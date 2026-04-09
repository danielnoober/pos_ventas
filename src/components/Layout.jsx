import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, ClipboardList, Gift, Settings, LogOut, Star, Monitor } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const openCustomerScreen = () => {
    window.open('/cliente', 'pantalla-cliente', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
  }

  const navItems = [
    { to: '/pos',     label: 'Punto de Venta', Icon: ShoppingCart },
    { to: '/history', label: 'Historial',       Icon: ClipboardList },
    { to: '/redeem',  label: 'Canjear Puntos',  Icon: Gift },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Administración', Icon: Settings }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{
        height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
        boxShadow: 'var(--shadow-sm)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--red) 0%, var(--blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={16} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, letterSpacing: '-.3px' }}>
            DISTRIBUIDORA <span style={{ color: 'var(--red)' }}>COLQUE</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: 'Outfit, sans-serif', transition: '.15s',
                  background: isActive ? 'var(--red-light)' : 'transparent',
                  color: isActive ? 'var(--red)' : 'var(--text2)',
                }}>
                  <Icon size={15} />{label}
                </button>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={openCustomerScreen}>
            <Monitor size={15} /> Pantalla Cliente
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,var(--red),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{user?.full_name?.[0] || 'U'}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name}</div>
              <div style={{ fontSize: 11, color: user?.role === 'admin' ? 'var(--red)' : 'var(--blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                {user?.role === 'admin' ? 'Admin' : 'Empleado'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}><LogOut size={15} /> Salir</button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
