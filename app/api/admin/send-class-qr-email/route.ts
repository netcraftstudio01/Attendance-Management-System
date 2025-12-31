import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const { classEmail, className, section, year, department } = await request.json()

    if (!classEmail) {
      return NextResponse.json(
        { error: 'Class email is required' },
        { status: 400 }
      )
    }

    if (!className) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      )
    }

    console.log('📧 Preparing to send class QR code email to:', classEmail)
    console.log('🎯 Using Gmail account:', process.env.GMAIL_USER)
    console.log('📚 Class:', className)

    // Check Gmail credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('⚠️ Gmail credentials not configured')
      console.warn('GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not set')
      console.warn('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set')
      return NextResponse.json(
        { 
          success: false,
          error: 'Email service not configured - missing Gmail credentials'
        },
        { status: 500 }
      )
    }

    // Generate QR code as buffer for attachment
    let qrCodeBuffer: Buffer
    try {
      // Create a URL that will help identify the class
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://attendance-system-roan-one.vercel.app'
      const qrContent = `${baseUrl}/teacher/page?class=${encodeURIComponent(className)}`
      
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

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
      .class-box { 
        background: white; 
        border: 2px solid #667eea; 
        padding: 20px; 
        text-align: center; 
        margin: 20px 0; 
        border-radius: 8px; 
      }
      .class-name { 
        font-size: 24px; 
        font-weight: bold; 
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
      .highlight { 
        background: #e8f4f8; 
        border-left: 4px solid #667eea; 
        padding: 12px; 
        margin: 20px 0; 
      }
      .badge {
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
        <h1>KPRCAS - Class Created</h1>
        <p>New Class Information</p>
      </div>
      <div class="content">
        <div class="badge">CLASS CREATED</div>
        
        <h2>New Class: ${className}</h2>
        <p>A new class has been successfully created in the KPRCAS Attendance Management System.</p>
        
        <div class="class-box">
          <h3 style="color: #667eea; margin-top: 0;">Class Details</h3>
          
          <div class="info-row">
            <span class="info-label">Class Name:</span>
            <span class="info-value">${className}</span>
          </div>
          
          ${section ? `<div class="info-row">
            <span class="info-label">Section:</span>
            <span class="info-value">${section}</span>
          </div>` : ''}
          
          ${year ? `<div class="info-row">
            <span class="info-label">Year:</span>
            <span class="info-value">${year}</span>
          </div>` : ''}
          
          ${department ? `<div class="info-row">
            <span class="info-label">Department:</span>
            <span class="info-value">${department}</span>
          </div>` : ''}
          
          <div class="qr-code">
            <p style="margin-bottom: 10px; color: #666;">Class Reference QR Code:</p>
            <img src="cid:qrcode" alt="QR Code" style="max-width: 300px; border: 2px solid #667eea; padding: 10px; background: white;">
          </div>
        </div>
        
        <div class="highlight">
          <strong>Next Steps:</strong>
          <ul>
            <li>Assign teachers to this class</li>
            <li>Add students to this class</li>
            <li>Configure subjects for this class</li>
            <li>Set up attendance sessions</li>
          </ul>
        </div>
        
        <p>Best regards,<br>KPRCAS Attendance System</p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} KPRCAS. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`

    // Send email with QR code attachment
    const mailOptions = {
      from: `"KPRCAS Attendance System" <${process.env.GMAIL_USER}>`,
      to: classEmail,
      subject: `Class Created: ${className}`,
      html: htmlTemplate,
      attachments: [
        {
          filename: 'class-qrcode.png',
          content: qrCodeBuffer,
          cid: 'qrcode'
        }
      ]
    }

    try {
      console.log('🚀 Sending class QR code email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      })
      
      const info = await transporter.sendMail(mailOptions)
      
      console.log('✅ Class QR code email sent successfully!')
      console.log('📧 Email ID:', info.messageId)
      console.log('📨 To:', classEmail)

      return NextResponse.json({
        success: true,
        message: 'Class QR code email sent successfully',
        class_email: classEmail,
        class_name: className,
        messageId: info.messageId
      })
    } catch (emailError) {
      console.error('❌ Error sending class QR code email:', emailError)
      console.error('Error details:', {
        message: emailError instanceof Error ? emailError.message : 'Unknown error',
        code: emailError instanceof Error && 'code' in emailError ? (emailError as any).code : undefined
      })
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to send email',
          details: emailError instanceof Error ? emailError.message : 'Unknown error',
          class_email: classEmail
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error sending class QR code email:', error)
    return NextResponse.json(
      { error: 'Failed to send class QR code email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
