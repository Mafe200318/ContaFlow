import { useState, useEffect } from 'react'
import { exportCausacion } from '../api/client'
import Icon from './ui/Icon'
import { StatusBadge, PlatformPill } from './ui/Badge'

const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function CausacionModal({ causacion, onClose, onEdit }) {
  if (!causacion) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Asiento #{causacion.id}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{causacion.concepto}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportCausacion(causacion.id)}>
              <Icon name="download" size={11}/> Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { onClose(); onEdit(causacion); }}>
              ✏️ Editar
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Meta */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:20 }}>
            {[
              ['Fecha',       causacion.fecha],
              ['Plataforma',  null],
              ['Estado',      null],
              ['Usuario',     causacion.usuario],
            ].map(([label, val], i) => (
              <div key={label} style={{ background:'var(--navy3)', borderRadius:6, padding:'10px 12px' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                {i === 1 ? <PlatformPill platform={causacion.plataforma}/> :
                 i === 2 ? <StatusBadge status={causacion.status}/> :
                 <div style={{ fontSize:12, color:'var(--text-primary)', fontFamily: i===0?'var(--mono)':'var(--sans)' }}>{val}</div>}
              </div>
            ))}
          </div>

          {/* IDs externos */}
          {(causacion.siigo_id || causacion.alegra_id) && (
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              {causacion.siigo_id  && <span style={{ fontFamily:'var(--mono)', fontSize:10, background:'rgba(74,158,255,0.1)', border:'1px solid rgba(74,158,255,0.2)', borderRadius:4, padding:'3px 8px', color:'#7BB8FF' }}>Siigo: {causacion.siigo_id}</span>}
              {causacion.alegra_id && <span style={{ fontFamily:'var(--mono)', fontSize:10, background:'rgba(240,165,0,0.1)',  border:'1px solid rgba(240,165,0,0.2)',  borderRadius:4, padding:'3px 8px', color:'var(--gold)' }}>Alegra: {causacion.alegra_id}</span>}
            </div>
          )}

          {/* Error */}
          {causacion.error_msg && (
            <div style={{ background:'rgba(255,71,87,0.07)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:6, padding:'8px 12px', fontSize:11, color:'var(--red)', marginBottom:14, fontFamily:'var(--mono)' }}>
              ⚠ {causacion.error_msg}
            </div>
          )}

          {/* Líneas */}
          <div style={{ fontFamily:'var(--display)', fontSize:12, fontWeight:700, marginBottom:8, color:'var(--text-primary)' }}>Líneas del Asiento</div>
          <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Cuenta','Descripción','Tercero','Débito','Crédito'].map(h => (
                    <th key={h} style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-muted)', padding:'8px 10px', textAlign: h==='Débito'||h==='Crédito'?'right':'left', background:'var(--navy3)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(causacion.lineas || []).map((l, i) => (
                  <tr key={i} style={{ background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'8px 10px', fontFamily:'var(--mono)', fontSize:11, color:'#7BB8FF' }}>{l.cuenta}</td>
                    <td style={{ padding:'8px 10px', fontSize:12 }}>{l.descripcion}</td>
                    <td style={{ padding:'8px 10px', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)' }}>{l.tercero || '—'}</td>
                    <td style={{ padding:'8px 10px', fontFamily:'var(--mono)', fontSize:11, textAlign:'right', color: l.debito>0?'var(--text-primary)':'var(--text-muted)' }}>{l.debito > 0 ? fmt(l.debito) : '—'}</td>
                    <td style={{ padding:'8px 10px', fontFamily:'var(--mono)', fontSize:11, textAlign:'right', color: l.credito>0?'var(--emerald)':'var(--text-muted)' }}>{l.credito > 0 ? fmt(l.credito) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:24, padding:'10px 14px', background:'var(--navy3)', borderTop:'1px solid var(--border)' }}>
              {[['Total Débito', causacion.total_debito],['Total Crédito', causacion.total_credito]].map(([l,v]) => (
                <div key={l} style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px' }}>{l}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:600, color:'var(--emerald)', marginTop:2 }}>{fmt(v||0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
