import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, teacherEmail } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    console.log('📧 Fetching session:', sessionId)

    // Fetch session details with simpler query
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError)
      return NextResponse.json(
        { error: 'Session not found', details: sessionError?.message },
        { status: 404 }
      )
    }

    console.log('✅ Session found:', session.id)

    // Fetch class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, class_name, section, year, class_email')
      .eq('id', session.class_id)
      .single()

    if (classError) {
      console.error('Error fetching class:', classError)
    }

    // Fetch subject details
    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .select('id, subject_code, subject_name')
      .eq('id', session.subject_id)
      .single()

    if (subjectError) {
      console.error('Error fetching subject:', subjectError)
    }

    // Fetch teacher details
    const { data: teacherData, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', session.teacher_id)
      .single()

    if (teacherError || !teacherData) {
      console.error('Error fetching teacher:', teacherError)
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    const teacher = teacherData

    if (!teacher?.email) {
      return NextResponse.json(
        { error: 'Teacher email not found' },
        { status: 400 }
      )
    }

    console.log('📧 Preparing to send email to:', teacher.email)
    console.log('🎯 Using Gmail account:', process.env.GMAIL_USER)
    console.log('📝 Session Code:', session.session_code)
    console.log('📚 Class:', classData?.class_name)
    console.log('� Class Email:', classData?.class_email || 'NOT SET')
    console.log('�📖 Subject:', subjectData?.subject_code)

    // Generate QR code as buffer for attachment
    let qrCodeBuffer: Buffer
    try {
      // Create a proper URL that includes the session code
      // When scanned, it will open the student attendance page with the session code pre-filled
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://attendance-system-roan-one.vercel.app'
      const qrContent = `${baseUrl}/student/attendance?session=${encodeURIComponent(session.session_code)}`
      
      console.log('📲 QR Code content:', qrContent)
      
      qrCodeBuffer = await QRCode.toBuffer(qrContent, {
        width: 400,
        margin: 3,
        errorCorrectionLevel: 'H',
        type: 'png',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (qrError) {
      console.error('Error generating QR code:', qrError)
      return NextResponse.json(
        { error: 'Failed to generate QR code' },
        { status: 500 }
      )
    }

    // Send email using Nodemailer
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('⚠️ Gmail credentials not configured')
      console.warn('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not set')
      console.warn('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set')
      return NextResponse.json(
        { 
          success: false,
          error: 'Email service not configured - missing Gmail credentials',
          session: session
        },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    console.log('📧 Preparing to send email to:', teacher.email)
    console.log('🎯 Using Gmail account:', process.env.GMAIL_USER)

    // Email HTML template
    const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
        color: white; 
        padding: 30px; 
        text-align: center; 
        border-radius: 10px 10px 0 0; 
      }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .session-box { 
        background: white; 
        border: 2px solid #667eea; 
        padding: 20px; 
        text-align: center; 
        margin: 20px 0; 
        border-radius: 8px; 
      }
      .session-code { 
        font-size: 28px; 
        font-weight: bold; 
        letter-spacing: 4px; 
        color: #667eea; 
        margin: 10px 0;
      }
      .qr-code { margin: 20px 0; }
      .info-row { 
        display: flex; 
        justify-content: space-between; 
        padding: 8px 0; 
        border-bottom: 1px solid #eee; 
      }
      .info-label { font-weight: bold; color: #666; }
      .info-value { color: #333; }
      .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      .warning { 
        background: #fff3cd; 
        border-left: 4px solid #ffc107; 
        padding: 12px; 
        margin: 20px 0; 
      }
      .success-badge {
        background: #28a745;
        color: white;
        padding: 5px 15px;
        border-radius: 20px;
        display: inline-block;
        font-size: 12px;
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>KPRCAS Attendance Session</h1>
        <p>Auto-Generated Attendance Session</p>
      </div>
      <div class="content">
        <div class="success-badge">SESSION ACTIVE</div>
        
        <h2>Hello ${teacher.name},</h2>
        <p>Your attendance session has been automatically created and is now active.</p>
        
        <div class="session-box">
          <h3 style="color: #667eea; margin-top: 0;">Session Details</h3>
          
          <div class="info-row">
            <span class="info-label">Class:</span>
            <span class="info-value">${classData?.class_name || 'N/A'} ${classData?.section || ''}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">${subjectData?.subject_code || 'N/A'} - ${subjectData?.subject_name || 'N/A'}</span>
          </div>
          
          <div class="qr-code">
            <p style="margin-bottom: 10px; color: #666;">QR Code for Students:</p>
            <img src="cid:qrcode" alt="QR Code" style="max-width: 300px; border: 2px solid #667eea; padding: 10px; background: white;">
          </div>
          
          <div class="info-row">
            <span class="info-label">Expires At:</span>
            <span class="info-value">${new Date(session.expires_at).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="warning">
          <strong>Important:</strong> This session is valid for <strong>5 minutes</strong> only. Students must scan the QR code or enter the session code before it expires.
        </div>
        
        <h3>How Students Can Mark Attendance:</h3>
        <ol>
          <li>Scan the QR code above</li>
          <li>Verify their identity with OTP sent to their email</li>
        </ol>
        
        <p>Best regards,<br>KPRCAS Attendance System</p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} KPRCAS. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`

    // Send email with QR code attachment to teacher and class
    // Build recipients list
    const recipients: string[] = []
    if (teacher.email) recipients.push(teacher.email)
    if (classData?.class_email) recipients.push(classData.class_email)

    console.log('📬 Email Recipients Being Built:')
    console.log('  - Teacher Email:', teacher.email ? '✅ ' + teacher.email : '❌ NOT AVAILABLE')
    console.log('  - Class Email:', classData?.class_email ? '✅ ' + classData.class_email : '❌ NOT SET')
    console.log('  - Final Recipients List:', recipients)

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email recipients found' },
        { status: 400 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    try {
      const sentResults = []
      
      // Send email to teacher
      if (teacher.email) {
        console.log('📧 Sending email to teacher:', teacher.email)
        const teacherMailOptions = {
          from: `"KPRCAS Attendance System" <${process.env.GMAIL_USER}>`,
          to: teacher.email,
          subject: `Attendance Session Active - ${classData?.class_name || 'Class'} ${subjectData?.subject_code || 'Subject'}`,
          html: htmlTemplate,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrCodeBuffer,
              cid: 'qrcode'
            }
          ]
        }
        
        try {
          const teacherInfo = await transporter.sendMail(teacherMailOptions)
          console.log('✅ Teacher email sent successfully!')
          console.log('📧 Teacher Email ID:', teacherInfo.messageId)
          sentResults.push({ to: teacher.email, status: 'success', messageId: teacherInfo.messageId })
        } catch (teacherEmailError) {
          console.error('❌ Error sending email to teacher:', teacherEmailError)
          sentResults.push({ to: teacher.email, status: 'failed', error: teacherEmailError instanceof Error ? teacherEmailError.message : 'Unknown error' })
        }
      }
      
      // Send email to class separately
      if (classData?.class_email) {
        console.log('📧 Sending email to class:', classData.class_email)
        const classMailOptions = {
          from: `"KPRCAS Attendance System" <${process.env.GMAIL_USER}>`,
          to: classData.class_email,
          subject: `Attendance Session Active - ${classData?.class_name || 'Class'} ${subjectData?.subject_code || 'Subject'}`,
          html: htmlTemplate,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrCodeBuffer,
              cid: 'qrcode'
            }
          ]
        }
        
        try {
          const classInfo = await transporter.sendMail(classMailOptions)
          console.log('✅ Class email sent successfully!')
          console.log('📧 Class Email ID:', classInfo.messageId)
          sentResults.push({ to: classData.class_email, status: 'success', messageId: classInfo.messageId })
        } catch (classEmailError) {
          console.error('❌ Error sending email to class:', classEmailError)
          sentResults.push({ to: classData.class_email, status: 'failed', error: classEmailError instanceof Error ? classEmailError.message : 'Unknown error' })
        }
      }

      console.log('📨 All email sending attempts completed')
      console.log('Results:', sentResults)

      return NextResponse.json({
        success: true,
        message: 'Session emails sent successfully',
        teacher_email: teacher.email,
        class_email: classData?.class_email,
        recipients: recipients,
        session_code: session.session_code,
        sent_results: sentResults
      })
    } catch (emailError) {
      console.error('❌ Critical error in email sending process:', emailError)
      console.error('Error details:', {
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        code: emailError instanceof Error && 'code' in emailError ? (emailError as any).code : undefined
      })
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to send email',
          details: emailError instanceof Error ? emailError.message : 'Unknown error',
          teacher_email: teacher.email,
          class_email: classData?.class_email
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error sending session email:', error)
    return NextResponse.json(
      { error: 'Failed to send session email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
