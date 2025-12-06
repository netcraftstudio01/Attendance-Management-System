# Admin UI Changes - Visual Guide

## Before vs After

### Assignment Form - Before
```
┌─────────────────────────────────────┐
│ Assign Teacher to Class             │
├─────────────────────────────────────┤
│ Teacher: [Select teacher ▼]         │
│ Subject: [Select subject ▼]         │
│ Class:   [Select class ▼]           │
│                                     │
│ [Cancel]  [Assign]                  │
└─────────────────────────────────────┘
```

### Assignment Form - After (With Auto-Session Feature)
```
┌─────────────────────────────────────────────────────┐
│ Assign Teacher to Class                             │
├─────────────────────────────────────────────────────┤
│ Teacher: [Select teacher ▼]                         │
│ Subject: [Select subject ▼]                         │
│ Class:   [Select class ▼]                           │
│                                                     │
│ ───────────────────────────────────────────────────│
│ 📅 Auto-Session Schedule (Optional)                │
│ ───────────────────────────────────────────────────│
│                                                     │
│ ☑ Enable automatic session creation                │
│                                                     │
│ When enabled:                                       │
│                                                     │
│ Day of Week: [Select day ▼]                        │
│              (Monday, Tuesday, Wednesday, ...)      │
│                                                     │
│ Start Time: [09:00]  End Time: [10:00]             │
│                                                     │
│ ℹ️  Session will automatically start 5 minutes     │
│    before the scheduled time and the QR code +      │
│    session code will be emailed to the teacher.     │
│                                                     │
│ [Cancel]  [Assign]                                  │
└─────────────────────────────────────────────────────┘
```

## Field Details

### 1. Enable Automatic Session Creation (Checkbox)
- **Default:** Unchecked (disabled)
- **When checked:** Shows additional fields below
- **When unchecked:** Hides schedule fields

### 2. Day of Week (Dropdown)
- **Options:** Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- **Required:** When auto-session is enabled
- **Purpose:** Defines which day the class occurs

### 3. Start Time (Time Input)
- **Format:** HH:MM (24-hour format)
- **Example:** 09:00, 14:30
- **Purpose:** When the class starts
- **Session Creation:** Session created 5 minutes before this time

### 4. End Time (Time Input)
- **Format:** HH:MM (24-hour format)
- **Example:** 10:00, 15:30
- **Purpose:** When the class ends (informational)

## User Flow

### Step 1: Admin Opens Assignment Form
```
Admin → Manage → Assignments Tab → Click "Assign Teacher"
```

### Step 2: Admin Fills Basic Info
```
1. Select Teacher: "Dr. John Doe"
2. Select Subject: "CS101 - Data Structures"
3. Select Class: "MSC A"
```

### Step 3: Admin Enables Auto-Session (Optional)
```
4. Check ☑ "Enable automatic session creation"
   
   ⬇ Additional fields appear:
   
5. Select Day: "Monday"
6. Set Start Time: "10:00"
7. Set End Time: "11:00"
```

### Step 4: Admin Clicks Assign
```
8. Click [Assign] button
   ⬇
   Assignment saved with schedule
   ⬇
   Success message appears
```

## What Happens After Assignment

### Every Monday at 9:55 AM (5 min before class)
```
┌─────────────────────────────────────────────┐
│ 🤖 Automated System                         │
├─────────────────────────────────────────────┤
│ 1. Cron job runs                            │
│ 2. Finds "Monday 10:00" assignment          │
│ 3. Creates session in database              │
│    - Session Code: ABC123                   │
│    - Expires: 10:05 AM                      │
│ 4. Generates QR code                        │
│ 5. Sends email to Dr. John Doe              │
└─────────────────────────────────────────────┘
```

### Monday at 10:00 AM (Class Time)
```
┌─────────────────────────────────────────────┐
│ 📧 Teacher's Email Inbox                    │
├─────────────────────────────────────────────┤
│ From: KPRCAS Attendance System              │
│ Subject: Attendance Session Active -        │
│          MSC A CS101                        │
│                                             │
│ Hello Dr. John Doe,                         │
│                                             │
│ Your session is now active:                 │
│                                             │
│ Class: MSC A                                │
│ Subject: CS101 - Data Structures            │
│ Session Code: ABC123                        │
│                                             │
│ [QR CODE IMAGE]                             │
│                                             │
│ ⏰ Expires: 10:05 AM                        │
│                                             │
│ Students can scan the QR code or enter      │
│ the session code to mark attendance.        │
└─────────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Regular Weekly Class
```
Assignment:
  Teacher: Prof. Smith
  Subject: JAVA Programming
  Class: BCA A
  Day: Wednesday
  Time: 14:00 - 15:00
  Auto-Session: ☑ Enabled

Result:
  Every Wednesday at 13:55 (5 min before):
  - Session created automatically
  - Email sent to Prof. Smith
  - Students can mark attendance from 14:00 - 14:05
```

### Scenario 2: Multiple Classes Same Day
```
Assignment 1:
  Teacher: Dr. Kumar
  Subject: Data Structures
  Class: MSC A
  Day: Monday
  Time: 09:00 - 10:00
  
Assignment 2:
  Teacher: Dr. Kumar
  Subject: Algorithms
  Class: MSC B
  Day: Monday
  Time: 11:00 - 12:00

Result:
  Monday 08:55 - Session 1 created & emailed
  Monday 10:55 - Session 2 created & emailed
```

### Scenario 3: No Auto-Session (Traditional)
```
Assignment:
  Teacher: Prof. Jones
  Subject: Database Systems
  Class: CS A
  Auto-Session: ☐ Disabled

Result:
  No automatic sessions
  Teacher creates sessions manually from dashboard
  (Same as before - backward compatible)
```

## Benefits

✅ **For Admins:**
- Set schedule once, works every week
- No manual session creation needed
- Automatic email delivery

✅ **For Teachers:**
- Receive QR code automatically
- No need to login before class
- Email arrives exactly when needed

✅ **For Students:**
- Consistent attendance timing
- Can prepare in advance
- No delays waiting for teacher to create session

## Important Notes

⚠️ **Session Duration:** Always 5 minutes from start time  
⚠️ **Email Timing:** 5 minutes before class starts  
⚠️ **Duplicate Prevention:** Won't create multiple sessions within 10 minutes  
⚠️ **Cron Frequency:** Checks every 3 minutes for scheduled sessions  
⚠️ **Holiday Handling:** Runs every week (no holiday detection yet)
