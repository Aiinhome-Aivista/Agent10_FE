// ─── Stat Card ──────────────────────────────────────────────────────
export function StatCard({ title, value, sub, color="rgb(var(--color-primary))", icon: Icon }) {
  return (
    <div className="bg-pwc-white border border-pwc-border rounded-xl p-5 flex flex-col gap-1">
      <div className="flex justify-between items-start">
        <span className="text-xs text-pwc-text-muted font-medium">{title}</span>
        {Icon && <Icon size={16} color={color} />}
      </div>
      <span className="text-3xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs text-pwc-text-muted">{sub}</span>}
    </div>
  )
}

// ─── Badge ──────────────────────────────────────────────────────────
const BC = {
  ACTIVE:'#22c55e', COMPLETED: 'rgb(var(--color-primary))', PENDING:'#f59e0b', CANCELLED:'#ef4444',
  ESCALATED:'#f97316', ON_HOLD:'#94a3b8', APPROVED:'#22c55e', REJECTED:'#ef4444',
  ISSUED: 'rgb(var(--color-primary))', DRAFT:'#6b7280', INDEXED:'#22c55e', FAILED:'#ef4444',
  PROCESSING:'#f59e0b', VERIFIED:'#22c55e', EXPIRED:'#ef4444',
  LEVEL_1:'#f59e0b', LEVEL_2:'#f97316', LEVEL_3:'#ef4444',
}
export function Badge({ label }) {
  const c = BC[label] || '#6b7280'
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ color: c, background: c + '22', border: `1px solid ${c}44` }}>
      {label}
    </span>
  )
}

// ─── DataTable ──────────────────────────────────────────────────────
export function DataTable({ columns, rows, emptyText = 'No data' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className="text-left px-3 py-2.5 text-xs font-semibold text-pwc-text-muted border-b border-pwc-border whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={columns.length} className="text-center py-10 text-pwc-text-muted">{emptyText}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} className="border-b border-pwc-border hover:bg-pwc-input">
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-2.5">
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return <div className={`bg-pwc-white border border-pwc-border rounded-xl p-5 ${className}`}>{children}</div>
}

// ─── Section Header ──────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex justify-between items-end mb-5">
      <div>
        <h2 className="text-xl font-bold font-display">{title}</h2>
        {subtitle && <p className="text-sm text-pwc-text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Btn ─────────────────────────────────────────────────────────────
const BV = {
  primary:   'bg-pwc-primary hover:bg-pwc-hover-orange text-pwc-white',
  secondary: 'bg-transparent border border-pwc-border text-pwc-text hover:bg-pwc-input',
  danger:    'bg-red-500 hover:bg-red-600 text-pwc-white',
  success:   'bg-green-500 hover:bg-green-600 text-pwc-white',
  ghost:     'bg-transparent text-pwc-text-muted hover:text-pwc-white',
}
const BS = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-base' }
export function Btn({ children, onClick, variant='primary', size='md', disabled, className='' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`rounded-lg font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${BV[variant]} ${BS[size]} ${className}`}>
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type='text', placeholder, required, className='', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-pwc-text-muted">{label}{required && ' *'}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2 text-sm text-pwc-text outline-none focus:border-pwc-primary transition-colors"
        {...props}
      />
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, className='' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-pwc-text-muted">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2 text-sm text-pwc-text outline-none focus:border-pwc-primary cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Alert ───────────────────────────────────────────────────────────
const AC = { error:'#ef4444', success:'#22c55e', warning:'#f59e0b', info: 'rgb(var(--color-primary))' }
export function Alert({ type='error', message }) {
  const c = AC[type]
  return (
    <div className="rounded-lg px-4 py-2.5 text-sm mb-3"
         style={{ background: c + '18', border: `1px solid ${c}44`, color: c }}>
      {message}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 rounded-full border-2 border-pwc-border border-t-pwc-primary"
           style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, className = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`bg-pwc-white border border-pwc-border rounded-xl p-6 w-full max-h-[85vh] overflow-y-auto relative ${className}`}
           onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-pwc-border bg-pwc-bg text-pwc-placeholder hover:text-pwc-white hover:border-pwc-primary transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X size={16} />
        </button>
        {title && <h3 className="text-lg font-bold font-display mb-4 pr-8">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
