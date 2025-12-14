# Department-Based Admin Structure - Quick Reference

## 📋 Admin Credentials by Department

### 1. Computer Science Department
```
Email: cs-admin@kprcas.ac.in
Password: CS@Admin123
Department: Computer Science
Manages: CS classes, CS subjects, CS students, CS teachers only
```
**What CS Admin can see:**
- ✅ CS-101, CS-102, CS-103 (classes)
- ✅ Java, Python, DSA (subjects)
- ✅ Students assigned to CS classes
- ✅ Teachers assigned to CS classes
- ❌ CANNOT see IT, MSC, or BCA data

---

### 2. Information Technology Department
```
Email: it-admin@kprcas.ac.in
Password: IT@Admin123
Department: Information Technology
Manages: IT classes, IT subjects, IT students, IT teachers only
```
**What IT Admin can see:**
- ✅ IT-101, IT-102, IT-103 (classes)
- ✅ Networks, Security, OS (subjects)
- ✅ Students assigned to IT classes
- ✅ Teachers assigned to IT classes
- ❌ CANNOT see CS, MSC, or BCA data

---

### 3. Master of Science Department
```
Email: msc-admin@kprcas.ac.in
Password: MSC@Admin123
Department: Master of Science
Manages: MSC classes, MSC subjects, MSC students, MSC teachers only
```

---

### 4. Bachelor of Computer Applications Department
```
Email: bca-admin@kprcas.ac.in
Password: BCA@Admin123
Department: Bachelor of Computer Applications
Manages: BCA classes, BCA subjects, BCA students, BCA teachers only
```

---

### 5. System Administrator (Full Access)
```
Email: admin@kprcas.ac.in
Password: Admin@123
Department: Administration
Manages: Full system access
```

---

## 🔐 Key Features

### Department Isolation
Each admin operates in complete isolation:

```
┌─────────────────────────────────────────┐
│    CS Admin Dashboard                   │
├─────────────────────────────────────────┤
│ Classes:                                │
│   ✓ CS-101, CS-102, CS-103             │
│   ✗ IT-101 (hidden)                    │
│                                         │
│ Subjects:                               │
│   ✓ Java, Python, DSA                  │
│   ✗ Networks (hidden)                  │
│                                         │
│ Students:                               │
│   ✓ Only students in CS classes        │
│   ✗ IT students (hidden)               │
│                                         │
│ Teachers:                               │
│   ✓ Only teachers assigned to CS       │
│   ✗ IT teachers (hidden)               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    IT Admin Dashboard                   │
├─────────────────────────────────────────┤
│ Classes:                                │
│   ✓ IT-101, IT-102, IT-103             │
│   ✗ CS-101 (hidden)                    │
│                                         │
│ Subjects:                               │
│   ✓ Networks, Security, OS             │
│   ✗ Java (hidden)                      │
│                                         │
│ Students:                               │
│   ✓ Only students in IT classes        │
│   ✗ CS students (hidden)               │
│                                         │
│ Teachers:                               │
│   ✓ Only teachers assigned to IT       │
│   ✗ CS teachers (hidden)               │
└─────────────────────────────────────────┘
```

### How Department Isolation Works

1. **Database Level**
   - All classes, subjects, students, teachers have `department` field
   - UNIQUE constraints include department
   - Same class name can exist in different departments

2. **API Level**
   - Service role API validates `admin.department` on every operation
   - GET requests filtered by department
   - POST/PUT/DELETE only work for admin's department

3. **Frontend Level**
   - Admin's department stored in localStorage
   - Passed with every API request
   - Dashboard only shows admin's department data

---

## 🚀 How to Use

### For CS Admin
```
1. Login: cs-admin@kprcas.ac.in (OTP)
2. Go to Admin → Manage
3. Create CS-101, CS-102, etc.
4. Add Java, Python, DSA subjects
5. Assign CS teachers to classes
6. Add students to CS classes
7. IT admin data is completely hidden
```

### For IT Admin
```
1. Login: it-admin@kprcas.ac.in (OTP)
2. Go to Admin → Manage
3. Create IT-101, IT-102, etc.
4. Add Networks, Security, OS subjects
5. Assign IT teachers to classes
6. Add students to IT classes
7. CS admin data is completely hidden
```

### Adding More Departments

Edit `MASTER_DATABASE_SETUP.sql` and add:

```sql
INSERT INTO users (
  email,
  name,
  username,
  plain_password,
  user_type,
  role,
  department,
  phone,
  status
) VALUES (
  'yourprefix-admin@kprcas.ac.in',
  'Your Department Admin',
  'yourprefix_admin',
  'YourPass123',
  'admin',
  'admin',
  'Your Department Name',
  '+91-9000000005',
  'active'
);
```

---

## ✅ Testing Department Isolation

### Test 1: CS Admin Creates Classes
1. Login as cs-admin@kprcas.ac.in
2. Create class "CS-101"
3. ✅ Should succeed

### Test 2: IT Admin Cannot See CS Classes
1. Login as it-admin@kprcas.ac.in (new tab)
2. Go to Admin → Manage → Classes
3. ✅ CS-101 should NOT appear

### Test 3: IT Admin Creates Classes
1. Still logged in as it-admin@kprcas.ac.in
2. Create class "IT-101"
3. ✅ Should succeed

### Test 4: CS Admin Cannot See IT Classes
1. Go back to CS admin tab
2. Refresh Admin → Manage → Classes
3. ✅ IT-101 should NOT appear
4. ✅ Only CS-101 visible

### Test 5: Subject Isolation
1. CS Admin creates "Java" (CS-Java)
2. IT Admin creates "Java" (IT-Java)
3. ✅ Both succeed (different departments)
4. ✅ Each admin sees only their "Java"

---

## 📊 Database Structure

### Users Table
```sql
id | email | name | department | role
---|-------|------|------------|-----
1  | cs-admin@kprcas.ac.in | Computer Science Admin | Computer Science | admin
2  | it-admin@kprcas.ac.in | IT Admin | Information Technology | admin
3  | admin@kprcas.ac.in | System Admin | Administration | admin
```

### Classes Table
```sql
id | class_name | section | year | department
---|------------|---------|------|------------
1  | CS-101     | A       | 1    | Computer Science
2  | IT-101     | A       | 1    | Information Technology
```

### Subjects Table
```sql
id | subject_code | subject_name | department
---|--------------|--------------|---
1  | CS-JAVA      | Java         | Computer Science
2  | IT-JAVA      | Java         | Information Technology
```

Notice: Same subject code can exist in different departments!

---

## 🔒 Security Notes

- ✅ Department isolation enforced at API level
- ✅ Service role validates all operations
- ✅ Cannot bypass department restrictions
- ✅ Complete data separation per department
- ✅ OTP-based authentication (secure)
- ⚠️ Passwords are for reference only

---

## 🎯 Best Practices

1. **When Creating Admins**
   - Always specify the department
   - Use descriptive email addresses (e.g., cs-admin, it-admin)
   - Department should match organizational structure

2. **When Creating Classes/Subjects**
   - Department is automatically set from admin's department
   - Don't worry about cross-department conflicts
   - Can use same names in different departments

3. **When Assigning Teachers**
   - Teachers must be in same department
   - Assignment only shows teachers from admin's department
   - Cannot assign IT teacher to CS class

4. **When Adding Students**
   - Students inherit class's department
   - Only admins from that department can see them
   - Cannot move students between departments

---

## 📞 Need More Admins?

Run this SQL in Supabase (update values):

```sql
INSERT INTO users (
  email,
  name,
  username,
  plain_password,
  user_type,
  role,
  department,
  phone,
  status
) VALUES (
  'engineering-admin@kprcas.ac.in',
  'Engineering Department Admin',
  'eng_admin',
  'Eng@Admin123',
  'admin',
  'admin',
  'Engineering',
  '+91-9000000006',
  'active'
);
```

Then test:
1. Login with new email
2. Create classes/subjects
3. Verify other admins cannot see the data

---

**System Version:** Department Isolation v1.0  
**Last Updated:** December 2025  
**Status:** ✅ Production Ready
