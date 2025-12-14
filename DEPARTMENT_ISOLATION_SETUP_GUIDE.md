# Department-Based Admin System - Setup & Testing Guide

## Overview
The system now supports department-based admin isolation. Each admin manages only their assigned department's resources (classes, subjects, students, teachers).

## Architecture

### Multi-Tenant Model
```
┌─────────────────────────────────────────┐
│        Admin Dashboard                  │
│  (Computer Science Department)          │
├─────────────────────────────────────────┤
│ Classes:  CS-101, CS-102, CS-103        │
│ Subjects: Java, Python, DSA             │
│ Students: Only CS students              │
│ Teachers: Only CS teachers              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        Admin Dashboard                  │
│  (IT Department)                        │
├─────────────────────────────────────────┤
│ Classes:  IT-101, IT-102, IT-103        │
│ Subjects: Networks, Security, OS        │
│ Students: Only IT students              │
│ Teachers: Only IT teachers              │
└─────────────────────────────────────────┘
```

## Database Changes

### Tables Updated
1. **users** - Already has `department` column
2. **classes** - Added `department` column, updated UNIQUE constraint
3. **subjects** - Added `department` column, updated UNIQUE constraint  
4. **students** - Added `department` column

### UNIQUE Constraints (Important!)
```sql
-- Classes - allows same name in different departments
UNIQUE(class_name, section, year, department)

-- Subjects - allows same code in different departments
UNIQUE(subject_code, department)
```

## Setting Up Department Admins

### Method 1: Using Supabase Dashboard
1. Open Supabase → Auth → Users
2. Create new user with email (e.g., `cs-admin@kprcas.ac.in`)
3. Open database editor
4. Go to `users` table
5. Find the newly created user
6. Set the following fields:
   - `name`: "Computer Science Admin"
   - `role`: "admin"
   - `user_type`: "admin"
   - `department`: "Computer Science"
   - `plain_password`: (set a password, will be improved with bcrypt)

### Method 2: Using SQL (Recommended for Testing)
```sql
-- Create CS Department Admin
INSERT INTO users (
  email, 
  name, 
  username, 
  plain_password, 
  role, 
  user_type, 
  department, 
  status
) VALUES (
  'cs-admin@kprcas.ac.in',
  'Computer Science Admin',
  'cs_admin',
  'CS@123Admin',
  'admin',
  'admin',
  'Computer Science',
  'active'
) ON CONFLICT DO NOTHING;

-- Create IT Department Admin
INSERT INTO users (
  email, 
  name, 
  username, 
  plain_password, 
  role, 
  user_type, 
  department, 
  status
) VALUES (
  'it-admin@kprcas.ac.in',
  'IT Department Admin',
  'it_admin',
  'IT@123Admin',
  'admin',
  'admin',
  'Information Technology',
  'active'
) ON CONFLICT DO NOTHING;
```

## Testing Department Isolation

### Test Case 1: CS Admin Creates Classes
1. Login as `cs-admin@kprcas.ac.in` (OTP-based)
2. Navigate to Admin → Manage → Classes
3. Create class "CS-101" Section "A" Year 1
4. Verify class appears in list
5. Database should show: `classes.department = "Computer Science"`

### Test Case 2: IT Admin Cannot See CS Classes
1. Login as `it-admin@kprcas.ac.in`
2. Navigate to Admin → Manage → Classes
3. Verify "CS-101" does NOT appear
4. Create class "IT-101" Section "A" Year 1
5. Verify only "IT-101" shows (not "CS-101")

### Test Case 3: Subjects Isolation
1. CS Admin creates subject "Java" (code: CS-Java)
2. IT Admin tries to create subject "Java" (code: CS-Java) - Should succeed (different department)
3. IT Admin creates subject "Networks" (code: IT-Networks)
4. Verify CS Admin cannot see "Networks"

### Test Case 4: Students Assignment
1. Create class "CS-101" in CS department
2. Create student in CS-101
3. Verify student.department = "Computer Science"
4. IT Admin should not see this student

### Test Case 5: Dashboard Statistics
1. CS Admin views dashboard
2. Stats should show only CS: classes, students, teachers
3. IT Admin views dashboard
4. Stats should show only IT: classes, students, teachers

## API Endpoints Reference

### Classes API
```typescript
// GET - Fetch department's classes
GET /api/admin/classes?adminId={id}&department={dept}

// POST - Create class
POST /api/admin/classes
Body: {
  adminId, 
  department, 
  class_name, 
  section, 
  year
}

// PUT - Update class
PUT /api/admin/classes
Body: {
  adminId,
  department,
  classId,
  class_name,
  section,
  year
}

// DELETE - Delete class
DELETE /api/admin/classes
Body: {
  adminId,
  department,
  classId
}
```

### Subjects API
```typescript
// GET - Fetch department's subjects
GET /api/admin/subjects?adminId={id}&department={dept}

// POST - Create subject
POST /api/admin/subjects
Body: {
  adminId,
  department,
  subject_code,
  subject_name,
  credits,
  semester
}

// PUT - Update subject
PUT /api/admin/subjects
Body: {
  adminId,
  department,
  id,
  subject_code,
  subject_name,
  credits,
  semester
}

// DELETE - Delete subject
DELETE /api/admin/subjects
Body: {
  adminId,
  department,
  id
}
```

### Dashboard API
```typescript
// GET - Fetch department statistics
GET /api/admin/dashboard?adminId={id}

Response: {
  success: true,
  stats: {
    totalStudents: number,
    totalTeachers: number,
    totalClasses: number
  },
  odRequests: array
}
```

## Frontend Data Flow

### How Department is Used

```typescript
// 1. During Login - OTP verification
const user = {
  id: "uuid",
  email: "cs-admin@kprcas.ac.in",
  department: "Computer Science",  // ← Set during OTP verification
  role: "admin"
}
localStorage.setItem("user", JSON.stringify(user))

// 2. In Manage Page - Fetch classes
const userObj = JSON.parse(localStorage.getItem("user"))
const department = userObj.department  // "Computer Science"
const response = await fetch(
  `/api/admin/classes?adminId=${user.id}&department=${department}`
)

// 3. Create Class - Include department
const data = {
  adminId: user.id,
  department: "Computer Science",  // Always from localStorage
  class_name: "CS-101",
  section: "A",
  year: 1
}
const response = await fetch("/api/admin/classes", {
  method: "POST",
  body: JSON.stringify(data)
})
```

## Security Model

### Validation at Each Step
1. **Authentication**: OTP-based login (in `/api/auth/login`)
2. **Authorization**: Department field stored in localStorage
3. **Backend Validation**: Each API route validates:
   ```typescript
   // Only allow if department matches
   .eq('department', department)
   // And operation is from correct admin
   .eq('id', resourceId)
   ```
4. **Service Role**: API uses service role to bypass RLS, but validates department in code

### Isolation Guarantee
```
CS Admin (department: "Computer Science")
├─ Can create/read/update/delete only department="Computer Science" resources
└─ Cannot see IT (department: "Information Technology") resources

IT Admin (department: "Information Technology")
├─ Can create/read/update/delete only department="Information Technology" resources
└─ Cannot see CS resources
```

## Troubleshooting

### Issue: Admin can see all departments' data
**Cause**: Department column not set in users table
**Fix**: 
```sql
UPDATE users 
SET department = 'Computer Science' 
WHERE email = 'cs-admin@kprcas.ac.in';
```

### Issue: Class creation fails with "violates unique constraint"
**Cause**: Same class name exists in same department
**Fix**: Use different class name or section/year combination

### Issue: Dashboard shows 0 students/classes
**Cause**: Admin's department doesn't match resources' department
**Fix**: Verify both admin and resources have same department value

### Issue: Manage page doesn't load classes
**Cause**: User object not in localStorage or missing department field
**Fix**: Re-login via OTP, verify user object includes department field

## Testing Checklist

- [ ] CS Admin created with department = "Computer Science"
- [ ] IT Admin created with department = "Information Technology"
- [ ] CS Admin can login via OTP
- [ ] IT Admin can login via OTP
- [ ] CS Admin sees user.department in localStorage after login
- [ ] IT Admin sees user.department in localStorage after login
- [ ] CS Admin can create class in Manage page
- [ ] IT Admin can create class in Manage page
- [ ] CS class doesn't appear in IT Admin's view
- [ ] IT class doesn't appear in CS Admin's view
- [ ] Dashboard stats show correct counts for each admin
- [ ] Subject creation works with department isolation
- [ ] Student creation assigns correct department
- [ ] Teacher assignment respects department boundaries

## Next Steps

1. **Test Department Isolation**
   - Create 2-3 test admins with different departments
   - Test full CRUD workflow for each department
   - Verify cross-department isolation

2. **Complete Remaining APIs**
   - Update teachers API with department filtering
   - Update assignments API with department filtering
   - Update students API with department filtering
   - Update OD requests API with department filtering

3. **Add Super Admin Role** (Optional)
   - Create super-admin that can see all departments
   - Add department selector to dashboard
   - Allow super-admin to manage multiple departments

4. **Improve Passwords** (Security)
   - Hash passwords with bcrypt
   - Remove plain_password column (once migration done)
   - Implement proper password reset

5. **Add Department Selection** (UX)
   - If admin belongs to multiple departments, show selector
   - Allow switching between departments
   - Remember selected department in localStorage

