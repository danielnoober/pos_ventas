import { useRef, useState } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { uploadImage } from '../lib/supabase'
import { toast } from '../lib/toast'

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Image Upload ─────────────────────────────────────────────
export function ImageUpload({ value, onChange, label = 'Imagen' }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef()

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Solo se permiten imágenes', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('La imagen no puede superar 5MB', 'error'); return }
    try {
      setUploading(true)
      const url = await uploadImage(file)
      onChange(url)
      toast('Imagen subida correctamente', 'success')
    } catch (e) {
      toast('Error al subir imagen: ' + e.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="input-group">
      <span className="input-label">{label}</span>
      <div
        className="img-upload-zone"
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {uploading ? (
          <p style={{ color: 'var(--blue)', fontSize: 13 }}>Subiendo...</p>
        ) : value ? (
          <>
            <img src={value} alt="preview" className="img-preview" />
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>Haz clic para cambiar</p>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text2)' }}>
            <Upload size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>Arrastra una imagen o haz clic para seleccionar</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>PNG, JPG, WEBP — máx. 5MB</span>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────
export function Confirm({ msg, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div className="modal-header"><h2>Confirmar acción</h2></div>
        <div className="modal-body"><p style={{ color: 'var(--text2)' }}>{msg}</p></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Search Input with suggestions ───────────────────────────
export function SearchInput({ value, onChange, suggestions, onSelect, placeholder }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef()

  const handleClickOutside = (e) => {
    if (!wrap.current?.contains(e.target)) setOpen(false)
  }
  // mount/unmount listener
  useState(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  return (
    <div className="search-wrap" ref={wrap}>
      <span className="search-icon-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </span>
      <input
        className="input search-input-pad"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map(s => (
            <div key={s.id} className="suggestion-row" onMouseDown={() => { onSelect(s); setOpen(false) }}>
              <div>
                <div className="sug-name" dangerouslySetInnerHTML={{ __html: s.displayName || s.full_name }} />
                <div className="sug-sub">{s.id}</div>
              </div>
              <div className="sug-pts">{s.points} pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
