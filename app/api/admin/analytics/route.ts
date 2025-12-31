import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const adminId = searchParams.get('adminId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Get admin's department
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('department')
      .eq('id', adminId)
      .single()

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Get all classes for this department
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, class_name, section')
      .eq('department', admin.department)

    if (classesError || !classes) {
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      )
    }

    // Build analytics for each class
    const analyticsData = await Promise.all(
      classes.map(async (cls: any) => {
        // Get total students in the class
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', cls.id)

        const totalStudents = students?.length || 0

        // Get attendance records for this class
        let query = supabase
          .from('attendance_records')
          .select('id, status', { count: 'exact' })
          .eq('status', 'present')
          .in('student_id', students?.map(s => s.id) || [])

        if (startDate) {
          query = query.gte('created_at', startDate)
        }
        if (endDate) {
          query = query.lte('created_at', endDate)
        }

        const { data: presentRecords, count: presentCount } = await query

        // Get total attendance records for this class
        let totalQuery = supabase
          .from('attendance_records')
          .select('id', { count: 'exact' })
          .in('student_id', students?.map(s => s.id) || [])

        if (startDate) {
          totalQuery = totalQuery.gte('created_at', startDate)
        }
        if (endDate) {
          totalQuery = totalQuery.lte('created_at', endDate)
        }

        const { data: allRecords, count: totalRecords } = await totalQuery

        // Calculate attendance percentage
        const attendancePercentage = totalRecords && totalRecords > 0 
          ? Math.round((presentCount || 0 / totalRecords) * 100) 
          : 0

        return {
          className: `${cls.class_name} ${cls.section || ''}`.trim(),
          strength: totalStudents,
          presentToday: presentCount || 0,
          totalRecords: totalRecords || 0,
          attendancePercentage,
          classId: cls.id,
        }
      })
    )

    return NextResponse.json({
      success: true,
      analytics: analyticsData,
      summary: {
        totalClasses: classes.length,
        totalStudents: analyticsData.reduce((sum, a) => sum + a.strength, 0),
        averageAttendance: Math.round(
          analyticsData.reduce((sum, a) => sum + a.attendancePercentage, 0) / analyticsData.length
        ),
      },
    })
  } catch (error) {
    console.error('Error in GET analytics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
