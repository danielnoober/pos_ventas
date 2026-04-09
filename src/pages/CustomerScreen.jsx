/**
 * CustomerScreen.jsx
 * Route: /cliente  — open in second monitor / second window
 * 
 * Modes:
 *  - IDLE: slideshow fullscreen when no active order
 *  - ACTIVE: show order details + points when operator is working
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { listenState } from '../lib/posChannel'
import { Star, Gift } from 'lucide-react'

const IDLE_TIMEOUT_MS = 30000 // go back to slides after 30s of no activity

export default function CustomerScreen() {
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

  // Listen to POS broadcast
  useEffect(() => {
    const unsub = listenState(payload => {
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
  }, [])

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
   ACTIVE SCREEN — show order + points + mini slides
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

  const r = 80, cx = 95, cy = 95
  const circumference = 2 * Math.PI * r
  const deg       = Math.min((currentPts / 1000) * 360, 360)
  const dashOffset = circumference - (deg / 360) * circumference

  const isCompleted = lastPurchase && validOrder.length === 0
  const displayItems = isCompleted ? lastPurchase.items : validOrder

  const OP_COLORS = { Entel: '#00AEEF', Viva: '#43A047', Tigo: '#1A3A8F', General: '#F57C00' }
  const OP_BG     = { Entel: '#E3F6FF', Viva: '#E8F5E9', Tigo: '#E8EDF8', General: '#FFF3E0' }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f8f9fc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top strip */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, #D32F2F 0%, #1565C0 100%)', flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '40% 60%', overflow: 'hidden' }}>

        {/* ── LEFT: order ── */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e6ef', overflow: 'hidden' }}>

          {/* Welcome header */}
          <div style={{ marginBottom: 20, flexShrink: 0 }}>
            {isCompleted ? (
              <>
                <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>
                  ¡Gracias, <span style={{ color: '#D32F2F' }}>{lastPurchase.client?.full_name?.split(' ')[0]}!</span>
                </div>
                <div style={{ color: '#6B7280', fontSize: 17, marginTop: 6 }}>Compra registrada correctamente ✓</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>
                  {client ? <>Hola, <span style={{ color: '#D32F2F' }}>{client.full_name.split(' ')[0]}</span>!</> : 'Bienvenido'}
                </div>
                <div style={{ color: '#6B7280', fontSize: 17, marginTop: 6 }}>Tu pedido en tiempo real</div>
              </>
            )}
          </div>

          {/* Table header */}
          {displayItems.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr 54px 72px 88px',
              gap: 10,
              paddingBottom: 10,
              borderBottom: '2px solid #e2e6ef',
              fontSize: 12, fontWeight: 700, color: '#9CA3AF',
              textTransform: 'uppercase', letterSpacing: '.5px',
              flexShrink: 0,
            }}>
              <span></span>
              <span>Producto</span>
              <span style={{ textAlign: 'center' }}>Cant.</span>
              <span style={{ textAlign: 'right' }}>P. Unit.</span>
              <span style={{ textAlign: 'right' }}>Subtotal</span>
            </div>
          )}

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {displayItems.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 18, paddingTop: 24 }}>Aún no hay productos en el pedido…</div>
            ) : (
              displayItems.map((item, i) => {
                const qty      = parseInt(item.quantity)
                const opColor  = OP_COLORS[item.operator] || '#999'
                const opBg     = OP_BG[item.operator]     || '#f5f5f5'
                const disc     = parseFloat(item.discount) || 0
                const effPrice = item.effectivePrice != null
                  ? parseFloat(item.effectivePrice)
                  : Math.max(0, parseFloat(item.product_price) - disc)
                const origPrice = parseFloat(item.product_price).toFixed(2)
                const subtotal  = (effPrice * qty).toFixed(2)
                const hasDisc   = disc > 0 || (item.effectivePrice != null && item.effectivePrice !== item.product_price)
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 54px 72px 88px',
                    gap: 10,
                    padding: '12px 0',
                    borderBottom: '1px solid #e2e6ef',
                    alignItems: 'center',
                  }}>
                    {/* Image */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                      background: opBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.product_image
                        ? <img src={item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 16, fontWeight: 900, color: opColor }}>{item.operator?.[0]}</span>
                      }
                    </div>

                    {/* Name + operator + discount badge */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}>{item.product_name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: opColor, marginTop: 2 }}>{item.operator}</div>
                      {hasDisc && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 6, padding: '1px 7px' }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through' }}>Bs. {origPrice}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#1B8A5A' }}>→ Bs. {effPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', color: '#111827' }}>×{qty}</div>

                    {/* Unit price (effective) */}
                    <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'right', color: hasDisc ? '#1B8A5A' : '#6B7280' }}>
                      Bs. {effPrice.toFixed(2)}
                    </div>

                    {/* Subtotal */}
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#D32F2F', textAlign: 'right' }}>
                      Bs. {subtotal}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer totals */}
          <div style={{ flexShrink: 0, borderTop: '2px solid #e2e6ef', paddingTop: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#6B7280' }}>TOTAL</span>
              <span style={{ fontSize: 46, fontWeight: 900, color: '#111827' }}>
                Bs. {(isCompleted ? lastPurchase.total : total).toFixed(2)}
              </span>
            </div>

            {(isCompleted ? lastPurchase.cash > 0 : cash > 0) && (
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <div style={{ flex: 1, background: '#F0F2F7', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Efectivo</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>Bs. {(isCompleted ? lastPurchase.cash : cash).toFixed(2)}</div>
                </div>
                <div style={{
                  flex: 1, borderRadius: 10, padding: '10px 16px',
                  background: (isCompleted ? lastPurchase.change : change) >= 0 ? '#ECFDF5' : '#FEE2E2',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: (isCompleted ? lastPurchase.change : change) >= 0 ? '#1B8A5A' : '#D32F2F' }}>Cambio</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: (isCompleted ? lastPurchase.change : change) >= 0 ? '#1B8A5A' : '#D32F2F' }}>
                    Bs. {Math.max(0, isCompleted ? lastPurchase.change : change).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {(isCompleted ? lastPurchase.ptsEarn : ptsEarn) > 0 && (
              <div style={{ marginTop: 12, background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={18} color="#1B8A5A" fill="#1B8A5A" />
                <span style={{ color: '#1B8A5A', fontWeight: 700, fontSize: 16 }}>
                  {isCompleted ? `Ganaste ${lastPurchase.ptsEarn} puntos` : `Esta compra te dará ${ptsEarn} puntos`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: bigger circle + gifts ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 16px', background: '#fff', overflowY: 'auto' }}>

          {/* Big points circle */}
          {(() => {
            const svgSize = 260, svgCx = 130, svgCy = 130, svgR = 112
            const svgCirc = 2 * Math.PI * svgR
            const svgDash = svgCirc - (Math.min(currentPts / 1000, 1) * 360 / 360) * svgCirc
            return (
              <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ flexShrink: 0 }}>
                <circle cx={svgCx} cy={svgCy} r={svgR} fill="none" stroke="#e2e6ef" strokeWidth="16" />
                <circle cx={svgCx} cy={svgCy} r={svgR} fill="none"
                  stroke="url(#ptsg2)" strokeWidth="16"
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
                <text x={svgCx} y={svgCy - 12} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="56" fontWeight="900" fill="#111827">
                  {isCompleted ? (lastPurchase.newPts ?? currentPts) : currentPts}
                </text>
                <text x={svgCx} y={svgCy + 18} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="15" fontWeight="700" fill="#9CA3AF" letterSpacing="3">
                  PUNTOS
                </text>
                {client && (
                  <text x={svgCx} y={svgCy + 40} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="600" fill="#6B7280">
                    {client.full_name.split(' ').slice(0, 2).join(' ')}
                  </text>
                )}
              </svg>
            )
          })()}

          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <div style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.4 }}>
              Cada <strong>Bs. 10</strong> = 1 punto
            </div>
          </div>

          {/* Gifts section — horizontal cards */}
          {gifts.length > 0 && (
            <div style={{ width: '100%', marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, textAlign: 'center' }}>
                🎁 Regalos canjeables
              </div>
              {/* Horizontal scroll */}
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                {gifts.map(g => {
                  const canRedeem = currentPts >= g.points_required
                  return (
                    <div key={g.id} style={{
                      flexShrink: 0, width: 120,
                      background: canRedeem ? '#ECFDF5' : '#F9FAFB',
                      border: `2px solid ${canRedeem ? '#6EE7B7' : '#E2E6EF'}`,
                      borderRadius: 14, overflow: 'hidden',
                      display: 'flex', flexDirection: 'column',
                    }}>
                      {/* Image */}
                      <div style={{ width: '100%', height: 80, background: '#F0F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {g.image_url
                          ? <img src={g.image_url} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 32 }}>🎁</span>
                        }
                      </div>
                      {/* Info */}
                      <div style={{ padding: '7px 8px', flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25, marginBottom: 4 }}>{g.name}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: canRedeem ? '#1B8A5A' : '#9CA3AF' }}>
                          ⭐ {g.points_required} pts
                        </div>
                        {canRedeem
                          ? <div style={{ fontSize: 10, fontWeight: 800, color: '#1B8A5A', marginTop: 2 }}>✓ Disponible</div>
                          : <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Faltan {g.points_required - currentPts}</div>
                        }
                      </div>
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
