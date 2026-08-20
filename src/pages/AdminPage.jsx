import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { useStore } from '../lib/store'
import { Modal, ImageUpload, Confirm } from '../components/UI'
import { Plus, Pencil, Trash2, Package, Gift, Users, Star, Image, ToggleLeft, ToggleRight, Store, UserCog, Copy } from 'lucide-react'

const toTitleCase = (str) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

const TABS = [
  { key: 'products', label: 'Productos',  Icon: Package },
  { key: 'gifts',    label: 'Regalos',    Icon: Gift },
  { key: 'clients',  label: 'Clientes',   Icon: Users },
  { key: 'slides',   label: 'Anuncios',   Icon: Image },
  { key: 'stores',   label: 'Tiendas',    Icon: Store },
  { key: 'users',    label: 'Empleados',  Icon: UserCog },
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
      {tab === 'stores'   && <StoresCRUD   setConfirm={setConfirmMsg} />}
      {tab === 'users'    && <UsersCRUD    setConfirm={setConfirmMsg} />}

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
  const { currentStore, stores, setCurrentStore } = useStore()
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null) // null | 'new' | product
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [copyModal, setCopyModal] = useState(false)
  const [copySource, setCopySource] = useState('')
  const [copying, setCopying] = useState(false)

  useEffect(() => { if (currentStore) fetch(); else setItems([]) }, [currentStore])
  const fetch = async () => {
    const { data } = await supabase.from('products').select('*').eq('store_id', currentStore.id).order('operator').order('price')
    setItems(data || [])
  }

  const copyFromStore = async () => {
    if (!copySource) return
    setCopying(true)
    try {
      const { data: source, error: fErr } = await supabase.from('products').select('*').eq('store_id', copySource)
      if (fErr) throw fErr
      if (!source || source.length === 0) { toast('Esa tienda no tiene productos para copiar', 'error'); return }
      const rows = source.map(p => ({
        name: p.name, price: p.price, operator: p.operator, category: p.category,
        image_url: p.image_url, in_stock: p.in_stock, store_id: currentStore.id,
      }))
      const { error: iErr } = await supabase.from('products').insert(rows)
      if (iErr) throw iErr
      toast(`${rows.length} productos copiados a ${currentStore.name}`, 'success')
      setCopyModal(false); setCopySource(''); fetch()
    } catch (e) { toast(e.message, 'error') } finally { setCopying(false) }
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
        const { error } = await supabase.from('products').insert({ name: form.name, price: parseFloat(form.price), operator: form.operator, category: form.category, image_url: form.image_url || null, in_stock: form.in_stock, store_id: currentStore.id })
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

  if (!currentStore) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <Store size={36} />
        <p>{stores.length === 0 ? 'Crea una tienda primero en la pestaña "Tiendas"' : 'Selecciona una tienda arriba para gestionar sus productos'}</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text2)' }}>
          Gestionando productos de:
          <select
            className="input" style={{ width: 'auto', fontWeight: 700 }}
            value={currentStore.id}
            onChange={e => setCurrentStore(stores.find(s => s.id === e.target.value) || null)}
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {stores.length > 1 && (
            <button className="btn btn-ghost" onClick={() => setCopyModal(true)}><Copy size={15} /> Copiar de otra tienda</button>
          )}
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Producto</button>
        </div>
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

      {copyModal && (
        <Modal title="Copiar productos de otra tienda" onClose={() => setCopyModal(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setCopyModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={copyFromStore} disabled={!copySource || copying}>
              <Copy size={15} /> {copying ? 'Copiando…' : 'Copiar productos'}
            </button>
          </>}
        >
          <div className="input-group">
            <label className="input-label">Tienda de origen</label>
            <select className="input" value={copySource} onChange={e => setCopySource(e.target.value)}>
              <option value="" disabled>Elige una tienda…</option>
              {stores.filter(s => s.id !== currentStore.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            Se copiarán todos los productos (nombre, precio, operadora, categoría, imagen y stock) de esa tienda hacia <strong>{currentStore.name}</strong> como productos nuevos e independientes — podrás ajustar los precios después. Si vuelves a copiar, se duplicarán.
          </p>
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

/* ═══════════════════════════════════════════════
   STORES CRUD — Tiendas
═══════════════════════════════════════════════ */
function StoresCRUD({ setConfirm }) {
  const { stores: items, refreshStores } = useStore()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const openNew  = () => { setForm({ name: '', address: '', active: true }); setModal('new') }
  const openEdit = s => { setForm({ ...s }); setModal(s) }

  const save = async () => {
    if (!form.name?.trim()) { toast('El nombre de la tienda es obligatorio', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), address: form.address?.trim() || null, active: form.active }
      if (modal === 'new') {
        const { error } = await supabase.from('stores').insert(payload)
        if (error) throw error
        toast('Tienda creada', 'success')
      } else {
        const { error } = await supabase.from('stores').update(payload).eq('id', modal.id)
        if (error) throw error
        toast('Tienda actualizada', 'success')
      }
      setModal(null); refreshStores()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  const del = (s) => setConfirm({ msg: `¿Eliminar la tienda "${s.name}"? Esto fallará si aún tiene productos o empleados asignados.`, onConfirm: async () => {
    const { error } = await supabase.from('stores').delete().eq('id', s.id)
    if (error) toast('No se pudo eliminar: ' + error.message, 'error')
    else toast('Tienda eliminada', 'info')
    refreshStores()
  }})

  const toggleActive = async (s) => {
    await supabase.from('stores').update({ active: !s.active }).eq('id', s.id)
    refreshStores()
  }

  return (
    <>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          Cada tienda tiene su propio catálogo de productos y precios, y su propia Pantalla Cliente en tiempo real.
        </p>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nueva Tienda</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Dirección</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text2)', fontSize: 13 }}>{s.address || '—'}</td>
                <td><span className={`badge ${s.active ? 'badge-green' : 'badge-gray'}`}>{s.active ? 'Activa' : 'Inactiva'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(s)} title={s.active ? 'Desactivar' : 'Activar'}>
                      {s.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil size={13} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(s)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4}><div className="empty-state"><Store size={32} /><p>Sin tiendas aún. Crea la primera.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Nueva Tienda' : 'Editar Tienda'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <div className="input-group">
            <label className="input-label">Nombre *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sucursal Norte" autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Dirección</label>
            <input className="input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Siempre Viva 123" />
          </div>
          <div className="input-group">
            <label className="input-label">Estado</label>
            <select className="input" value={String(form.active)} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   USERS CRUD — Empleados (asignación de tienda)
═══════════════════════════════════════════════ */
function UsersCRUD({ setConfirm }) {
  const { stores } = useStore()
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])
  const fetch = async () => {
    const { data } = await supabase.from('system_users').select('*, stores(id, name)').order('full_name')
    setItems(data || [])
  }

  const openNew  = () => { setForm({ username: '', password_hash: '', full_name: '', role: 'employee', store_id: stores[0]?.id || '' }); setModal('new') }
  const openEdit = u => { setForm({ ...u, store_id: u.store_id || '' }); setModal(u) }

  const save = async () => {
    if (!form.username?.trim() || !form.password_hash?.trim() || !form.full_name?.trim()) {
      toast('Usuario, contraseña y nombre son obligatorios', 'error'); return
    }
    if (form.role === 'employee' && !form.store_id) {
      toast('Asigna una tienda al empleado', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        username: form.username.trim(),
        password_hash: form.password_hash.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        store_id: form.role === 'employee' ? form.store_id : null,
      }
      if (modal === 'new') {
        const { error } = await supabase.from('system_users').insert(payload)
        if (error) throw error
        toast('Empleado creado', 'success')
      } else {
        const { error } = await supabase.from('system_users').update(payload).eq('id', modal.id)
        if (error) throw error
        toast('Empleado actualizado', 'success')
      }
      setModal(null); fetch()
    } catch (e) {
      toast(e.message.includes('duplicate') || e.message.includes('unique') ? 'Ese usuario ya existe' : e.message, 'error')
    } finally { setSaving(false) }
  }

  const del = (u) => setConfirm({ msg: `¿Eliminar el usuario "${u.username}"?`, onConfirm: async () => {
    await supabase.from('system_users').delete().eq('id', u.id)
    toast('Usuario eliminado', 'info'); fetch()
  }})

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nuevo Usuario</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Tienda</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id}>
                <td><code style={{ background: 'var(--surface2)', padding: '2px 7px', borderRadius: 5, fontSize: 12 }}>{u.username}</code></td>
                <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 13 }}>{u.role === 'admin' ? 'Todas' : (u.stores?.name || '— sin asignar —')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><Pencil size={13} /> Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(u)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><UserCog size={32} /><p>Sin usuarios</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal
          title={modal === 'new' ? 'Nuevo Usuario' : 'Editar Usuario'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>}
        >
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Usuario *</label>
              <input className="input" value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="jperez" />
            </div>
            <div className="input-group">
              <label className="input-label">Contraseña *</label>
              <input className="input" value={form.password_hash || ''} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Nombre completo *</label>
            <input className="input" value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre Apellido" />
          </div>
          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Rol *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Tienda asignada {form.role === 'employee' && '*'}</label>
              <select
                className="input" value={form.store_id || ''}
                disabled={form.role === 'admin'}
                onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
              >
                <option value="" disabled>Elige una tienda…</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {form.role === 'admin' && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Los administradores pueden operar cualquier tienda</span>}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
