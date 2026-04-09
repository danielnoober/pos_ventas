import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { broadcastState } from './lib/posChannel'
import Layout from './components/Layout'
import LoginPage      from './pages/LoginPage'
import POSPage        from './pages/POSPage'
import HistoryPage    from './pages/HistoryPage'
import RedeemPage     from './pages/RedeemPage'
import AdminPage      from './pages/AdminPage'
import CustomerScreen from './pages/CustomerScreen'

function RequireAuth({ children, adminOnly = false }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/pos" replace />
  return children
}

function AppInner() {
  const { user } = useAuth()
  const [order, setOrder]               = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [cashReceived, setCashReceived]  = useState('')
  const [lastPurchase, setLastPurchase]  = useState(null)

  // Broadcast state whenever it changes
  useEffect(() => {
    broadcastState({ order, client: selectedClient, cashReceived, lastPurchase })
  }, [order, selectedClient, cashReceived, lastPurchase])

  if (!user) {
    return (
      <Routes>
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/cliente" element={<CustomerScreen />} />
        <Route path="*"        element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      {/* Customer screen — standalone full-screen page */}
      <Route path="/cliente" element={<CustomerScreen />} />

      {/* Operator app */}
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/pos" element={
              <RequireAuth>
                <POSPage
                  order={order} setOrder={setOrder}
                  selectedClient={selectedClient} setSelectedClient={setSelectedClient}
                  cashReceived={cashReceived} setCashReceived={setCashReceived}
                  lastPurchase={lastPurchase} setLastPurchase={setLastPurchase}
                />
              </RequireAuth>
            } />
            <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
            <Route path="/redeem"  element={<RequireAuth><RedeemPage /></RequireAuth>} />
            <Route path="/admin"   element={<RequireAuth adminOnly><AdminPage /></RequireAuth>} />
            <Route path="/login"   element={<Navigate to="/pos" replace />} />
            <Route path="*"        element={<Navigate to="/pos" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthProvider>
  )
}
