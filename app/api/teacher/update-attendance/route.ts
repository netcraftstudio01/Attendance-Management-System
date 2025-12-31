import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface UpdateAttendanceRequest {
  sessionId: string
  studentId: string
  status: 'present' | 'absent' | 'late' | 'on_duty'
  notes?: string
  teacherId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateAttendanceRequest = await request.json()
    const { sessionId, studentId, status, notes, teacherId } = body

    // Validation
    if (!sessionId || !studentId || !status || !teacherId) {
      return NextResponse.json(
        { error: 'Session ID, student ID, status, and teacher ID are required' },
        { status: 400 }
      )
    }

    // Verify status is valid
    const validStatuses = ['present', 'absent', 'late', 'on_duty']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch the session to verify teacher ownership
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, teacher_id, transferred_to')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify the teacher is the current handler or original teacher
    const currentHandler = session.transferred_to || session.teacher_id
    if (currentHandler !== teacherId) {
      return NextResponse.json(
        { error: 'Only the session handler can update attendance' },
        { status: 403 }
      )
    }

    // Check if attendance record exists
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single()

    let result
    if (existingRecord) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('attendance_records')
        .update({
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
          marked_by: teacherId
        })
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating attendance:', updateError)
        return NextResponse.json(
          { error: 'Failed to update attendance' },
          { status: 500 }
        )
      }
      result = updated
    } else {
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          status,
          notes: notes || null,
          marked_at: new Date().toISOString(),
          marked_by: teacherId
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating attendance record:', createError)
        return NextResponse.json(
          { error: 'Failed to create attendance record' },
          { status: 500 }
        )
      }
      result = created
    }

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status}`,
      record: result
    })
  } catch (error) {
    console.error('Error in update attendance:', error)
    return NextResponse.json(
      {
        error: 'Failed to update attendance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch all attendance records for the session with student details
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        student_id,
        status,
        notes,
        marked_at,
        marked_by,
        students (id, name, email, student_id)
      `)
      .eq('session_id', sessionId)
      .order('students(student_id)', { ascending: true })

    if (error) {
      console.error('Error fetching attendance records:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendance records' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      count: records?.length || 0
    })
  } catch (error) {
    console.error('Error in GET request:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
