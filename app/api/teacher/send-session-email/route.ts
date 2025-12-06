import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch session details with teacher, class, and subject info
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select(`
        id,
        session_code,
        qr_code,
        status,
        expires_at,
        teacher_id,
        class_id,
        subject_id,
        users!teacher_id(id, name, email),
        classes!class_id(id, class_name, section, year),
        subjects!subject_id(id, subject_code, subject_name)
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError)
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const teacher = session.users as any
    const classData = session.classes as any
    const subject = session.subjects as any

    if (!teacher?.email) {
      return NextResponse.json(
        { error: 'Teacher email not found' },
        { status: 400 }
      )
    }

    // Generate QR code as data URL
    let qrCodeDataUrl = ''
    try {
      // Create the QR code data (session code)
      qrCodeDataUrl = await QRCode.toDataURL(session.session_code, {
        width: 300,
        margin: 2,
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
      return NextResponse.json(
        { 
          success: false,
          error: 'Email service not configured',
          session: session
        },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Email HTML template
    const htmlTemplate = `
<!DOCTYPE html>
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
        <h1>🏫 KPRCAS Attendance Session</h1>
        <p>Auto-Generated Attendance Session</p>
      </div>
      <div class="content">
        <div class="success-badge">✓ SESSION ACTIVE</div>
        
        <h2>Hello ${teacher.name},</h2>
        <p>Your attendance session has been automatically created and is now active.</p>
        
        <div class="session-box">
          <h3 style="color: #667eea; margin-top: 0;">Session Details</h3>
          
          <div class="info-row">
            <span class="info-label">Class:</span>
            <span class="info-value">${classData.class_name} ${classData.section || ''}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Subject:</span>
            <span class="info-value">${subject.subject_code} - ${subject.subject_name}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Session Code:</span>
            <span class="info-value session-code">${session.session_code}</span>
          </div>
          
          <div class="qr-code">
            <p style="margin-bottom: 10px; color: #666;">QR Code for Students:</p>
            <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 300px; border: 2px solid #667eea; padding: 10px; background: white;">
          </div>
          
          <div class="info-row">
            <span class="info-label">Expires At:</span>
            <span class="info-value">${new Date(session.expires_at).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="warning">
          ⏰ <strong>Important:</strong> This session is valid for <strong>5 minutes</strong> only. Students must scan the QR code or enter the session code before it expires.
        </div>
        
        <h3>How Students Can Mark Attendance:</h3>
        <ol>
          <li>Scan the QR code above, OR</li>
          <li>Enter the session code manually: <strong>${session.session_code}</strong></li>
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

    // Send email
    const mailOptions = {
      from: `"KPRCAS Attendance System" <${process.env.GMAIL_USER}>`,
      to: teacher.email,
      subject: `Attendance Session Active - ${classData.class_name} ${subject.subject_code}`,
      html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions)
    console.log('✅ Session email sent successfully to:', teacher.email)

    return NextResponse.json({
      success: true,
      message: 'Session email sent successfully',
      teacher_email: teacher.email,
      session_code: session.session_code
    })
  } catch (error) {
    console.error('❌ Error sending session email:', error)
    return NextResponse.json(
      { error: 'Failed to send session email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
