import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../../store/slices/authSlice'

export function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector(s => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    const res = await dispatch(loginUser({ email, password }))
    if (res.meta.requestStatus === 'fulfilled') navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pwc-bg">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-pwc-border bg-pwc-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-pwc-primary flex items-center justify-center text-pwc-white font-bold text-sm mx-auto mb-3">Q2P</div>
          <h1 className="text-xl font-bold font-display">Welcome back</h1>
          <p className="text-sm text-pwc-text-muted mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-pwc-text-muted">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@bank.com"
              className="bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-pwc-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-pwc-text-muted">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-pwc-primary" />
          </div>
          <button type="submit" disabled={loading}
            className="mt-2 py-2.5 rounded-lg bg-pwc-primary hover:bg-pwc-hover-orange text-pwc-white font-bold text-sm transition-colors disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-pwc-text-muted mt-6">
          No account?{' '}
          <Link to="/register" className="text-pwc-primary font-semibold hover:underline">Register</Link>
        </p>
        <p className="text-center mt-2">
          <Link to="/" className="text-xs text-pwc-text-muted hover:text-pwc-white">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}

const ROLES = ['BANKER', 'CUSTOMER', 'UNDERWRITER', 'COMPLIANCE', 'OPS_ADMIN']

export function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector(s => s.auth)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', phone: '' })
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    const res = await dispatch(registerUser(form))
    if (res.meta.requestStatus === 'fulfilled') navigate('/login')
  }

  const inp = 'bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-pwc-primary w-full'

  return (
    <div className="min-h-screen flex items-center justify-center py-10 bg-pwc-bg">
      <div className="w-full max-w-md p-8 rounded-2xl border border-pwc-border bg-pwc-white">
        <div className="text-center mb-7">
          <div className="w-12 h-12 rounded-xl bg-pwc-primary flex items-center justify-center text-pwc-white font-bold text-sm mx-auto mb-3">Q2P</div>
          <h1 className="text-xl font-bold font-display">Create Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Full Name', key: 'name', type: 'text', ph: 'Rahul Kumar' },
              { label: 'Email', key: 'email', type: 'email', ph: 'you@bank.com' },
              { label: 'Password', key: 'password', type: 'password', ph: '••••••••' },
              { label: 'Phone', key: 'phone', type: 'tel', ph: '+91 9876543210' },
            ].map(({ label, key, type, ph }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-pwc-text-muted">{label}</label>
                <input type={type} value={form[key]} onChange={e => set(key)(e.target.value)}
                  placeholder={ph} required={key !== 'phone'} className={inp} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-pwc-text-muted">Role</label>
            <select value={form.role} onChange={e => set('role')(e.target.value)} className={inp + ' cursor-pointer'}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="mt-1 py-2.5 rounded-lg bg-pwc-primary hover:bg-pwc-hover-orange text-pwc-white font-bold text-sm transition-colors disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-pwc-text-muted mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-pwc-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
