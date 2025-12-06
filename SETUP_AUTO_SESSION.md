# Quick Setup Instructions for Auto-Session Feature

## Step 1: Install Required Type Definitions
```bash
npm install --save-dev @types/qrcode
```

## Step 2: Update Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Add schedule fields to teacher_subjects table
ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS day_of_week TEXT 
  CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE teacher_subjects 
  ADD COLUMN IF NOT EXISTS auto_session_enabled BOOLEAN DEFAULT false;
```

## Step 3: Update Environment Variables

Add these to your `.env.local` file:

```env
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# New variables for auto-sessions
CRON_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, change `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL.

## Step 4: Build and Run

```bash
npm install
npm run dev
```

## Step 5: Test the Feature

### A. Admin Panel
1. Login as admin at http://localhost:3000/login
2. Go to Admin → Manage → Assignments
3. Click "Assign Teacher"
4. Fill in teacher, subject, and class
5. Check "Enable automatic session creation"
6. Select day of week (e.g., Friday)
7. Set start time (e.g., 14:00)
8. Set end time (e.g., 15:00)
9. Click "Assign"

### B. Test Cron Job Manually
Visit in browser:
```
http://localhost:3000/api/cron/create-scheduled-sessions
```

You should see a JSON response with scheduled sessions info.

### C. Test Email Sending
1. Create a session manually in the teacher dashboard
2. Get the session ID from the database
3. Call the email API:
```bash
curl -X POST http://localhost:3000/api/teacher/send-session-email \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-uuid"}'
```

## Step 6: Deploy to Vercel

1. Push code to GitHub
2. Deploy to Vercel
3. The cron job will automatically run every 3 minutes
4. No additional configuration needed!

## Verification Checklist

- [ ] Database columns added successfully
- [ ] Environment variables configured
- [ ] npm packages installed
- [ ] Admin UI shows schedule fields
- [ ] Can create scheduled assignments
- [ ] Cron endpoint returns valid response
- [ ] Email sending works (check inbox)
- [ ] QR code appears in email

## Troubleshooting

**Issue:** Type errors for qrcode module
**Solution:** Run `npm install --save-dev @types/qrcode`

**Issue:** Cron job not running
**Solution:** On Vercel, check the "Cron Jobs" tab in your project dashboard

**Issue:** Emails not sending
**Solution:** Verify GMAIL_USER and GMAIL_APP_PASSWORD are correct. Get app password from https://myaccount.google.com/apppasswords

**Issue:** Sessions not being created
**Solution:** Check that:
- `auto_session_enabled` is true
- `day_of_week` matches current day
- `start_time` is within the next 7 minutes
- Cron job is running

## Next Steps

See `AUTO_SESSION_FEATURE.md` for complete documentation.
