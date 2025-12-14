# Quick Start - Department Isolation Testing

## Step 1: Set Up Test Admins (Run in Supabase SQL Editor)

```sql
-- Computer Science Department Admin
INSERT INTO users (
  id,
  email, 
  name, 
  username, 
  plain_password, 
  role, 
  user_type, 
  department, 
  phone,
  status
) VALUES (
  gen_random_uuid(),
  'cs-admin@kprcas.ac.in',
  'Computer Science Admin',
  'cs_admin',
  'CS@123Admin',
  'admin',
  'admin',
  'Computer Science',
  '+91-9000000001',
  'active'
) ON CONFLICT (email) DO NOTHING;

-- Information Technology Department Admin
INSERT INTO users (
  id,
  email, 
  name, 
  username, 
  plain_password, 
  role, 
  user_type, 
  department, 
  phone,
  status
) VALUES (
  gen_random_uuid(),
  'it-admin@kprcas.ac.in',
  'IT Department Admin',
  'it_admin',
  'IT@123Admin',
  'admin',
  'admin',
  'Information Technology',
  '+91-9000000002',
  'active'
) ON CONFLICT (email) DO NOTHING;
```

## Step 2: Test Department Isolation Workflow

### Test 1: CS Admin Creates Classes
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000/login`
3. Login with:
   - Email: `cs-admin@kprcas.ac.in`
   - Password: `CS@123Admin` (or use OTP)
4. Navigate to Admin → Manage → Classes
5. Click "Add New Class"
6. Fill in:
   - Class Name: `CS-101`
   - Section: `A`
   - Year: `1`
7. Click Save
8. Verify class appears in list
9. Check database - should show `department: 'Computer Science'`

### Test 2: Verify Isolation - IT Admin Cannot See CS Classes
1. Open new incognito tab
2. Login as `it-admin@kprcas.ac.in` with password `IT@123Admin`
3. Go to Admin → Manage → Classes
4. **Verify: `CS-101` is NOT in the list** ✓
5. Create a class `IT-101` Section `A` Year `1`
6. Verify `IT-101` appears in IT Admin's list

### Test 3: Verify CS Admin Still Cannot See IT Classes
1. Go back to first tab with CS Admin logged in
2. Navigate to Admin → Manage → Classes
3. **Verify: `IT-101` is NOT in the list** ✓
4. **Verify: Only `CS-101` is visible** ✓

### Test 4: Test Subjects Isolation
**CS Admin Tab:**
1. Go to Admin → Manage → Subjects
2. Create Subject:
   - Code: `CS-JAVA`
   - Name: `Java Programming`
3. Create another:
   - Code: `CS-PYTHON`
   - Name: `Python Programming`

**IT Admin Tab:**
1. Go to Admin → Manage → Subjects
2. **Verify: `CS-JAVA` and `CS-PYTHON` are NOT visible** ✓
3. Create Subject:
   - Code: `IT-NETWORKS`
   - Name: `Networks & Security`

**Back to CS Admin Tab:**
1. Go to Admin → Manage → Subjects
2. **Verify: Only `CS-JAVA` and `CS-PYTHON` are visible** ✓
3. **Verify: `IT-NETWORKS` is NOT visible** ✓

### Test 5: Dashboard Statistics
**CS Admin:**
1. Go to Admin Dashboard
2. Note the statistics:
   - Classes: Should show only CS classes count
   - Subjects: Should show only CS subjects count
   - Students: Should show only CS students count

**IT Admin (new tab):**
1. Go to Admin Dashboard
2. Note the statistics:
   - Classes: Should show only IT classes count
   - Subjects: Should show only IT subjects count
   - Students: Should show only IT students count

## Step 3: Verify Data in Database

```sql
-- Check CS Admin's classes
SELECT id, class_name, section, year, department 
FROM classes 
WHERE department = 'Computer Science';

-- Check IT Admin's classes
SELECT id, class_name, section, year, department 
FROM classes 
WHERE department = 'Information Technology';

-- Check CS Admin's subjects
SELECT id, subject_code, subject_name, department 
FROM subjects 
WHERE department = 'Computer Science';

-- Check IT Admin's subjects
SELECT id, subject_code, subject_name, department 
FROM subjects 
WHERE department = 'Information Technology';

-- Verify admins have correct departments
SELECT id, email, name, department 
FROM users 
WHERE user_type = 'admin';
```

## Step 4: Test Failure Cases

### Should FAIL: CS Admin tries to delete IT Class (via Database)
```sql
-- This should fail - trying to delete with wrong department
-- API validates: .eq('id', classId).eq('department', 'Computer Science')
-- When actual class has department = 'Information Technology'
DELETE FROM classes 
WHERE id = '{IT-101-id}' 
AND department = 'Computer Science'; -- Wrong department!
```

### Should FAIL: Cross-Department Subject Code
```sql
-- This should succeed - same code, different department
INSERT INTO subjects (
  subject_code, 
  subject_name, 
  department
) VALUES (
  'CS-JAVA',  -- Same code!
  'Java for Data Science',
  'Information Technology'  -- Different department
);
-- Result: ✅ Success (not a violation due to composite UNIQUE constraint)
```

## Step 5: Verify API Responses

### Test Classes API
```bash
# Get CS Admin's classes
curl "http://localhost:3000/api/admin/classes?adminId=CS_ADMIN_ID&department=Computer%20Science"

# Response should contain:
# {
#   "success": true,
#   "data": [
#     { "id": "...", "class_name": "CS-101", "department": "Computer Science" }
#   ]
# }
```

### Test Subjects API
```bash
# Get IT Admin's subjects
curl "http://localhost:3000/api/admin/subjects?adminId=IT_ADMIN_ID&department=Information%20Technology"

# Response should contain:
# [
#   { "id": "...", "subject_code": "IT-NETWORKS", "department": "Information Technology" }
# ]
```

## Step 6: Browser DevTools Inspection

### Check localStorage
1. Open DevTools (F12)
2. Go to Application → localStorage
3. Look for `user` key
4. Expand and verify:
   ```json
   {
     "id": "...",
     "email": "cs-admin@kprcas.ac.in",
     "department": "Computer Science",
     "role": "admin"
   }
   ```

### Check Network Requests
1. Go to Network tab
2. Navigate to Admin → Manage → Classes
3. Look for `/api/admin/classes` request
4. Query parameters should include:
   ```
   adminId=... 
   department=Computer+Science
   ```
5. Click on request, check Response tab
6. Should show only classes with matching department

## Success Criteria ✓

- [ ] CS Admin can create/read classes only for CS department
- [ ] IT Admin can create/read classes only for IT department
- [ ] CS Admin cannot see IT department classes
- [ ] IT Admin cannot see CS department classes
- [ ] Same applies to subjects, students, teachers
- [ ] Dashboard shows correct statistics per department
- [ ] Database enforces department constraints
- [ ] API validates department ownership on all operations
- [ ] localStorage properly stores admin's department
- [ ] Network requests include department parameter

## Troubleshooting

### Problem: Department column missing in database
**Solution:**
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'department';

-- If missing, add it:
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';
ALTER TABLE students ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';
```

### Problem: Admin doesn't have department set
**Solution:**
```sql
UPDATE users 
SET department = 'Computer Science' 
WHERE email = 'cs-admin@kprcas.ac.in';
```

### Problem: Classes API returns empty array
**Solution:**
1. Check if admin has `department` field set in database
2. Check if any classes exist with matching department
3. Check browser console for errors
4. Verify query parameters are correct in Network tab

### Problem: localStorage doesn't have department
**Solution:**
1. Re-login (clear browser localStorage first)
2. Check login API response includes department field
3. Check OTP verify API returns department field

## Performance Notes

- Department filtering is done at the database level (efficient)
- No N+1 queries - select with relationships returns all needed data
- Service role queries are cached by Supabase
- Suitable for 1000+ students per department

