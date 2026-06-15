import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card, SectionHeader, Btn, Spinner, Alert } from '../../components/common'

export default function CustomerQueries() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState({})

  useEffect(() => {
    api.get('/queries/mine').then(r => setQueries(r.data.queries || [])).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const handleReply = async (id, e) => {
    e.preventDefault()
    setUploading(prev => ({ ...prev, [id]: true }))
    const form = new FormData(e.target)
    try {
      await api.post(`/queries/${id}/reply`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setQueries(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reply')
    } finally {
      setUploading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div>
      <SectionHeader title="Pending Queries" subtitle="Questions from underwriters requiring your response" />
      {loading ? <Spinner /> : null}
      {error && <Alert type="error" message={error} />}
      {!loading && queries.length === 0 && <Card style={{ color: 'var(--text-muted)' }}>No pending queries.</Card>}
      {queries.map(q => {
        const requirements = q.requirements || []
        return (
          <Card key={q.id} style={{ marginBottom: 12, backgroundColor: '#0f1117', borderColor: '#2a2f45', border: '1px solid #2a2f45', padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#e8eaf0', fontSize: 14 }}>Pending Query</div>
                </div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</div>
              </div>
              
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2f45' }}>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>Requested By: <span style={{ color: '#e8eaf0', fontWeight: 600 }}>Underwriter</span></div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>Required Document: <span style={{ color: '#e8eaf0', fontWeight: 600 }}>{(requirements[0]) || q.reason || 'Document'}</span></div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>Status: <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pending</span></div>
              </div>
            </div>

            <form onSubmit={(e) => handleReply(q.id, e)}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>Upload Document</label>
                <input type="file" name="files" required style={{ padding: 8, borderRadius: 6, border: '1px solid #2a2f45', background: '#161b2e', color: '#e8eaf0', width: '100%' }} />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>Reply Message (Optional)</label>
                <input name="message" placeholder="Add a message..." style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #2a2f45', background: '#161b2e', color: '#e8eaf0', fontSize: 12 }} />
              </div>

              <Btn type="submit" disabled={uploading[q.id]} style={{ backgroundColor: '#4f46e5', color: '#fff', width: '100%' }}>
                {uploading[q.id] ? 'Uploading...' : 'Upload Document'}
              </Btn>
            </form>
          </Card>
        )
      })}
    </div>
  )
}
