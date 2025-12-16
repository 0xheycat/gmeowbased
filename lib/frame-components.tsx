/**
 * Frame Component Library
 * 
 * Reusable UI components for Frog frames.
 * Uses standard JSX/HTML that Satori can render.
 */

/**
 * Frame Header Component
 * Brand-colored header with title
 */
export const FrameHeader = ({ title }: { title: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#8B5CF6',
      padding: '32px',
      width: '100%',
    }}
  >
    <h1 style={{ color: 'white', fontSize: '48px', fontWeight: 700, margin: 0 }}>
      {title}
    </h1>
  </div>
)

/**
 * Quest Card Component
 * Displays quest information in a card format
 */
export const QuestCard = ({ 
  quest 
}: { 
  quest: { 
    title: string
    reward_points: number
    difficulty: string
    category?: string
  } 
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '16px',
      border: '2px solid #E5E7EB',
      width: '100%',
    }}
  >
    <div style={{ fontSize: '28px', fontWeight: 600, color: 'black', marginBottom: '12px' }}>
      {quest.title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
      <span style={{ fontSize: '18px', color: '#6B7280' }}>
        {quest.difficulty}
      </span>
      {quest.category && (
        <span style={{ fontSize: '18px', color: '#8B5CF6' }}>
          {quest.category === 'onchain' ? '🔗 Onchain' : '💬 Social'}
        </span>
      )}
      <span style={{ marginLeft: 'auto', fontSize: '20px', fontWeight: 600, color: '#10B981' }}>
        +{quest.reward_points} XP
      </span>
    </div>
  </div>
)

/**
 * Empty State Component
 * Shows when no data available
 */
export const EmptyState = ({ 
  message,
  icon = '📭'
}: { 
  message: string
  icon?: string
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      gap: '16px',
    }}
  >
    <div style={{ fontSize: '64px' }}>{icon}</div>
    <div style={{ fontSize: '24px', color: '#6B7280', textAlign: 'center' }}>
      {message}
    </div>
  </div>
)
