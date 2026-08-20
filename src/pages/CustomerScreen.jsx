/**
 * CustomerScreen.jsx
 * Route: /cliente  — open in second monitor / second window
 * 
 * Modes:
 *  - IDLE: slideshow fullscreen when no active order
 *  - ACTIVE: show order details + points when operator is working
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listenState } from '../lib/posChannel'
import { Star, Gift, CheckCircle } from 'lucide-react'

const IDLE_TIMEOUT_MS = 60000 // go back to slides after 60s of no activity

export default function CustomerScreen() {
  const { storeId } = useParams()
  const [posState, setPosState]   = useState(null)   // last broadcast from operator
  const [slides, setSlides]       = useState([])
  const [slideIdx, setSlideIdx]   = useState(0)
  const [mode, setMode]           = useState('idle') // 'idle' | 'active'
  const [gifts, setGifts]         = useState([])
  const idleTimer                 = useRef(null)

  // Load slides from Supabase
  useEffect(() => {
    const loadSlides = async () => {
      const { data } = await supabase
        .from('slides')
        .select('*')
        .eq('active', true)
        .order('sort_order')
      setSlides(data || [])
    }
    const loadGifts = async () => {
      const { data } = await supabase.from('gifts').select('*').order('points_required')
      setGifts(data || [])
    }
    loadSlides()
    loadGifts()

    // Listen for slide changes in real time
    const ch = supabase
      .channel('slides-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slides' }, loadSlides)
      .subscribe()
    return () => ch.unsubscribe()
  }, [])

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    if (!slides.length) return
    const t = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])

  // Listen to POS broadcast — scoped to this store only
  useEffect(() => {
    if (!storeId) return
    const unsub = listenState(storeId, payload => {
      setPosState(payload)

      const hasActivity = payload.order?.length > 0 || payload.client
      if (hasActivity) {
        setMode('active')
        // Reset idle timer
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(() => setMode('idle'), IDLE_TIMEOUT_MS)
      }
      // If purchase just completed (lastPurchase set, order empty) keep active briefly
      if (payload.lastPurchase && (!payload.order || payload.order.length === 0)) {
        setMode('active')
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(() => setMode('idle'), IDLE_TIMEOUT_MS)
      }
    })
    return () => {
      unsub()
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [storeId])

  if (mode === 'idle' || !posState) {
    return <IdleScreen slides={slides} slideIdx={slideIdx} />
  }

  return <ActiveScreen state={posState} slides={slides} slideIdx={slideIdx} gifts={gifts} />
}

/* ══════════════════════════════════════════════════════════════
   IDLE SCREEN — fullscreen slideshow
══════════════════════════════════════════════════════════════ */
function IdleScreen({ slides, slideIdx }) {
  const current = slides[slideIdx]

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a14', overflow: 'hidden', position: 'relative' }}>
      {/* Slides */}
      {slides.length > 0 ? (
        <>
          {slides.map((s, i) => (
            <div key={s.id} style={{
              position: 'absolute', inset: 0,
              opacity: i === slideIdx ? 1 : 0,
              transition: 'opacity 1s ease',
              backgroundImage: `url(${s.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          ))}
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)' }} />
          {current?.title && (
            <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 36, fontWeight: 800, fontFamily: 'Outfit, sans-serif', textShadow: '0 2px 16px rgba(0,0,0,.6)' }}>
                {current.title}
              </div>
            </div>
          )}
          {/* Dots */}
          {slides.length > 1 && (
            <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {slides.map((_, i) => (
                <div key={i} style={{ width: i === slideIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === slideIdx ? '#fff' : 'rgba(255,255,255,.4)', transition: 'all .4s' }} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* No slides yet — default branded screen */
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          background: 'linear-gradient(135deg, #1a0a0a 0%, #0a1a3a 100%)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: 'linear-gradient(135deg, #D32F2F, #1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(211,47,47,.4)' }}>
            <Star size={40} color="#fff" fill="#fff" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: -2 }}>
              POS <span style={{ color: '#EF5350' }}>COLQUE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 18, marginTop: 8 }}>Tarjetas al por Mayor · Entel · Viva · Tigo</div>
          </div>
          {/* Animated operator chips */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {[['Entel','#00AEEF'],['Viva','#43A047'],['Tigo','#1A3A8F']].map(([name, color]) => (
              <div key={name} style={{ padding: '10px 28px', borderRadius: 30, border: `2px solid ${color}`, color, fontSize: 18, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ACTIVE SCREEN — show order + points + gifts
══════════════════════════════════════════════════════════════ */
function ActiveScreen({ state, slides, slideIdx, gifts = [] }) {
  const { order = [], client, cashReceived, lastPurchase } = state

  const validOrder = order.filter(i => parseInt(i.quantity) > 0)
  const effP = (i) => i.effectivePrice != null
    ? parseFloat(i.effectivePrice)
    : Math.max(0, parseFloat(i.product_price) - (parseFloat(i.discount) || 0))
  const total      = validOrder.reduce((s, i) => s + effP(i) * parseInt(i.quantity), 0)
  const ptsEarn    = Math.floor(total / 10)
  const cash       = parseFloat(cashReceived) || 0
  const change     = cash - total
  const currentPts = client?.points ?? 0

  const isCompleted  = lastPurchase && validOrder.length === 0
  const displayItems = isCompleted ? lastPurchase.items : validOrder

  const OP_COLORS = { Entel: '#00AEEF', Viva: '#43A047', Tigo: '#1A3A8F', General: '#F57C00' }
  const OP_BG     = { Entel: '#E3F6FF', Viva: '#E8F5E9', Tigo: '#E8EDF8', General: '#FFF3E0' }

  // Circle params — bigger
  const svgSize = 320, svgCx = 160, svgCy = 160, svgR = 138
  const svgCirc = 2 * Math.PI * svgR
  const ptsDisplay = isCompleted ? (lastPurchase.newPts ?? currentPts) : currentPts
  const svgDash = svgCirc - (Math.min(ptsDisplay / 1000, 1)) * svgCirc

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f8f9fc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top strip */}
      <div style={{ height: 7, background: 'linear-gradient(90deg, #D32F2F 0%, #1565C0 100%)', flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '55% 45%', overflow: 'hidden' }}>

        {/* ── LEFT: order detail ── */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e6ef', overflow: 'hidden' }}>

          {/* Welcome */}
          <div style={{ marginBottom: 20, flexShrink: 0 }}>
            {isCompleted ? (
              <>
                <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1 }}>
                  ¡Gracias, <span style={{ color: '#D32F2F' }}>{lastPurchase.client?.full_name?.split(' ')[0]}!</span>
                </div>
                <div style={{ color: '#6B7280', fontSize: 20, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Compra registrada <CheckCircle size={20} color="#1B8A5A" />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1 }}>
                  {client ? <>Hola, <span style={{ color: '#D32F2F' }}>{client.full_name.split(' ')[0]}</span>!</> : 'Bienvenido'}
                </div>
                <div style={{ color: '#6B7280', fontSize: 20, marginTop: 8 }}>Tu pedido en tiempo real</div>
              </>
            )}
          </div>

          {/* Table header */}
          {displayItems.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '68px 1fr 60px 90px 100px',
              gap: 10, paddingBottom: 12,
              borderBottom: '2px solid #e2e6ef',
              fontSize: 14, fontWeight: 700, color: '#9CA3AF',
              textTransform: 'uppercase', letterSpacing: '.5px', flexShrink: 0,
            }}>
              <span />
              <span>Producto</span>
              <span style={{ textAlign: 'center' }}>Cant.</span>
              <span style={{ textAlign: 'right' }}>P. Unit.</span>
              <span style={{ textAlign: 'right' }}>Subtotal</span>
            </div>
          )}

          {/* Items list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {displayItems.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 22, paddingTop: 28 }}>Aún no hay productos…</div>
            ) : (
              displayItems.map((item, i) => {
                const qty       = parseInt(item.quantity)
                const opColor   = OP_COLORS[item.operator] || '#999'
                const opBg      = OP_BG[item.operator]     || '#f5f5f5'
                const disc      = parseFloat(item.discount) || 0
                const effPrice  = item.effectivePrice != null
                  ? parseFloat(item.effectivePrice)
                  : Math.max(0, parseFloat(item.product_price) - disc)
                const origPrice = parseFloat(item.product_price).toFixed(2)
                const subtotal  = (effPrice * qty).toFixed(2)
                const hasDisc   = disc > 0 || (item.effectivePrice != null && parseFloat(item.effectivePrice) !== parseFloat(item.product_price))
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '68px 1fr 60px 90px 100px',
                    gap: 10, padding: '14px 0',
                    borderBottom: '1px solid #e2e6ef',
                    alignItems: 'center',
                  }}>
                    {/* Image — bigger */}
                    <div style={{
                      width: 62, height: 62, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                      background: opBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.product_image
                        ? <img src={item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 22, fontWeight: 900, color: opColor }}>{item.operator?.[0]}</span>
                      }
                    </div>

                    {/* Name + discount */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{item.product_name}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: opColor, marginTop: 2 }}>{item.operator}</div>
                      {hasDisc && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '2px 9px' }}>
                          <span style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'line-through' }}>Bs. {origPrice}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#1B8A5A' }}>→ Bs. {effPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <div style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', color: '#111827' }}>×{qty}</div>

                    {/* Unit price */}
                    <div style={{ fontSize: 19, fontWeight: 700, textAlign: 'right', color: hasDisc ? '#1B8A5A' : '#6B7280' }}>
                      Bs. {effPrice.toFixed(2)}
                    </div>

                    {/* Subtotal */}
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#D32F2F', textAlign: 'right' }}>
                      Bs. {subtotal}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer totals */}
          <div style={{ flexShrink: 0, borderTop: '2px solid #e2e6ef', paddingTop: 18, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#6B7280' }}>TOTAL</span>
              <span style={{ fontSize: 56, fontWeight: 900, color: '#111827' }}>
                Bs. {(isCompleted ? lastPurchase.total : total).toFixed(2)}
              </span>
            </div>

            {(isCompleted ? lastPurchase.cash > 0 : cash > 0) && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1, background: '#F0F2F7', borderRadius: 12, padding: '12px 18px' }}>
                  <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Efectivo</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>Bs. {(isCompleted ? lastPurchase.cash : cash).toFixed(2)}</div>
                </div>
                <div style={{
                  flex: 1, borderRadius: 12, padding: '12px 18px',
                  background: (isCompleted ? lastPurchase.change : change) >= 0 ? '#ECFDF5' : '#FEE2E2',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: (isCompleted ? lastPurchase.change : change) >= 0 ? '#1B8A5A' : '#D32F2F' }}>Cambio</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: (isCompleted ? lastPurchase.change : change) >= 0 ? '#1B8A5A' : '#D32F2F' }}>
                    Bs. {Math.max(0, isCompleted ? lastPurchase.change : change).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {(isCompleted ? lastPurchase.ptsEarn : ptsEarn) > 0 && (
              <div style={{ marginTop: 14, background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={22} color="#1B8A5A" fill="#1B8A5A" />
                <span style={{ color: '#1B8A5A', fontWeight: 700, fontSize: 20 }}>
                  {isCompleted ? `Ganaste ${lastPurchase.ptsEarn} puntos` : `Esta compra te dará ${ptsEarn} puntos`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: big circle fixed + gifts scrollable ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', overflow: 'hidden' }}>

          {/* Sección fija: círculo de puntos */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 8px', width: '100%' }}>
          {/* Big points circle */}
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <circle cx={svgCx} cy={svgCy} r={svgR} fill="none" stroke="#e2e6ef" strokeWidth="18" />
            <circle cx={svgCx} cy={svgCy} r={svgR} fill="none"
              stroke="url(#ptsg2)" strokeWidth="18"
              strokeDasharray={svgCirc}
              strokeDashoffset={svgDash}
              strokeLinecap="round"
              transform={`rotate(-90 ${svgCx} ${svgCy})`}
              style={{ transition: 'stroke-dashoffset .8s ease' }}
            />
            <defs>
              <linearGradient id="ptsg2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D32F2F" />
                <stop offset="100%" stopColor="#1565C0" />
              </linearGradient>
            </defs>
            <text x={svgCx} y={svgCy - 18} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="72" fontWeight="900" fill="#111827">
              {ptsDisplay}
            </text>
            <text x={svgCx} y={svgCy + 20} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="20" fontWeight="700" fill="#9CA3AF" letterSpacing="4">
              PUNTOS
            </text>
            {client && (
              <text x={svgCx} y={svgCy + 50} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="17" fontWeight="600" fill="#6B7280">
                {client.full_name.split(' ').slice(0, 2).join(' ')}
              </text>
            )}
          </svg>

          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.4 }}>
              Cada <strong>Bs. 10</strong> = 1 punto · Canjéalos por regalos
            </div>
          </div>
          </div>

          {/* Sección con scroll: regalos */}
          {gifts.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto', width: '100%', padding: '0 20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Gift size={14} /> Regalos disponibles
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(gifts.length, 3)}, 1fr)`,
                gap: 8,
              }}>
                {gifts.map(g => {
                  const canRedeem = ptsDisplay >= g.points_required
                  return (
                    <div key={g.id} style={{
                      background: canRedeem ? '#ECFDF5' : '#F9FAFB',
                      border: `2px solid ${canRedeem ? '#6EE7B7' : '#E2E6EF'}`,
                      borderRadius: 14, overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 8px 12px',
                    }}>
                      <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#F0F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        {g.image_url
                          ? <img src={g.image_url} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Gift size={28} color="#9CA3AF" />
                        }
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, marginBottom: 6, wordBreak: 'break-word' }}>{g.name}</div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: canRedeem ? '#1B8A5A' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={13} fill="currentColor" /> {g.points_required} pts
                      </div>
                      {canRedeem && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#1B8A5A', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={13} /> Disponible
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
