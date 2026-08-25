import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { toggleSidebar } from '../../store/slices/uiSlice'
import {
  LayoutDashboard, Users, FileText, ShieldCheck, Stethoscope,
  BookOpen, Bell, LogOut, Menu, MessageSquare, ClipboardList,
  Briefcase, Scale, CheckCircle, Home, UserRound, BarChart3, CalendarClock,
  Send, FolderOpen, Upload, Sun, Moon
} from 'lucide-react'
import api from '../../services/api'
import { useTheme } from '../../hooks/useTheme'

const NAV = {
  BANKER: [
    { label: 'My Cases', icon: Briefcase, to: '/dashboard/banker' },
    { label: 'New Case', icon: FileText, to: '/dashboard/banker/new' },
    { label: 'Notifications', icon: Bell, to: '/dashboard/banker/notifications' },
    { label: 'Knowledge Base', icon: BookOpen, to: '/dashboard/banker/kb' },
    { label: 'RAG Chat', icon: MessageSquare, to: '/dashboard/banker/rag-chat' },
  ],
  CUSTOMER: [
    { label: 'My Cases',       icon: Home,        to: '/dashboard/customer' },
    { label: 'Policy Quotes',  icon: FileText,    to: '/dashboard/customer/quotes' },
    { label: 'Upload Documents', icon: Upload,     to: '/dashboard/customer/documents' },
    { label: 'My Policies',    icon: ShieldCheck, to: '/dashboard/customer/policies' },
    { label: 'Notifications',  icon: Bell,        to: '/dashboard/customer/notifications' },
    { label: 'RAG Chat',       icon: MessageSquare, to: '/dashboard/customer/rag-chat' },
  ],
  UNDERWRITER: [
    { label: 'UW Queue', icon: ClipboardList, to: '/dashboard/underwriter' },
    { label: 'Policy Issuance', icon: FileText, to: '/dashboard/underwriter/policies' },
    { label: 'Notifications', icon: Bell, to: '/dashboard/underwriter/notifications' },
    { label: 'Knowledge Base', icon: BookOpen, to: '/dashboard/underwriter/kb' },
    { label: 'RAG Chat', icon: MessageSquare, to: '/dashboard/underwriter/rag-chat' },
  ],
}


// Strip HTML tags and decode basic HTML entities to plain text
function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')      // remove tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim()
}

function BellDropdown({ onClose }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    api.get('/notifications/mine').then(r => setNotifs(r.data.notifications || [])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read')
    setNotifs(prev => prev.map(n => ({ ...n, status: 'SENT' })))
  }

  return (
    <div ref={ref} className="absolute right-0 top-10 w-80 bg-pwc-white border border-pwc-border rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-pwc-border">
        <span className="font-bold text-sm">Notifications</span>
        {notifs.some(n => n.status === 'PENDING') && (
          <button onClick={markAllRead} className="text-xs text-pwc-primary hover:underline cursor-pointer">Mark all read</button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-pwc-text-muted">Loading…</div>
        ) : notifs.length === 0 ? (
          <div className="p-6 text-center text-xs text-pwc-text-muted">No notifications yet</div>
        ) : notifs.slice(0, 10).map(n => (
          <div key={n.id} className={`px-4 py-3 border-b border-pwc-border last:border-0 ${n.status === 'PENDING' ? 'bg-pwc-primary/5' : ''}`}>
            <div className="flex items-start gap-2">
              {n.status === 'PENDING' && <div className="w-1.5 h-1.5 rounded-full bg-pwc-primary mt-1.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{n.subject}</p>
                <p className="text-xs text-pwc-text-muted mt-0.5 line-clamp-2">{stripHtml(n.body) || n.notification_type}</p>
                <p className="text-[10px] text-pwc-text-muted mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardShell() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const { sidebarOpen } = useSelector(s => s.ui)
  const navItems = NAV[user?.role] || []
  const { isDark, toggleTheme } = useTheme()

  const [unreadCount, setUnreadCount] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)

  useEffect(() => {
    const fetch = () => {
      api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count || 0)).catch(() => {})
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-pwc-bg">
      {/* Sidebar */}
      <aside className={`flex flex-col flex-shrink-0 transition-all duration-200 border-r border-pwc-border bg-pwc-sidebar`}
        style={{ width: sidebarOpen ? 240 : 64 }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-pwc-border">
          <div className="w-8 h-8 rounded-lg bg-pwc-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            Q2P
          </div>
          {sidebarOpen && <span className="font-bold text-sm font-display whitespace-nowrap text-white">Q2P Platform</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map(({ label, icon: Icon, to }) => (
            <NavLink key={to} to={to} end={to.split('/').length <= 3}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors no-underline
                 ${isActive ? 'bg-pwc-primary text-white font-semibold shadow' : 'text-[#D8D8D8] hover:text-white hover:bg-pwc-input/20'}`
              }>
              <Icon size={17} className="flex-shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-pwc-border p-3 text-[#D8D8D8]">
          {sidebarOpen && (
            <div className="mb-2 px-2">
              <p className="text-xs font-semibold truncate text-white">{user?.name || user?.id?.slice(0, 8)}</p>
              <p className="text-xs">{user?.role}</p>
            </div>
          )}
          <button onClick={() => { dispatch(logout()); navigate('/login') }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs hover:text-red-400 hover:bg-pwc-primary/15 transition-colors cursor-pointer">
            <LogOut size={15} />
            {sidebarOpen && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-5 h-14 border-b border-pwc-border flex-shrink-0 bg-pwc-white">
          <button onClick={() => dispatch(toggleSidebar())} className="text-pwc-text-muted hover:text-pwc-primary cursor-pointer">
            <Menu size={20} />
          </button>
          <div className="flex-1" />

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="text-pwc-text-muted hover:text-pwc-primary cursor-pointer p-1">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Bell with unread badge */}
          <div className="relative">
            <button onClick={() => setBellOpen(v => !v)} className="relative text-pwc-text-muted hover:text-pwc-primary cursor-pointer p-1">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pwc-primary text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && <BellDropdown onClose={() => { setBellOpen(false); api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count || 0)) }} />}
          </div>

          <div className="w-8 h-8 rounded-full bg-pwc-primary flex items-center justify-center text-white text-xs font-bold">
            {(user?.name || user?.role || 'U')[0].toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 fade-in bg-pwc-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

