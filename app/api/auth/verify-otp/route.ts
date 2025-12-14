import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { otpStorage } from '@/lib/otp-storage'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 OTP Verification request received')
    const { email, otp } = await request.json()
    console.log('📧 Email:', email, '| OTP:', otp)

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    let otpValid = false
    let otpExpired = false

    // PRIORITY 1: Check memory storage first (primary storage)
    console.log('💾 Checking memory storage first...')
    console.log(`💾 Email for lookup: "${email}"`)
    console.log(`💾 Email (lowercase): "${email.toLowerCase()}"`)
    console.log(`💾 OTP to verify: "${otp}"`)
    console.log(`💾 OTP type: ${typeof otp}`)
    console.log(`💾 Current storage size: ${otpStorage.size()}`)
    otpStorage.listAll() // Debug: show all stored OTPs
    
    const memoryOtp = otpStorage.get(email.toLowerCase())
    
    if (memoryOtp) {
      console.log('✅ OTP found in memory storage:', memoryOtp.otp)
      console.log('🔍 Stored OTP type:', typeof memoryOtp.otp)
      console.log('🔍 Stored OTP value:', JSON.stringify(memoryOtp.otp))
      console.log('🔍 Provided OTP value:', JSON.stringify(otp))
      console.log('🔍 Comparing:', { stored: memoryOtp.otp, provided: otp })
      console.log('🔍 String comparison:', String(memoryOtp.otp) === String(otp))
      console.log('🔍 Strict comparison:', memoryOtp.otp === otp)
      
      // Use string conversion to be safe
      if (String(memoryOtp.otp) === String(otp)) {
        const now = new Date()
        console.log('🕐 Expiry check:', { now: now.toISOString(), expiresAt: memoryOtp.expiresAt.toISOString() })
        
        if (now > memoryOtp.expiresAt) {
          console.log('❌ Memory OTP expired')
          otpExpired = true
        } else {
          console.log('✅ Memory OTP is valid!')
          otpValid = true
          // Remove from memory after use
          console.log('🗑️ Deleting OTP from memory...')
          otpStorage.delete(email.toLowerCase())
          console.log('✅ OTP deleted from memory')
        }
      } else {
        console.log('❌ OTP mismatch in memory')
        console.log('❌ Expected:', memoryOtp.otp)
        console.log('❌ Received:', otp)
      }
    } else {
      console.log('❌ OTP not found in memory storage')
      console.log('❌ Searched for email:', email.toLowerCase())
      console.log('❌ Storage is empty or email not in storage')
    }

    // PRIORITY 2: Fallback to database if memory check failed
    if (!otpValid && !otpExpired) {
      console.log('💾 Memory check failed, trying database as fallback...')
      try {
        const { data: otpRecord, error: otpError } = await supabase
          .from('otps')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('otp_code', otp)
          .eq('is_used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!otpError && otpRecord) {
          console.log('✅ OTP found in database')
          const expiresAt = new Date(otpRecord.expires_at)
          const now = new Date()

          if (now > expiresAt) {
            console.log('❌ Database OTP expired')
            otpExpired = true
          } else {
            console.log('✅ Database OTP is valid')
            otpValid = true
            
            // Mark OTP as used
            const { error: updateError } = await supabase
              .from('otps')
              .update({ is_used: true })
              .eq('id', otpRecord.id)

            if (updateError) {
              console.error('⚠️ Error updating OTP:', updateError)
            }
          }
        } else {
          console.log('❌ OTP not found in database either')
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError)
        console.log('❌ OTP not found in memory or database')
      }
    }

    // Return error if OTP is invalid or expired
    if (otpExpired) {
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      )
    }

    if (!otpValid) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      )
    }

    // Check if user exists
    console.log('👤 Checking if user exists in database...')
    let user: any = null
    let userFromDb = false

    try {
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle() // Use maybeSingle to handle no rows gracefully

      if (existingUser) {
        console.log('✅ User found in database:', existingUser.id)
        user = existingUser
        userFromDb = true
      } else {
        console.log('ℹ️ User not found in database, will create new user...')
      }
    } catch (dbError) {
      console.error('⚠️ Database error while checking user:', dbError)
      console.log('⚠️ Will attempt to create user anyway...')
    }

    // If user doesn't exist, create a new user
    if (!user) {
      const emailLower = email.toLowerCase()
      let role: 'admin' | 'teacher' | 'student' = 'student'

      // Determine role based on email
      if (emailLower.includes('admin') || emailLower.includes('principal')) {
        role = 'admin'
      } else if (
        emailLower.includes('teacher') ||
        emailLower.includes('faculty') ||
        emailLower.includes('staff')
      ) {
        role = 'teacher'
      }

      console.log('📝 Creating new user with role:', role)
      
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: emailLower,
            role: role,
            name: emailLower.split('@')[0],
          })
          .select()
          .maybeSingle()

        if (createError) {
          console.error('❌ Database error creating user:', createError)
          console.error('❌ Error details:', JSON.stringify(createError, null, 2))
          
          // If it's a unique constraint error, the user might already exist
          if (createError.code === '23505') {
            console.log('⚠️ User already exists (unique constraint), fetching existing user...')
            try {
              const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', emailLower)
                .maybeSingle()
              
              if (existingUser) {
                console.log('✅ Found existing user after constraint error')
                user = existingUser
                userFromDb = true
              }
            } catch (fetchError) {
              console.error('❌ Failed to fetch existing user:', fetchError)
            }
          }
          
          // If still no user, create a mock user for the session
          if (!user) {
            console.log('⚠️ Creating temporary in-memory user (database unavailable)')
            user = {
              id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              email: emailLower,
              role: role,
              name: emailLower.split('@')[0],
              is_temporary: true
            }
          }
        } else if (newUser) {
          console.log('✅ New user created successfully:', newUser.id)
          user = newUser
          userFromDb = true
        }
      } catch (createException) {
        console.error('❌ Exception while creating user:', createException)
        
        // Create temporary user as last resort
        console.log('⚠️ Creating temporary in-memory user (exception occurred)')
        user = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          email: emailLower,
          role: role,
          name: emailLower.split('@')[0],
          is_temporary: true
        }
      }
    }

    // Create a session token (in production, use proper JWT or session management)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        timestamp: Date.now(),
      })
    ).toString('base64')

    // Prepare response message
    let message = 'Login successful'
    if (user.is_temporary) {
      message = 'Login successful (temporary session - database unavailable)'
      console.log('⚠️ Warning: User is using temporary session')
    } else if (userFromDb) {
      console.log('✅ User session created from database user')
    }

    // Return user data and session
    return NextResponse.json({
      success: true,
      message: message,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department || 'General',
        is_temporary: user.is_temporary || false,
      },
      token: sessionToken,
    })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
