import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: Fetch transfer history for a teacher
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get('teacherId')
    const sessionId = searchParams.get('sessionId')

    if (!teacherId && !sessionId) {
      return NextResponse.json(
        { error: 'Teacher ID or Session ID is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('session_transfers')
      .select(`
        id,
        session_id,
        transferred_from,
        transferred_to,
        transfer_reason,
        transferred_at,
        status,
        created_at,
        attendance_sessions (
          session_code,
          classes (class_name, section),
          subjects (subject_code, subject_name)
        )
      `)

    if (teacherId) {
      // Get transfers where teacher is either the original or new handler
      query = query.or(`transferred_from.eq.${teacherId},transferred_to.eq.${teacherId}`)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: transfers, error } = await query.order('transferred_at', { ascending: false })

    if (error) {
      console.error('Error fetching transfer history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transfer history' },
        { status: 500 }
      )
    }

    // Fetch teacher names
    const transfersWithNames = await Promise.all(
      (transfers || []).map(async (transfer) => {
        const { data: fromTeacher } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', transfer.transferred_from)
          .single()

        const { data: toTeacher } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', transfer.transferred_to)
          .single()

        return {
          ...transfer,
          fromTeacher,
          toTeacher,
        }
      })
    )

    return NextResponse.json({
      success: true,
      transfers: transfersWithNames
    })
  } catch (error) {
    console.error('Error in transfer history:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch transfer history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
