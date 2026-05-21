import { useState, useEffect } from 'react'
import { getStats, getHistorial, getAutomatizaciones, getAppStatus, syncAll } from '../api/client'
import { StatusBadge, PlatformPill } from './ui/Badge'
import Icon from './ui/Icon'

const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const fmtShort = n => {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

const STATUS_COLOR = { ok: '#00D97E', pending: '#F0A500', error: '#FF4757' }

export default function Dashboard({ onNavigate, toast }) {
  const [stats,      setStats]      = useState(null)
  const [historial,  setHistorial]  = useState([])
  const [autos,      setAutos]      = useState([])
  const [appStatus,  setAppStatus]  = useState(null)
  const [syncing,    setSyncing]    = useState(false)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      getStats(),
      getHistorial({ limit: 5 }),
      getAutomatizaciones(),
      getAppStatus(),
    ]).then(([s, h, a, st]) => {
      setStats(s)
      setHistorial(h)
      setAutos(a)
      setAppStatus(st)
    }).catch(() => {
      toast('Error cargando datos del dashboard', 'error')
    }).finally(() => setLoading(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const results = await syncAll()
      const total   = results.reduce((s, r) => s + r.synced, 0)
      toast(`Sincronización completada — ${total} registros procesados`, 'success')
      // Refresh stats after sync
      getStats().then(setStats).catch(() => {})
      getHistorial({ limit: 5 }).then(setHistorial).catch(() => {})
    } catch {
      toast('Error al sincronizar plataformas', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const autosActivos = autos.filter(a => a.active).length
  const siigoMode    = appStatus?.siigo?.mode  || 'demo'
  const alegraMode   = appStatus?.alegra?.mode || 'demo'

  return (
    <div className="fade-up">

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi green">
          <div className="kpi-label">Asientos Totales</div>
          <div className="kpi-value green">{loading ? '—' : stats?.total_asientos ?? 0}</div>
          <div className="kpi-delta">En la base de datos</div>
          <div className="kpi-icon">📒</div>
        </div>
        <div className="kpi gold">
          <div className="kpi-label">Valor Causado (COP)</div>
          <div className="kpi-value gold">{loading ? '—' : fmtShort(stats?.total_causado ?? 0)}</div>
          <div className="kpi-delta">Período acumulado</div>
          <div className="kpi-icon">💰</div>
        </div>
        <div className="kpi blue">
          <div className="kpi-label">Pendientes</div>
          <div className="kpi-value" style={{ color:'#4A9EFF' }}>{loading ? '—' : stats?.pendientes ?? 0}</div>
          <div className="kpi-delta">Por confirmar</div>
          <div className="kpi-icon">⏳</div>
        </div>
        <div className="kpi red">
          <div className="kpi-label">Errores</div>
          <div className="kpi-value red">{loading ? '—' : stats?.errores ?? 0}</div>
          <div className="kpi-delta">Requieren revisión</div>
          <div className="kpi-icon">⚠️</div>
        </div>
      </div>

      <div className="dash-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Actividad reciente desde historial real */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Actividad Reciente</span>
              <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
                <Icon name="refresh" size={11}/> {syncing ? 'Sincronizando...' : 'Sync Manual'}
              </button>
            </div>
            <div className="card-body" style={{ padding:'8px 18px' }}>
              {loading ? (
                <div className="loading-center" style={{ height:80 }}><div className="spinner"/></div>
              ) : historial.length === 0 ? (
                <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:12 }}>Sin actividad reciente</div>
              ) : (
                <div className="activity-list">
                  {historial.map(r => (
                    <div key={r.id} className="activity-item">
                      <div className="activity-dot" style={{ background: STATUS_COLOR[r.status] || '#4A9EFF', boxShadow:`0 0 6px ${STATUS_COLOR[r.status] || '#4A9EFF'}` }}/>
                      <div className="activity-content">
                        <div className="activity-text">
                          <strong>{r.concepto}</strong>
                          {' — '}{r.tipo}
                          {r.status === 'error' && <span style={{ color:'var(--red)', marginLeft:6, fontSize:11 }}>✗ Error</span>}
                        </div>
                        <div className="activity-time">{r.fecha} {r.hora} · {r.usuario}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Últimas causaciones */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Últimas Causaciones</span>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('historial')}>Ver todo →</button>
            </div>
            <div className="table-wrap">
              {loading ? (
                <div className="loading-center" style={{ height:60 }}><div className="spinner"/></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th>Plataforma</th><th style={{ textAlign:'right' }}>Débito</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {historial.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:11 }}>Sin registros</td></tr>
                    ) : historial.map(r => (
                      <tr key={r.id}>
                        <td className="td-mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{r.fecha}</td>
                        <td style={{ fontWeight:500 }}>{r.concepto}</td>
                        <td><PlatformPill platform={r.platform}/></td>
                        <td className="td-amount debit">{fmtShort(r.debito)}</td>
                        <td><StatusBadge status={r.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><span className="card-title">Acciones Rápidas</span></div>
            <div className="card-body">
              <div className="quick-actions">
                {[
                  { icon:'📝', label:'Nueva Causación',  desc:'Crear asiento manual',    nav:'causaciones' },
                  { icon:'⚡', label:'Automatizaciones', desc:`${autosActivos} activas`,   nav:'automatizaciones' },
                  { icon:'🔗', label:'Sync Ahora',       desc:'Siigo ↔ Alegra',           action: handleSync },
                  { icon:'📊', label:'Ver Historial',    desc:'Asientos del período',     nav:'historial' },
                ].map((qa, i) => (
                  <button key={i} className="qa-btn" onClick={() => qa.nav ? onNavigate(qa.nav) : qa.action?.()}>
                    <div className="qa-btn-icon">{qa.icon}</div>
                    <div className="qa-btn-label">{qa.label}</div>
                    <div className="qa-btn-desc">{qa.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* API Status real */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Estado API</span>
              {appStatus?.demo_mode && (
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--gold)', background:'rgba(240,165,0,0.1)', border:'1px solid rgba(240,165,0,0.2)', borderRadius:4, padding:'2px 7px' }}>
                  DEMO
                </span>
              )}
            </div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['Siigo', siigoMode,  appStatus?.siigo?.env  || '—'],
                ['Alegra',alegraMode, appStatus?.alegra?.env || '—'],
              ].map(([name, mode, env]) => {
                const ok      = mode === 'real'
                const color   = ok ? 'var(--emerald)' : 'var(--gold)'
                const barW    = ok ? '100%' : '40%'
                const barCls  = ok ? 'green' : 'gold'
                return (
                  <div key={name} style={{ background:'var(--navy3)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{name} API</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color, background:`${color}18`, border:`1px solid ${color}40`, borderRadius:4, padding:'2px 7px', textTransform:'uppercase' }}>
                        {mode}
                      </span>
                    </div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
                      entorno: {env}
                    </div>
                    <div className="progress-wrap" style={{ marginTop:8 }}>
                      <div className="progress-bar">
                        <div className={`progress-fill ${barCls}`} style={{ width: barW, transition:'width 0.8s ease' }}/>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Automatizaciones activas */}
              <div style={{ background:'var(--navy3)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>Automatizaciones</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--emerald)' }}>{autosActivos}/{autos.length} activas</span>
                </div>
                <div className="progress-wrap">
                  <div className="progress-bar">
                    <div className="progress-fill green" style={{ width: autos.length ? `${(autosActivos/autos.length)*100}%` : '0%', transition:'width 0.8s ease' }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
