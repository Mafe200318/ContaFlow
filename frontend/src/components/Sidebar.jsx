import Icon from './ui/Icon'

const NAV = [
  { section: 'Principal',    items: [
    { id: 'dashboard',       label: 'Dashboard',        icon: 'dashboard' },
  ]},
  { section: 'Contabilidad', items: [
    { id: 'causaciones',      label: 'Causaciones',      icon: 'journal'  },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: 'auto'     },
    { id: 'historial',        label: 'Historial',        icon: 'history'  },
  ]},
  { section: 'Sistema', items: [
    { id: 'config',           label: 'Configuración',    icon: 'config'   },
    { id: 'perfil',           label: 'Mi Perfil',        icon: 'user'     },
  ]},
]

export default function Sidebar({ page, onNavigate, siigoOk, alegraOk, user, errores }) {
  const nombre = user?.nombre || user?.email || 'Usuario'
  const tp     = user?.tarjeta_profesional || ''

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-hex"><span>CF</span></div>
          <div>
            <div className="logo-text">ContaFlow</div>
            <div className="logo-sub">v2.0 · Colombia</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {items.map(n => (
              <div key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`}
                onClick={() => onNavigate(n.id)}>
                <Icon name={n.icon} />
                {n.label}
              </div>
            ))}
          </div>
        ))}

        {/* Error alert widget */}
        {errores > 0 && (
          <div style={{ padding:'14px 18px 8px' }}>
            <div style={{ background:'rgba(255,71,87,0.07)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--red)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>Errores activos</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:600, color:'var(--red)' }}>{errores}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Requieren revisión</div>
              <button className="btn btn-secondary btn-sm"
                style={{ marginTop:8, width:'100%', justifyContent:'center', fontSize:10 }}
                onClick={() => onNavigate('historial')}>
                Ver detalles
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sync-status">
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>Estado Conexiones</div>
          <div className="sync-row"><div className={`sync-dot ${siigoOk ?'on':'off'}`}/><span className="sync-label">Siigo {siigoOk ? '● real' : '○ demo'}</span></div>
          <div className="sync-row"><div className={`sync-dot ${alegraOk?'on':'off'}`}/><span className="sync-label">Alegra {alegraOk? '● real' : '○ demo'}</span></div>
        </div>

        {/* User info — clickable to perfil */}
        <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)', cursor:'pointer' }}
          onClick={() => onNavigate('perfil')}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'var(--navy)', flexShrink:0 }}>
              {nombre[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', fontWeight:500 }}>{nombre}</div>
              {tp && <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)' }}>Contador · {tp}</div>}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
