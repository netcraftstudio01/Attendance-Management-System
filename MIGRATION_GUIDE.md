# Migration Guide - Adding Auto-Session to Existing Deployment

## Overview
This guide helps you add the auto-session feature to an **existing** attendance management system deployment.

---

## Prerequisites

- Existing attendance management system deployed and working
- Access to Supabase SQL Editor
- Access to deployment environment variables (Vercel/server)
- Gmail account with App Password enabled

---

## Migration Steps

### Step 1: Backup Database (Recommended)

Before making changes, backup your database:

```sql
-- In Supabase SQL Editor, run:
SELECT * FROM teacher_subjects;
-- Export results as CSV or JSON
```

---

### Step 2: Update Database Schema

**Run this in Supabase SQL Editor:**

```sql
-- Add new columns to teacher_subjects table
ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS day_of_week TEXT 
  CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS auto_session_enabled BOOLEAN DEFAULT false;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'teacher_subjects';
```

**Expected Output:**
```
column_name            | data_type              | is_nullable
-----------------------|------------------------|------------
id                     | uuid                   | NO
teacher_id             | uuid                   | NO
class_id               | uuid                   | NO
subject_id             | uuid                   | NO
created_at             | timestamp with tz      | YES
day_of_week            | text                   | YES  ← NEW
start_time             | time without tz        | YES  ← NEW
end_time               | time without tz        | YES  ← NEW
auto_session_enabled   | boolean                | YES  ← NEW
```

---

### Step 3: Update Code Repository

**Pull or merge the new code:**

```bash
git pull origin master
# or
git merge feature/auto-session
```

**Files that changed:**
- `app/admin/manage/page.tsx`
- `app/api/admin/assignments/route.ts`
- `app/api/teacher/send-session-email/route.ts` (NEW)
- `app/api/cron/create-scheduled-sessions/route.ts` (NEW)
- `vercel.json`
- `MASTER_DATABASE_SETUP.sql`

---

### Step 4: Install Dependencies

```bash
npm install --save-dev @types/qrcode
npm install
```

---

### Step 5: Update Environment Variables

**Add to your `.env.local` (local development):**

```env
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# NEW: Add these for auto-session feature
CRON_SECRET=generate-a-random-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Add to Vercel Environment Variables (production):**

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - `CRON_SECRET` = `your-random-secret-key`
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`

**Generate a secure CRON_SECRET:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32|%{Get-Random -Minimum 0 -Maximum 256}))
```

---

### Step 6: Deploy Changes

**Option A: Vercel (Recommended)**

```bash
git add .
git commit -m "Add auto-session feature"
git push origin master
```

Vercel will auto-deploy. Check deployment logs.

**Option B: Manual Build**

```bash
npm run build
npm run start
```

---

### Step 7: Verify Cron Job

**On Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Click "Cron Jobs" tab
3. You should see:
   ```
   Path: /api/cron/create-scheduled-sessions
   Schedule: */3 * * * * (Every 3 minutes)
   Status: Active ✓
   ```

**Manual Test:**

```bash
# Test locally
curl http://localhost:3000/api/cron/create-scheduled-sessions

# Test on production
curl https://your-app.vercel.app/api/cron/create-scheduled-sessions
```

**Expected Response:**
```json
{
  "success": true,
  "checked_at": "2025-12-06T10:00:00Z",
  "current_day": "Friday",
  "current_time": "10:00",
  "total_scheduled": 0,
  "triggered": 0,
  "created": 0
}
```

---

### Step 8: Test Email Functionality

**Create a test session:**

1. Login as teacher
2. Create a session manually
3. Copy the session ID from database
4. Test email API:

```bash
curl -X POST https://your-app.vercel.app/api/teacher/send-session-email \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"paste-session-id-here"}'
```

**Check teacher's email inbox** for the QR code email.

---

### Step 9: Create First Scheduled Assignment

1. Login as admin
2. Go to Admin → Manage → Assignments
3. Click "Assign Teacher"
4. Fill in:
   - Teacher: Select any teacher
   - Subject: Select any subject
   - Class: Select any class
5. Check ☑ "Enable automatic session creation"
6. Select:
   - Day of Week: (Select current day for testing)
   - Start Time: (5 minutes from now)
   - End Time: (10 minutes from now)
7. Click "Assign"

**Wait 5 minutes**, then check:
- Teacher's email for session notification
- Database for new session record
- Cron logs in Vercel

---

### Step 10: Verify Data Migration

**Check existing assignments still work:**

```sql
-- In Supabase SQL Editor
SELECT 
  ts.id,
  ts.day_of_week,
  ts.start_time,
  ts.end_time,
  ts.auto_session_enabled,
  u.name as teacher,
  s.subject_name,
  c.class_name
FROM teacher_subjects ts
JOIN users u ON ts.teacher_id = u.id
JOIN subjects s ON ts.subject_id = s.id
JOIN classes c ON ts.class_id = c.id;
```

**Expected Results:**
- Old assignments: New fields will be `NULL` or `false`
- New assignments: Fields will have values
- Both types work correctly

---

## Rollback Plan (If Needed)

If something goes wrong:

### Quick Rollback
```sql
-- Remove new columns (CAUTION: This deletes schedule data)
ALTER TABLE teacher_subjects DROP COLUMN IF EXISTS day_of_week;
ALTER TABLE teacher_subjects DROP COLUMN IF EXISTS start_time;
ALTER TABLE teacher_subjects DROP COLUMN IF EXISTS end_time;
ALTER TABLE teacher_subjects DROP COLUMN IF EXISTS auto_session_enabled;
```

### Code Rollback
```bash
git revert HEAD
git push origin master
```

### Vercel Rollback
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## Post-Migration Checklist

- [ ] Database schema updated successfully
- [ ] New code deployed
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Cron job appears in Vercel dashboard
- [ ] Cron endpoint returns valid JSON
- [ ] Email sending tested and working
- [ ] First scheduled assignment created
- [ ] Teacher received email with QR code
- [ ] Session created in database
- [ ] Existing assignments still work
- [ ] Admin UI shows new schedule fields
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Common Migration Issues

### Issue 1: Type Errors in TypeScript
**Symptom:** Build fails with "Cannot find module 'qrcode'"

**Solution:**
```bash
npm install --save-dev @types/qrcode
npm run build
```

---

### Issue 2: Database Constraint Error
**Symptom:** Cannot add day_of_week column

**Solution:**
```sql
-- Check for conflicting data first
SELECT * FROM teacher_subjects WHERE day_of_week NOT IN 
  ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  AND day_of_week IS NOT NULL;

-- If found, fix or delete invalid rows
DELETE FROM teacher_subjects WHERE day_of_week = 'invalid-value';

-- Then re-run ALTER TABLE
```

---

### Issue 3: Cron Job Not Running
**Symptom:** Sessions not being created automatically

**Solutions:**
1. Check Vercel dashboard → Cron Jobs → Status
2. Verify `vercel.json` has cron configuration
3. Check environment variable `CRON_SECRET` is set
4. Review cron logs in Vercel

---

### Issue 4: Emails Not Sending
**Symptom:** No emails received by teachers

**Solutions:**
1. Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` in env
2. Check Gmail App Password is valid
3. Review server logs for email errors
4. Test with manual API call
5. Check spam folder

---

## Monitoring After Migration

### Daily Checks (First Week)
- Check cron job logs in Vercel
- Verify scheduled sessions are created
- Confirm teachers receive emails
- Monitor error logs

### Weekly Checks
- Review attendance statistics
- Check for duplicate sessions
- Verify no missed schedules
- Monitor email delivery rate

---

## Support

If you encounter issues:

1. **Check Logs:**
   - Vercel: Dashboard → Functions → Logs
   - Local: Terminal output

2. **Review Documentation:**
   - `AUTO_SESSION_FEATURE.md` - Complete docs
   - `SETUP_AUTO_SESSION.md` - Setup guide
   - `UI_CHANGES_GUIDE.md` - UI reference

3. **Test Endpoints:**
   ```bash
   # Cron
   curl https://your-app.vercel.app/api/cron/create-scheduled-sessions
   
   # Email
   curl -X POST https://your-app.vercel.app/api/teacher/send-session-email \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test-id"}'
   ```

4. **Database Check:**
   ```sql
   SELECT * FROM teacher_subjects WHERE auto_session_enabled = true;
   ```

---

**Migration Date:** _______________  
**Performed By:** _______________  
**Status:** ☐ Success  ☐ Issues (describe below)

**Notes:**
_______________________________________
_______________________________________
_______________________________________
