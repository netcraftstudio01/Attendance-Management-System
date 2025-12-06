# Quick Reference Card - Auto-Session Feature

## 🚀 Quick Start (3 Steps)

### 1. Install & Update Database
```bash
npm install --save-dev @types/qrcode
```

```sql
-- In Supabase SQL Editor:
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS auto_session_enabled BOOLEAN DEFAULT false;
```

### 2. Configure Environment
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
CRON_SECRET=random-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Deploy & Test
```bash
npm run build
git push origin master
```

---

## 📋 Usage Cheat Sheet

### Admin: Create Scheduled Assignment
```
1. Admin → Manage → Assignments → Assign Teacher
2. Select: Teacher, Subject, Class
3. Check: ☑ Enable automatic session creation
4. Set: Day (Monday), Time (10:00 - 11:00)
5. Click: Assign
```

### System: Auto-Create Session
```
Every 3 minutes → Check schedules
5 min before class → Create session + Email teacher
Session active for → 5 minutes only
```

### Teacher: Receive Email
```
Email contains:
- Session Code: ABC123
- QR Code: [Image]
- Expires: 10:05 AM
```

---

## 🔧 Important Files

| File | Purpose |
|------|---------|
| `app/api/cron/create-scheduled-sessions/route.ts` | Cron job logic |
| `app/api/teacher/send-session-email/route.ts` | Email sender |
| `app/admin/manage/page.tsx` | Admin UI |
| `vercel.json` | Cron config |

---

## 🧪 Testing Commands

```bash
# Test cron endpoint
curl http://localhost:3000/api/cron/create-scheduled-sessions

# Test email API
curl -X POST http://localhost:3000/api/teacher/send-session-email \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"uuid-here"}'

# Check database
# In Supabase:
SELECT * FROM teacher_subjects WHERE auto_session_enabled = true;
```

---

## ⚡ Key Timings

| Event | Timing |
|-------|--------|
| Cron runs | Every 3 minutes |
| Session created | 5-7 min before class |
| Email sent | Immediately after creation |
| Session expires | 5 min after start time |
| Duplicate prevention | 10 minute window |

---

## 🎯 Common Tasks

### Enable Auto-Session for Existing Assignment
```sql
UPDATE teacher_subjects 
SET 
  auto_session_enabled = true,
  day_of_week = 'Monday',
  start_time = '10:00',
  end_time = '11:00'
WHERE teacher_id = 'teacher-uuid'
  AND class_id = 'class-uuid'
  AND subject_id = 'subject-uuid';
```

### Disable Auto-Session
```sql
UPDATE teacher_subjects 
SET auto_session_enabled = false
WHERE id = 'assignment-uuid';
```

### View All Scheduled Assignments
```sql
SELECT 
  u.name as teacher,
  s.subject_name,
  c.class_name,
  ts.day_of_week,
  ts.start_time,
  ts.end_time
FROM teacher_subjects ts
JOIN users u ON ts.teacher_id = u.id
JOIN subjects s ON ts.subject_id = s.id
JOIN classes c ON ts.class_id = c.id
WHERE ts.auto_session_enabled = true
ORDER BY ts.day_of_week, ts.start_time;
```

### Check Today's Schedules
```sql
SELECT * FROM teacher_subjects 
WHERE auto_session_enabled = true 
  AND day_of_week = to_char(CURRENT_DATE, 'Day');
```

---

## 🐛 Troubleshooting Quick Fixes

### Emails Not Sending?
```bash
# 1. Check env vars
echo $GMAIL_USER
echo $GMAIL_APP_PASSWORD

# 2. Test manually
curl -X POST http://localhost:3000/api/teacher/send-session-email \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"valid-session-id"}'
```

### Cron Not Running?
```bash
# 1. Check vercel.json
cat vercel.json | grep cron

# 2. Test endpoint
curl http://localhost:3000/api/cron/create-scheduled-sessions

# 3. Check Vercel dashboard → Cron Jobs
```

### Sessions Not Created?
```sql
-- 1. Check assignment exists
SELECT * FROM teacher_subjects 
WHERE auto_session_enabled = true;

-- 2. Check day matches
SELECT to_char(CURRENT_DATE, 'Day');

-- 3. Check time window (next 7 minutes)
SELECT CURRENT_TIME, 
       CURRENT_TIME + interval '7 minutes' as window_end;
```

---

## 📞 Support Resources

| Resource | Location |
|----------|----------|
| Full Documentation | `AUTO_SESSION_FEATURE.md` |
| Setup Guide | `SETUP_AUTO_SESSION.md` |
| Migration Guide | `MIGRATION_GUIDE.md` |
| UI Guide | `UI_CHANGES_GUIDE.md` |
| Summary | `AUTO_SESSION_SUMMARY.md` |

---

## ✅ Health Check

Run this checklist to verify everything works:

- [ ] Database columns added
- [ ] Environment variables set
- [ ] Code deployed
- [ ] Cron job active (Vercel dashboard)
- [ ] Test email received
- [ ] Schedule created successfully
- [ ] Session auto-created
- [ ] QR code in email
- [ ] Session expires correctly

---

## 🔐 Security Notes

- `CRON_SECRET` prevents unauthorized cron calls
- Only valid Gmail app passwords work
- Sessions expire after 5 minutes
- QR codes are unique per session
- No duplicate sessions within 10 minutes

---

## 🎓 Example Schedule

```
Teacher: Dr. Smith
Class: MSC A
Subject: Data Structures

Monday    09:00-10:00  ✓ Auto-session
Tuesday   11:00-12:00  ✓ Auto-session  
Wednesday 14:00-15:00  ✓ Auto-session
Thursday  10:00-11:00  ✓ Auto-session
Friday    09:00-10:00  ✓ Auto-session

Each day at [time - 5 min]:
→ Session created
→ Email sent with QR code
→ Valid for 5 minutes
```

---

**Version:** 1.0  
**Updated:** December 6, 2025  
**Status:** Production Ready ✅
