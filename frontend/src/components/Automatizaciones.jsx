import { useState, useEffect } from 'react'
import { getAutomatizaciones, toggleAutomatizacion, runAutomatizacion, deleteAutomatizacion } from '../api/client'
import { StatusBadge, PlatformPill } from './ui/Badge'
import Icon from './ui/Icon'
import AutomatizacionModal from './AutomatizacionModal'

export default function Automatizaciones({ toast }) {
  const [autos,    setAutos]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [running,  setRunning] = useState(null)
  const [progress, setProgress]= useState({})
  const [modal,    setModal]   = useState(null)   // null | { auto } | { auto: undefined } (new)
  const [deleting, setDeleting]= useState(null)

  useEffect(() => {
    getAutomatizaciones()
      .then(setAutos)
      .catch(() => toast('Error cargando automatizaciones', 'error'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Toggle ──────────────────────────────────────────────────────────────── */
  const handleToggle = async (auto) => {
    try {
      const updated = await toggleAutomatizacion(auto.id, !auto.active)
      setAutos(as => as.map(a => a.id === auto.id ? updated : a))
      toast(`"${auto.name}" ${updated.active ? 'activada' : 'pausada'}`, 'success')
    } catch {
      toast('Error al cambiar estado', 'error')
    }
  }

  /* ── Run now ─────────────────────────────────────────────────────────────── */
  const handleRun = async (auto) => {
    if (!auto.active) { toast('Active la automatización primero', 'error'); return }
    setRunning(auto.id)
    setProgress(p => ({ ...p, [auto.id]: 0 }))

    const iv = setInterval(() => {
      setProgress(p => {
        const cur = p[auto.id] ?? 0
        if (cur >= 90) { clearInterval(iv); return p }
        return { ...p, [auto.id]: cur + Math.random() * 15 }
      })
    }, 300)

    try {
      await runAutomatizacion(auto.id)
      clearInterval(iv)
      setProgress(p => ({ ...p, [auto.id]: 100 }))
      toast(`"${auto.name}" ejecutada correctamente`, 'success')
      const updated = await getAutomatizaciones()
      setAutos(updated)
    } catch (e) {
      clearInterval(iv)
      setProgress(p => ({ ...p, [auto.id]: 0 }))
      toast(e.response?.data?.detail || 'Error al ejecutar', 'error')
    } finally {
      setRunning(null)
    }
  }

  /* ── Delete ──────────────────────────────────────────────────────────────── */
  const handleDelete = async (auto) => {
    if (!window.confirm(`¿Eliminar "${auto.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(auto.id)
    try {
      await deleteAutomatizacion(auto.id)
      setAutos(as => as.filter(a => a.id !== auto.id))
      toast(`"${auto.name}" eliminada`, 'success')
    } catch {
      toast('Error al eliminar', 'error')
    } finally {
      setDeleting(null)
    }
  }

  /* ── After save in modal ─────────────────────────────────────────────────── */
  const handleSaved = (saved) => {
    setAutos(as => {
      const exists = as.find(a => a.id === saved.id)
      return exists ? as.map(a => a.id === saved.id ? saved : a) : [...as, saved]
    })
  }

  if (loading) return <div className="loading-center"><div className="spinner" /> Cargando automatizaciones...</div>

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setModal({ auto: undefined })}>
          <Icon name="plus" /> Nueva Automatización
        </button>
      </div>

      {autos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
          No hay automatizaciones configuradas. Crea la primera haciendo clic en «Nueva Automatización».
        </div>
      )}

      <div className="auto-grid">
        {autos.map(auto => {
          const pct       = progress[auto.id] ?? 0
          const isRunning = running === auto.id
          const isDeleting= deleting === auto.id
          const iconColor = auto.platform === 'siigo' ? 'blue' : auto.platform === 'alegra' ? 'gold' : 'green'
          const icon      = auto.freq === 'Diario' ? '🔄' : auto.freq === 'Mensual' ? '📅' : auto.freq === 'Semanal' ? '🗓' : '📊'

          return (
            <div key={auto.id} className="auto-card" style={{ opacity: auto.active ? 1 : 0.65 }}>
              <div className={`auto-icon ${iconColor}`}>{icon}</div>
              <div className="auto-info">
                <div className="auto-name">{auto.name}</div>
                <div className="auto-desc">{auto.desc}</div>
                <div className="auto-meta">
                  <PlatformPill platform={auto.platform} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', background: 'var(--navy4)', padding: '1px 6px', borderRadius: 4 }}>
                    {auto.freq}{auto.hora_ejecucion ? ` · ${auto.hora_ejecucion}` : ''}
                  </span>
                  <StatusBadge status={isRunning ? 'pending' : auto.active ? auto.status : 'off'} />
                </div>
                {(isRunning || pct > 0) && (
                  <div className="progress-wrap" style={{ marginTop: 8 }}>
                    <div className="progress-label">
                      <span>{isRunning ? 'Ejecutando...' : 'Completado'}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${pct === 100 ? 'green' : isRunning ? 'gold' : 'green'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                  {auto.last_run && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>Última: {auto.last_run}</span>}
                  {auto.next_run && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>Próxima: {auto.next_run}</span>}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>{auto.entries_count} asientos</span>
                </div>
              </div>

              <div className="auto-actions" style={{ gap: 6 }}>
                {/* Run */}
                <button className="btn btn-secondary btn-sm" disabled={isRunning || !auto.active}
                  onClick={() => handleRun(auto)}>
                  <Icon name="play" size={11} /> {isRunning ? '...' : 'Ejecutar'}
                </button>
                {/* Edit */}
                <button className="btn btn-secondary btn-sm" onClick={() => setModal({ auto })}
                  title="Editar">
                  ✏️
                </button>
                {/* Delete */}
                <button className="btn btn-sm" disabled={isDeleting}
                  onClick={() => handleDelete(auto)}
                  title="Eliminar"
                  style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: 'var(--red)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
                  {isDeleting ? '…' : '🗑'}
                </button>
                {/* Toggle */}
                <button className={`toggle ${auto.active ? 'on' : ''}`} onClick={() => handleToggle(auto)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal !== null && (
        <AutomatizacionModal
          auto={modal.auto}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          toast={toast}
        />
      )}
    </div>
  )
}
