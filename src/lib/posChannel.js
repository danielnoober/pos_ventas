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
 * Each store gets its own channel (`pos-store-<storeId>`) so that
 * two stores running the POS at the same time never see each
 * other's live order on their customer screens.
 *
 * Event:   'pos-state'
 * Payload: { order, client, cashReceived, lastPurchase }
 */

import { supabase } from './supabase'

const EVENT_NAME = 'pos-state'

const channels = new Map() // storeId -> channel

function getChannel(storeId) {
  if (!channels.has(storeId)) {
    channels.set(storeId, supabase.channel(`pos-store-${storeId}`, {
      config: { broadcast: { self: true } },
    }))
  }
  return channels.get(storeId)
}

/** Broadcast current POS state to all listeners (including self) for a given store */
export async function broadcastState(storeId, payload) {
  if (!storeId) return
  const ch = getChannel(storeId)
  if (ch.state !== 'joined') {
    await new Promise(resolve => {
      ch.subscribe(status => { if (status === 'SUBSCRIBED') resolve() })
    })
  }
  await ch.send({ type: 'broadcast', event: EVENT_NAME, payload })
}

/** Listen for POS state updates for a given store. Returns an unsubscribe function. */
export function listenState(storeId, callback) {
  if (!storeId) return () => {}
  const ch = getChannel(storeId)
  ch.on('broadcast', { event: EVENT_NAME }, ({ payload }) => callback(payload))
  if (ch.state !== 'joined' && ch.state !== 'joining') {
    ch.subscribe()
  }
  return () => {
    ch.unsubscribe()
    channels.delete(storeId)
  }
}
