export default function DemoBanner({ status, onConfig }) {
  if (!status || (!status.demo_mode && status.siigo?.mode === 'real' && status.alegra?.mode === 'real')) return null

  const siigoDemo  = status.siigo?.mode  === 'demo'
  const alegraDemo = status.alegra?.mode === 'demo'
  const platforms  = [siigoDemo && 'Siigo', alegraDemo && 'Alegra'].filter(Boolean).join(' y ')

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(240,165,0,0.12), rgba(240,165,0,0.06))',
      border: '1px solid rgba(240,165,0,0.3)',
      borderLeft: '3px solid var(--gold)',
      borderRadius: 8,
      padding: '10px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 12,
    }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Modo Demo activo — {platforms}</span>
        <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
          Los asientos se guardan localmente pero <strong>no se envían</strong> a las plataformas reales.
        </span>
      </div>
      <button
        onClick={onConfig}
        style={{
          background: 'rgba(240,165,0,0.15)',
          border: '1px solid rgba(240,165,0,0.4)',
          borderRadius: 6,
          color: 'var(--gold)',
          padding: '5px 12px',
          fontSize: 11,
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          whiteSpace: 'nowrap',
        }}
      >
        Configurar APIs →
      </button>
    </div>
  )
}
