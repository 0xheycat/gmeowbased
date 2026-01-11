/**
 * GET /api/test/active-users-frame
 * 
 * Purpose: Test endpoint to fetch active guild members and generate frame image
 * Method: GET
 * Query Params:
 * - guildId: string (optional, default: "1")
 * - format: "json" | "image" (optional, default: "json")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

interface ActiveMember {
  address: string
  farcasterUsername: string | null
  isOfficer: boolean
  points: string
  joinedAt: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const guildId = searchParams.get('guildId') || '1'
    const format = searchParams.get('format') || 'json'

    // Initialize Supabase client
    const supabase = createClient()

    // GraphQL query to get active guild members
    const QUERY = `
      query GetActiveGuildMembers($guildId: String!) {
        guild(id: $guildId) {
          id
          name
          leader
          totalPoints
          memberCount
          level
          active
          members(where: { isActive: true }) {
            id
            user {
              id
              address
              farcasterUsername
            }
            isOfficer
            points
            joinedAt
          }
        }
      }
    `

    // Fetch from Subsquid GraphQL
    const response = await fetch(process.env.NEXT_PUBLIC_SUBSQUID_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { guildId },
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch guild data' },
        { status: 500 }
      )
    }

    const { data, errors } = await response.json()

    if (errors) {
      return NextResponse.json(
        { error: 'GraphQL errors', details: errors },
        { status: 500 }
      )
    }

    if (!data?.guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    // Cross-verify with guild_events to filter out members who left
    const { data: leftEvents } = await supabase
      .from('guild_events')
      .select('member_address')
      .eq('guild_id', guildId)
      .eq('event_type', 'GUILD_LEFT')  // Updated to match Dec 31 contract event

    const leftAddresses = new Set(
      leftEvents?.map((e: any) => e.member_address.toLowerCase()) || []
    )

    // Filter active members
    const activeMembers: ActiveMember[] = data.guild.members
      .filter((m: any) => !leftAddresses.has(m.user.address.toLowerCase()))
      .map((m: any) => ({
        address: m.user.address,
        farcasterUsername: m.user.farcasterUsername,
        isOfficer: m.isOfficer,
        points: m.points,
        joinedAt: m.joinedAt,
      }))

    const guildData = {
      id: data.guild.id,
      name: data.guild.name,
      leader: data.guild.leader,
      totalPoints: data.guild.totalPoints,
      memberCount: activeMembers.length,
      level: data.guild.level,
      active: data.guild.active,
    }

    // Return JSON format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        guild: guildData,
        activeMembers: activeMembers.map((m, i) => ({
          rank: i + 1,
          ...m,
        })),
        timestamp: Date.now(),
      })
    }

    // Return Image format
    if (format === 'image') {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              color: 'white',
              fontFamily: 'system-ui, sans-serif',
              padding: '40px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '30px',
              }}
            >
              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  margin: '0 0 10px 0',
                  color: '#f9fafb',
                }}
              >
                {guildData.name}
              </h1>
              <div
                style={{
                  fontSize: '24px',
                  color: '#9ca3af',
                  display: 'flex',
                  gap: '20px',
                }}
              >
                <span>Level {guildData.level}</span>
                <span>•</span>
                <span>{activeMembers.length} Active Members</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  background: '#374151',
                  borderRadius: '12px',
                  padding: '20px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f9fafb' }}>
                  {parseInt(guildData.totalPoints).toLocaleString()}
                </div>
                <div style={{ fontSize: '18px', color: '#9ca3af' }}>Total Points</div>
              </div>

              <div
                style={{
                  background: '#374151',
                  borderRadius: '12px',
                  padding: '20px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f9fafb' }}>
                  {activeMembers.filter(m => m.isOfficer).length}
                </div>
                <div style={{ fontSize: '18px', color: '#9ca3af' }}>Officers</div>
              </div>
            </div>

            {/* Top Members */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
                maxWidth: '600px',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  color: '#f9fafb',
                }}
              >
                Top Active Members
              </div>
              {activeMembers.slice(0, 5).map((member, i) => (
                <div
                  key={member.address}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#374151',
                    borderRadius: '8px',
                    padding: '12px 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#9ca3af',
                        minWidth: '30px',
                      }}
                    >
                      #{i + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '18px', color: '#f9fafb' }}>
                        {member.farcasterUsername || 
                          `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                      </div>
                      {member.isOfficer && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#d1d5db',
                          }}
                        >
                          ⭐ Officer
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f9fafb' }}>
                    {parseInt(member.points).toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '30px',
                fontSize: '16px',
                color: '#6b7280',
              }}
            >
              Generated: {new Date().toLocaleString()}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('[test-active-users] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
