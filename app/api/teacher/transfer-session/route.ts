import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface TransferRequest {
  sessionId: string
  transferToTeacherId: string
  transferReason?: string
  transferredByTeacherId: string
}

// POST: Transfer a session to another teacher
export async function POST(request: NextRequest) {
  try {
    const body: TransferRequest = await request.json()
    const { sessionId, transferToTeacherId, transferReason, transferredByTeacherId } = body

    // Validation
    if (!sessionId || !transferToTeacherId || !transferredByTeacherId) {
      return NextResponse.json(
        { error: 'Session ID, transfer to teacher ID, and transferred by teacher ID are required' },
        { status: 400 }
      )
    }

    // Fetch current session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select(`
        id,
        teacher_id,
        transferred_to,
        original_teacher_id,
        class_id,
        subject_id,
        classes (class_name, section),
        subjects (subject_code, subject_name)
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify authorization - only the current session handler or original teacher can transfer
    const currentHandler = session.transferred_to || session.teacher_id
    if (currentHandler !== transferredByTeacherId) {
      return NextResponse.json(
        { error: 'Only the session handler can transfer the session' },
        { status: 403 }
      )
    }

    // Verify the target teacher teaches this class
    const { data: targetTeacherAssignment, error: checkError } = await supabase
      .from('teacher_subjects')
      .select('id')
      .eq('teacher_id', transferToTeacherId)
      .eq('class_id', session.class_id)
      .single()

    if (checkError || !targetTeacherAssignment) {
      return NextResponse.json(
        { error: 'Target teacher does not teach this class' },
        { status: 400 }
      )
    }

    // Verify target teacher exists
    const { data: targetTeacher, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', transferToTeacherId)
      .single()

    if (teacherError || !targetTeacher) {
      return NextResponse.json(
        { error: 'Target teacher not found' },
        { status: 404 }
      )
    }

    // Store original teacher if this is first transfer
    const originalTeacherId = session.original_teacher_id || session.teacher_id

    // Update session with transfer info
    const { data: updatedSession, error: updateError } = await supabase
      .from('attendance_sessions')
      .update({
        transferred_to: transferToTeacherId,
        transferred_from: session.teacher_id,
        transferred_at: new Date().toISOString(),
        transfer_reason: transferReason || 'Session transferred between teachers',
        original_teacher_id: originalTeacherId
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json(
        { error: 'Failed to transfer session' },
        { status: 500 }
      )
    }

    // Record transfer in history
    const { error: historyError } = await supabase
      .from('session_transfers')
      .insert({
        session_id: sessionId,
        transferred_from: transferredByTeacherId,
        transferred_to: transferToTeacherId,
        transfer_reason: transferReason,
        status: 'completed'
      })

    if (historyError) {
      console.error('Error recording transfer history:', historyError)
    }

    // Fetch the original teacher for email
    const { data: originalTeacher } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', originalTeacherId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Session transferred successfully',
      session: updatedSession,
      transferredTo: targetTeacher,
      originalTeacher: originalTeacher
    })
  } catch (error) {
    console.error('Error in session transfer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to transfer session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: Fetch available teachers for a specific class with department info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('classId')
    const currentTeacherId = searchParams.get('currentTeacherId')

    if (!classId || !currentTeacherId) {
      return NextResponse.json(
        { error: 'Class ID and current teacher ID are required' },
        { status: 400 }
      )
    }

    // Get current teacher's info to find their department
    const { data: currentTeacher, error: currentTeacherError } = await supabase
      .from('users')
      .select('id, department')
      .eq('id', currentTeacherId)
      .single()

    if (currentTeacherError) {
      console.error('Error fetching current teacher:', currentTeacherError)
    }

    // Get all teachers for this class
    const { data: teachersAssignments, error: assignmentsError } = await supabase
      .from('teacher_subjects')
      .select(`
        teacher_id,
        users (id, name, email, department)
      `)
      .eq('class_id', classId)
      .neq('teacher_id', currentTeacherId)

    if (assignmentsError) {
      console.error('Error fetching teachers:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch available teachers' },
        { status: 500 }
      )
    }

    // Extract unique teachers and format response
    const uniqueTeachersMap = new Map()
    teachersAssignments?.forEach((assignment: any) => {
      const teacher = assignment.users
      if (teacher && !uniqueTeachersMap.has(teacher.id)) {
        uniqueTeachersMap.set(teacher.id, {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          department: teacher.department || 'Not specified'
        })
      }
    })

    const teachers = Array.from(uniqueTeachersMap.values())

    return NextResponse.json({
      success: true,
      teachers,
      currentDepartment: currentTeacher?.department
    })
  } catch (error) {
    console.error('Error in GET request:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch teachers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
