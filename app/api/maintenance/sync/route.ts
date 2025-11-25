/**
 * 🔄 DATABASE SYNC API
 * 
 * Initialize and sync maintenance tasks database
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeTaskDatabase, getAllTasksFromDB, getTaskStats } from '@/lib/maintenance/task-db'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'init') {
      // Initialize database with all tasks
      const result = await initializeTaskDatabase()
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      const stats = await getTaskStats()
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        stats,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      const stats = await getTaskStats()
      return NextResponse.json(stats)
    }

    if (action === 'tasks') {
      const tasks = await getAllTasksFromDB()
      return NextResponse.json({ tasks })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
