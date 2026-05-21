export function StatusBadge({ status }) {
  const map = {
    ok:      ['badge-ok',      'Procesado'],
    pending: ['badge-pending', 'Pendiente'],
    error:   ['badge-error',   'Error'],
    off:     ['badge-off',     'Pausado'],
  }
  const [cls, label] = map[status] ?? ['badge-info', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function PlatformPill({ platform }) {
  if (platform === 'siigo')  return <span className="pill pill-siigo">Siigo</span>
  if (platform === 'alegra') return <span className="pill pill-alegra">Alegra</span>
  return <span className="pill pill-both">Ambas</span>
}
