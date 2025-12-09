import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/teacher/check-scheduled-sessions
 * Allows teachers to manually check and display their scheduled sessions for today
 */
export async function GET(request: NextRequest) {
  try {
    const teacherId = request.nextUrl.searchParams.get('teacher_id')

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id is required' },
        { status: 400 }
      )
    }

    // Get current day
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    // Fetch today's scheduled sessions for this teacher
    const { data: scheduledAssignments, error: fetchError } = await supabase
      .from('teacher_subjects')
      .select(`
        id,
        teacher_id,
        class_id,
        subject_id,
        day_of_week,
        start_time,
        end_time,
        auto_session_enabled,
        classes!class_id(id, class_name, section),
        subjects!subject_id(id, subject_code, subject_name)
      `)
      .eq('teacher_id', teacherId)
      .eq('day_of_week', today)
      .eq('auto_session_enabled', true)

    if (fetchError) {
      console.error('Error fetching scheduled sessions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled sessions' },
        { status: 500 }
      )
    }

    const scheduledWithTimes = (scheduledAssignments || []).map((assignment) => {
      const startTime = assignment.start_time as string
      const [hours, minutes] = startTime.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour

      return {
        ...assignment,
        display_time: `${displayHour}:${minutes} ${ampm}`,
        start_time_24h: startTime,
      }
    })

    return NextResponse.json({
      success: true,
      teacher_id: teacherId,
      today: today,
      scheduled_sessions: scheduledWithTimes,
      count: scheduledWithTimes.length,
    })
  } catch (error) {
    console.error('Error checking scheduled sessions:', error)
    return NextResponse.json(
      { error: 'Failed to check scheduled sessions' },
      { status: 500 }
    )
  }
}
