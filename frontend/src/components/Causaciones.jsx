import { useState, useEffect, useCallback } from 'react'
import { createCausacion, updateCausacion, deleteCausacion, getCausaciones, exportCausacion, exportCausaciones } from '../api/client'
import { StatusBadge, PlatformPill } from './ui/Badge'
import CausacionModal from './CausacionModal'
import Icon from './ui/Icon'

/* ── PUC catalog ──────────────────────────────────────────────────────────── */
const CUENTAS_PUC = [
  { code: '1105', name: 'Caja General' }, { code: '1110', name: 'Bancos' },
  { code: '1305', name: 'Clientes' },     { code: '1330', name: 'Anticipos y Avances' },
  { code: '2205', name: 'Proveedores Nacionales' }, { code: '2360', name: 'Retención en la Fuente' },
  { code: '2365', name: 'Impuesto a las Ventas' },  { code: '2370', name: 'Retenciones de Nómina' },
  { code: '2404', name: 'Impuesto de Renta' },      { code: '2510', name: 'Salarios por Pagar' },
  { code: '2525', name: 'Cesantías Consolidadas' },
  { code: '4135', name: 'Servicios' },              { code: '4175', name: 'Consultoría' },
  { code: '5105', name: 'Gastos de Personal - Sueldos' },
  { code: '5110', name: 'Honorarios' },             { code: '5115', name: 'Impuestos' },
  { code: '5120', name: 'Arrendamientos' },         { code: '5125', name: 'Vacaciones' },
  { code: '5160', name: 'Aportes Salud Empleador' },{ code: '5165', name: 'Aportes Pensión' },
  { code: '5170', name: 'Aportes ARL' },            { code: '5195', name: 'Depreciaciones' },
  { code: '5215', name: 'Arriendo Oficina' },       { code: '5220', name: 'Honorarios Externos' },
  { code: '6205', name: 'Costos de Ventas' },
]

const PLANTILLAS = [
  { id: 1, name: 'Nómina Mensual', platform: 'both', lines: [
    { cuenta: '5105', descripcion: 'Sueldos y Salarios', debito: 6800000, credito: 0 },
    { cuenta: '5160', descripcion: 'Aportes Salud Empleador', debito: 578000, credito: 0 },
    { cuenta: '5165', descripcion: 'Aportes Pensión Empleador', debito: 816000, credito: 0 },
    { cuenta: '2510', descripcion: 'Sueldos por Pagar', debito: 0, credito: 6800000 },
    { cuenta: '2525', descripcion: 'Aportes Seguridad Social por Pagar', debito: 0, credito: 1394000 },
  ]},
  { id: 2, name: 'Arriendo Oficina', platform: 'siigo', lines: [
    { cuenta: '5215', descripcion: 'Arrendamiento Oficina', debito: 3200000, credito: 0 },
    { cuenta: '2360', descripcion: 'Retención Fuente Arrendamiento 3.5%', debito: 0, credito: 112000 },
    { cuenta: '2205', descripcion: 'Proveedor Arriendo por Pagar', debito: 0, credito: 3088000 },
  ]},
  { id: 3, name: 'IVA Bimestral', platform: 'alegra', lines: [
    { cuenta: '2365', descripcion: 'IVA Generado 19%', debito: 4560000, credito: 0 },
    { cuenta: '2365', descripcion: 'IVA Descontable', debito: 0, credito: 2130000 },
    { cuenta: '1110', descripcion: 'Saldo IVA a Pagar', debito: 0, credito: 2430000 },
  ]},
  { id: 4, name: 'Honorarios Contador', platform: 'both', lines: [
    { cuenta: '5220', descripcion: 'Honorarios Contador', debito: 1800000, credito: 0 },
    { cuenta: '2360', descripcion: 'Retención Fuente Honorarios 10%', debito: 0, credito: 180000 },
    { cuenta: '2205', descripcion: 'Contador por Pagar', debito: 0, credito: 1620000 },
  ]},
]

const fmt     = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const fmtShort = n => { if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return fmt(n) }
const emptyLine = () => ({ id: crypto.randomUUID(), cuenta: '', descripcion: '', tercero: '', debito: '', credito: '' })
const PAGE_SIZE = 15

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Causaciones({ toast }) {
  const [tab, setTab] = useState('list')   // 'list' | 'new'

  /* List state */
  const [rows,      setRows]     = useState([])
  const [total,     setTotal]    = useState(0)
  const [page,      setPage]     = useState(0)
  const [loadingList, setLL]     = useState(true)
  const [filterStatus,   setFS]  = useState('all')
  const [filterPlatform, setFP]  = useState('all')
  const [search,    setSearch]   = useState('')
  const [detail,    setDetail]   = useState(null)
  const [deleting,  setDeleting] = useState(null)

  /* Form state */
  const [lines,      setLines]      = useState([emptyLine(), emptyLine(), emptyLine()])
  const [header,     setHeader]     = useState({ fecha: new Date().toISOString().split('T')[0], concepto: '', plataforma: 'both' })
  const [editingId,  setEditingId]  = useState(null)
  const [showTpl,    setShowTpl]    = useState(false)
  const [processing, setProcessing] = useState(false)

  const userName = (() => { try { return JSON.parse(localStorage.getItem('cf_user'))?.nombre || 'Sistema' } catch { return 'Sistema' } })()

  /* ── Load list ──────────────────────────────────────────────────────────── */
  const loadList = useCallback(async (pg = 0) => {
    setLL(true)
    try {
      const params = { skip: pg * PAGE_SIZE, limit: PAGE_SIZE }
      if (filterStatus   !== 'all') params.status   = filterStatus
      if (filterPlatform !== 'all') params.platform = filterPlatform
      if (search)                    params.search   = search
      const data = await getCausaciones(params)
      setRows(data.items || [])
      setTotal(data.total || 0)
      setPage(pg)
    } catch {
      toast('Error cargando causaciones', 'error')
    } finally {
      setLL(false)
    }
  }, [filterStatus, filterPlatform, search])

  useEffect(() => { loadList(0) }, [loadList])

  /* ── Delete ─────────────────────────────────────────────────────────────── */
  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar "${r.concepto}"? Esta acción no se puede deshacer.`)) return
    setDeleting(r.id)
    try {
      await deleteCausacion(r.id)
      toast(`"${r.concepto}" eliminada`, 'success')
      loadList(page)
    } catch {
      toast('Error al eliminar', 'error')
    } finally {
      setDeleting(null)
    }
  }

  /* ── Open edit ──────────────────────────────────────────────────────────── */
  const openEdit = (caus) => {
    setEditingId(caus.id)
    setHeader({ fecha: caus.fecha, concepto: caus.concepto, plataforma: caus.plataforma })
    setLines((caus.lineas || []).map(l => ({ ...emptyLine(), ...l })))
    setTab('new')
  }

  /* ── Form helpers ───────────────────────────────────────────────────────── */
  const totalDeb  = lines.reduce((s, l) => s + (parseFloat(l.debito)  || 0), 0)
  const totalCred = lines.reduce((s, l) => s + (parseFloat(l.credito) || 0), 0)
  const balanced  = Math.abs(totalDeb - totalCred) < 1 && totalDeb > 0

  const update  = (id, field, val) => setLines(ls => ls.map(l => l.id === id ? { ...l, [field]: val } : l))
  const addLine = () => setLines(ls => [...ls, emptyLine()])
  const delLine = id => { if (lines.length > 2) setLines(ls => ls.filter(l => l.id !== id)) }

  const loadPlantilla = p => {
    setLines(p.lines.map(l => ({ ...emptyLine(), ...l })))
    setHeader(h => ({ ...h, concepto: p.name, plataforma: p.platform }))
    setShowTpl(false)
    toast(`Plantilla "${p.name}" cargada`, 'success')
  }

  const resetForm = () => {
    setLines([emptyLine(), emptyLine(), emptyLine()])
    setHeader({ fecha: new Date().toISOString().split('T')[0], concepto: '', plataforma: 'both' })
    setEditingId(null)
  }

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!header.concepto.trim()) { toast('Ingrese el concepto del asiento', 'error'); return }
    if (!balanced) { toast('El asiento no está cuadrado', 'error'); return }
    setProcessing(true)
    try {
      const payload = {
        fecha: header.fecha, concepto: header.concepto, plataforma: header.plataforma,
        lineas: lines.filter(l => l.cuenta).map(l => ({
          cuenta: l.cuenta, descripcion: l.descripcion, tercero: l.tercero || '',
          debito: parseFloat(l.debito) || 0, credito: parseFloat(l.credito) || 0,
        })),
        usuario: userName,
      }
      const res = editingId
        ? await updateCausacion(editingId, payload)
        : await createCausacion(payload)

      toast(
        res.status === 'ok'
          ? `Asiento ${editingId ? 'actualizado' : 'causado'} correctamente`
          : `Asiento guardado con advertencias: ${res.error_msg}`,
        res.status === 'ok' ? 'success' : 'error',
      )
      resetForm()
      loadList(0)
      setTab('list')
    } catch (e) {
      toast(e.response?.data?.detail || 'Error al causar el asiento', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="fade-up">

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
        {[['list', `📋 Asientos (${total})`], ['new', editingId ? '✏️ Editando' : '➕ Nuevo Asiento']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); if (id === 'new' && !editingId) resetForm() }}
            style={{
              padding: '7px 18px', border: 'none', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600,
              background: tab === id ? 'var(--emerald)' : 'transparent',
              color: tab === id ? 'var(--navy)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>{label}</button>
        ))}
      </div>

      {/* ══ LIST TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'list' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Buscar por concepto..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 210, background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }} />
            <div className="historial-filters">
              {[['all','Todos'],['ok','Procesados'],['pending','Pendientes'],['error','Errores']].map(([v,l]) => (
                <button key={v} className={`filter-chip ${filterStatus===v?'active':''}`} onClick={() => setFS(v)}>{l}</button>
              ))}
            </div>
            <select value={filterPlatform} onChange={e => setFP(e.target.value)}
              style={{ background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' }}>
              <option value="all">Todas las plataformas</option>
              <option value="siigo">Siigo</option>
              <option value="alegra">Alegra</option>
              <option value="both">Ambas</option>
            </select>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
              onClick={() => {
                const params = {}
                if (filterStatus   !== 'all') params.status   = filterStatus
                if (filterPlatform !== 'all') params.platform = filterPlatform
                if (search)                    params.search   = search
                exportCausaciones(params)
              }}>
              <Icon name="download" size={11}/> Exportar Excel
            </button>
          </div>

          <div className="card">
            <div className="table-wrap">
              {loadingList ? (
                <div className="loading-center"><div className="spinner" /> Cargando...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Fecha</th><th>Concepto</th><th>Plataforma</th>
                      <th style={{ textAlign:'right' }}>Débito</th>
                      <th style={{ textAlign:'right' }}>Crédito</th>
                      <th>Estado</th><th>Usuario</th><th style={{ textAlign:'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:12 }}>
                        Sin asientos registrados
                      </td></tr>
                    ) : rows.map(r => (
                      <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => setDetail(r)}>
                        <td className="td-mono" style={{ color:'var(--text-muted)', fontSize:11 }}>#{r.id}</td>
                        <td className="td-mono" style={{ fontSize:11 }}>{r.fecha}</td>
                        <td style={{ fontWeight:500, maxWidth:220 }}>
                          {r.concepto}
                          {r.error_msg && <span style={{ marginLeft:6, fontSize:10, color:'var(--red)' }}>⚠</span>}
                        </td>
                        <td><PlatformPill platform={r.plataforma} /></td>
                        <td className="td-amount debit">{fmtShort(r.total_debito)}</td>
                        <td className="td-amount credit">{fmtShort(r.total_credito)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{r.usuario}</td>
                        <td style={{ textAlign:'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                            <button className="btn btn-secondary btn-sm" title="Ver detalle"
                              onClick={() => setDetail(r)} style={{ padding:'3px 7px', fontSize:11 }}>👁</button>
                            <button className="btn btn-secondary btn-sm" title="Exportar Excel"
                              onClick={() => exportCausacion(r.id)} style={{ padding:'3px 7px', fontSize:11 }}>📥</button>
                            <button className="btn btn-secondary btn-sm" title="Editar"
                              onClick={() => openEdit(r)} style={{ padding:'3px 7px', fontSize:11 }}>✏️</button>
                            <button title="Eliminar" disabled={deleting === r.id}
                              onClick={() => handleDelete(r)}
                              style={{ background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.25)', color:'var(--red)', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:11 }}>
                              {deleting===r.id ? '…' : '🗑'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderTop:'1px solid var(--border)' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)' }}>
                  {total} asientos · pág. {page+1} de {totalPages}
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-secondary btn-sm" disabled={page===0||loadingList} onClick={() => loadList(page-1)}>← Anterior</button>
                  <button className="btn btn-secondary btn-sm" disabled={page>=totalPages-1||loadingList} onClick={() => loadList(page+1)}>Siguiente →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ FORM TAB ══════════════════════════════════════════════════════════ */}
      {tab === 'new' && (
        <>
          {/* Plantillas modal */}
          {showTpl && (
            <div className="modal-overlay" onClick={() => setShowTpl(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">Seleccionar Plantilla</span>
                  <button className="modal-close" onClick={() => setShowTpl(false)}>×</button>
                </div>
                <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {PLANTILLAS.map(p => (
                    <div key={p.id} className="auto-card" style={{ cursor:'pointer' }} onClick={() => loadPlantilla(p)}>
                      <div className="auto-icon green">📋</div>
                      <div className="auto-info">
                        <div className="auto-name">{p.name}</div>
                        <div className="auto-desc">{p.lines.length} líneas de asiento</div>
                      </div>
                      <span className={`pill ${p.platform==='both'?'pill-both':`pill-${p.platform}`}`}>
                        {p.platform==='both'?'Ambas':p.platform==='siigo'?'Siigo':'Alegra'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header">
              <span className="card-title">{editingId ? `Editando Asiento #${editingId}` : 'Encabezado del Asiento'}</span>
              <div style={{ display:'flex', gap:8 }}>
                {editingId && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { resetForm(); setTab('list') }}>
                    Cancelar edición
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setShowTpl(true)}>📋 Usar Plantilla</button>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row form-4">
                <div className="field">
                  <label>Fecha</label>
                  <input type="date" value={header.fecha} onChange={e => setHeader(h=>({...h,fecha:e.target.value}))} />
                </div>
                <div className="field" style={{ gridColumn:'span 2' }}>
                  <label>Concepto / Descripción</label>
                  <input placeholder="Ej: Nómina Mayo 2026" value={header.concepto} onChange={e => setHeader(h=>({...h,concepto:e.target.value}))} />
                </div>
                <div className="field">
                  <label>Plataforma Destino</label>
                  <select value={header.plataforma} onChange={e => setHeader(h=>({...h,plataforma:e.target.value}))}>
                    <option value="both">Siigo + Alegra</option>
                    <option value="siigo">Solo Siigo</option>
                    <option value="alegra">Solo Alegra</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Líneas del Asiento Contable</span>
              <button className="btn btn-secondary btn-sm" onClick={addLine}><Icon name="plus" size={11}/> Agregar Línea</button>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              <div className="caus-table-wrap">
                <table className="caus-table">
                  <thead>
                    <tr>
                      <th style={{ width:170 }}>Cuenta PUC</th>
                      <th style={{ width:220 }}>Descripción</th>
                      <th style={{ width:140 }}>Tercero / NIT</th>
                      <th style={{ width:130, textAlign:'right' }}>Débito (COP)</th>
                      <th style={{ width:130, textAlign:'right' }}>Crédito (COP)</th>
                      <th style={{ width:36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.id}>
                        <td>
                          <select value={line.cuenta} onChange={e=>update(line.id,'cuenta',e.target.value)}
                            style={{ width:'100%', fontFamily:'var(--mono)', fontSize:11 }}>
                            <option value="">— Seleccione —</option>
                            {CUENTAS_PUC.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                          </select>
                        </td>
                        <td><input value={line.descripcion} onChange={e=>update(line.id,'descripcion',e.target.value)} placeholder={`Línea ${idx+1}`} style={{ width:'100%' }}/></td>
                        <td><input value={line.tercero} onChange={e=>update(line.id,'tercero',e.target.value)} placeholder="NIT Tercero" className="input-mono" style={{ width:'100%',fontSize:11 }}/></td>
                        <td><input type="number" value={line.debito} onChange={e=>update(line.id,'debito',e.target.value)} placeholder="0" className="input-mono" style={{ width:'100%',textAlign:'right' }}/></td>
                        <td><input type="number" value={line.credito} onChange={e=>update(line.id,'credito',e.target.value)} placeholder="0" className="input-mono" style={{ width:'100%',textAlign:'right' }}/></td>
                        <td style={{ textAlign:'center' }}>
                          <button className="row-del" onClick={() => delLine(line.id)}><Icon name="trash" size={12}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="caus-totals">
                  {[['Total Débito',totalDeb,''],['Total Crédito',totalCred,''],['Diferencia',Math.abs(totalDeb-totalCred),balanced?'balanced':'unbalanced']].map(([label,val,cls]) => (
                    <div key={label} className="caus-total-item">
                      <div className="caus-total-label">{label}</div>
                      <div className={`caus-total-value ${cls}`}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div className={`balance-indicator ${balanced?'ok':'bad'}`}>
                  {balanced ? <><Icon name="check" size={14}/> Asiento cuadrado — listo para causar</> : '⚠ Débitos ≠ Créditos — ajuste las líneas'}
                </div>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={processing||!balanced}>
                  {processing ? '⏳ Procesando...' : editingId ? <><Icon name="check"/> Guardar Cambios</> : <><Icon name="check"/> Causar Asiento</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail modal */}
      {detail && (
        <CausacionModal
          causacion={detail}
          onClose={() => setDetail(null)}
          onEdit={(c) => { openEdit(c) }}
        />
      )}
    </div>
  )
}
