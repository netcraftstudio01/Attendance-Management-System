import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: Debug API to check teacher sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacher_id")

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacher_id is required" },
        { status: 400 }
      )
    }

    // Check if teacher exists
    const { data: teacher, error: teacherError } = await supabase
      .from("users")
      .select("*")
      .eq("id", teacherId)
      .single()

    // Check teacher assignments
    const { data: assignments } = await supabase
      .from("teacher_subjects")
      .select(`
        *,
        classes (class_name, section),
        subjects (subject_name, subject_code)
      `)
      .eq("teacher_id", teacherId)

    // Check all sessions for this teacher
    const { data: allSessions } = await supabase
      .from("attendance_sessions")
      .select(`
        *,
        classes (class_name, section),
        subjects (subject_name, subject_code)
      `)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    // Check recent sessions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentSessions } = await supabase
      .from("attendance_sessions")
      .select(`
        *,
        classes (class_name, section),
        subjects (subject_name, subject_code)
      `)
      .eq("teacher_id", teacherId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })

    return NextResponse.json({
      success: true,
      debug_data: {
        teacher_exists: !!teacher,
        teacher_info: teacher ? { id: teacher.id, name: teacher.name, email: teacher.email } : null,
        teacher_error: teacherError?.message,
        assignments_count: assignments?.length || 0,
        assignments: assignments,
        all_sessions_count: allSessions?.length || 0,
        all_sessions: allSessions?.slice(0, 5), // Show first 5
        recent_sessions_count: recentSessions?.length || 0,
        recent_sessions: recentSessions,
        query_info: {
          teacher_id: teacherId,
          seven_days_ago: sevenDaysAgo.toISOString()
        }
      }
    })

  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch debug data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
