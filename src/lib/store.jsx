import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

const StoreContext = createContext(null)

const STORAGE_KEY = 'fps_current_store'

export function StoreProvider({ children }) {
  const { user } = useAuth()
  const [stores, setStores] = useState([])
  const [currentStore, setCurrentStoreState] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshStores = useCallback(async () => {
    const { data } = await supabase.from('stores').select('*').order('name')
    setStores(data || [])
    return data || []
  }, [])

  useEffect(() => {
    if (!user) {
      setStores([]); setCurrentStoreState(null); setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    refreshStores().then(list => {
      if (cancelled) return
      if (user.role === 'employee') {
        setCurrentStoreState(list.find(s => s.id === user.store_id) || null)
      } else {
        const savedId = sessionStorage.getItem(STORAGE_KEY)
        const saved = savedId ? list.find(s => s.id === savedId) : null
        setCurrentStoreState(saved || list.find(s => s.active) || list[0] || null)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user, refreshStores])

  // Employees are pinned to their assigned store; only admins can switch.
  const setCurrentStore = (store) => {
    if (user?.role === 'employee') return
    setCurrentStoreState(store)
    if (store) sessionStorage.setItem(STORAGE_KEY, store.id)
    else sessionStorage.removeItem(STORAGE_KEY)
  }

  return (
    <StoreContext.Provider value={{ stores, currentStore, setCurrentStore, refreshStores, loading }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
