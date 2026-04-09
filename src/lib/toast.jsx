import { createRoot } from 'react-dom/client'
import { CheckCircle, XCircle, Info } from 'lucide-react'

let toastRoot = null

function getRoot() {
  let el = document.getElementById('toast-root')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast-root'
    document.body.appendChild(el)
  }
  if (!toastRoot) toastRoot = createRoot(el)
  return toastRoot
}

let toasts = []
let render = () => {}

function ToastContainer() {
  const icons = { success: CheckCircle, error: XCircle, info: Info }
  const colors = { success: '#1B8A5A', error: '#D32F2F', info: '#1565C0' }
  return (
    <div id="toast-root" style={{ position:'fixed', top:16, right:16, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => {
        const Icon = icons[t.type] || Info
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon size={18} color={colors[t.type]} strokeWidth={2.5} />
            <span>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}

export function toast(msg, type = 'info', duration = 3000) {
  const id = Date.now()
  toasts = [...toasts, { id, msg, type }]
  getRoot().render(<ToastContainer />)
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    getRoot().render(<ToastContainer />)
  }, duration)
}
