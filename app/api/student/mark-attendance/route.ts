import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST: Mark student attendance after OTP verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, session_id } = body

    if (!email || !session_id) {
      return NextResponse.json(
        { error: "Email and session_id are required" },
        { status: 400 }
      )
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("email", email)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from("attendance_sessions")
      .select(`
        *,
        classes (class_name, section),
        subjects (subject_name)
      `)
      .eq("id", session_id)
      .eq("status", "active")
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 404 }
      )
    }

    // Get the current handler of the session (for recording who marked the attendance)
    const currentTeacherId = session.transferred_to || session.teacher_id
    
    // Fetch teacher info for reference
    const { data: teacherData } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", currentTeacherId)
      .single()

    // Verify OTP was verified
    const { data: otpRecord, error: otpError } = await supabase
      .from("attendance_otps")
      .select("*")
      .eq("email", email)
      .eq("session_id", session_id)
      .eq("verified", true)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: "OTP not verified. Please verify OTP first." },
        { status: 403 }
      )
    }

    // Check if attendance already marked
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("session_id", session_id)
      .eq("student_id", student.id)
      .single()

    if (existingRecord) {
      return NextResponse.json(
        { error: "Attendance already marked for this session" },
        { status: 400 }
      )
    }

    // Mark attendance with teacher info (show who marked it)
    const { data: attendanceRecord, error: recordError } = await supabase
      .from("attendance_records")
      .insert({
        session_id,
        student_id: student.id,
        status: "present",
        otp_verified: true,
        marked_at: new Date().toISOString(),
        marked_by: teacherData?.name || "Teacher"
      })
      .select()
      .single()

    if (recordError) {
      console.error("Error marking attendance:", recordError)
      return NextResponse.json(
        { error: "Failed to mark attendance" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully!",
      record: {
        student_name: student.name,
        class: `${session.classes.class_name} ${session.classes.section}`,
        subject: session.subjects.subject_name,
        marked_at: attendanceRecord.marked_at,
        status: "present"
      }
    })
  } catch (error: any) {
    console.error("Error marking attendance:", error)
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    )
  }
}

// GET: Get student's attendance history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const studentId = searchParams.get("student_id")

    if (!email && !studentId) {
      return NextResponse.json(
        { error: "Email or student_id is required" },
        { status: 400 }
      )
    }

    // Get student
    let query = supabase.from("students").select("*")
    
    if (email) {
      query = query.eq("email", email)
    } else if (studentId) {
      query = query.eq("id", studentId)
    }

    const { data: student, error: studentError } = await query.single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      )
    }

    // Get attendance records
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select(`
        *,
        attendance_sessions (
          created_at,
          classes (class_name, section),
          subjects (subject_name, subject_code)
        )
      `)
      .eq("student_id", student.id)
      .order("marked_at", { ascending: false })

    if (recordsError) {
      return NextResponse.json(
        { error: recordsError.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalClasses = records.length
    const presentCount = records.filter(r => r.status === "present").length
    const absentCount = records.filter(r => r.status === "absent").length
    const lateCount = records.filter(r => r.status === "late").length
    const attendancePercentage = totalClasses > 0 
      ? Math.round((presentCount / totalClasses) * 100) 
      : 0

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        student_id: student.student_id,
        name: student.name,
        email: student.email
      },
      statistics: {
        total_classes: totalClasses,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        attendance_percentage: attendancePercentage
      },
      records
    })
  } catch (error: any) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}
