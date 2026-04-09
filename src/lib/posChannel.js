/**
 * posChannel.js
 * 
 * Uses Supabase Realtime BROADCAST to sync POS state 
 * (order + client) to the customer screen in real time.
 * 
 * Broadcast is WebSocket-based and does NOT require a DB table.
 * Both windows must be open in the same browser (same session)
 * OR on different devices connected to the same Supabase project.
 * 
 * Channel: 'pos-colque'
 * Event:   'pos-state'
 * Payload: { order, client, cashReceived, lastPurchase }
 */

import { supabase } from './supabase'

const CHANNEL_NAME = 'pos-colque'
const EVENT_NAME   = 'pos-state'

let _channel = null

function getChannel() {
  if (!_channel) {
    _channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: true } },
    })
  }
  return _channel
}

/** Broadcast current POS state to all listeners (including self) */
export async function broadcastState(payload) {
  const ch = getChannel()
  // Subscribe first if not subscribed
  if (ch.state !== 'joined') {
    await new Promise(resolve => {
      ch.subscribe(status => { if (status === 'SUBSCRIBED') resolve() })
    })
  }
  await ch.send({ type: 'broadcast', event: EVENT_NAME, payload })
}

/** Listen for POS state updates. Returns an unsubscribe function. */
export function listenState(callback) {
  const ch = getChannel()
  ch.on('broadcast', { event: EVENT_NAME }, ({ payload }) => callback(payload))
  if (ch.state !== 'joined' && ch.state !== 'joining') {
    ch.subscribe()
  }
  return () => {
    ch.unsubscribe()
    _channel = null
  }
}
