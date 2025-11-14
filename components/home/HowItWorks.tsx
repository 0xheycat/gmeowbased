'use client'

const STEPS = [
  {
    title: '🐱 GM DAILY',
    description: 'Check in every 24h to grow your streak. Longer streaks unlock bonus Paw Points.',
  },
  {
    title: '🎯 COMPLETE QUESTS',
    description: 'Finish cinematic quests for points, ERC20 drops, and animated profile upgrades.',
  },
  {
    title: '🏆 UNLOCK BADGES',
    description: 'Burn or stake points to mint Soulbound badges and flex them across Farcaster.',
  },
] as const

export function HowItWorks() {
  return (
    <section className="how-it-works">
      <h2>How it works</h2>
      <div className="steps">
        {STEPS.map((step, index) => (
          <div key={step.title} className="step">
            <div className="step-number">0{index + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
