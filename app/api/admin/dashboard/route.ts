import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: NextRequest) {
  try {
    const adminId = request.nextUrl.searchParams.get('adminId')

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      )
    }

    console.log('📊 Fetching dashboard data for admin:', adminId)

    // Fetch students
    const { data: studentsData, count: studentCount, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact' })
      .eq('created_by_admin_id', adminId)

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError)
    }

    // Fetch teachers
    const { data: teachersData, count: teacherCount, error: teachersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .eq('user_type', 'teacher')

    if (teachersError) {
      console.error('❌ Error fetching teachers:', teachersError)
    }

    // Fetch classes
    const { data: classesData, count: classCount, error: classesError } = await supabaseAdmin
      .from('classes')
      .select('*', { count: 'exact' })
      .eq('created_by_admin_id', adminId)

    if (classesError) {
      console.error('❌ Error fetching classes:', classesError)
    }

    // Fetch pending OD requests
    const { data: odRequests, error: odError } = await supabaseAdmin
      .from('od_requests')
      .select(`
        id,
        od_start_date,
        od_end_date,
        reason,
        status,
        teacher_approved,
        admin_approved,
        students (name, email),
        classes (class_name)
      `)
      .eq('admin_id', adminId)
      .eq('status', 'pending')
      .limit(10)

    if (odError) {
      console.error('❌ Error fetching OD requests:', odError)
    }

    console.log('✅ Dashboard data fetched:', {
      students: studentCount || 0,
      teachers: teacherCount || 0,
      classes: classCount || 0,
      odRequests: (odRequests || []).length,
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        totalClasses: classCount || 0,
      },
      odRequests: odRequests || [],
    })
  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
