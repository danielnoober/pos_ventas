import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SearchInput } from '../components/UI'
import { ClipboardList, Gift, Star } from 'lucide-react'

function highlight(text, query) {
  if (!query) return text
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}

const OP_COLORS = { Entel: '#00A8E8', Viva: '#E30613', Tigo: '#003087', General: '#6B7280' }

export default function HistoryPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [client, setClient] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('clients').select('*')
        .or(`full_name.ilike.%${query}%,id.ilike.%${query}%`)
        .limit(8)
      setSuggestions((data || []).map(c => ({ ...c, displayName: highlight(c.full_name, query) })))    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const selectClient = async (c) => {
    setClient(c)
    setQuery(c.full_name)
    setSuggestions([])
    setLoading(true)
    const [{ data: purch }, { data: reds }] = await Promise.all([
      supabase.from('purchases').select('*, purchase_items(*), stores(name)').eq('client_id', c.id).order('created_at', { ascending: false }),
      supabase.from('redemptions').select('*').eq('client_id', c.id).order('created_at', { ascending: false }),
    ])
    setPurchases(purch || [])
    setRedemptions(reds || [])
    // refresh points
    const { data: fresh } = await supabase.from('clients').select('points').eq('id', c.id).single()
    if (fresh) setClient(prev => ({ ...prev, points: fresh.points }))
    setLoading(false)
  }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Compras</h1>
          <p className="page-sub">Consulta las compras y canjes de cada cliente</p>
        </div>
      </div>

      <div style={{ maxWidth: 540, marginBottom: 28 }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          suggestions={suggestions}
          onSelect={selectClient}
          placeholder="Buscar cliente por nombre, celular o CI…"
        />
      </div>

      {loading && <p style={{ color: 'var(--text2)' }}>Cargando…</p>}

      {client && !loading && (
        <>
          {/* Client summary */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,var(--red),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:20 }}>
                {client.full_name[0]}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{client.full_name}</div>
                <div style={{ color: 'var(--text2)', fontSize: 13 }}>Cel/CI: {client.id} · Registrado: {client.created_at}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--blue-light)', border: '1.5px solid #90CAF9', borderRadius: 12, padding: '12px 22px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 32, fontWeight: 700, color: 'var(--blue)' }}>{client.points}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', opacity: .7, textTransform: 'uppercase' }}>Puntos actuales</div>
            </div>
          </div>

          {/* Purchases */}
          <h2 style={{ fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} /> Compras ({purchases.length})
          </h2>
          {purchases.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px' }}><ClipboardList size={32} /><p>Sin compras registradas</p></div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: 32 }}>
              <table>
                <thead><tr>
                  <th>Fecha</th>
                  <th>Tienda</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Puntos ganados</th>
                  <th>Empleado</th>
                </tr></thead>
                <tbody>
                  {purchases.map(p => (
                    <tr key={p.id}>
                      <td data-label="Fecha" style={{ color: 'var(--text2)', fontSize: 12 }}>{new Date(p.created_at).toLocaleString('es-BO')}</td>
                      <td data-label="Tienda" style={{ fontSize: 12 }}>{p.stores?.name || '—'}</td>
                      <td data-label="Productos" className="cell-block">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(p.purchase_items || []).map((it, i) => (
                            <span key={i} style={{ fontSize: 11, background: 'var(--surface2)', borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              {it.quantity}× {it.product_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td data-label="Total"><strong style={{ color: 'var(--red)' }}>Bs. {parseFloat(p.total).toFixed(2)}</strong></td>
                      <td data-label="Puntos"><span className="badge badge-green"><Star size={10} fill="currentColor" /> +{p.points_earned} pts</span></td>
                      <td data-label="Empleado" style={{ color: 'var(--text2)', fontSize: 12 }}>{p.created_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Redemptions */}
          <h2 style={{ fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={18} /> Canjes de Puntos ({redemptions.length})
          </h2>
          {redemptions.length === 0 ? (
            <div className="empty-state" style={{ padding: '28px' }}><Gift size={32} /><p>Sin canjes registrados</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Regalo</th><th>Puntos usados</th><th>Empleado</th></tr></thead>
                <tbody>
                  {redemptions.map(r => (
                    <tr key={r.id}>
                      <td data-label="Fecha" style={{ color: 'var(--text2)', fontSize: 12 }}>{new Date(r.created_at).toLocaleString('es-BO')}</td>
                      <td data-label="Regalo"><strong>{r.gift_name}</strong></td>
                      <td data-label="Puntos"><span className="badge badge-red">−{r.points_used} pts</span></td>
                      <td data-label="Empleado" style={{ color: 'var(--text2)', fontSize: 12 }}>{r.created_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!client && !loading && (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <ClipboardList size={48} />
          <p>Busca un cliente para ver su historial</p>
        </div>
      )}
    </div>
  )
}
