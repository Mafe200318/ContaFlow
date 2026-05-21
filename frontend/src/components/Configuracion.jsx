import { useState, useEffect } from 'react'
import { getConfig, saveConfig, testConnection, saveSyncPrefs, getSyncPrefs } from '../api/client'
import Icon from './ui/Icon'

/* ── Collapsible help guide ─────────────────────────────────────────────── */
const HELP = {
  siigo: [
    { step: '1', text: 'Ve a', link: 'https://developer.siigo.com', label: 'developer.siigo.com' },
    { step: '2', text: 'Regístrate con el correo de tu empresa Siigo (debe tener rol Administrador).' },
    { step: '3', text: 'En "Mis Aplicaciones" → crea una nueva app y copia el email y la API Key.' },
    { step: '4', text: 'Pega esos datos en los campos de arriba y haz clic en "Probar Conexión".' },
  ],
  alegra: [
    { step: '1', text: 'Inicia sesión en', link: 'https://app.alegra.com', label: 'app.alegra.com' },
    { step: '2', text: 'Ve al menú de tu usuario (arriba a la derecha) → Configuración → Integraciones.' },
    { step: '3', text: 'Busca la sección "API" y copia el token (o genera uno nuevo si no existe).' },
    { step: '4', text: 'Pega el email de tu cuenta Alegra y el token en los campos de arriba.' },
  ],
}

function HelpGuide({ platform }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px',
          cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--sans)', fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{open ? '▾' : '▸'}</span>
        ¿Dónde consigo mis credenciales?
      </button>
      {open && (
        <div style={{ marginTop: 8, background: 'rgba(0,217,126,0.04)', border: '1px solid rgba(0,217,126,0.15)',
          borderRadius: 8, padding: '14px 18px' }}>
          {HELP[platform].map(({ step, text, link, label }) => (
            <div key={step} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--emerald)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--navy)' }}>{step}</div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {text}{' '}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--emerald)', textDecoration: 'none' }}>{label} ↗</a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Per-platform config card ───────────────────────────────────────────── */
function PlatformConfig({ platform, label, badgeClass, toast, onStatusChange, onRefreshStatus }) {
  const [cfg, setCfg] = useState({ user_email: '', api_key: '', nit: '', env: 'prod', sync_freq: 'daily', sync_hour: '06:00' })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    getConfig(platform)
      .then(data => { setCfg(data); setTestResult(data.connected ? { success: true, message: `Conectado · ${data.nit}` } : null) })
      .catch(() => {})
  }, [platform])

  const set = (field, val) => { setCfg(c => ({ ...c, [field]: val })); setIsDirty(true) }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await testConnection(platform)
      setTestResult(res)
      onStatusChange?.(platform, res.success)
      toast(res.success ? `Conexión con ${label} verificada` : `Fallo conexión: ${res.message}`, res.success ? 'success' : 'error')
    } catch {
      toast('Error al probar conexión', 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(platform, cfg)
      setIsDirty(false)
      toast(`Configuración de ${label} guardada`, 'success')
      onRefreshStatus?.()
    } catch {
      toast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">
          Credenciales {label} <span className={`platform-badge ${badgeClass}`}>API</span>
        </span>
        <button className="btn btn-secondary btn-sm" onClick={handleTest} disabled={testing}>
          <Icon name="refresh" size={11} /> {testing ? 'Verificando...' : 'Probar Conexión'}
        </button>
      </div>
      <div className="card-body">
        <HelpGuide platform={platform} />

        <div className="form-row form-2" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>Email de Usuario</label>
            <input value={cfg.user_email} onChange={e => set('user_email', e.target.value)} placeholder="usuario@empresa.com.co" />
          </div>
          <div className="field">
            <label>NIT / Identificación</label>
            <input value={cfg.nit} onChange={e => set('nit', e.target.value)} className="input-mono" placeholder="900.000.000-0" />
          </div>
        </div>
        <div className="form-row form-2" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>API Key / Token</label>
            <div className="api-field">
              <input
                type={showKey ? 'text' : 'password'}
                value={cfg.api_key}
                onChange={e => set('api_key', e.target.value)}
                className="input-mono"
                placeholder="••••••••••••••••"
              />
              <button className="api-toggle" onClick={() => setShowKey(v => !v)}>
                <Icon name={showKey ? 'eyeoff' : 'eye'} size={13} />
              </button>
            </div>
          </div>
          <div className="field">
            <label>Ambiente</label>
            <select value={cfg.env} onChange={e => set('env', e.target.value)}>
              <option value="prod">Producción</option>
              <option value="sandbox">Sandbox / Pruebas</option>
            </select>
          </div>
        </div>

        {testResult && (
          <div className={`connection-test ${testResult.success ? 'ok' : 'fail'}`}>
            <div className={`conn-dot ${testResult.success ? 'ok' : 'fail'}`} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: testResult.success ? 'var(--emerald)' : 'var(--red)' }}>
              {testResult.message}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
            <Icon name="check" /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Configuracion page ────────────────────────────────────────────── */
export default function Configuracion({ toast, onRefreshStatus }) {
  const [syncFreq,  setSyncFreq]  = useState('daily')
  const [syncHour,  setSyncHour]  = useState('06:00')
  const [syncDirty, setSyncDirty] = useState(false)
  const [syncSaving,setSyncSaving]= useState(false)

  // Load current sync prefs from siigo config
  useEffect(() => {
    getSyncPrefs()
      .then(({ sync_freq, sync_hour }) => {
        setSyncFreq(sync_freq || 'daily')
        setSyncHour(sync_hour || '06:00')
      })
      .catch(() => {})
  }, [])

  const handleSavePrefs = async () => {
    setSyncSaving(true)
    try {
      await saveSyncPrefs({ sync_freq: syncFreq, sync_hour: syncHour })
      setSyncDirty(false)
      toast('Preferencias de sincronización guardadas', 'success')
    } catch {
      toast('Error al guardar preferencias', 'error')
    } finally {
      setSyncSaving(false)
    }
  }

  return (
    <div className="fade-up">
      <PlatformConfig platform="siigo"  label="Siigo"  badgeClass="pb-siigo"  toast={toast} onStatusChange={onRefreshStatus} onRefreshStatus={onRefreshStatus} />
      <PlatformConfig platform="alegra" label="Alegra" badgeClass="pb-alegra" toast={toast} onStatusChange={onRefreshStatus} onRefreshStatus={onRefreshStatus} />

      <div className="card">
        <div className="card-header"><span className="card-title">Preferencias de Sincronización</span></div>
        <div className="card-body">
          <div className="form-row form-3">
            <div className="field">
              <label>Frecuencia Sync Automático</label>
              <select value={syncFreq} onChange={e => { setSyncFreq(e.target.value); setSyncDirty(true) }}>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario (recomendado)</option>
                <option value="weekly">Semanal</option>
                <option value="manual">Solo manual</option>
              </select>
            </div>
            <div className="field">
              <label>Hora de Ejecución</label>
              <input type="time" value={syncHour} onChange={e => { setSyncHour(e.target.value); setSyncDirty(true) }} className="input-mono" />
            </div>
            <div className="field">
              <label>Zona Horaria</label>
              <select defaultValue="bogota">
                <option value="bogota">América/Bogotá (UTC-5)</option>
                <option value="utc">UTC</option>
              </select>
            </div>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSavePrefs} disabled={syncSaving || !syncDirty}>
              <Icon name="check" /> {syncSaving ? 'Guardando...' : 'Guardar Preferencias'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
