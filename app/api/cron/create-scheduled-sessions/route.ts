import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// This API should be called by a cron job (e.g., Vercel Cron or external cron service)
// It checks for scheduled sessions that need to be created and emails them to teachers

function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional: add a secret token for cron job security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('⚠️ Unauthorized cron request')
      // In development, allow without auth for testing
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('🕐 Running scheduled session check...')

    // Get current time and day
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    // Calculate time 5 minutes from now (when session should start)
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60000)
    const targetTime = fiveMinutesLater.toTimeString().slice(0, 5)

    console.log(`Current day: ${currentDay}, Current time: ${currentTime}, Target time: ${targetTime}`)

    // Fetch all scheduled assignments for today that should trigger now
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
        users!teacher_id(id, name, email),
        classes!class_id(id, class_name, section, year),
        subjects!subject_id(id, subject_code, subject_name)
      `)
      .eq('auto_session_enabled', true)
      .eq('day_of_week', currentDay)
      .not('start_time', 'is', null)

    if (fetchError) {
      console.error('Error fetching scheduled assignments:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled assignments' },
        { status: 500 }
      )
    }

    if (!scheduledAssignments || scheduledAssignments.length === 0) {
      console.log('No scheduled assignments found for today')
      return NextResponse.json({
        success: true,
        message: 'No scheduled sessions to create',
        checked_at: now.toISOString(),
        current_day: currentDay,
        current_time: currentTime
      })
    }

    console.log(`Found ${scheduledAssignments.length} scheduled assignment(s) for ${currentDay}`)

    // Filter assignments that should start within the next 5 minutes
    const assignmentsToTrigger = scheduledAssignments.filter(assignment => {
      const startTime = assignment.start_time as string
      // Check if start_time is within the next 5 minutes window
      // Allow a 2-minute window before the start time to account for cron timing
      const assignmentStart = new Date(`1970-01-01T${startTime}`)
      const targetStart = new Date(`1970-01-01T${targetTime}`)
      const currentStart = new Date(`1970-01-01T${currentTime}`)
      
      const diffMinutes = (assignmentStart.getTime() - currentStart.getTime()) / 60000
      
      // Trigger if class starts in 0-7 minutes (allows some buffer)
      return diffMinutes >= 0 && diffMinutes <= 7
    })

    console.log(`${assignmentsToTrigger.length} assignment(s) ready to trigger`)

    const createdSessions = []
    const errors = []

    for (const assignment of assignmentsToTrigger) {
      try {
        const teacher = assignment.users as any
        const classData = assignment.classes as any
        const subject = assignment.subjects as any

        // Check if a session was already created recently (within last 10 minutes) to avoid duplicates
        const { data: recentSession } = await supabase
          .from('attendance_sessions')
          .select('id, created_at')
          .eq('teacher_id', assignment.teacher_id)
          .eq('class_id', assignment.class_id)
          .eq('subject_id', assignment.subject_id)
          .gte('created_at', new Date(now.getTime() - 10 * 60000).toISOString())
          .single()

        if (recentSession) {
          console.log(`Session already exists for ${teacher.name} - ${subject.subject_code} - ${classData.class_name}`)
          continue
        }

        // Generate session details
        const sessionCode = generateSessionCode()
        const qrCode = sessionCode // QR code will contain the session code
        const expiresAt = new Date(fiveMinutesLater.getTime() + 5 * 60000) // 5 minutes after start time

        // Create the session
        const { data: newSession, error: sessionError } = await supabase
          .from('attendance_sessions')
          .insert({
            teacher_id: assignment.teacher_id,
            class_id: assignment.class_id,
            subject_id: assignment.subject_id,
            session_code: sessionCode,
            qr_code: qrCode,
            status: 'active',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single()

        if (sessionError) {
          console.error(`Error creating session for ${teacher.name}:`, sessionError)
          errors.push({
            teacher: teacher.name,
            error: sessionError.message
          })
          continue
        }

        console.log(`✅ Session created for ${teacher.name} - ${subject.subject_code} - ${classData.class_name}`)

        // Send email to teacher
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/teacher/send-session-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: newSession.id })
          })

          const emailResult = await emailResponse.json()
          
          if (emailResult.success) {
            console.log(`✅ Email sent to ${teacher.email}`)
            createdSessions.push({
              teacher: teacher.name,
              email: teacher.email,
              class: `${classData.class_name} ${classData.section || ''}`,
              subject: `${subject.subject_code} - ${subject.subject_name}`,
              session_code: sessionCode,
              expires_at: expiresAt.toISOString()
            })
          } else {
            console.error(`Failed to send email to ${teacher.email}:`, emailResult.error)
            errors.push({
              teacher: teacher.name,
              error: `Email failed: ${emailResult.error}`
            })
          }
        } catch (emailError) {
          console.error(`Error sending email to ${teacher.email}:`, emailError)
          errors.push({
            teacher: teacher.name,
            error: `Email exception: ${emailError instanceof Error ? emailError.message : 'Unknown'}`
          })
        }

      } catch (error) {
        console.error('Error processing assignment:', error)
        errors.push({
          assignment_id: assignment.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled session check completed`,
      checked_at: now.toISOString(),
      current_day: currentDay,
      current_time: currentTime,
      total_scheduled: scheduledAssignments.length,
      triggered: assignmentsToTrigger.length,
      created: createdSessions.length,
      sessions: createdSessions,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ Error in scheduled session cron:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
