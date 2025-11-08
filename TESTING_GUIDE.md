# 🧪 Complete Testing Guide - Student Attendance Flow

**Date**: November 8, 2025  
**Purpose**: Step-by-step testing of student OTP verification and attendance marking  
**Status**: Ready to Test ✅

---

## 🎯 What We're Testing

The complete flow:
1. ✅ Student enters email
2. ✅ OTP is sent to email
3. ✅ Student enters OTP
4. ✅ OTP is verified
5. ✅ Attendance is marked

---

## 📋 Prerequisites Checklist

Before testing, ensure:

- [ ] ✅ Database setup complete (MASTER_DATABASE_SETUP.sql run)
- [ ] ✅ Development server running (`npm run dev`)
- [ ] ✅ Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`
- [ ] ✅ Admin account exists (admin@kprcas.ac.in)
- [ ] ✅ At least one class created
- [ ] ✅ At least one subject created
- [ ] ✅ At least one teacher account created
- [ ] ✅ Teacher assigned to class and subject

---

## 🚀 Step-by-Step Testing Process

### Phase 1: Setup Test Data (Admin Tasks)

#### Step 1.1: Login as Admin

```
1. Open: http://localhost:3000/login
2. Click "Admin" tab
3. Enter: admin@kprcas.ac.in
4. Click "Send OTP"
5. Check Gmail for OTP
6. Enter OTP and login
```

**Expected Result**: ✅ Redirected to admin dashboard

---

#### Step 1.2: Create a Test Class

```
1. Go to: Admin Dashboard → Manage
2. Click "Classes" tab
3. Fill in:
   - Class Name: MSC A
   - Section: A
   - Year: 2024
4. Click "Add Class"
```

**Expected Result**: ✅ Class created successfully

**Verification Query** (Supabase SQL Editor):
```sql
SELECT * FROM classes WHERE class_name = 'MSC A';
```

---

#### Step 1.3: Create a Test Subject

```
1. Click "Subjects" tab
2. Fill in:
   - Subject Code: CS201
   - Subject Name: Data Structures
   - Credits: 4
   - Semester: 1
3. Click "Add Subject"
```

**Expected Result**: ✅ Subject created successfully

**Verification Query**:
```sql
SELECT * FROM subjects WHERE subject_code = 'CS201';
```

---

#### Step 1.4: Create a Teacher Account

```
1. Click "Users" tab
2. Click "Create User" button
3. Fill in:
   - Name: Dr. Kumar
   - Email: teacher@kprcas.ac.in
   - Username: teacher1
   - Role: Teacher
   - Status: Active
4. Click "Create User"
```

**Expected Result**: ✅ Teacher account created

**Verification Query**:
```sql
SELECT * FROM users WHERE email = 'teacher@kprcas.ac.in';
```

---

#### Step 1.5: Assign Teacher to Class and Subject (CRITICAL!)

```
1. Click "Assignments" tab
2. Select:
   - Teacher: Dr. Kumar (teacher@kprcas.ac.in)
   - Class: MSC A - Section A
   - Subject: CS201 - Data Structures
3. Click "Assign"
```

**Expected Result**: ✅ Assignment created successfully

**Verification Query**:
```sql
SELECT 
  ts.*,
  u.name as teacher_name,
  c.class_name,
  c.section,
  s.subject_name,
  s.subject_code
FROM teacher_subjects ts
JOIN users u ON ts.teacher_id = u.id
JOIN classes c ON ts.class_id = c.id
JOIN subjects s ON ts.subject_id = s.id
WHERE u.email = 'teacher@kprcas.ac.in';
```

**This is the most critical step!** If this is not done, teacher won't see any classes.

---

### Phase 2: Generate QR Session (Teacher Tasks)

#### Step 2.1: Logout and Login as Teacher

```
1. Logout from admin
2. Go to: http://localhost:3000/login
3. Click "Teacher" tab
4. Enter: teacher@kprcas.ac.in
5. Click "Send OTP"
6. Check Gmail for OTP
7. Enter OTP and login
```

**Expected Result**: ✅ Redirected to teacher dashboard

**Common Issue**: If teacher dashboard is empty:
- ❌ Problem: Teacher not assigned to any classes
- ✅ Solution: Go back to Admin → Assignments and assign teacher

---

#### Step 2.2: Verify Assigned Class Appears

```
1. Check "Featured Classes" section
2. You should see: "MSC A - Section A"
3. Subjects shown: CS201 - Data Structures
```

**Expected Result**: ✅ Class card appears with subject

**If you don't see the class**:
```sql
-- Run this query to check assignments
SELECT * FROM teacher_subjects WHERE teacher_id = (
  SELECT id FROM users WHERE email = 'teacher@kprcas.ac.in'
);
```

If empty, go back to Step 1.5!

---

#### Step 2.3: Start Attendance Session

```
1. Click "Start Session" button on the class card
2. Fill in session details:
   - Class: MSC A - Section A (auto-selected)
   - Subject: CS201 - Data Structures
   - Duration: 30 minutes
3. Click "Generate QR Code"
```

**Expected Result**: 
- ✅ QR code appears
- ✅ Session code displayed (e.g., "ABC123")
- ✅ Countdown timer starts

**Verification Query**:
```sql
SELECT 
  s.*,
  c.class_name,
  c.section,
  sub.subject_name,
  u.name as teacher_name
FROM attendance_sessions s
JOIN classes c ON s.class_id = c.id
JOIN subjects sub ON s.subject_id = sub.id
JOIN users u ON s.teacher_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 1;
```

---

### Phase 3: Student Attendance Marking (THE MAIN TEST!)

#### Step 3.1: Open Student Page

```
1. Open NEW browser tab (or incognito window)
2. Go to: http://localhost:3000/students
3. You should see "Mark Your Attendance" page
```

**Expected Result**: ✅ Student page loads

---

#### Step 3.2: Enter Session Code

```
1. Note the session code from teacher's QR (e.g., "ABC123")
2. In student page, enter the session code
3. Click "Continue" or press Enter
```

**Expected Result**: 
- ✅ Session details appear:
  - Class: MSC A - Section A
  - Subject: CS201 - Data Structures
  - Teacher: Dr. Kumar
  - Time remaining: ~30 minutes

**If "Session not found" error**:
- Check session code is correct
- Verify session is still active (not expired)
- Run verification query from Step 2.3

---

#### Step 3.3: Enter Student Email

```
1. Enter student email: student1@kprcas.ac.in
2. Click "Send OTP" button
```

**Expected Result**: 
- ✅ "OTP sent successfully to student1@kprcas.ac.in" message
- ✅ OTP input field appears
- ✅ Email sent to student1@kprcas.ac.in

**Check Gmail** (cnp3301@gmail.com):
- Look for email with subject: "Your Attendance OTP"
- Should contain 6-digit code (e.g., 123456)

**If OTP not received**:
1. Check `.env.local` variables are correct
2. Check spam folder
3. Check terminal/console for errors
4. Verify GMAIL_APP_PASSWORD is correct (16 chars, no spaces)

**Debug Query**:
```sql
-- Check if OTP was created
SELECT * FROM attendance_otps 
WHERE email = 'student1@kprcas.ac.in'
ORDER BY created_at DESC 
LIMIT 1;
```

---

#### Step 3.4: Enter OTP and Verify

```
1. Get OTP from Gmail (6 digits)
2. Enter OTP in the input field
3. Click "Verify OTP" button
```

**Expected Result**: 
- ✅ "Attendance marked successfully!" message
- ✅ Green checkmark appears
- ✅ Success animation

**Debug Query**:
```sql
-- Check if attendance was marked
SELECT 
  ar.*,
  s.student_id,
  s.email,
  ses.session_code,
  c.class_name
FROM attendance_records ar
JOIN students s ON ar.student_id = s.id
JOIN attendance_sessions ses ON ar.session_id = ses.id
JOIN classes c ON ses.class_id = c.id
WHERE s.email = 'student1@kprcas.ac.in'
ORDER BY ar.created_at DESC
LIMIT 1;
```

**Expected Query Result**:
```
id | session_id | student_id | status  | marked_at | verified_via
----------------------------------------------------------------
1  | abc-123... | xyz-456... | present | 2025-... | email_otp
```

---

#### Step 3.5: Verify Student Record Created

```sql
-- Check if student record was auto-created
SELECT * FROM students 
WHERE email = 'student1@kprcas.ac.in';
```

**Expected Result**:
- ✅ Student record exists
- ✅ `class_id` matches session's class
- ✅ `email` is correct
- ✅ `status` is 'active'

---

### Phase 4: Verify Attendance in Teacher Dashboard

#### Step 4.1: Go Back to Teacher Dashboard

```
1. Switch back to teacher's browser tab
2. Refresh page (or it auto-updates)
3. Click "View Attendance" on the active session
```

**Expected Result**: 
- ✅ Student list appears
- ✅ student1@kprcas.ac.in shown as "Present"
- ✅ Green checkmark next to student
- ✅ Marked time displayed

---

#### Step 4.2: Test Report Generation

```
1. Click "Download PDF" button
2. PDF should download
3. Open PDF and verify:
   - Class: MSC A - Section A
   - Subject: CS201 - Data Structures
   - Student: student1@kprcas.ac.in (Present)
   - Date and time

4. Click "Download CSV" button
5. CSV should download
6. Open CSV and verify data
```

**Expected Result**: 
- ✅ PDF downloads successfully
- ✅ CSV downloads successfully
- ✅ Both contain correct attendance data

---

## 🧪 Additional Test Cases

### Test Case 1: Multiple Students

```
1. Repeat Phase 3 with different emails:
   - student2@kprcas.ac.in
   - student3@kprcas.ac.in
2. Each should receive unique OTP
3. All should mark attendance successfully
4. Teacher should see all 3 students as "Present"
```

---

### Test Case 2: Wrong OTP

```
1. Enter email: student4@kprcas.ac.in
2. Click "Send OTP"
3. Enter WRONG OTP (e.g., 000000)
4. Click "Verify OTP"
```

**Expected Result**: 
- ❌ "Invalid or expired OTP" error message
- ❌ Attendance NOT marked

---

### Test Case 3: Expired OTP

```
1. Enter email: student5@kprcas.ac.in
2. Click "Send OTP"
3. Wait 11 minutes (OTP expires after 10 minutes)
4. Enter the OTP
5. Click "Verify OTP"
```

**Expected Result**: 
- ❌ "OTP has expired" error message
- ❌ Attendance NOT marked

---

### Test Case 4: Class Restriction

```
1. Admin: Create another class "MSC B"
2. Admin: Create student with class_id = MSC B
3. Student tries to mark attendance in MSC A session
```

**Expected Result**: 
- ❌ "You are not assigned to this class" error
- ❌ OTP NOT sent
- ❌ Attendance NOT marked

---

### Test Case 5: Duplicate Attendance

```
1. Student marks attendance successfully
2. Same student tries to mark attendance again for same session
```

**Expected Result**: 
- ❌ "You have already marked attendance for this session"
- ❌ Duplicate NOT created

---

### Test Case 6: Session Expired

```
1. Create session with 1 minute duration
2. Wait 2 minutes
3. Student tries to mark attendance
```

**Expected Result**: 
- ❌ "Session has expired" error
- ❌ Attendance NOT marked

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Error fetching assignments: {}"

**Cause**: Teacher not assigned to any classes

**Solution**:
```
1. Login as admin
2. Go to Manage → Assignments
3. Assign teacher to class and subject
4. Logout and login as teacher again
```

---

### Issue 2: OTP Not Received

**Cause**: Gmail configuration issue

**Debug Steps**:
1. Check terminal for email errors
2. Verify `.env.local`:
   ```bash
   GMAIL_USER=cnp3301@gmail.com
   GMAIL_APP_PASSWORD=xvnbqkhincedpuvy
   ```
3. Test Gmail connection:
   ```sql
   -- Check if OTP was created in database
   SELECT * FROM attendance_otps 
   WHERE email = 'test@kprcas.ac.in'
   ORDER BY created_at DESC;
   ```

4. If OTP in database but email not sent:
   - GMAIL_APP_PASSWORD is wrong
   - Gmail account security blocking
   - Need to regenerate App Password

---

### Issue 3: "Session not found"

**Cause**: Session expired or wrong code

**Debug Query**:
```sql
SELECT * FROM attendance_sessions 
WHERE session_code = 'ABC123'  -- Replace with your code
AND status = 'active';
```

**If empty**: Session doesn't exist or has expired

---

### Issue 4: Teacher Dashboard Empty

**Cause**: No assignments in teacher_subjects table

**Debug Query**:
```sql
SELECT 
  ts.*,
  u.email as teacher_email,
  c.class_name,
  s.subject_name
FROM teacher_subjects ts
JOIN users u ON ts.teacher_id = u.id
JOIN classes c ON ts.class_id = c.id
JOIN subjects s ON ts.subject_id = s.id;
```

**If empty**: No assignments exist. Go to Admin → Assignments

---

### Issue 5: Student Auto-Registration Not Working

**Debug**: Check browser console for errors

**Verify Query**:
```sql
-- Check students table
SELECT * FROM students 
WHERE email = 'yourtest@kprcas.ac.in';
```

**If empty after marking attendance**: Check API logs for errors

---

## ✅ Success Checklist

After completing all tests, verify:

- [ ] ✅ Admin can create classes
- [ ] ✅ Admin can create subjects
- [ ] ✅ Admin can create teachers
- [ ] ✅ Admin can assign teachers to classes
- [ ] ✅ Teacher sees assigned classes
- [ ] ✅ Teacher can generate QR session
- [ ] ✅ Student can enter session code
- [ ] ✅ Student can enter email
- [ ] ✅ OTP is sent to email
- [ ] ✅ Student can enter OTP
- [ ] ✅ OTP is verified
- [ ] ✅ Attendance is marked
- [ ] ✅ Student record auto-created
- [ ] ✅ Teacher sees updated attendance
- [ ] ✅ PDF report generates
- [ ] ✅ CSV report generates
- [ ] ✅ Class restriction works
- [ ] ✅ Duplicate prevention works
- [ ] ✅ Session expiry works

---

## 🎯 Quick Test Commands

### Check Everything is Setup
```sql
-- 1. Check admin user
SELECT * FROM users WHERE email = 'admin@kprcas.ac.in';

-- 2. Check classes
SELECT * FROM classes;

-- 3. Check subjects
SELECT * FROM subjects;

-- 4. Check teachers
SELECT * FROM users WHERE user_type = 'teacher';

-- 5. Check assignments (MOST IMPORTANT!)
SELECT 
  ts.id,
  u.name as teacher,
  c.class_name,
  c.section,
  s.subject_name
FROM teacher_subjects ts
JOIN users u ON ts.teacher_id = u.id
JOIN classes c ON ts.class_id = c.id
JOIN subjects s ON ts.subject_id = s.id;

-- 6. Check active sessions
SELECT * FROM attendance_sessions 
WHERE status = 'active';

-- 7. Check recent attendance
SELECT 
  ar.*,
  s.email,
  ses.session_code
FROM attendance_records ar
JOIN students s ON ar.student_id = s.id
JOIN attendance_sessions ses ON ar.session_id = ses.id
ORDER BY ar.created_at DESC
LIMIT 10;
```

---

## 📊 Expected Database State After Complete Test

```sql
-- Tables should have data:
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'teacher_subjects', COUNT(*) FROM teacher_subjects
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'attendance_sessions', COUNT(*) FROM attendance_sessions
UNION ALL
SELECT 'attendance_records', COUNT(*) FROM attendance_records;
```

**Expected Result**:
```
Table                  | Count
----------------------------
users                 | 2+     (admin + teachers)
classes               | 1+
subjects              | 1+
teacher_subjects      | 1+     (CRITICAL!)
students              | 1+     (auto-created)
attendance_sessions   | 1+
attendance_records    | 1+
```

---

## 🚀 Ready for Production?

Once all tests pass:

1. ✅ Commit final changes
2. ✅ Push to GitHub
3. ✅ Deploy to Vercel (follow VERCEL_DEPLOYMENT_GUIDE.md)
4. ✅ Run MASTER_DATABASE_SETUP.sql in production Supabase
5. ✅ Test complete flow on production URL
6. ✅ Share with real users!

---

**Testing Date**: November 8, 2025  
**Status**: Ready to Test  
**Version**: 3.0  
**Critical Step**: Don't forget Step 1.5 (Assign Teacher to Class)!
