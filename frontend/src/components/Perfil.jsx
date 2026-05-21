import { useState } from 'react'
import { updateMe, changePassword } from '../api/client'
import Icon from './ui/Icon'

export default function Perfil({ user, onUserUpdate, toast }) {
  const [tab, setTab] = useState('perfil')   // 'perfil' | 'seguridad'

  /* ── Perfil tab ─────────────────────────────────────────────────────────── */
  const [form, setForm]   = useState({ nombre: user?.nombre || '', tarjeta_profesional: user?.tarjeta_profesional || '' })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }

  const handleSaveProfile = async () => {
    if (!form.nombre.trim()) { toast('El nombre no puede estar vacío', 'error'); return }
    setSaving(true)
    try {
      const updated = await updateMe(form)
      // Persist to localStorage so App re-reads it
      localStorage.setItem('cf_user', JSON.stringify({ ...user, ...updated }))
      onUserUpdate({ ...user, ...updated })
      setDirty(false)
      toast('Perfil actualizado correctamente', 'success')
    } catch (e) {
      toast(e.response?.data?.detail || 'Error al guardar perfil', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── Seguridad tab ──────────────────────────────────────────────────────── */
  const [pwd, setPwd]         = useState({ current_password: '', new_password: '', confirm: '' })
  const [changingPwd, setCP]  = useState(false)
  const [showPwd, setShowPwd] = useState({ cur: false, new: false, cfm: false })

  const setPwdF = (k, v) => setPwd(p => ({ ...p, [k]: v }))

  const handleChangePwd = async () => {
    if (!pwd.current_password || !pwd.new_password) { toast('Completa todos los campos', 'error'); return }
    if (pwd.new_password.length < 6)               { toast('La nueva contraseña debe tener al menos 6 caracteres', 'error'); return }
    if (pwd.new_password !== pwd.confirm)           { toast('Las contraseñas no coinciden', 'error'); return }
    setCP(true)
    try {
      await changePassword({ current_password: pwd.current_password, new_password: pwd.new_password })
      setPwd({ current_password: '', new_password: '', confirm: '' })
      toast('Contraseña actualizada correctamente', 'success')
    } catch (e) {
      toast(e.response?.data?.detail || 'Error al cambiar contraseña', 'error')
    } finally {
      setCP(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  const initial = (user?.nombre || user?.email || 'U')[0].toUpperCase()

  return (
    <div className="fade-up" style={{ maxWidth: 560 }}>

      {/* Avatar card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display:'flex', alignItems:'center', gap:20, padding:'20px 24px' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--emerald)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:26, color:'var(--navy)', flexShrink:0 }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>{user?.nombre || '—'}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{user?.email}</div>
            {user?.tarjeta_profesional && (
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--emerald)', marginTop:4, background:'rgba(0,217,126,0.08)', border:'1px solid rgba(0,217,126,0.2)', borderRadius:4, padding:'2px 8px', display:'inline-block' }}>
                TP: {user.tarjeta_profesional}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:0, background:'var(--navy2)', border:'1px solid var(--border)', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {[['perfil','👤 Mi Perfil'],['seguridad','🔐 Seguridad']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'7px 20px', border:'none', borderRadius:7, cursor:'pointer',
            fontFamily:'var(--sans)', fontSize:12, fontWeight:600,
            background: tab===id ? 'var(--emerald)' : 'transparent',
            color: tab===id ? 'var(--navy)' : 'var(--text-muted)',
            transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Perfil tab ─────────────────────────────────────────────────── */}
      {tab === 'perfil' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Información Personal</span></div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="field">
              <label>Nombre Completo</label>
              <input value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                placeholder="Carlos Andrés Vargas" />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={user?.email || ''} disabled
                style={{ opacity:0.5, cursor:'not-allowed' }} />
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', marginTop:3, display:'block' }}>
                El email no se puede cambiar
              </span>
            </div>
            <div className="field">
              <label>Tarjeta Profesional</label>
              <input value={form.tarjeta_profesional} onChange={e => setF('tarjeta_profesional', e.target.value)}
                placeholder="TP-78432" className="input-mono" />
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving || !dirty}>
                <Icon name="check" /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Seguridad tab ──────────────────────────────────────────────── */}
      {tab === 'seguridad' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Cambiar Contraseña</span></div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {[
              ['current_password', 'Contraseña Actual', 'cur'],
              ['new_password',     'Nueva Contraseña',  'new'],
              ['confirm',          'Confirmar Nueva Contraseña', 'cfm'],
            ].map(([key, label, showKey]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <div className="api-field">
                  <input
                    type={showPwd[showKey] ? 'text' : 'password'}
                    value={pwd[key]}
                    onChange={e => setPwdF(key, e.target.value)}
                    placeholder="••••••••"
                  />
                  <button className="api-toggle" type="button"
                    onClick={() => setShowPwd(s => ({ ...s, [showKey]: !s[showKey] }))}>
                    <Icon name={showPwd[showKey] ? 'eyeoff' : 'eye'} size={13} />
                  </button>
                </div>
              </div>
            ))}

            {pwd.new_password && pwd.confirm && pwd.new_password !== pwd.confirm && (
              <div style={{ fontSize:11, color:'var(--red)', fontFamily:'var(--mono)' }}>
                ⚠ Las contraseñas no coinciden
              </div>
            )}
            {pwd.new_password && pwd.new_password.length < 6 && (
              <div style={{ fontSize:11, color:'var(--gold)', fontFamily:'var(--mono)' }}>
                ⚠ Mínimo 6 caracteres
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-primary" onClick={handleChangePwd} disabled={changingPwd}>
                🔐 {changingPwd ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
