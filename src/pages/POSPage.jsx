import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { SearchInput, Modal } from '../components/UI'
import { ShoppingCart, Trash2, CheckCircle, Star, Printer, UserPlus, X, Store } from 'lucide-react'

const OPERATORS = ['Todos', 'Entel', 'Viva', 'Tigo', 'General']
const OP_COLORS = { Entel: '#00AEEF', Viva: '#43A047', Tigo: '#1A3A8F', General: '#F57C00' }
const OP_BG    = { Entel: '#E3F6FF', Viva: '#E8F5E9', Tigo: '#E8EDF8', General: '#FFF3E0' }

// Category sort order: Tarjeta (low→high price) → Chip → Recarga → everything else
const CATEGORY_ORDER = ['tarjeta', 'chip', 'recarga']
const getCatRank = (cat = '') => {
  const c = cat.toLowerCase()
  if (c.includes('tarjeta')) return 0
  if (c.includes('chip'))    return 1
  if (c.includes('recarga')) return 2
  return 3
}

// Sort: operator → category rank → price
function sortProducts(products) {
  return [...products].sort((a, b) => {
    const opA = a.operator.toLowerCase(), opB = b.operator.toLowerCase()
    if (opA !== opB) return opA.localeCompare(opB)
    const catA = getCatRank(a.category), catB = getCatRank(b.category)
    if (catA !== catB) return catA - catB
    return parseFloat(a.price) - parseFloat(b.price)
  })
}

const toTitleCase = str => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

function highlight(text, query) {
  if (!query) return text
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}

export default function POSPage({
  order, setOrder,
  selectedClient, setSelectedClient,
  cashReceived, setCashReceived,
  lastPurchase, setLastPurchase,
}) {
  const { user } = useAuth()
  const { currentStore, stores, setCurrentStore } = useStore()
  const [products, setProducts]           = useState([])
  const [operator, setOperator]           = useState('Todos')
  const [clientQuery, setClientQuery]     = useState('')
  const [suggestions, setSuggestions]     = useState([])
  const [loading, setLoading]             = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ id: '', full_name: '' })
  const [savingClient, setSavingClient]   = useState(false)

  useEffect(() => { if (currentStore) fetchProducts() }, [currentStore])
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('store_id', currentStore.id)
    setProducts(sortProducts(data || []))
  }

  useEffect(() => {
    if (!clientQuery.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clients').select('*')
        .or(`full_name.ilike.%${clientQuery}%,id.ilike.%${clientQuery}%`)
        .order('full_name').limit(8)
      setSuggestions((data || []).map(c => ({ ...c, displayName: highlight(c.full_name, clientQuery) })))
    }, 180)
    return () => clearTimeout(t)
  }, [clientQuery])

  const selectClient = c => { setSelectedClient(c); setClientQuery(c.full_name); setSuggestions([]) }

  // useRef map: product_id -> input DOM node, for reliable autofocus
  const qtyRefs = useRef({})
  const lastAddedId = useRef(null)

  const addToOrder = product => {
    setOrder(prev => {
      const exists = prev.find(i => i.product_id === product.id)
      lastAddedId.current = product.id
      if (exists) return prev
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image_url || null,
        operator: product.operator,
        quantity: '',
        discount: '',
      }]
    })
  }

  // After render, focus the qty input of the last added product
  useEffect(() => {
    if (lastAddedId.current && qtyRefs.current[lastAddedId.current]) {
      qtyRefs.current[lastAddedId.current].focus()
      qtyRefs.current[lastAddedId.current].select()
    }
  }, [order.length, lastAddedId.current])

  const setQty = (product_id, val) => {
    setOrder(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: val } : i))
  }

  const setDiscount = (product_id, discVal, priceInput) => {
    setOrder(prev => prev.map(i => i.product_id === product_id
      ? { ...i, discount: discVal, _priceInput: priceInput }
      : i
    ))
  }

  const removeItem = product_id => setOrder(prev => prev.filter(i => i.product_id !== product_id))

  const clearAll = () => {
    setOrder([]); setCashReceived(''); setSelectedClient(null); setClientQuery(''); setSuggestions([])
  }

  const validOrder = order.filter(i => parseInt(i.quantity) > 0)
  const effectivePrice = (i) => Math.max(0, parseFloat(i.product_price) - (parseFloat(i.discount) || 0))
  const total   = validOrder.reduce((s, i) => s + effectivePrice(i) * parseInt(i.quantity), 0)
  const ptsEarn = Math.floor(total / 10)
  const cash    = parseFloat(cashReceived) || 0
  const change  = cash - total

  const checkout = async () => {
    if (!currentStore || !selectedClient || !validOrder.length) return
    if (order.some(i => !parseInt(i.quantity))) {
      toast('Hay productos sin cantidad válida', 'error'); return
    }
    setLoading(true)
    try {
      const { data: purchase, error: pErr } = await supabase
        .from('purchases')
        .insert({ client_id: selectedClient.id, total, points_earned: ptsEarn, created_by: user.username, store_id: currentStore.id })
        .select().single()
      if (pErr) throw pErr

      await supabase.from('purchase_items').insert(
        validOrder.map(i => ({
          purchase_id: purchase.id, product_id: i.product_id,
          product_name: i.product_name,
          product_price: effectivePrice(i),   // already discounted price
          quantity: parseInt(i.quantity),
        }))
      )
      const newPts = selectedClient.points + ptsEarn
      await supabase.from('clients').update({ points: newPts }).eq('id', selectedClient.id)

      setLastPurchase({
        client: { ...selectedClient },
        items: validOrder.map(i => ({ ...i, quantity: parseInt(i.quantity), effectivePrice: effectivePrice(i) })),
        total, ptsEarn, newPts, cash, change,
        date: new Date().toLocaleString('es-BO'),
        createdBy: user.full_name,
      })
      clearAll()
      toast(`Compra registrada. +${ptsEarn} puntos para ${selectedClient.full_name}`, 'success')
    } catch (e) {
      toast('Error al registrar: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    // Print current order directly — no registration required
    const itemsToPrint = validOrder.length > 0
      ? validOrder.map(i => ({ ...i, quantity: parseInt(i.quantity) }))
      : (lastPurchase?.items || [])

    if (!itemsToPrint.length) { toast('No hay productos en el pedido', 'error'); return }

    const totalToPrint  = itemsToPrint.reduce((s, i) => s + (i.effectivePrice != null ? parseFloat(i.effectivePrice) : Math.max(0, parseFloat(i.product_price) - (parseFloat(i.discount) || 0))) * i.quantity, 0)
    const cashToPrint   = parseFloat(cashReceived) || 0
    const changeToPrint = cashToPrint - totalToPrint
    const ptsToPrint    = Math.floor(totalToPrint / 10)
    const clientForPrint = validOrder.length > 0 ? selectedClient : (lastPurchase?.client || null)

    const receipt = {
      storeName: currentStore?.name || 'DISTRIBUIDORA COLQUE',
      client: clientForPrint,
      items: itemsToPrint.map(i => ({ ...i, effectivePrice: i.effectivePrice ?? (Math.max(0, parseFloat(i.product_price) - (parseFloat(i.discount) || 0))) })),
      total: totalToPrint,
      ptsEarn: ptsToPrint,
      newPts: (clientForPrint?.points || 0) + ptsToPrint,
      cash: cashToPrint,
      change: changeToPrint,
      date: new Date().toLocaleString('es-BO'),
      createdBy: user.full_name,
    }
    const html = buildReceiptHTML(receipt)
    const win = window.open('', '_blank', 'width=320,height=560,menubar=no,toolbar=no,location=no,status=no,scrollbars=no')
    win.document.write(html)
    win.document.close()
    win.focus()
    // onload inside the HTML triggers print immediately
  }

  const saveNewClient = async () => {
    if (!newClientForm.id.trim() || !newClientForm.full_name.trim()) {
      toast('Completa el celular/CI y el nombre', 'error'); return
    }
    const cleanName = toTitleCase(newClientForm.full_name)
    setSavingClient(true)
    try {
      const { error } = await supabase.from('clients').insert({ id: newClientForm.id.trim(), full_name: cleanName, points: 0 })
      if (error) throw error
      const newC = { id: newClientForm.id.trim(), full_name: cleanName, points: 0 }
      toast(`Cliente "${cleanName}" registrado`, 'success')
      selectClient(newC)
      setShowNewClient(false)
      setNewClientForm({ id: '', full_name: '' })
    } catch (e) {
      toast(e.message.includes('duplicate') || e.message.includes('unique')
        ? 'Ese celular/CI ya está registrado' : e.message, 'error')
    } finally {
      setSavingClient(false)
    }
  }

  // Group filtered products by category for horizontal sections
  const baseFiltered = operator === 'Todos' ? products : products.filter(p => p.operator === operator)

  // Build grouped sections: each group = { label, items[] }
  const grouped = (() => {
    const map = new Map()
    for (const p of baseFiltered) {
      const key = `${p.operator}___${p.category}`
      if (!map.has(key)) map.set(key, { operator: p.operator, category: p.category, items: [] })
      map.get(key).items.push(p)
    }
    // Sort groups by operator then category rank then category name
    return [...map.values()].sort((a, b) => {
      if (a.operator !== b.operator) return a.operator.localeCompare(b.operator)
      const ra = getCatRank(a.category), rb = getCatRank(b.category)
      if (ra !== rb) return ra - rb
      return a.category.localeCompare(b.category)
    })
  })()

  if (!currentStore) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state" style={{ maxWidth: 420, textAlign: 'center' }}>
          <Store size={40} />
          <p>Selecciona una tienda para empezar a vender</p>
          {stores.length > 0 ? (
            <select
              className="input" style={{ marginTop: 12 }}
              value=""
              onChange={e => setCurrentStore(stores.find(s => s.id === e.target.value) || null)}
            >
              <option value="" disabled>Elige una tienda…</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Aún no hay tiendas creadas. Ve a Administración → Tiendas.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', height: '100%', overflow: 'hidden' }}>

        {/* ── LEFT: products ── */}
        <div style={{ overflowY: 'auto', padding: '20px 20px 20px 24px' }}>
          {/* Operator filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {OPERATORS.map(op => (
              <button key={op} onClick={() => setOperator(op)} style={{
                padding: '9px 22px', borderRadius: 20, border: '2px solid',
                fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: '.15s',
                borderColor: operator === op ? (OP_COLORS[op] || '#999') : 'var(--border)',
                background:  operator === op ? (OP_BG[op] || '#f5f5f5')  : 'var(--surface)',
                color:       operator === op ? (OP_COLORS[op] || '#333')  : 'var(--text2)',
              }}>{op}</button>
            ))}
          </div>

          {grouped.length === 0 ? (
            <div className="empty-state"><ShoppingCart size={40} /><p>No hay productos</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {grouped.map(group => (
                <div key={`${group.operator}-${group.category}`}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 22, borderRadius: 2, background: OP_COLORS[group.operator] || '#999' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: OP_COLORS[group.operator] || 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      {group.operator}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>— {group.category}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                  {/* Horizontal scroll row */}
                  <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                    {group.items.map(p => (
                      <ProductCard key={p.id} product={p} onAdd={addToOrder} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Client */}
          <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Cliente</span>
              {/* Green "Nuevo" button */}
              <button
                onClick={() => setShowNewClient(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#16a34a', color: '#fff',
                  fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700,
                  transition: '.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
                onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}
              >
                <UserPlus size={15} /> Registrar Cliente
              </button>
            </div>
            <SearchInput
              value={clientQuery}
              onChange={v => { setClientQuery(v); if (!v) setSelectedClient(null) }}
              suggestions={suggestions}
              onSelect={selectClient}
              placeholder="Buscar por nombre, celular o CI…"
            />
            {selectedClient && (
              <div className="client-chip" style={{ marginTop: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--red),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:17, flexShrink:0 }}>
                  {selectedClient.full_name[0]}
                </div>
                <div className="client-chip-info">
                  <div className="client-chip-name" style={{ fontSize: 17 }}>{selectedClient.full_name}</div>
                  <div className="client-chip-sub">Cel/CI: {selectedClient.id}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="client-chip-pts">{selectedClient.points}</div>
                  <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700 }}>PUNTOS</div>
                </div>
              </div>
            )}
          </div>

          {/* Order items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
              Pedido actual
            </div>
            {order.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 10px' }}>
                <ShoppingCart size={32} /><p style={{ fontSize: 15 }}>Agrega productos al pedido</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.map(item => {
                  const qty     = parseInt(item.quantity) || 0
                  const disc    = parseFloat(item.discount) || 0
                  const effP    = Math.max(0, parseFloat(item.product_price) - disc)
                  const opColor = OP_COLORS[item.operator] || 'var(--text2)'
                  const opBg    = OP_BG[item.operator]    || '#f5f5f5'
                  return (
                    <div key={item.product_id} style={{
                      background: 'var(--surface2)', borderRadius: 12,
                      padding: '10px 12px', border: '1.5px solid var(--border)',
                    }}>
                      {/* Top row: image + name + qty + subtotal + remove */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Image */}
                        <div style={{ width: 50, height: 50, borderRadius: 9, flexShrink: 0, overflow: 'hidden', background: opBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.product_image
                            ? <img src={item.product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 15, fontWeight: 900, color: opColor }}>{item.operator[0]}</span>
                          }
                        </div>
                        {/* Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                          <div style={{ fontSize: 11, color: opColor, fontWeight: 700 }}>{item.operator}</div>
                        </div>
                        {/* Qty input with ref for autofocus */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase' }}>Cant.</span>
                          <input
                            ref={el => { if (el) qtyRefs.current[item.product_id] = el }}
                            type="number" min="0"
                            value={item.quantity}
                            onChange={e => setQty(item.product_id, e.target.value)}
                            placeholder="0"
                            style={{
                              width: 64, textAlign: 'center',
                              border: item.quantity === '' ? '2px solid #FCA5A5' : '1.5px solid var(--border)',
                              borderRadius: 7, padding: '6px 4px',
                              fontSize: 16, fontWeight: 800,
                              fontFamily: 'Outfit, sans-serif', outline: 'none', background: 'var(--surface)',
                            }}
                          />
                        </div>
                        {/* Subtotal */}
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)', minWidth: 62, textAlign: 'right', flexShrink: 0 }}>
                          {qty > 0 ? `Bs. ${(effP * qty).toFixed(2)}` : '—'}
                        </div>
                        {/* Remove */}
                        <button onClick={() => removeItem(item.product_id)}
                          style={{ color: 'var(--text3)', display: 'flex', cursor: 'pointer', padding: 3, flexShrink: 0, borderRadius: 5, transition: '.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = '#FEE2E2' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent' }}
                        ><X size={15} /></button>
                      </div>

                      {/* Discount row — always visible */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Precio: <span style={{ color: disc > 0 ? 'var(--text3)' : 'var(--text)', textDecoration: disc > 0 ? 'line-through' : 'none' }}>
                            Bs. {parseFloat(item.product_price).toFixed(2)}
                          </span>
                          {disc > 0 && <span style={{ color: 'var(--green)', fontWeight: 800 }}> → Bs. {effP.toFixed(2)}</span>}
                        </span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap' }}>Desc. Bs.:</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.discount}
                          onChange={e => setDiscount(item.product_id, e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: 72, textAlign: 'center',
                            border: disc > 0 ? '2px solid #6EE7B7' : '1.5px solid var(--border)',
                            borderRadius: 7, padding: '4px 6px',
                            fontSize: 14, fontWeight: 700,
                            fontFamily: 'Outfit, sans-serif', outline: 'none', background: 'var(--surface)',
                            color: disc > 0 ? 'var(--green)' : 'var(--text)',
                          }}
                        />
                      </div>
                      {disc > 0 && qty > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginTop: 4 }}>
                          Ahorro total: Bs. {(disc * qty).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

                    {/* Bottom panel */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, color: 'var(--text2)', fontSize: 16 }}>TOTAL</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>Bs. {total.toFixed(2)}</span>
            </div>

            {/* Cash & change */}
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="input-group">
                <label className="input-label">Efectivo recibido (Bs.)</label>
                <input className="input" type="number" min="0" step="0.5"
                  value={cashReceived} onChange={e => setCashReceived(e.target.value)}
                  placeholder="0.00" style={{ fontSize: 20, fontWeight: 800 }} />
              </div>
              {cash > 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 8,
                  background: change >= 0 ? 'var(--green-bg)' : '#FEE2E2',
                  border: `2px solid ${change >= 0 ? '#6EE7B7' : '#FCA5A5'}`,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {change >= 0 ? 'Cambio' : 'Falta'}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: 26, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    Bs. {Math.abs(change).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {ptsEarn > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 15, fontWeight: 700 }}>
                <Star size={16} fill="var(--green)" /> +{ptsEarn} puntos para el cliente
              </div>
            )}

            {/* Registrar compra */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 17 }}
              onClick={checkout}
              disabled={!selectedClient || validOrder.length === 0 || loading}
            >
              <CheckCircle size={19} />
              {loading ? 'Registrando…' : 'Registrar Compra'}
            </button>

            {/* Imprimir (always enabled) + Limpiar */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Blue print button — always enabled */}
              <button
                onClick={handlePrint}
                disabled={validOrder.length === 0 && !lastPurchase}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: (validOrder.length === 0 && !lastPurchase) ? '#dbeafe' : '#1d4ed8',
                  color: (validOrder.length === 0 && !lastPurchase) ? '#93c5fd' : '#fff',
                  fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700,
                  transition: '.15s',
                }}
                onMouseEnter={e => { if (validOrder.length > 0 || lastPurchase) e.currentTarget.style.background = '#1e40af' }}
                onMouseLeave={e => { if (validOrder.length > 0 || lastPurchase) e.currentTarget.style.background = '#1d4ed8' }}
              >
                <Printer size={16} /> Imprimir nota
              </button>

              {/* Red clear button */}
              <button
                onClick={clearAll}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#dc2626', color: '#fff',
                  fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700,
                  transition: '.15s', opacity: order.length === 0 && !selectedClient ? .45 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
              >
                <Trash2 size={16} /> Limpiar todo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New client modal */}
      {showNewClient && (
        <Modal title="Registrar Nuevo Cliente" onClose={() => setShowNewClient(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setShowNewClient(false)}>Cancelar</button>
            <button
              onClick={saveNewClient}
              disabled={savingClient}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#16a34a', color: '#fff',
                fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700,
              }}
            >
              <UserPlus size={16} />
              {savingClient ? 'Guardando…' : 'Registrar Cliente'}
            </button>
          </>}
        >
          <div className="input-group">
            <label className="input-label">Celular o Carnet de Identidad *</label>
            <input className="input" value={newClientForm.id}
              onChange={e => setNewClientForm(f => ({ ...f, id: e.target.value }))}
              placeholder="71234567 ó 4521890" autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Nombre Completo *</label>
            <input className="input" value={newClientForm.full_name}
              onChange={e => setNewClientForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Nombre Apellido"
              onKeyDown={e => e.key === 'Enter' && saveNewClient()} />
            {newClientForm.full_name && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                Se guardará como: <strong>{toTitleCase(newClientForm.full_name)}</strong>
              </span>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

/* ── Receipt HTML — opens in new window, prints immediately ── */
function buildReceiptHTML(p) {
  const itemsHTML = p.items.map(i => {
    const effP = i.effectivePrice ?? parseFloat(i.product_price)
    const disc = parseFloat(i.discount) || 0
    const sub  = (effP * i.quantity).toFixed(2)
    const discLine = disc > 0
      ? `<div style="font-size:12px;font-weight:700;color:#555;margin-bottom:2px">Descuento: -Bs.${disc.toFixed(2)}/u → Bs.${effP.toFixed(2)}/u</div>`
      : ''
    return `
      <div style="margin:6px 0 2px;font-size:15px;font-weight:900;word-break:break-word">${i.product_name}</div>
      ${discLine}
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-bottom:4px">
        <span>${i.quantity} x Bs.${effP.toFixed(2)}</span>
        <span>Bs. ${sub}</span>
      </div>`
  }).join('')

  const cashLine = p.cash > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:2px 0">
      <span>Efectivo:</span><span>Bs. ${p.cash.toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:2px 0">
      <span>Cambio:</span><span>Bs. ${Math.max(0, p.change).toFixed(2)}</span>
    </div>` : ''

  const clientLine = p.client
    ? `<div style="font-size:13px;font-weight:700;margin:1px 0">Cliente: ${p.client.full_name}</div><div style="font-size:13px;font-weight:700;margin:1px 0">Cel/CI: ${p.client.id}</div>`
    : ''

  const ptsLine = p.ptsEarn > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:2px 0">
      <span>Puntos ganados:</span><span>+${p.ptsEarn}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:2px 0">
      <span>Puntos acumulados:</span><span>${p.newPts}</span>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota</title>
  <style>
    @page {
      margin: 0;
      size: 72mm auto;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      font-weight: 900;
      width: 72mm;
      padding: 4px 4px 8px 4px;
      color: #000;
      background: #fff;
    }
    hr { border:none; border-top:1px dashed #000; margin:5px 0; }
  </style>
</head>
<body>
  <div style="text-align:center;font-size:18px;font-weight:900;margin-bottom:1px">${p.storeName}</div>
  <div style="text-align:center;font-size:14px;font-weight:700">Tarjetas al por Mayor</div>
  <div style="text-align:center;font-size:14px;font-weight:700">Entel · Viva · Tigo</div>
  <hr>
  <div style="font-size:13px;font-weight:700">Fecha: ${p.date}</div>
  <div style="font-size:13px;font-weight:700">Empleado: ${p.createdBy}</div>
  ${clientLine}
  <hr>
  <div style="text-align:center;font-size:15px;font-weight:900;margin:3px 0">DETALLE DE COMPRA</div>
  <hr>
  ${itemsHTML}
  <hr>
  <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;margin:3px 0">
    <span>TOTAL:</span><span>Bs. ${p.total.toFixed(2)}</span>
  </div>
  ${cashLine}
  ${ptsLine ? `<hr>${ptsLine}` : ''}
  <hr>
  <div style="text-align:center;font-size:15px;font-weight:900;margin:3px 0">** NO TIENE VALOR FISCAL **</div>
  <div style="text-align:center;font-size:14px;font-weight:700">Gracias por su compra!</div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 800);
    };
  <\/script>
</body>
</html>`
}


/* ── Product Card ─────────────────────────────────────────────── */
function ProductCard({ product, onAdd }) {
  const opColor = OP_COLORS[product.operator] || '#999'
  const opBg    = OP_BG[product.operator]    || '#F5F5F5'
  return (
    <div
      onClick={() => product.in_stock && onAdd(product)}
      style={{
        flexShrink: 0, width: 180,
        background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 14,
        overflow: 'hidden', cursor: product.in_stock ? 'pointer' : 'not-allowed',
        transition: 'all .15s', opacity: product.in_stock ? 1 : .5,
      }}
      onMouseEnter={e => {
        if (!product.in_stock) return
        e.currentTarget.style.borderColor = opColor
        e.currentTarget.style.boxShadow = `0 6px 20px ${opColor}33`
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ height: 100, background: opBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 32, fontWeight: 900, color: opColor, fontFamily: 'Outfit, sans-serif', letterSpacing: '-1px', opacity: .75 }}>{product.operator}</span>
        }
      </div>
      <div style={{ padding: '10px 13px 13px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: opColor, background: opBg, padding: '3px 9px', borderRadius: 20, border: `1.5px solid ${opColor}55` }}>
          {product.operator}
        </span>
        {!product.in_stock && <span className="badge badge-gray" style={{ marginLeft: 4 }}>Agotado</span>}
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 7, lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ fontSize: 21, fontWeight: 900, color: 'var(--red)', marginTop: 4 }}>
          Bs. {parseFloat(product.price).toFixed(2)}
        </div>
      </div>
    </div>
  )
}
