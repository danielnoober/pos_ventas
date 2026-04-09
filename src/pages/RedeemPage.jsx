import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useAuth } from '../lib/auth'
import { SearchInput } from '../components/UI'
import { Gift, Star, CheckCircle, AlertCircle } from 'lucide-react'

export default function RedeemPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [client, setClient] = useState(null)
  const [gifts, setGifts] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchGifts(); fetchRedemptions() }, [])

  const fetchGifts = async () => {
    const { data } = await supabase.from('gifts').select('*').order('points_required')
    setGifts(data || [])
  }

  const fetchRedemptions = async () => {
    const { data } = await supabase.from('redemptions').select('*, clients(full_name)').order('created_at', { ascending: false }).limit(15)
    setRedemptions(data || [])
  }

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clients').select('*').or(`full_name.ilike.%${query}%,id.ilike.%${query}%`).limit(8)
      setSuggestions((data || []).map(c => ({
        ...c,
        displayName: c.full_name.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>'),
      })))
    }, 180)
    return () => clearTimeout(t)
  }, [query])

  const selectClient = (c) => { setClient(c); setQuery(c.full_name); setSuggestions([]) }

  const redeem = async (gift) => {
    if (!client) { toast('Selecciona un cliente primero', 'error'); return }
    if (client.points < gift.points_required) {
      toast(`Puntos insuficientes. Tiene ${client.points}, necesita ${gift.points_required}`, 'error')
      return
    }
    setLoading(true)
    try {
      const newPts = client.points - gift.points_required
      await supabase.from('clients').update({ points: newPts }).eq('id', client.id)
      await supabase.from('redemptions').insert({
        client_id: client.id,
        gift_id: gift.id,
        gift_name: gift.name,
        points_used: gift.points_required,
        created_by: user.username,
      })
      setClient(prev => ({ ...prev, points: newPts }))
      fetchRedemptions()
      toast(`¡Canje exitoso! Se usaron ${gift.points_required} puntos por "${gift.name}"`, 'success')
    } catch (e) {
      toast('Error al canjear: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', height: '100%', overflow: 'hidden' }}>
      {/* LEFT */}
      <div style={{ overflowY: 'auto', padding: '24px 24px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Canjear Puntos</h1>
            <p className="page-sub">Verifica los puntos del cliente y entrega su regalo</p>
          </div>
        </div>

        {/* Client search */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>
            Cliente
          </div>
          <SearchInput value={query} onChange={setQuery} suggestions={suggestions} onSelect={selectClient} placeholder="Buscar por nombre, celular o CI…" />
          {client && (
            <div className="client-chip" style={{ marginTop: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--red),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:17, flexShrink:0 }}>
                {client.full_name[0]}
              </div>
              <div className="client-chip-info">
                <div className="client-chip-name">{client.full_name}</div>
                <div className="client-chip-sub">Cel/CI: {client.id}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="client-chip-pts">{client.points}</div>
                <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>PUNTOS</div>
              </div>
            </div>
          )}
        </div>

        {/* Gifts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
          {gifts.map(gift => {
            const canRedeem = client && client.points >= gift.points_required
            const missing = client ? gift.points_required - client.points : null
            return (
              <div key={gift.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: client && !canRedeem ? .7 : 1, transition: '.2s' }}>
                {/* Image */}
                <div style={{ height: 130, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {gift.image_url ? (
                    <img src={gift.image_url} alt={gift.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Gift size={48} strokeWidth={1} style={{ color: 'var(--border2)' }} />
                  )}
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{gift.name}</div>
                  {gift.description && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{gift.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Star size={14} fill="#1565C0" color="#1565C0" />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>{gift.points_required} pts</span>
                  </div>
                  {client && !canRedeem && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)', fontSize: 12 }}>
                      <AlertCircle size={13} /> Faltan {missing} puntos
                    </div>
                  )}
                  <button
                    className={`btn ${canRedeem ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
                    onClick={() => redeem(gift)}
                    disabled={!client || !canRedeem || loading}
                  >
                    <CheckCircle size={15} />
                    {canRedeem ? 'Canjear' : 'Puntos insuficientes'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT — Recent redemptions */}
      <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto', padding: '24px 20px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gift size={16} /> Canjes Recientes
        </h3>
        {redemptions.length === 0 ? (
          <div className="empty-state"><Gift size={28} /><p>Sin canjes aún</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {redemptions.map(r => (
              <div key={r.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.clients?.full_name || r.client_id}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{r.gift_name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                  <span className="badge badge-red">−{r.points_used} pts</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString('es-BO')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
