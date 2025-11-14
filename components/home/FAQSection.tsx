'use client'

import { useState } from 'react'
import type { FAQItem } from './types'

type Props = {
  items: FAQItem[]
}

export function FAQSection({ items }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <section className="faq">
      <h2>FAQ</h2>
      <div className="faq-list">
        {items.map((faq, index) => (
          <div key={faq.question} className={`faq-item${activeIndex === index ? ' active' : ''}`}>
            <button type="button" onClick={() => setActiveIndex(activeIndex === index ? null : index)}>
              <span>{faq.question}</span>
              <span className="faq-icon">{activeIndex === index ? '−' : '+'}</span>
            </button>
            {activeIndex === index ? <p>{faq.answer}</p> : null}
          </div>
        ))}
      </div>
    </section>
  )
}
