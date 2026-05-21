import { useState, useEffect, useCallback } from 'react'
import { getHistorial, exportHistorial } from '../api/client'
import { StatusBadge, PlatformPill } from './ui/Badge'
import Icon from './ui/Icon'

const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const fmtShort = n => { if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return fmt(n) }
const PAGE_SIZE = 20

export default function Historial({ toast }) {
  const [rows,      setRows]    = useState([])
  const [total,     setTotal]   = useState(0)
  const [loading,   setLoading] = useState(true)
  const [filter,    setFilter]  = useState('all')
  const [platform,  setPlatform]= useState('all')
  const [search,    setSearch]  = useState('')
  const [page,      setPage]    = useState(0)

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const params = { skip: pg * PAGE_SIZE, limit: PAGE_SIZE }
      if (filter   !== 'all') params.status   = filter
      if (platform !== 'all') params.platform = platform
      if (search)              params.search   = search
      const data = await getHistorial(params)
      setRows(data.items || [])
      setTotal(data.total || 0)
      setPage(pg)
    } catch {
      toast('Error cargando historial', 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, platform, search])

  useEffect(() => { load(0) }, [load])

  const handleExport = () => {
    const params = {}
    if (filter   !== 'all') params.status   = filter
    if (platform !== 'all') params.platform = platform
    if (search)              params.search   = search
    exportHistorial(params)
    toast('Generando Excel...', 'info')
  }

  const totalPages  = Math.ceil(total / PAGE_SIZE)
  const pageTotal   = rows.reduce((s, r) => s + (r.debito || 0), 0)

  return (
    <div className="fade-up">
      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder="Buscar por concepto..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:220, background:'var(--navy3)', border:'1px solid var(--border)', borderRadius:6, padding:'7px 12px', color:'var(--text-primary)', fontFamily:'var(--sans)', fontSize:13, outline:'none' }} />
        <div className="historial-filters">
          {[['all','Todos'],['ok','Procesados'],['pending','Pendientes'],['error','Errores']].map(([v,l]) => (
            <button key={v} className={`filter-chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <select value={platform} onChange={e => setPlatform(e.target.value)}
          style={{ background:'var(--navy3)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 10px', color:'var(--text-secondary)', fontFamily:'var(--mono)', fontSize:11, outline:'none' }}>
          <option value="all">Todas las plataformas</option>
          <option value="siigo">Siigo</option>
          <option value="alegra">Alegra</option>
          <option value="both">Ambas</option>
        </select>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft:'auto' }} onClick={handleExport}>
          <Icon name="download" size={11}/> Exportar Excel
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {loading ? 'Cargando...' : `${total} registro${total !== 1 ? 's' : ''}`}
            {totalPages > 1 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginLeft:8 }}>· pág. {page+1}/{totalPages}</span>}
          </span>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)' }}>
            Pág: <span style={{ color:'var(--emerald)' }}>{fmtShort(pageTotal)}</span>
          </span>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-center"><div className="spinner"/> Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Hora</th><th>Concepto</th><th>Tipo</th>
                  <th>Plataforma</th><th>Cuentas</th>
                  <th style={{ textAlign:'right' }}>Débito</th>
                  <th style={{ textAlign:'right' }}>Crédito</th>
                  <th>Estado</th><th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:12 }}>
                    Sin registros
                  </td></tr>
                ) : rows.map(r => (
                  <tr key={r.id}>
                    <td className="td-mono" style={{ color:'var(--text-muted)', fontSize:10 }}>#{r.id}</td>
                    <td className="td-mono" style={{ fontSize:11 }}>{r.fecha}</td>
                    <td className="td-mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{r.hora}</td>
                    <td style={{ fontWeight:500, maxWidth:200 }}>
                      {r.concepto}
                      {r.error_msg && (
                        <span title={r.error_msg} style={{ marginLeft:6, fontSize:10, color:'var(--red)', cursor:'help' }}>⚠</span>
                      )}
                    </td>
                    <td style={{ fontSize:11, color:'var(--text-secondary)' }}>{r.tipo}</td>
                    <td><PlatformPill platform={r.platform}/></td>
                    <td className="td-mono" style={{ textAlign:'center', color:'var(--text-muted)' }}>{r.cuentas}</td>
                    <td className="td-amount debit">{fmt(r.debito)}</td>
                    <td className="td-amount credit">{fmt(r.credito)}</td>
                    <td><StatusBadge status={r.status}/></td>
                    <td style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{r.usuario}</td>
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
              {total} registros · pág. {page+1} de {totalPages}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-secondary btn-sm" disabled={page===0||loading} onClick={() => load(page-1)}>← Anterior</button>
              <button className="btn btn-secondary btn-sm" disabled={page>=totalPages-1||loading} onClick={() => load(page+1)}>Siguiente →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
