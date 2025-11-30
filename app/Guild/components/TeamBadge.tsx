export function TeamBadge({ role, chain }: { role: 'founder' | 'member'; chain: string }) {
  const bg = role === 'founder' ? 'rgba(234,179,8,0.25)' : 'rgba(59,130,246,0.25)'
  return (
    <span className="pixel-pill" style={{ background: bg }}>
      {role === 'founder' ? 'Founder' : 'Member'} • {chain}
    </span>
  )
}