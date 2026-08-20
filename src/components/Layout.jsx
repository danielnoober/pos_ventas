import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, ClipboardList, Gift, Settings, LogOut, Star, Monitor, Store, Menu, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'

/* Store switcher (admin) / store badge (employee) + Pantalla Cliente + user card + logout.
   Rendered twice: inline in the desktop header, and stacked inside the mobile menu panel. */
function AccountCluster({ user, stores, currentStore, setCurrentStore, openCustomerScreen, handleLogout, column }) {
  return (
    <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', alignItems: column ? 'stretch' : 'center', gap: column ? 12 : 10, width: column ? '100%' : 'auto' }}>
      {user?.role === 'admin' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <Store size={14} color="var(--text2)" />
          <select
            value={currentStore?.id || ''}
            onChange={e => setCurrentStore(stores.find(s => s.id === e.target.value) || null)}
            style={{
              border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', flex: column ? 1 : 'none',
              fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)',
            }}
          >
            {stores.length === 0 && <option value="">Sin tiendas</option>}
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      ) : currentStore && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <Store size={14} color="var(--text2)" />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600 }}>{currentStore.name}</span>
        </div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={openCustomerScreen} disabled={!currentStore} title={!currentStore ? 'Selecciona una tienda primero' : ''} style={column ? { justifyContent: 'center' } : undefined}>
        <Monitor size={15} /> Pantalla Cliente
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,var(--red),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{user?.full_name?.[0] || 'U'}</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name}</div>
          <div style={{ fontSize: 11, color: user?.role === 'admin' ? 'var(--red)' : 'var(--blue)', fontWeight: 700, textTransform: 'uppercase' }}>
            {user?.role === 'admin' ? 'Admin' : 'Empleado'}
          </div>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={column ? { justifyContent: 'center' } : undefined}>
        <LogOut size={15} /> Salir
      </button>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { stores, currentStore, setCurrentStore } = useStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const openCustomerScreen = () => {
    if (!currentStore) return
    window.open(`/cliente/${currentStore.id}`, `pantalla-cliente-${currentStore.id}`, 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
  }

  const navItems = [
    { to: '/pos',     label: 'Punto de Venta', Icon: ShoppingCart },
    { to: '/history', label: 'Historial',       Icon: ClipboardList },
    { to: '/redeem',  label: 'Canjear Puntos',  Icon: Gift },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Administración', Icon: Settings }] : []),
  ]

  const accountProps = { user, stores, currentStore, setCurrentStore, openCustomerScreen, handleLogout }
  const mobileAccountProps = {
    ...accountProps,
    setCurrentStore: (s) => { setCurrentStore(s); setMenuOpen(false) },
    openCustomerScreen: () => { openCustomerScreen(); setMenuOpen(false) },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{
        height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
        boxShadow: 'var(--shadow-sm)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--red) 0%, var(--blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Star size={16} color="#fff" fill="#fff" />
          </div>
          <span className="desktop-only" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 800, letterSpacing: '-.3px' }}>
            DISTRIBUIDORA <span style={{ color: 'var(--red)' }}>COLQUE</span>
          </span>
          <span className="mobile-only" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-.3px' }}>
            POS <span style={{ color: 'var(--red)' }}>COLQUE</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="desktop-only" style={{ display: 'flex', gap: 4, flex: 1 }}>
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

        {/* Desktop right cluster */}
        <div className="desktop-only" style={{ marginLeft: 'auto' }}>
          <AccountCluster {...accountProps} />
        </div>

        {/* Mobile: pushes hamburger to the right + toggles the account panel */}
        <button
          className="mobile-only btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Mobile account panel */}
      {menuOpen && (
        <>
          <div
            className="mobile-only"
            style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 190 }}
            onClick={() => setMenuOpen(false)}
          />
          <div className="mobile-only" style={{
            position: 'fixed', top: 58, left: 0, right: 0, zIndex: 200,
            background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)', padding: 16,
          }}>
            <AccountCluster {...mobileAccountProps} column />
          </div>
        </>
      )}

      <main className="app-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 'var(--mobile-nav-h)',
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 10px rgba(0,0,0,.06)', zIndex: 150,
        justifyContent: 'space-around', alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {navItems.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                height: '100%', color: isActive ? 'var(--red)' : 'var(--text2)',
              }}>
                <Icon size={19} />
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Outfit, sans-serif', textAlign: 'center', lineHeight: 1.1 }}>
                  {label.split(' ')[0]}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
