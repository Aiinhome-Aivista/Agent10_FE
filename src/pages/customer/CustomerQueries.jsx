import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card, SectionHeader, Btn, Spinner, Alert } from '../../components/common'

export default function CustomerQueries() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/queries/mine').then(r => setQueries(r.data.queries || [])).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const handleReply = async (id, e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    try {
      await api.post(`/queries/${id}/reply`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setQueries(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reply')
    }
  }

  return (
    <div>
      <SectionHeader title="Pending Queries" subtitle="Questions from underwriters requiring your response" />
      {loading ? <Spinner /> : null}
      {error && <Alert type="error" message={error} />}
      {!loading && queries.length === 0 && <Card style={{ color: 'var(--text-muted)' }}>No pending queries.</Card>}
      {queries.map(q => (
        <Card key={q.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{q.case_number || q.case_id}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{q.reason}</div>
            </div>
            <div style={{ textAlign: 'right' }}>{q.created_at ? new Date(q.created_at).toLocaleString() : ''}</div>
          </div>
          <form onSubmit={(e) => handleReply(q.id, e)}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="file" name="files" multiple />
              <input name="message" placeholder="Optional reply message" style={{ flex: 1 }} />
              <Btn type="submit">Reply</Btn>
            </div>
          </form>
        </Card>
      ))}
    </div>
  )
}
