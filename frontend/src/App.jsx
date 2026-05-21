import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Causaciones from './components/Causaciones'
import Automatizaciones from './components/Automatizaciones'
import Historial from './components/Historial'
import Configuracion from './components/Configuracion'
import Perfil from './components/Perfil'
import DemoBanner from './components/DemoBanner'
import Login from './components/Login'
import ToastContainer from './components/ui/Toast'
import Icon from './components/ui/Icon'
import { useToast } from './hooks/useToast'
import { syncAll, getAppStatus, getStats } from './api/client'

/* ── Dynamic page subtitle ───────────────────────────────────────────────── */
const mesActual = () => new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

const PAGE_META = {
  dashboard:        { title: 'Dashboard',             sub: () => `Resumen operativo · ${mesActual()}` },
  causaciones:      { title: 'Causaciones',            sub: () => 'Asientos contables · Siigo / Alegra' },
  automatizaciones: { title: 'Automatizaciones',       sub: () => 'Tareas programadas y recurrentes' },
  historial:        { title: 'Historial de Asientos',  sub: () => 'Registro de operaciones contables' },
  config:           { title: 'Configuración',          sub: () => 'APIs y preferencias del sistema' },
  perfil:           { title: 'Mi Perfil',              sub: () => 'Información personal y seguridad' },
}

export default function App() {
  const [user,      setUser]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('cf_user')) } catch { return null }
  })
  const [page,      setPage]      = useState('dashboard')
  const [appStatus, setAppStatus] = useState(null)
  const [errores,   setErrores]   = useState(0)
  const [syncing,   setSyncing]   = useState(false)
  const { toasts,   toast }       = useToast()

  /* ── Auth helpers ─────────────────────────────────────────────────────── */
  const handleAuth = (u) => { setUser(u); setPage('dashboard') }

  const handleLogout = () => {
    localStorage.removeItem('cf_token')
    localStorage.removeItem('cf_user')
    setUser(null)
    setAppStatus(null)
    setErrores(0)
  }

  const handleUserUpdate = (u) => setUser(u)

  /* ── Load app status + stats ──────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return
    getAppStatus()
      .then(setAppStatus)
      .catch(() => setAppStatus({ demo_mode: true, siigo: { mode: 'demo' }, alegra: { mode: 'demo' } }))
    getStats()
      .then(s => setErrores(s.errores || 0))
      .catch(() => {})
  }, [user])

  const refreshStatus = () => {
    getAppStatus().then(setAppStatus).catch(() => {})
    getStats().then(s => setErrores(s.errores || 0)).catch(() => {})
  }

  /* ── Sync ─────────────────────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true)
    try {
      const results = await syncAll()
      const total   = results.reduce((s, r) => s + r.synced, 0)
      const hasDemo = results.some(r => r.message.includes('DEMO'))
      toast(`Sincronización completada — ${total} registros${hasDemo ? ' (modo demo)' : ''}`, 'success')
      refreshStatus()
    } catch {
      toast('Error al sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  /* ── Not logged in ────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <>
        <Login onAuth={handleAuth} />
        <ToastContainer toasts={toasts} />
      </>
    )
  }

  /* ── Main app ─────────────────────────────────────────────────────────── */
  const siigoOk  = appStatus?.siigo?.mode  === 'real'
  const alegraOk = appStatus?.alegra?.mode === 'real'
  const meta     = PAGE_META[page] ?? PAGE_META.dashboard

  const renderPage = () => {
    switch (page) {
      case 'dashboard':        return <Dashboard onNavigate={setPage} toast={toast} />
      case 'causaciones':      return <Causaciones toast={toast} />
      case 'automatizaciones': return <Automatizaciones toast={toast} />
      case 'historial':        return <Historial toast={toast} />
      case 'config':           return <Configuracion toast={toast} onRefreshStatus={refreshStatus} />
      case 'perfil':           return <Perfil user={user} onUserUpdate={handleUserUpdate} toast={toast} />
      default:                 return null
    }
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        onNavigate={setPage}
        siigoOk={siigoOk}
        alegraOk={alegraOk}
        user={user}
        errores={errores}
      />

      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{meta.title}</div>
            <div className="topbar-sub">{meta.sub()}</div>
          </div>
          <div className="topbar-actions">
            {appStatus?.demo_mode && (
              <span style={{
                fontFamily:'var(--mono)', fontSize:9, letterSpacing:'1px',
                textTransform:'uppercase', color:'var(--gold)',
                background:'rgba(240,165,0,0.1)', border:'1px solid rgba(240,165,0,0.25)',
                borderRadius:4, padding:'3px 8px',
              }}>MODO DEMO</span>
            )}

            {/* User chip */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--navy3)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}
              onClick={() => setPage('perfil')}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:10, color:'var(--navy)' }}>
                {(user.nombre || user.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-secondary)' }}>
                {user.nombre?.split(' ')[0] || user.email}
              </span>
              <button onClick={e => { e.stopPropagation(); handleLogout() }} title="Cerrar sesión"
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, lineHeight:1, padding:0 }}>
                ↩
              </button>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
              <Icon name="refresh" size={11}/> {syncing ? 'Sincronizando...' : 'Sync'}
            </button>

            {page !== 'causaciones' && (
              <button className="btn btn-primary btn-sm" onClick={() => setPage('causaciones')}>
                <Icon name="plus"/> Nueva Causación
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {page !== 'config' && page !== 'perfil' && (
            <DemoBanner status={appStatus} onConfig={() => setPage('config')} />
          )}
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
