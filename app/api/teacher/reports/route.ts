import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: Fetch attendance reports with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacher_id")
    const classId = searchParams.get("class_id")
    const subjectId = searchParams.get("subject_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const period = searchParams.get("period") // daily, weekly, monthly, yearly
    const format = searchParams.get("format") // json, csv, pdf

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacher_id is required" },
        { status: 400 }
      )
    }

    // Calculate date range based on period
    let startDate = dateFrom ? new Date(dateFrom) : new Date()
    let endDate = dateTo ? new Date(dateTo) : new Date()

    if (period) {
      const now = new Date()
      endDate = now

      switch (period) {
        case "daily":
          startDate = new Date(now)
          startDate.setHours(0, 0, 0, 0)
          break
        case "weekly":
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case "monthly":
          startDate = new Date(now)
          startDate.setMonth(now.getMonth() - 1)
          break
        case "yearly":
          startDate = new Date(now)
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }
    }

    // First, let's check if teacher has any sessions at all (debug)
    console.log("🔍 Debug - Searching sessions for teacher:", teacherId)
    console.log("🔍 Debug - Date range:", { startDate: startDate.toISOString(), endDate: endDate.toISOString() })
    
    const { data: allSessions, error: debugError } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("teacher_id", teacherId)
      .limit(5)
    
    console.log("🔍 Debug - Teacher has total sessions:", allSessions?.length || 0)
    if (allSessions?.length > 0) {
      console.log("🔍 Debug - Sample session:", allSessions[0])
    }

    // Fetch sessions for the teacher within date range
    let sessionsQuery = supabase
      .from("attendance_sessions")
      .select(`
        *,
        classes (id, class_name, section, year),
        subjects (id, subject_name, subject_code, credits)
      `)
      .eq("teacher_id", teacherId)

    // Only apply date filter if dates are provided, otherwise get all sessions
    if (dateFrom && dateTo) {
      sessionsQuery = sessionsQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
    } else if (period) {
      sessionsQuery = sessionsQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
    }
    
    sessionsQuery = sessionsQuery.order("created_at", { ascending: false })

    if (classId) {
      sessionsQuery = sessionsQuery.eq("class_id", classId)
    }

    if (subjectId) {
      sessionsQuery = sessionsQuery.eq("subject_id", subjectId)
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    console.log("🔍 Debug - Query returned sessions:", sessions?.length || 0)
    
    if (!sessions || sessions.length === 0) {
      // Check if teacher exists and has any assignments
      const { data: teacherCheck } = await supabase
        .from("users")
        .select("*, teacher_subjects(*, classes(class_name), subjects(subject_name))")
        .eq("id", teacherId)
        .single()
      
      console.log("🔍 Debug - Teacher check:", teacherCheck)
      
      return NextResponse.json({
        success: true,
        message: (allSessions && allSessions.length > 0) 
          ? `No sessions found for the selected date range. Teacher has ${allSessions.length} total sessions.`
          : "No attendance sessions found. Please create an attendance session first by generating a QR code in the teacher dashboard.",
        sessions: [],
        debug: {
          teacherId,
          dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          totalTeacherSessions: allSessions?.length || 0,
          hasTeacherAssignments: teacherCheck?.teacher_subjects?.length || 0
        },
        summary: {
          total_sessions: 0,
          total_students_marked: 0,
          average_attendance: 0
        }
      })
    }

    // Fetch attendance records for these sessions
    const sessionIds = sessions.map(s => s.id)
    
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select(`
        *,
        students (id, student_id, name, email),
        attendance_sessions (
          created_at,
          classes (class_name, section),
          subjects (subject_name, subject_code)
        )
      `)
      .in("session_id", sessionIds)
      .order("marked_at", { ascending: false })

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    // Calculate statistics
    const totalSessions = sessions.length
    const totalStudentsMarked = records?.length || 0
    const presentCount = records?.filter(r => r.status === "present").length || 0
    const averageAttendance = totalStudentsMarked > 0
      ? Math.round((presentCount / totalStudentsMarked) * 100)
      : 0

    // Group records by session
    const sessionRecords = sessions.map(session => {
      const sessionAttendance = records?.filter(r => r.session_id === session.id) || []
      const present = sessionAttendance.filter(r => r.status === "present").length
      const total = sessionAttendance.length

      return {
        session_id: session.id,
        session_code: session.session_code,
        date: session.created_at,
        class: `${session.classes.class_name} ${session.classes.section}`,
        subject: session.subjects.subject_name,
        subject_code: session.subjects.subject_code,
        status: session.status,
        present_count: present,
        total_count: total,
        attendance_percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        students: sessionAttendance.map(r => ({
          student_id: r.students.student_id,
          name: r.students.name,
          email: r.students.email,
          status: r.status,
          marked_at: r.marked_at
        }))
      }
    })

    // Group by student for student-wise report
    const studentWiseReport: any = {}
    
    records?.forEach(record => {
      const studentId = record.students.id
      
      if (!studentWiseReport[studentId]) {
        studentWiseReport[studentId] = {
          student_id: record.students.student_id,
          name: record.students.name,
          email: record.students.email,
          total_sessions: 0,
          present: 0,
          absent: 0,
          late: 0,
          on_duty: 0,
          attendance_percentage: 0
        }
      }

      studentWiseReport[studentId].total_sessions++
      
      if (record.status === "present") studentWiseReport[studentId].present++
      else if (record.status === "absent") studentWiseReport[studentId].absent++
      else if (record.status === "late") studentWiseReport[studentId].late++
      else if (record.status === "on_duty") studentWiseReport[studentId].on_duty++
    })

    // Calculate attendance percentage for each student
    Object.values(studentWiseReport).forEach((student: any) => {
      student.attendance_percentage = Math.round((student.present / student.total_sessions) * 100)
    })

    const response = {
      success: true,
      period: period || "custom",
      date_range: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      summary: {
        total_sessions: totalSessions,
        total_students_marked: totalStudentsMarked,
        present_count: presentCount,
        average_attendance: averageAttendance
      },
      session_wise: sessionRecords,
      student_wise: Object.values(studentWiseReport)
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error fetching reports:", error)
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}
