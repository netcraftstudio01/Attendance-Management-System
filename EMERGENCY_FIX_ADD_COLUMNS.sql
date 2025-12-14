-- ═══════════════════════════════════════════════════════════════════════
-- EMERGENCY FIX: Add Missing Department Columns
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Create NEW query
-- 4. Paste this entire script
-- 5. Click "Execute"
-- 6. Wait for success message
-- 
-- ═══════════════════════════════════════════════════════════════════════

SELECT '🔧 ADDING MISSING DEPARTMENT COLUMNS' as info;

-- Add department column to classes table if it doesn't exist
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';

-- Update the UNIQUE constraint on classes table
-- First, drop the old constraint if it exists
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_class_name_section_year_key CASCADE;

-- Add the new constraint with department
ALTER TABLE classes 
ADD CONSTRAINT classes_class_name_section_year_department_key 
UNIQUE(class_name, section, year, department);

SELECT '✅ Classes table updated' as status;

-- Add department column to subjects table if it doesn't exist
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';

-- Update the UNIQUE constraint on subjects table
-- First, drop the old constraint if it exists
ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_subject_code_key CASCADE;

-- Add the new constraint with department
ALTER TABLE subjects 
ADD CONSTRAINT subjects_subject_code_department_key 
UNIQUE(subject_code, department);

SELECT '✅ Subjects table updated' as status;

-- Add department column to students table if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General';

SELECT '✅ Students table updated' as status;

-- Verify all columns exist
SELECT 'Verification Results:' as info;

SELECT COUNT(*) as classes_with_department_column
FROM information_schema.columns
WHERE table_name = 'classes' AND column_name = 'department';

SELECT COUNT(*) as subjects_with_department_column
FROM information_schema.columns
WHERE table_name = 'subjects' AND column_name = 'department';

SELECT COUNT(*) as students_with_department_column
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'department';

SELECT '✅ ALL MIGRATIONS COMPLETE!' as final_status;
