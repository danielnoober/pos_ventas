import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { toast } from '../lib/toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('employee')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) { toast('Completa todos los campos', 'error'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*, stores(id, name)')
        .eq('username', username)
        .eq('password_hash', password)
        .eq('role', role)
        .single()

      if (error || !data) { toast('Usuario o contraseña incorrectos', 'error'); return }
      login(data)
      toast(`Bienvenido, ${data.full_name}`, 'success')
      navigate('/pos')
    } catch (err) {
      toast('Error de conexión', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
      backgroundImage: `
        radial-gradient(ellipse at 15% 50%, rgba(211,47,47,.06) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 20%, rgba(21,101,192,.06) 0%, transparent 55%)
      `,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--red) 0%, var(--blue) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(211,47,47,.25)',
          }}>
            <Star size={28} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 28, fontWeight: 700 }}>
            DISTRIBUIDORA <span style={{ color: 'var(--red)' }}>COLQUE</span>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            Sistema de Venta · Tarjetas al por Mayor
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {/* Role tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--surface2)', padding: 4, borderRadius: 10 }}>
            {[['admin','Administrador'],['employee','Empleado']].map(([r, label]) => (
              <button
                key={r} onClick={() => setRole(r)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700,
                  background: role === r ? 'var(--surface)' : 'transparent',
                  color: role === r ? (r === 'admin' ? 'var(--red)' : 'var(--blue)') : 'var(--text2)',
                  boxShadow: role === r ? 'var(--shadow-sm)' : 'none',
                  transition: '.15s',
                }}
              >{label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Usuario</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nombre de usuario" autoComplete="username" />
            </div>

            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input" type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex',
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Ingresando…' : 'Ingresar al Sistema'}
            </button>
          </form>
               {/*   
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, marginTop: 20 }}>
            Admin: <strong>admin</strong> / <strong>admin123</strong> · Empleado: <strong>empleado</strong> / <strong>emp123</strong>
          </p>*/}
        </div>
      </div>
    </div>
  )
}
