import { EventEmitter } from 'events'
import type { TipBroadcast } from '@/lib/tips-types'

class TipBroker {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(0)
  }

  publish(event: TipBroadcast) {
    this.emitter.emit('tip', event)
  }

  subscribe(handler: (event: TipBroadcast) => void): () => void {
    this.emitter.on('tip', handler)
    return () => {
      this.emitter.off('tip', handler)
    }
  }
}

const tipBroker = new TipBroker()

export function publishTip(event: TipBroadcast) {
  tipBroker.publish(event)
}

export function subscribeToTips(handler: (event: TipBroadcast) => void) {
  return tipBroker.subscribe(handler)
}

export default tipBroker
