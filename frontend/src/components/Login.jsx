import { useState, useEffect } from 'react'
import { login, register, forgotPassword, resetPassword } from '../api/client'

/* ── Logo mark ──────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:40, justifyContent:'center' }}>
      <div style={{ width:44, height:44, background:'var(--emerald)', clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'var(--navy)' }}>CF</span>
      </div>
      <div>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:24, color:'var(--text-primary)', letterSpacing:'-0.5px' }}>ContaFlow</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:'1px' }}>AUTOMATIZACIÓN CONTABLE · COLOMBIA</div>
      </div>
    </div>
  )
}

/* ── Forgot-password panel ──────────────────────────────────────────────── */
function ForgotPanel({ onBack }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [devLink, setDevLink] = useState('')
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await forgotPassword(email)
      setSent(true)
      // In demo/dev mode the backend returns the link so we can test without email
      if (res.reset_link) setDevLink(res.reset_link)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
        <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>Correo enviado</div>
        <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
          Si <strong style={{ color:'var(--text-secondary)' }}>{email}</strong> está registrado,
          recibirás un enlace para restablecer tu contraseña. Válido por 1 hora.
        </p>
        {devLink && (
          <div style={{ marginTop:16, background:'rgba(240,165,0,0.08)', border:'1px solid rgba(240,165,0,0.25)', borderRadius:8, padding:'12px 16px', textAlign:'left' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--gold)', marginBottom:6, textTransform:'uppercase', letterSpacing:'1px' }}>Modo Dev — Enlace directo</div>
            <a href={devLink} style={{ fontSize:11, color:'var(--emerald)', wordBreak:'break-all', fontFamily:'var(--mono)' }}>{devLink}</a>
          </div>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginTop:20 }}>← Volver al login</button>
      </div>
    )
  }

  return (
    <>
      <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:6 }}>Recuperar contraseña</div>
      <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20, lineHeight:1.5 }}>
        Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="contador@empresa.com.co" required autoFocus />
        </div>
        {error && (
          <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'var(--red)' }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
          {loading ? '⏳ Enviando...' : 'Enviar enlace →'}
        </button>
      </form>
      <button onClick={onBack} style={{ marginTop:16, background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', display:'block', width:'100%', textAlign:'center' }}>
        ← Volver al inicio de sesión
      </button>
    </>
  )
}

/* ── Reset-password panel ───────────────────────────────────────────────── */
function ResetPanel({ token, onDone }) {
  const [pass,    setPass]    = useState('')
  const [pass2,   setPass2]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (pass !== pass2) { setError('Las contraseñas no coinciden'); return }
    if (pass.length < 6)  { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      await resetPassword(token, pass)
      setDone(true)
      // Remove token from URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('reset_token')
      window.history.replaceState({}, '', url)
    } catch (e) {
      setError(e.response?.data?.detail || 'Enlace inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>✅</div>
        <div style={{ fontWeight:700, color:'var(--emerald)', marginBottom:8 }}>Contraseña actualizada</div>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <button className="btn btn-primary" onClick={onDone} style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
          Ir al login →
        </button>
      </div>
    )
  }

  return (
    <>
      <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:6 }}>Nueva contraseña</div>
      <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>Elige una contraseña segura (mínimo 6 caracteres).</p>
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="field">
          <label>Nueva contraseña</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required minLength={6} autoFocus />
        </div>
        <div className="field">
          <label>Confirmar contraseña</label>
          <input type="password" value={pass2} onChange={e => setPass2(e.target.value)} placeholder="••••••••" required />
        </div>
        {error && (
          <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'var(--red)' }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent:'center', padding:'11px', fontSize:14 }}>
          {loading ? '⏳ Guardando...' : 'Restablecer contraseña →'}
        </button>
      </form>
    </>
  )
}

/* ── Main Login component ───────────────────────────────────────────────── */
export default function Login({ onAuth }) {
  // Check URL for reset token on mount
  const urlToken = new URLSearchParams(window.location.search).get('reset_token') || ''

  const [mode,    setMode]    = useState(urlToken ? 'reset' : 'login')  // 'login' | 'register' | 'forgot' | 'reset'
  const [form,    setForm]    = useState({ nombre: '', email: '', password: '', tarjeta_profesional: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      let data
      if (mode === 'login') {
        data = await login(form.email, form.password)
      } else {
        data = await register(form)
      }
      localStorage.setItem('cf_token', data.access_token)
      localStorage.setItem('cf_user',  JSON.stringify(data.user))
      onAuth(data.user)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--sans)' }}>
      <div style={{ width: 400 }}>
        <Logo />

        <div style={{ background:'var(--navy2)', border:'1px solid var(--border)', borderRadius:12, padding:32 }}>

          {/* ── Forgot password ── */}
          {mode === 'forgot' && (
            <ForgotPanel onBack={() => { setMode('login'); setError('') }} />
          )}

          {/* ── Reset password (from email link) ── */}
          {mode === 'reset' && (
            <ResetPanel token={urlToken} onDone={() => { setMode('login') }} />
          )}

          {/* ── Login / Register ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Tabs */}
              <div style={{ display:'flex', gap:0, marginBottom:28, background:'var(--navy3)', borderRadius:8, padding:4 }}>
                {[['login','Iniciar Sesión'],['register','Crear Cuenta']].map(([m,l]) => (
                  <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                    flex:1, padding:'8px 0', border:'none', borderRadius:6, fontFamily:'var(--sans)',
                    fontWeight:600, fontSize:12, cursor:'pointer', transition:'all 0.15s',
                    background: mode===m ? 'var(--emerald)' : 'transparent',
                    color: mode===m ? 'var(--navy)' : 'var(--text-muted)',
                  }}>{l}</button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {mode === 'register' && (
                  <>
                    <div className="field">
                      <label>Nombre Completo</label>
                      <input value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Carlos Andrés Vargas" required/>
                    </div>
                    <div className="field">
                      <label>Tarjeta Profesional</label>
                      <input value={form.tarjeta_profesional} onChange={e=>set('tarjeta_profesional',e.target.value)} placeholder="TP-78432" className="input-mono"/>
                    </div>
                  </>
                )}
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="contador@empresa.com.co" required/>
                </div>
                <div className="field">
                  <label>Contraseña</label>
                  <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="••••••••" required minLength={6}/>
                </div>

                {error && (
                  <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'var(--red)' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop:6, justifyContent:'center', padding:'11px', fontSize:14 }}>
                  {loading ? '⏳ Verificando...' : mode === 'login' ? 'Ingresar →' : 'Crear Cuenta →'}
                </button>
              </form>

              {mode === 'login' && (
                <>
                  <div style={{ textAlign:'center', marginTop:14 }}>
                    <button onClick={() => { setMode('forgot'); setError('') }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', textDecoration:'underline' }}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <p style={{ marginTop:12, fontSize:11, color:'var(--text-muted)', textAlign:'center', fontFamily:'var(--mono)' }}>
                    Demo: <span style={{color:'var(--text-secondary)'}}>admin@contaflow.co</span> / <span style={{color:'var(--text-secondary)'}}>demo1234</span>
                  </p>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
