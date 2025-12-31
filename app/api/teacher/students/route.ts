import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Fetch students for the class
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        name,
        email,
        phone,
        address,
        parent_phone,
        parent_name,
        class_id,
        status
      `)
      .eq('class_id', classId)
      .order('student_id', { ascending: true })

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Transform the data
    const formattedStudents = (students || []).map((student: any) => ({
      id: student.id,
      user_id: student.id,
      class_id: student.class_id,
      roll_number: student.student_id,
      name: student.name,
      email: student.email,
      phone: student.phone || '',
      department: '',
      year: '',
    }))

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      count: formattedStudents.length
    })
  } catch (error) {
    console.error('Error in GET request:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
