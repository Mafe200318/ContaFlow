import { Component } from 'react'

/**
 * ErrorBoundary — catches React render errors and shows a
 * recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ContaFlow ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, info: null })
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg = this.state.error?.message || 'Error desconocido'
    const stack = this.state.info?.componentStack || ''

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--navy)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)', padding: 24,
      }}>
        <div style={{
          maxWidth: 560, width: '100%', background: 'var(--navy2)',
          border: '1px solid rgba(255,71,87,0.3)', borderRadius: 12, padding: 36,
        }}>
          {/* Icon */}
          <div style={{ width: 48, height: 48, background: 'rgba(255,71,87,0.12)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>⚠</div>

          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
            Algo salió mal
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            ContaFlow encontró un error inesperado en la interfaz. Tus datos están seguros —
            el problema solo afecta a la pantalla actual.
          </p>

          {/* Error message */}
          <div style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '10px 14px', marginBottom: 20, fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--red)', wordBreak: 'break-word' }}>
            {msg}
          </div>

          {/* Stack trace (collapsed) */}
          {stack && (
            <details style={{ marginBottom: 20 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                Ver traza del error
              </summary>
              <pre style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
                background: 'var(--navy3)', padding: 12, borderRadius: 6, overflow: 'auto',
                maxHeight: 180, whiteSpace: 'pre-wrap' }}>
                {stack.trim()}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={this.handleReload}
              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}>
              🔄 Recargar aplicación
            </button>
            <button
              className="btn btn-secondary"
              onClick={this.handleReset}
              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}>
              ↩ Intentar de nuevo
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textAlign: 'center', letterSpacing: '0.5px' }}>
            ContaFlow · Si el problema persiste, recarga la página o contacta soporte.
          </p>
        </div>
      </div>
    )
  }
}
