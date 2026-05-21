import { useState, useEffect } from 'react'
import { createAutomatizacion, updateAutomatizacion } from '../api/client'
import Icon from './ui/Icon'

const FREQS     = ['Diario', 'Semanal', 'Mensual', 'Bimestral']
const PLATFORMS = [['siigo', 'Siigo'], ['alegra', 'Alegra'], ['both', 'Ambas']]
const CUENTAS_COMUNES = [
  '1105 - Caja General',
  '1110 - Bancos',
  '1305 - Clientes',
  '2205 - Proveedores Nacionales',
  '2360 - Retención en la Fuente por Pagar',
  '2365 - IVA por Pagar',
  '2370 - Retenciones y Aportes de Nómina',
  '4135 - Ingresos por Servicios',
  '5105 - Gastos de Personal - Sueldos',
  '5110 - Gastos de Personal - Auxilio de Transporte',
  '5115 - Cesantías',
  '5120 - Intereses sobre Cesantías',
  '5125 - Vacaciones',
  '5130 - Primas de Servicios',
  '5160 - Gastos de Personal - Salud',
  '5165 - Gastos de Personal - Pensión',
  '5170 - Gastos de Personal - ARL',
  '5195 - Depreciación Activos Fijos',
  '5215 - Arriendo',
  '5220 - Honorarios',
]

const EMPTY_LINEA = { cuenta: '', descripcion: '', tercero: '', debito: 0, credito: 0 }

const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0)
const parseMoney = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0

export default function AutomatizacionModal({ auto, onClose, onSaved, toast }) {
  const editing = !!auto?.id

  const [form, setForm] = useState({
    name:                auto?.name                || '',
    desc:                auto?.desc                || '',
    freq:                auto?.freq                || 'Mensual',
    platform:            auto?.platform            || 'siigo',
    hora_ejecucion:      auto?.hora_ejecucion      || '06:00',
    dia_mes:             auto?.dia_mes             || 1,
    concepto_plantilla:  auto?.concepto_plantilla  || '',
    plantilla_lineas:    (auto?.plantilla_lineas && auto.plantilla_lineas.length)
                           ? auto.plantilla_lineas
                           : [{ ...EMPTY_LINEA }],
  })
  const [saving,  setSaving]  = useState(false)
  const [tab,     setTab]     = useState('general')   // 'general' | 'plantilla'

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ── Líneas helpers ─────────────────────────────────────────────────────── */
  const addLinea    = () => set('plantilla_lineas', [...form.plantilla_lineas, { ...EMPTY_LINEA }])
  const removeLinea = i  => set('plantilla_lineas', form.plantilla_lineas.filter((_, j) => j !== i))
  const setLinea    = (i, k, v) =>
    set('plantilla_lineas', form.plantilla_lineas.map((l, j) => j === i ? { ...l, [k]: v } : l))

  const totalDebito  = form.plantilla_lineas.reduce((s, l) => s + parseMoney(l.debito),  0)
  const totalCredito = form.plantilla_lineas.reduce((s, l) => s + parseMoney(l.credito), 0)
  const balanced     = Math.abs(totalDebito - totalCredito) < 0.01

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { toast('El nombre es obligatorio', 'error'); return }
    if (tab === 'plantilla' && form.plantilla_lineas.length > 0 && !balanced) {
      toast('El asiento no cuadra (Débito ≠ Crédito)', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        dia_mes: ['Mensual','Bimestral'].includes(form.freq) ? Number(form.dia_mes) : null,
        plantilla_lineas: form.plantilla_lineas.map(l => ({
          ...l, debito: parseMoney(l.debito), credito: parseMoney(l.credito),
        })),
      }
      const saved = editing
        ? await updateAutomatizacion(auto.id, payload)
        : await createAutomatizacion(payload)
      toast(`Automatización "${saved.name}" ${editing ? 'actualizada' : 'creada'}`, 'success')
      onSaved(saved)
      onClose()
    } catch (err) {
      toast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">{editing ? `Editar: ${auto.name}` : 'Nueva Automatización'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--navy3)', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {[['general', '⚙ General'], ['plantilla', '📋 Plantilla']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
              color: tab === id ? 'var(--emerald)' : 'var(--text-muted)',
              borderBottom: tab === id ? '2px solid var(--emerald)' : '2px solid transparent',
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* ── TAB: General ─────────────────────────────────────────── */}
            {tab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div className="field">
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="ej: Nómina Mensual Automática" required />
                </div>

                <div className="field">
                  <label>Descripción</label>
                  <input value={form.desc} onChange={e => set('desc', e.target.value)}
                    placeholder="ej: Causa nómina cada fin de mes - 12 empleados" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Plataforma</label>
                    <select value={form.platform} onChange={e => set('platform', e.target.value)}>
                      {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Frecuencia</label>
                    <select value={form.freq} onChange={e => set('freq', e.target.value)}>
                      {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Hora de ejecución</label>
                    <input type="time" value={form.hora_ejecucion}
                      onChange={e => set('hora_ejecucion', e.target.value)}
                      className="input-mono" />
                  </div>
                  {['Mensual','Bimestral'].includes(form.freq) && (
                    <div className="field">
                      <label>Día del mes (1–28)</label>
                      <input type="number" min={1} max={28} value={form.dia_mes}
                        onChange={e => set('dia_mes', e.target.value)}
                        className="input-mono" />
                    </div>
                  )}
                </div>

                {/* Info box */}
                <div style={{ background: 'rgba(74,158,255,0.07)', border: '1px solid rgba(74,158,255,0.15)', borderRadius: 6, padding: '10px 14px', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
                  {form.freq === 'Diario'     && `Se ejecutará todos los días a las ${form.hora_ejecucion} (Bogotá)`}
                  {form.freq === 'Semanal'    && `Se ejecutará cada lunes a las ${form.hora_ejecucion} (Bogotá)`}
                  {form.freq === 'Mensual'    && `Se ejecutará el día ${form.dia_mes} de cada mes a las ${form.hora_ejecucion} (Bogotá)`}
                  {form.freq === 'Bimestral'  && `Se ejecutará el día ${form.dia_mes} cada 2 meses a las ${form.hora_ejecucion} (Bogotá)`}
                </div>
              </div>
            )}

            {/* ── TAB: Plantilla ────────────────────────────────────────── */}
            {tab === 'plantilla' && (
              <div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Concepto del asiento</label>
                  <input value={form.concepto_plantilla}
                    onChange={e => set('concepto_plantilla', e.target.value)}
                    placeholder="ej: Causación Nómina {{mes}} {{año}}" />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Variables disponibles: {'{{mes}}'} {'{{año}}'} {'{{fecha}}'}
                  </span>
                </div>

                {/* Tabla de líneas */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Cuenta PUC', 'Descripción', 'Tercero', 'Débito', 'Crédito', ''].map(h => (
                          <th key={h} style={{
                            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '1px',
                            textTransform: 'uppercase', color: 'var(--text-muted)',
                            padding: '8px 8px', textAlign: h === 'Débito' || h === 'Crédito' ? 'right' : 'left',
                            background: 'var(--navy3)', borderBottom: '1px solid var(--border)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.plantilla_lineas.map((l, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '6px 6px' }}>
                            <input list="cuentas-list" value={l.cuenta}
                              onChange={e => setLinea(i, 'cuenta', e.target.value)}
                              placeholder="1105" className="input-mono"
                              style={{ width: 130, fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input value={l.descripcion}
                              onChange={e => setLinea(i, 'descripcion', e.target.value)}
                              placeholder="Descripción" style={{ width: '100%', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input value={l.tercero}
                              onChange={e => setLinea(i, 'tercero', e.target.value)}
                              placeholder="NIT" className="input-mono"
                              style={{ width: 100, fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input type="number" min={0} value={l.debito || ''}
                              onChange={e => setLinea(i, 'debito', e.target.value)}
                              placeholder="0" className="input-mono"
                              style={{ width: 110, fontSize: 11, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '6px 6px' }}>
                            <input type="number" min={0} value={l.credito || ''}
                              onChange={e => setLinea(i, 'credito', e.target.value)}
                              placeholder="0" className="input-mono"
                              style={{ width: 110, fontSize: 11, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                            <button type="button" onClick={() => removeLinea(i)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totales */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'var(--navy3)', borderTop: '1px solid var(--border)' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLinea}>
                      <Icon name="plus" size={11} /> Agregar línea
                    </button>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {[['Débito', totalDebito], ['Crédito', totalCredito]].map(([lbl, val]) => (
                        <div key={lbl} style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{lbl}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }}>{fmt(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Balance warning */}
                {form.plantilla_lineas.length > 0 && !balanced && (
                  <div style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)' }}>
                    ⚠ El asiento no cuadra — Diferencia: {fmt(Math.abs(totalDebito - totalCredito))}
                  </div>
                )}

                {/* Datalist for PUC autocomplete */}
                <datalist id="cuentas-list">
                  {CUENTAS_COMUNES.map(c => <option key={c} value={c.split(' - ')[0]}>{c}</option>)}
                </datalist>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--navy3)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Guardando...' : editing ? '💾 Guardar cambios' : '✓ Crear automatización'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
