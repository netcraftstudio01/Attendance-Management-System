import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Test endpoint to check database tables
export async function GET() {
  try {
    const results: Record<string, {
      success?: boolean;
      count?: number;
      sample?: unknown;
      error?: string;
      exists?: boolean;
      sampleData?: unknown;
    }> = {}

    // Test classes table
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('*')
      .limit(1)
    
    results.classes = {
      exists: !classError,
      error: classError?.message,
      sampleData: classes?.[0] || null,
    }

    // Test subjects table
    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .limit(1)
    
    results.subjects = {
      exists: !subjectError,
      error: subjectError?.message,
      sampleData: subjects?.[0] || null,
    }

    // Test users table
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', 'teacher')
      .limit(1)
    
    results.users = {
      exists: !userError,
      error: userError?.message,
      sampleData: users?.[0] || null,
    }

    // Test teacher_subjects table
    const { data: assignments, error: assignError } = await supabase
      .from('teacher_subjects')
      .select('*')
      .limit(1)
    
    results.teacher_subjects = {
      exists: !assignError,
      error: assignError?.message,
      sampleData: assignments?.[0] || null,
    }

    return NextResponse.json({
      success: true,
      message: 'Database test completed',
      tables: results,
    })
  } catch (error: unknown) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
