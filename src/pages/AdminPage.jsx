import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { Modal, ImageUpload, Confirm } from '../components/UI'
import { Plus, Pencil, Trash2, Package, Gift, Users, Star, Image, ToggleLeft, ToggleRight } from 'lucide-react'

const toTitleCase = (str) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

const TABS = [
  { key: 'products', label: 'Productos',  Icon: Package },
  { key: 'gifts',    label: 'Regalos',    Icon: Gift },
  { key: 'clients',  label: 'Clientes',   Icon: Users },
  { key: 'slides',   label: 'Anuncios',   Icon: Image },
]

const OPERATORS = ['Entel', 'Viva', 'Tigo', 'General']
const OP_COLORS  = { Entel: '#00AEEF', Viva: '#43A047', Tigo: '#1A3A8F', General: '#F57C00' }
const OP_BG      = { Entel: '#E3F6FF', Viva: '#E8F5E9', Tigo: '#E8EDF8', General: '#FFF3E0' }

export default function AdminPage() {
  const [tab, setTab] = useState('products')
  const [confirmMsg, setConfirmMsg] = useState(null) // { msg, onConfirm }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Administración</h1>
          <p className="page-sub">Gestiona productos, regalos y clientes del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 20px', borderRadius: 10, border: '1.5px solid',
            fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: '.15s',
            borderColor: tab === key ? 'var(--red)' : 'var(--border)',
            background: tab === key ? 'var(--red-light)' : 'var(--surface)',
            color: tab === key ? 'var(--red)' : 'var(--text2)',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsCRUD setConfirm={setConfirmMsg} />}
      {tab === 'gifts'    && <GiftsCRUD    setConfirm={setConfirmMsg} />}
      {tab === 'clients'  && <ClientsCRUD  setConfirm={setConfirmMsg} />}
      {tab === 'slides'   && <SlidesCRUD    setConfirm={setConfirmMsg} />}

      {confirmMsg && (
        <Confirm
          msg={confirmMsg.msg}
          onConfirm={() => { confirmMsg.onConfirm(); setConfirmMsg(null) }}
          onCancel={() => setConfirmMsg(null)}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PRODUCTS CRUD
═══════════════════════════════════════════════ */
function ProductsCRUD({ setConfirm }) {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null) // null | 'new' | product
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])
  const fetch = async () => {
    const { data } = await supabase.from('products').select('*').order('operator').order('price')
    setItems(data || [])
  }

  const openNew = () => {
    setForm({ name: '', price: '', operator: 'Entel', category: 'Recarga', image_url: '', in_stock: true })
    setModal('new')
  }
  const openEdit = (p) => { setForm({ ...p }); setModal(p) }

  const save = async () => {
    if (!form.name || !form.price || !form.operator || !form.category) { toast('Completa todos los campos', 'error'); return }
    setSaving(true)
    try {
      if (modal === 'new') {
        const { error } = await supabase.from('products').insert({ name: form.name, price: parseFloat(form.price), operator: form.operator, category: form.category, image_url: form.image_url || null, in_stock: form.in_stock })
        if (error) throw error
        toast('Producto creado', 'success')
      } else {
        const { error } = await supabase.from('products').update({ name: form.name, price: parseFloat(form.price), operator: form.operator, category: form.category, image_url: form.image_url || null, in_stock: form.in_stock }).eq('id', modal.id)
        if (error) throw error
        toast('Producto actualizado', 'success')
      }
      setModal(null); fetch()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const del = (id) => setConfirm({ msg: '¿Eliminar este producto?', onConfirm: async () => {
    await supabase.from('products').delete().eq('id', id)
    toast('Producto eliminado', 'info'); fetch()
  }})

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Producto</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Imagen</th><th>Nombre</th><th>Operadora</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td>
                  {p.image_url
                    ? <img src={p.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: OP_BG[p.operator] || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces,serif', fontWeight: 700, color: OP_COLORS[p.operator] || '#6B7280', fontSize: 18 }}>{p.operator[0]}</div>
                  }
                </td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: OP_COLORS[p.operator] || 'var(--text2)', background: OP_BG[p.operator] || '#F3F4F6', padding: '3px 10px', borderRadius: 20 }}>
                    {p.operator}
                  </span>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 13 }}>{p.category}</td>
                <td style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'Fraunces,serif' }}>Bs. {parseFloat(p.price).toFixed(2)}</td>
                <td>
                  <span className={`badge ${p.in_stock ? 'badge-green' : 'badge-gray'}`}>
                    {p.in_stock ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Pencil size={13} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><Package size={32} /><p>Sin productos</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal
          title={modal === 'new' ? 'Nuevo Producto' : 'Editar Producto'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <ImageUpload value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} label="Imagen del producto" />
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Nombre *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Recarga Entel Bs. 10" />
            </div>
            <div className="input-group">
              <label className="input-label">Precio (Bs.) *</label>
              <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="10.00" />
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Operadora *</label>
              <select className="input" value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}>
                {OPERATORS.map(op => <option key={op}>{op}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Categoría *</label>
              <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Recarga, Plan…" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Stock</label>
            <select className="input" value={String(form.in_stock)} onChange={e => setForm(f => ({ ...f, in_stock: e.target.value === 'true' }))}>
              <option value="true">Disponible</option>
              <option value="false">Agotado</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   GIFTS CRUD
═══════════════════════════════════════════════ */
function GiftsCRUD({ setConfirm }) {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])
  const fetch = async () => {
    const { data } = await supabase.from('gifts').select('*').order('points_required')
    setItems(data || [])
  }

  const openNew = () => { setForm({ name: '', points_required: '', description: '', image_url: '' }); setModal('new') }
  const openEdit = (g) => { setForm({ ...g }); setModal(g) }

  const save = async () => {
    if (!form.name || !form.points_required) { toast('Nombre y puntos son obligatorios', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: form.name, points_required: parseInt(form.points_required), description: form.description || null, image_url: form.image_url || null }
      if (modal === 'new') {
        const { error } = await supabase.from('gifts').insert(payload)
        if (error) throw error
        toast('Regalo creado', 'success')
      } else {
        const { error } = await supabase.from('gifts').update(payload).eq('id', modal.id)
        if (error) throw error
        toast('Regalo actualizado', 'success')
      }
      setModal(null); fetch()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const del = (id) => setConfirm({ msg: '¿Eliminar este regalo?', onConfirm: async () => {
    await supabase.from('gifts').delete().eq('id', id)
    toast('Regalo eliminado', 'info'); fetch()
  }})

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Regalo</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Imagen</th><th>Nombre</th><th>Puntos</th><th>Descripción</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(g => (
              <tr key={g.id}>
                <td>
                  {g.image_url
                    ? <img src={g.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gift size={20} color="var(--blue)" /></div>
                  }
                </td>
                <td style={{ fontWeight: 600 }}>{g.name}</td>
                <td>
                  <span className="badge badge-blue" style={{ gap: 5 }}>
                    <Star size={10} fill="currentColor" /> {g.points_required} pts
                  </span>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 220 }}>{g.description || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Pencil size={13} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(g.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><Gift size={32} /><p>Sin regalos</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal
          title={modal === 'new' ? 'Nuevo Regalo' : 'Editar Regalo'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <ImageUpload value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} label="Imagen del regalo" />
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Nombre *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mochila, Vaso…" />
            </div>
            <div className="input-group">
              <label className="input-label">Puntos requeridos *</label>
              <input className="input" type="number" min="1" value={form.points_required} onChange={e => setForm(f => ({ ...f, points_required: e.target.value }))} placeholder="200" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Descripción</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve del regalo" />
          </div>
        </Modal>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   CLIENTS CRUD
═══════════════════════════════════════════════ */
function ClientsCRUD({ setConfirm }) {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetch() }, [])
  const fetch = async () => {
    const { data } = await supabase.from('clients').select('*').order('full_name')
    setItems(data || [])
  }

  const openNew = () => {
    setForm({ id: '', full_name: '', points: 0 })
    setModal('new')
  }
  const openEdit = (c) => { setForm({ ...c }); setModal(c) }

  const save = async () => {
    if (!form.id || !form.full_name) { toast('ID y nombre son obligatorios', 'error'); return }
    setSaving(true)
    try {
      const newId = form.id.trim()
      const payload = { id: newId, full_name: toTitleCase(form.full_name), points: parseInt(form.points) || 0 }
      if (modal === 'new') {
        const { error } = await supabase.from('clients').insert(payload)
        if (error) throw error
        toast('Cliente registrado', 'success')
      } else {
        const oldId = modal.id
        if (newId !== oldId) {
          // ID changed: insert new record, delete old (cascade handles purchases)
          const { error: insErr } = await supabase.from('clients').insert({ ...payload, created_at: modal.created_at })
          if (insErr) throw insErr
          await supabase.from('clients').delete().eq('id', oldId)
        } else {
          const { error } = await supabase.from('clients').update({ full_name: toTitleCase(form.full_name), points: parseInt(form.points) || 0 }).eq('id', oldId)
          if (error) throw error
        }
        toast('Cliente actualizado', 'success')
      }
      setModal(null); fetch()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const del = (id) => setConfirm({ msg: `¿Eliminar cliente ${id}? Se perderá su historial.`, onConfirm: async () => {
    await supabase.from('clients').delete().eq('id', id)
    toast('Cliente eliminado', 'info'); fetch()
  }})

  const filtered = search ? items.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())) : items

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <div style={{ position: 'relative', width: 280 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input className="input search-input-pad" style={{ paddingLeft: 36 }} placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Cliente</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cel/CI</th><th>Nombre</th><th>Puntos</th><th>Registrado</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><code style={{ background: 'var(--surface2)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>{c.id}</code></td>
                <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                <td>
                  <span className="badge badge-blue" style={{ gap: 5 }}>
                    <Star size={10} fill="currentColor" /> {c.points}
                  </span>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 12 }}>{c.created_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><Users size={32} /><p>Sin clientes</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal
          title={modal === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Celular o Carnet (ID) *</label>
              <input className="input" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="71234567 o 4521890" />
              {modal !== 'new' && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Puedes editar el cel/CI si el cliente cambió de número</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Puntos actuales</label>
              <input className="input" type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Nombre completo *</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre Apellido" />
          </div>
        </Modal>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   SLIDES CRUD — Anuncios para pantalla cliente
═══════════════════════════════════════════════ */
function SlidesCRUD({ setConfirm }) {
  const [items, setItems]   = useState([])
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])
  const fetch = async () => {
    const { data } = await supabase.from('slides').select('*').order('sort_order')
    setItems(data || [])
  }

  const openNew  = () => { setForm({ title: '', image_url: '', sort_order: items.length, active: true }); setModal('new') }
  const openEdit = s => { setForm({ ...s }); setModal(s) }

  const save = async () => {
    if (!form.image_url) { toast('Sube una imagen primero', 'error'); return }
    setSaving(true)
    try {
      const payload = { title: form.title || null, image_url: form.image_url, sort_order: parseInt(form.sort_order) || 0, active: form.active }
      if (modal === 'new') {
        const { error } = await supabase.from('slides').insert(payload)
        if (error) throw error
        toast('Anuncio creado', 'success')
      } else {
        const { error } = await supabase.from('slides').update(payload).eq('id', modal.id)
        if (error) throw error
        toast('Anuncio actualizado', 'success')
      }
      setModal(null); fetch()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const del = id => setConfirm({ msg: '¿Eliminar este anuncio?', onConfirm: async () => {
    await supabase.from('slides').delete().eq('id', id)
    toast('Anuncio eliminado', 'info'); fetch()
  }})

  const toggleActive = async (s) => {
    await supabase.from('slides').update({ active: !s.active }).eq('id', s.id)
    fetch()
  }

  return (
    <>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          Estos slides se muestran en la pantalla del cliente cuando no hay pedido activo.
        </p>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Anuncio</button>
      </div>

      {/* Preview grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {items.map(s => (
          <div key={s.id} className="card" style={{ overflow: 'hidden', opacity: s.active ? 1 : .55 }}>
            <div style={{ height: 140, background: 'var(--surface2)', overflow: 'hidden', position: 'relative' }}>
              <img src={s.image_url} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <span className={`badge ${s.active ? 'badge-green' : 'badge-gray'}`}>{s.active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                <span style={{ background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>Orden: {s.sort_order}</span>
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title || <span style={{ color: 'var(--text3)' }}>Sin título</span>}</div>
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(s)} title={s.active ? 'Desactivar' : 'Activar'}>
                  {s.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />} {s.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}><Image size={36} /><p>Sin anuncios aún. Agrega imágenes para mostrar en la pantalla del cliente.</p></div>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Nuevo Anuncio' : 'Editar Anuncio'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <ImageUpload value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} label="Imagen del anuncio *" />
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Título (opcional)</label>
              <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Oferta especial…" />
            </div>
            <div className="input-group">
              <label className="input-label">Orden</label>
              <input className="input" type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Estado</label>
            <select className="input" value={String(form.active)} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}>
              <option value="true">Activo (se muestra)</option>
              <option value="false">Inactivo (oculto)</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}
