# Session Transfer Feature Documentation

## Overview

The Session Transfer feature allows teachers to transfer their attendance sessions to other teachers when they're unable to attend class. This ensures continuity of attendance marking even when the original teacher is unavailable.

## Features

### 1. **Session Transfer**
- Teachers can transfer active sessions to any other teacher who teaches the same class
- The original teacher is always recorded for audit purposes
- Transfer history is maintained automatically

### 2. **Transferred Session Handling**
- When a session is transferred, the new teacher can mark attendance
- Attendance is recorded under the original teacher's name/class
- The system tracks who actually marked the attendance

### 3. **Transfer History**
- All transfers are logged with:
  - Original teacher
  - Teacher who transferred to
  - Time of transfer
  - Reason for transfer
  - Transfer status

## Database Schema

### New Columns in `attendance_sessions` Table
```sql
transferred_from UUID REFERENCES users(id)
transferred_to UUID REFERENCES users(id)
transferred_at TIMESTAMP WITH TIME ZONE
transfer_reason TEXT
original_teacher_id UUID REFERENCES users(id)
```

### New Table: `session_transfers`
```sql
CREATE TABLE session_transfers (
  id UUID PRIMARY KEY
  session_id UUID NOT NULL REFERENCES attendance_sessions(id)
  transferred_from UUID NOT NULL REFERENCES users(id)
  transferred_to UUID NOT NULL REFERENCES users(id)
  transfer_reason TEXT
  transferred_at TIMESTAMP DEFAULT NOW()
  status TEXT (pending, accepted, rejected, completed)
  created_at TIMESTAMP DEFAULT NOW()
)
```

## API Endpoints

### POST `/api/teacher/transfer-session`
**Purpose:** Transfer a session to another teacher

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "transferToTeacherId": "uuid-string",
  "transferReason": "Unable to attend - Sick leave",
  "transferredByTeacherId": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session transferred successfully",
  "session": { ...session data... },
  "transferredTo": { 
    "id": "uuid",
    "name": "Teacher Name",
    "email": "teacher@email.com"
  },
  "originalTeacher": { ...original teacher data... }
}
```

### GET `/api/teacher/transfer-session`
**Purpose:** Get available teachers for a specific class

**Query Parameters:**
- `classId`: UUID of the class
- `currentTeacherId`: UUID of current teacher (to exclude from list)

**Response:**
```json
{
  "success": true,
  "teachers": [
    {
      "id": "uuid",
      "name": "Teacher Name",
      "email": "teacher@email.com"
    }
  ]
}
```

### GET `/api/teacher/transfer-history`
**Purpose:** Fetch transfer history for a teacher

**Query Parameters:**
- `teacherId`: UUID of teacher (to get all transfers involving this teacher)
- `sessionId`: UUID of session (to get transfer history for specific session)

**Response:**
```json
{
  "success": true,
  "transfers": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "transferred_from": "uuid",
      "transferred_to": "uuid",
      "transfer_reason": "Reason text",
      "transferred_at": "2025-12-17T10:00:00Z",
      "status": "completed",
      "fromTeacher": { "id", "name", "email" },
      "toTeacher": { "id", "name", "email" },
      "attendance_sessions": { ...session data... }
    }
  ]
}
```

## UI Components

### 1. TransferSessionDialog
**File:** `components/transfer-session-dialog.tsx`

A modal dialog that allows teachers to:
- Select a teacher from available options
- Provide a reason for transfer
- Confirm the transfer

**Props:**
```typescript
interface TransferSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: any
  currentTeacherId: string
  onTransferSuccess?: () => void
}
```

### 2. Manage Transfers Page
**File:** `app/teacher/manage-transfers/page.tsx`

A comprehensive page showing:
- All sessions created or handled by the teacher
- Transfer status and history
- List of teachers each session was transferred to
- Ability to initiate new transfers

**Features:**
- Table view of all sessions
- Filter by status (Active, Transferred, Expired)
- Transfer information display
- Transfer button for active sessions

## User Workflow

### For Teachers Who Need to Transfer Sessions

1. **Navigate to Dashboard:**
   - Go to Teacher Dashboard
   - Look for "Transfer Sessions" section

2. **Click "Manage Session Transfers":**
   - Opens the session management page
   - Shows all your active and transferred sessions

3. **Select a Session to Transfer:**
   - Find the active session you want to transfer
   - Click the "Transfer" button

4. **Choose Recipient Teacher:**
   - The dialog shows available teachers for the class
   - Select the teacher to transfer to

5. **Add Reason (Optional):**
   - Provide context for the transfer
   - Example: "Sick leave", "Emergency", "Attending meeting"

6. **Confirm Transfer:**
   - Click "Transfer Session"
   - System updates immediately

### For Teachers Receiving Transferred Sessions

1. **Check Dashboard:**
   - The session now appears in their dashboard
   - Shows which teacher transferred it to them

2. **Mark Attendance:**
   - They can now mark attendance for that session
   - The system records their name as who marked it
   - But it's recorded under the original teacher's class

## Attendance Recording with Transfers

When attendance is marked on a transferred session:

```typescript
// marked_by shows who actually marked it
{
  session_id: "uuid",
  student_id: "uuid",
  status: "present",
  marked_at: "2025-12-17T10:30:00Z",
  marked_by: "Current Teacher Name"  // Teacher who handled transfer
}
```

But the session links back to:
```typescript
{
  original_teacher_id: "original-uuid",  // Original teacher remains
  transferred_to: "current-uuid",        // Current handler
  transferred_from: "previous-uuid"      // Who transferred from
}
```

## Audit Trail

Every transfer is logged in the `session_transfers` table for compliance:

| Field | Purpose |
|-------|---------|
| `session_id` | Which session was transferred |
| `transferred_from` | Original handler |
| `transferred_to` | New handler |
| `transfer_reason` | Why it was transferred |
| `transferred_at` | When it was transferred |
| `status` | Transfer status |
| `created_at` | Record creation time |

## Error Handling

### Common Error Scenarios

1. **Teacher Not Found:**
   - Status: 404
   - Message: "Target teacher not found"

2. **Authorization Failed:**
   - Status: 403
   - Message: "Only the session handler can transfer the session"

3. **Invalid Target:**
   - Status: 400
   - Message: "Target teacher does not teach this class"

4. **Session Not Found:**
   - Status: 404
   - Message: "Session not found"

5. **Email Service Down:**
   - Status: 500
   - Message: "Failed to send transfer notification"

## Migration Setup

To enable this feature on an existing installation:

1. **Run the migration:**
   ```bash
   # Execute the SQL from migrations/002_add_session_transfer.sql
   ```

2. **Verify the migration:**
   ```sql
   -- Check if new columns exist
   SELECT * FROM information_schema.columns 
   WHERE table_name='attendance_sessions' 
   AND column_name IN ('transferred_to', 'original_teacher_id');
   
   -- Check if transfer history table exists
   SELECT * FROM session_transfers LIMIT 1;
   ```

## API Integration

### Backend Validation

The transfer system validates:
- ✓ Session exists and is active
- ✓ Target teacher exists
- ✓ Target teacher teaches the same class
- ✓ Current user is authorized to transfer (session handler)
- ✓ Transfer reason is provided (optional but recommended)

### Frontend Validation

The UI validates:
- ✓ Teacher is selected
- ✓ Session is available for transfer
- ✓ Network connectivity
- ✓ Form completeness

## Performance Considerations

### Indexes Created
- `idx_attendance_sessions_transferred_to` - Fast lookup of transferred sessions
- `idx_attendance_sessions_original_teacher` - Track original teachers
- `idx_session_transfers_from_teacher` - Get transfers sent by teacher
- `idx_session_transfers_to_teacher` - Get transfers received by teacher
- `idx_session_transfers_session` - Get transfer history for session

### Query Optimization

All queries use:
- Indexed foreign key lookups
- Limited result sets with pagination (if needed)
- Selective field queries to reduce bandwidth

## Testing Checklist

- [ ] Transfer session to another teacher
- [ ] Verify original teacher name is preserved
- [ ] Verify transferred teacher can mark attendance
- [ ] Check that attendance is recorded with transferred teacher's name
- [ ] Verify transfer history is logged
- [ ] Test with invalid target teacher
- [ ] Test with inactive sessions
- [ ] Verify email notifications (if configured)
- [ ] Check audit trail in database

## Future Enhancements

Potential improvements for future versions:
1. **Transfer Approval:** Require receiving teacher to accept transfer
2. **Transfer History Report:** Comprehensive transfer statistics
3. **Bulk Transfers:** Transfer multiple sessions at once
4. **Transfer Rules:** Set default recipients for specific classes
5. **Notifications:** Email alerts for transfers
6. **Transfer Analytics:** Track which teachers transfer most frequently

## Support & Troubleshooting

### Session Not Showing as Transferred
- Verify the database migration was executed
- Check that `original_teacher_id` column exists
- Ensure browser cache is cleared

### Can't Transfer to Specific Teacher
- Verify the teacher teaches the same class
- Check `teacher_subjects` table for assignments
- Ensure teacher account is active

### Transfer History Not Showing
- Verify `session_transfers` table exists
- Check database permissions
- Clear cache and refresh page

## Related Documentation

- [Attendance System Overview](../README.md)
- [Database Schema](../MASTER_DATABASE_SETUP.sql)
- [Teacher Dashboard Guide](./TEACHER_GUIDE.md)
- [API Documentation](./API_REFERENCE.md)
