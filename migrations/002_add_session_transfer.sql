-- Add session transfer tracking to attendance_sessions table
ALTER TABLE attendance_sessions 
ADD COLUMN transferred_from UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN transferred_to UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN transferred_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN transfer_reason TEXT,
ADD COLUMN original_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster queries on transferred sessions
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_transferred_to 
ON attendance_sessions(transferred_to);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_original_teacher 
ON attendance_sessions(original_teacher_id);

-- Create a transfer history table for audit trail
CREATE TABLE IF NOT EXISTS session_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  transferred_from UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transferred_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transfer_reason TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on transfer history
CREATE INDEX IF NOT EXISTS idx_session_transfers_from_teacher 
ON session_transfers(transferred_from);

CREATE INDEX IF NOT EXISTS idx_session_transfers_to_teacher 
ON session_transfers(transferred_to);

CREATE INDEX IF NOT EXISTS idx_session_transfers_session 
ON session_transfers(session_id);

-- Add comment to column for clarity
COMMENT ON COLUMN attendance_sessions.original_teacher_id IS 'Original teacher who created the session (remains unchanged even after transfer)';
COMMENT ON COLUMN attendance_sessions.transferred_to IS 'Teacher currently handling this session (if transferred)';
COMMENT ON TABLE session_transfers IS 'Audit trail for all session transfers between teachers';
