import { useEffect, useRef, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCases } from '../../store/slices/casesSlice'
import { StatCard, DataTable, Badge, Card, SectionHeader, Btn, Input, Alert, Spinner, Modal } from '../../components/common'
import { Briefcase, Clock, CheckCircle, FileText, Bell, Upload, Search } from 'lucide-react'
import api from '../../services/api'
import { KnowledgeBase, RAGChat } from '../../components/common/RAGComponents'

const STAGES = [
  'CUSTOMER_INTAKE', 'NEEDS_ANALYSIS', 'SUITABILITY_VALIDATION', 'QUOTE_RETRIEVAL',
  'QUOTE_COMPARISON', 'RECOMMENDATION', 'BANKER_APPROVAL', 'OTP_CONSENT',
  'PROPOSAL_GENERATION', 'MEDICAL_COORDINATION', 'UNDERWRITING', 'POLICY_ISSUANCE',
  'EXCEPTION_HANDLING', 'ESCALATION', 'COMPLETED'
]

function CsvDropzone({ file, onFileChange, onClear, description, label = 'CSV Upload', disabled = false }) {
  const inputRef = useRef(null)

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    if (disabled) return
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) onFileChange(dropped)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPicker()
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={`group rounded-2xl border border-dashed bg-[linear-gradient(180deg,#15192a_0%,#101423_100%)] p-4 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-[#6366f1] hover:bg-[#15192f]'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6366f1]/15 text-[#7c83ff]">
          <Upload size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#e8eaf0]">{label}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{description}</p>
          <p className="mt-2 text-xs text-[#93a1c6]">Drop a CSV file here or click to browse.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#2a2f45] bg-[#0f1117] px-3 py-2 text-sm">
        <span className="text-[#6b7280]">Selected file:</span>
        <span className="truncate font-medium text-[#e8eaf0]">{file?.name || 'No file selected'}</span>
        {file && onClear && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onClear()
            }}
            className="ml-auto rounded-lg border border-[#2a2f45] px-3 py-1 text-xs font-semibold text-[#e8eaf0] hover:bg-[#1e2235]"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

// ── Case List ─────────────────────────────────────────────────────────
function CaseList() {
  const dispatch = useDispatch()
  const { list: cases, loading } = useSelector(s => s.cases)
  const [selected, setSelected] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [qLoading, setQL] = useState(false)
  
  // Filtering states
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => { dispatch(fetchCases()) }, [dispatch])

  const fetchQuotes = async caseId => {
    setQL(true)
    try {
      const { data } = await api.get(`/quotes/case/${caseId}`)
      setQuotes(data.quotes)
    } finally { setQL(false) }
  }

  const triggerFetch = async caseId => {
    await api.post(`/quotes/case/${caseId}/fetch`)
    fetchQuotes(caseId)
  }

  const approve = async caseId => {
    await api.post(`/cases/${caseId}/banker-approve`, { remarks: 'Approved by banker' })
    dispatch(fetchCases())
  }

  const triggerWorkflow = async caseId => {
    await api.post(`/workflow/case/${caseId}/run`)
    dispatch(fetchCases())
  }

  const cols = [
    { key: 'case_number', label: 'Case #' },
    { key: 'current_stage', label: 'Stage', render: r => <Badge label={r.current_stage} /> },
    { key: 'status', label: 'Status', render: r => <Badge label={r.status} /> },
    { key: 'sum_assured', label: 'Sum Assured', render: r => r.sum_assured ? `₹${r.sum_assured.toLocaleString()}` : '—' },
    { key: 'banker_approved', label: 'Recommendation Accepted?', render: r => r.banker_approved ? 'Yes' : 'No' },
    { key: 'consent_given', label: 'OTP Verified?', render: r => r.consent_given ? 'Yes' : 'Pending' },
    { key: 'created_at', label: 'Created', render: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '—' },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => { setSelected(r); fetchQuotes(r.id) }}>View</Btn>
          {!r.banker_approved && r.current_stage === 'BANKER_APPROVAL' &&
            <Btn size="sm" variant="success" onClick={() => approve(r.id)}>Approve</Btn>}
        </div>
      )
    },
  ]

  const active = cases.filter(c => c.status === 'ACTIVE').length
  const pending = cases.filter(c => c.status === 'PENDING').length
  const completed = cases.filter(c => c.status === 'COMPLETED').length

  // Selected case should be reactive to the cases list
  const activeCase = selected ? cases.find(c => c.id === selected.id) : null
  const stageIdx = activeCase ? STAGES.indexOf(activeCase.current_stage) : 0

  // Filter cases logic
  const filteredCases = cases.filter(c => {
    const matchesSearch = !searchQuery || c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = filterStage === 'ALL' || c.current_stage === filterStage
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus
    return matchesSearch && matchesStage && matchesStatus
  })

  return (
    <div>
      <SectionHeader title="My Cases" subtitle="All insurance cases assigned to you" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Cases" value={cases.length} icon={Briefcase} />
        <StatCard title="Active" value={active} color="#22c55e" icon={Clock} />
        <StatCard title="Pending" value={pending} color="#f59e0b" icon={FileText} />
        <StatCard title="Completed" value={completed} color="#6366f1" icon={CheckCircle} />
      </div>
      
      <Card>
        <div className="flex justify-between items-center mb-4">
          <p className="font-semibold text-sm text-[#e8eaf0]">Case Directory</p>
          <Btn size="sm" variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Btn>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 rounded-xl border border-[#2a2f45] bg-[#0f1117]">
            <div>
              <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Search Case #</label>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search case number..."
                className="w-full bg-[#15192a] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Filter by Stage</label>
              <select
                value={filterStage}
                onChange={e => setFilterStage(e.target.value)}
                className="w-full bg-[#15192a] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1]"
              >
                <option value="ALL">All Stages</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-[#15192a] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
          </div>
        )}

        {loading ? <Spinner /> : <DataTable columns={cols} rows={filteredCases} emptyText="No cases match your filters." />}
      </Card>

      {/* Case Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Case: ${activeCase?.case_number}`} className="max-w-4xl">
        {activeCase && (
          <div>
            {/* Stage Progress */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-[#6b7280] mb-2">Workflow Progress</p>
              <div className="flex flex-wrap gap-1">
                {STAGES.map((s, i) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: i < stageIdx ? '#22c55e22' : i === stageIdx ? '#6366f122' : '#1e2235',
                      color: i < stageIdx ? '#22c55e' : i === stageIdx ? '#6366f1' : '#6b7280',
                      border: `1px solid ${i <= stageIdx ? (i < stageIdx ? '#22c55e44' : '#6366f144') : '#2a2f45'}`
                    }}>
                    {i + 1}. {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-5 flex-wrap">
              <Btn size="sm" onClick={() => triggerWorkflow(activeCase.id)}>▶ Run AI Workflow</Btn>
              <Btn size="sm" variant="secondary" onClick={() => triggerFetch(activeCase.id)}>📊 Fetch Quotes</Btn>
              {!activeCase.banker_approved && <Btn size="sm" variant="success" onClick={() => approve(activeCase.id)}>✅ Approve</Btn>}
            </div>

            {/* Quotes */}
            {qLoading ? <Spinner /> : quotes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-semibold text-[#6b7280]">Quotes ({quotes.length})</p>
                  <button 
                    onClick={() => fetchQuotes(activeCase.id)} 
                    className="text-xs font-semibold text-[#6366f1] hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                  >
                    🔄 Refresh Quotes
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {quotes.map((q, i) => (
                    <QuoteCard key={q.id} q={q} isTop={i === 0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── New Case Form ─────────────────────────────────────────────────────
function NewCaseForm() {
  const { user } = useSelector(s => s.auth)
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [form, setForm] = useState({
    sum_assured: '', premium_budget: '', policy_tenure: '20', purpose: '',
  })
  const [loading, setL] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const selectedCustomer = customers.find((customer) => customer.user_id === selectedCustomerId) || null

  const filteredCustomers = customers.filter((customer) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    return [customer.name, customer.email, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const buildCustomerProfile = (customer) => {
    const raw = customer?.raw_payload || {}
    const normalized = customer?.normalized_payload || {}
    return {
      ...raw,
      ...normalized,
      name: customer?.name || normalized.name || raw.name || '',
      email: customer?.email || normalized.email || raw.email || '',
      phone: customer?.phone || normalized.phone || raw.phone || '',
      dob: normalized.date_of_birth || normalized.dob || raw.date_of_birth || raw.dob || '',
      annual_income: Number(normalized.annual_income) || Number(raw.annual_income) || 0,
      dependents: Number(normalized.dependents) || Number(raw.dependents) || 0,
      risk_appetite: normalized.risk_appetite || raw.risk_appetite || '',
      kyc_status: normalized.kyc_status || raw.kyc_status || '',
    }
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const { data } = await api.get('/banker/customers')
      setCustomers(data.customers || [])
    } catch (error) {
      setErr(error.response?.data?.detail || 'Failed to load customers')
    } finally {
      setLoadingCustomers(false)
    }
  }

  useEffect(() => { loadCustomers() }, [])

  const submit = async () => {
    if (!selectedCustomer) {
      setErr('Please select a customer from the list below first.')
      return
    }
    setL(true); setErr(null)
    try {
      await api.post('/cases/', {
        customer_id: selectedCustomer.user_id || user?.id,
        customer_profile: buildCustomerProfile(selectedCustomer),
        sum_assured: parseFloat(form.sum_assured) || 0,
        premium_budget: parseFloat(form.premium_budget) || 0,
        policy_tenure: parseInt(form.policy_tenure) || 20,
        needs_analysis: { purpose: form.purpose },
      })
      setOk(true)
    } catch (e) { setErr(e.response?.data?.detail || 'Failed to create case') }
    finally { setL(false) }
  }

  if (ok) return (
    <Card className="text-center py-12">
      <div className="text-5xl mb-4">✅</div>
      <h3 className="text-lg font-bold mb-2">Case Created!</h3>
      <p className="text-sm text-[#6b7280] mb-6">AI workflow has been triggered.</p>
      <Btn onClick={() => setOk(false)}>Create Another</Btn>
    </Card>
  )

  const uploadCsv = async () => {
    if (!csvFile) return
    setCsvUploading(true)
    setErr(null)
    setOk(null)
    try {
      const fd = new FormData()
      fd.append('file', csvFile)
      const { data } = await api.post('/banker/customers/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOk(`CSV import completed. Imported ${data.imported || 0} customer(s).`)
      setCsvFile(null)
      await loadCustomers()
    } catch (error) {
      setErr(error.response?.data?.detail || 'CSV import failed')
    } finally {
      setCsvUploading(false)
    }
  }

  const customerCols = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'source_type', label: 'Source', render: (row) => <Badge label={row.source_type} /> },
    { key: 'created_at', label: 'Added', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Btn
          size="sm"
          variant={row.user_id === selectedCustomerId ? 'success' : 'secondary'}
          onClick={() => setSelectedCustomerId(row.user_id)}
        >
          {row.user_id === selectedCustomerId ? 'Selected' : 'Select'}
        </Btn>
      ),
    },
  ]

  return (
    <div>
      <SectionHeader title="New Case" subtitle="Upload customers by CSV, pick one below, then create the case" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Upload size={16} />
            <p className="font-semibold">CSV Customer Upload</p>
          </div>
          <p className="text-sm text-[#6b7280] mb-4">Upload customer rows to create logins automatically. Each imported customer receives the default password 852456 and will be required to change it on first login.</p>
          {err && <Alert type="error" message={err} />}
          {ok && <Alert type="success" message={ok} />}
          <CsvDropzone
            file={csvFile}
            onFileChange={setCsvFile}
            onClear={() => setCsvFile(null)}
            description="Use a CSV with name and email columns. Common aliases like customer_name, customer_email, and phone_number also work."
          />
          <div className="mt-4 flex gap-2">
            <Btn onClick={uploadCsv} disabled={!csvFile || csvUploading} className="flex-1">
              {csvUploading ? 'Importing…' : 'Import CSV'}
            </Btn>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} />
            <p className="font-semibold">Case Details</p>
          </div>
          <div className="mb-4 rounded-lg border border-[#2a2f45] bg-[#0f1117] p-4">
            <p className="text-xs font-semibold text-[#6b7280] mb-2">Selected customer</p>
            {selectedCustomer ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-[#e8eaf0]">{selectedCustomer.name}</p>
                <p className="text-[#6b7280]">{selectedCustomer.email}</p>
                <p className="text-[#6b7280]">{selectedCustomer.phone || '—'}</p>
                <p className="text-xs text-[#6b7280]">User ID: {selectedCustomer.user_id}</p>
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">Pick a customer from the list below to continue.</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Sum Assured (₹)" value={form.sum_assured} onChange={set('sum_assured')} placeholder="5000000" />
            <Input label="Premium Budget/yr (₹)" value={form.premium_budget} onChange={set('premium_budget')} placeholder="60000" />
            <Input label="Policy Tenure (years)" value={form.policy_tenure} onChange={set('policy_tenure')} placeholder="20" />
            <Input label="Insurance Purpose" value={form.purpose} onChange={set('purpose')} placeholder="Family protection, tax saving…" className="sm:col-span-2" />
          </div>
          <Btn onClick={submit} disabled={loading || !selectedCustomer} className="mt-5 w-full">
            {loading ? 'Creating…' : 'Create Case & Trigger Workflow'}
          </Btn>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <SectionHeader title="Customers" subtitle="Search by name, email, or phone" />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name, email, or phone"
              className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#6366f1]"
            />
          </div>
          {loadingCustomers ? (
            <Spinner />
          ) : (
            <DataTable columns={customerCols} rows={filteredCustomers} emptyText="No customers match your search." />
          )}
        </div>
      </Card>

    </div>
  )
}

// ── Quote Comparison ──────────────────────────────────────────────────
function QuoteCard({ q, isTop }) {
  const [expanded, setExpanded] = useState(false)
  const coverage = q.coverage_details || {}
  const riders = q.riders || []
  const exclusions = q.exclusions || []
  const uwDocs = q.underwriting_requirements || []
  const medicals = q.medical_requirements || []

  return (
    <Card 
      onClick={() => setExpanded(!expanded)} 
      className={`relative flex flex-col justify-between cursor-pointer hover:border-[#6366f1] transition-all duration-200 ${isTop ? 'border-[#6366f1]' : ''}`}
    >
      {isTop && (
        <span className="absolute -top-3 left-4 bg-[#6366f1] text-white text-[10px] px-3 py-0.5 rounded-full font-bold">
          AI Recommended
        </span>
      )}
      <div>
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <p className="font-bold text-base text-[#e8eaf0]">{q.insurer_name}</p>
            <p className="text-xs text-[#6b7280]">{q.product_name}</p>
          </div>
          <div className="text-right min-w-max">
            <p className="font-bold text-[#22c55e] text-base">₹{q.annual_premium?.toLocaleString()}</p>
            <p className="text-[10px] text-[#6b7280]">per year</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-[#0f1117] border border-[#2a2f45] rounded-lg p-2.5">
            <p className="text-[10px] text-[#6b7280]">Sum Assured</p>
            <p className="font-bold text-[#e8eaf0]">₹{q.sum_assured?.toLocaleString()}</p>
          </div>
          <div className="bg-[#0f1117] border border-[#2a2f45] rounded-lg p-2.5">
            <p className="text-[10px] text-[#6b7280]">Tenure</p>
            <p className="font-bold text-[#e8eaf0]">{q.policy_tenure} yrs</p>
          </div>
          <div className="bg-[#0f1117] border border-[#2a2f45] rounded-lg p-2.5">
            <p className="text-[10px] text-[#6b7280]">AI Score</p>
            <p className="font-bold text-[#2dd4bf]">{((q.ai_score || 0) * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-[#0f1117] border border-[#2a2f45] rounded-lg p-2.5">
            <p className="text-[10px] text-[#6b7280]">Rank</p>
            <p className="font-bold text-[#e8eaf0]">#{q.ai_rank}</p>
          </div>
        </div>

        {q.ai_recommendation_text && (
          <div className="text-xs text-[#2dd4bf] bg-[#2dd4bf]/10 rounded-lg p-3 mb-3 leading-relaxed whitespace-pre-wrap">
            {q.ai_recommendation_text}
          </div>
        )}

        {expanded && (
          <div className="space-y-4 pt-3 border-t border-[#2a2f45] text-xs">
            {/* Benefit Coverages */}
            {Object.keys(coverage).length > 0 && (
              <div>
                <p className="text-[#6b7280] font-semibold mb-2">Benefit Coverages</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(coverage).map(([key, val]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${val ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'}`}>
                        {val ? '✓' : '✗'} {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Waiting Period */}
            {q.waiting_period_days !== undefined && q.waiting_period_days !== null && (
              <div className="flex justify-between items-center bg-[#0f1117] border border-[#2a2f45] rounded-lg p-2.5">
                <span className="text-[#6b7280]">Waiting Period</span>
                <span className="font-semibold text-[#e8eaf0]">{q.waiting_period_days} days</span>
              </div>
            )}

            {/* Riders */}
            {riders.length > 0 && (
              <div>
                <p className="text-[#6b7280] font-semibold mb-1.5">Optional Add-ons / Riders</p>
                <ul className="space-y-1 pl-4 list-disc text-[#e8eaf0]">
                  {riders.map((r, i) => {
                    const rName = r.name || r.rider_name || "";
                    const cost = r.annual_cost || r.annual_premium || r.premium_per_year;
                    return (
                      <li key={i}>
                        <span>{rName}</span>
                        {cost !== undefined && cost !== null && <span className="text-[#22c55e] font-semibold"> (+₹{cost.toLocaleString()}/yr)</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {exclusions.length > 0 && (
              <div>
                <p className="text-[#6b7280] font-semibold mb-1.5">Policy Exclusions</p>
                <ul className="space-y-1 pl-4 list-disc text-[#ef4444]">
                  {exclusions.map((exc, i) => (
                    <li key={i}>{exc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {(uwDocs.length > 0 || medicals.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {uwDocs.length > 0 && (
                  <div>
                    <p className="text-[#6b7280] font-semibold mb-1.5">Required Docs</p>
                    <ul className="space-y-1.5 pl-4 list-disc text-[#e8eaf0]">
                      {uwDocs.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                  </div>
                )}
                {medicals.length > 0 && (
                  <div>
                    <p className="text-[#6b7280] font-semibold mb-1.5">Medical Tests</p>
                    <ul className="space-y-1.5 pl-4 list-disc text-[#e8eaf0]">
                      {medicals.map((test, i) => <li key={i}>{test}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-full text-center py-2 px-3 rounded-lg border border-[#2a2f45] bg-[#15192a] hover:bg-[#1a1f36] text-xs font-semibold text-[#e8eaf0] transition-colors"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
    </Card>
  )
}

function QuoteComparison() {
  const { list: cases } = useSelector(s => s.cases)
  const [caseId, setCaseId] = useState('')
  const [quotes, setQuotes] = useState([])
  const [loading, setL] = useState(false)

  const load = async id => {
    setL(true)
    try { const { data } = await api.get(`/quotes/case/${id}`); setQuotes(data.quotes) }
    finally { setL(false) }
  }

  return (
    <div>
      <SectionHeader title="Quote Comparison" />
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={caseId} onChange={e => setCaseId(e.target.value)}
          className="bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none flex-1 min-w-48">
          <option value="">Select a case…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.current_stage}</option>)}
        </select>
        <Btn onClick={() => load(caseId)} disabled={!caseId || loading}>Load Quotes</Btn>
        <Btn variant="secondary" onClick={async () => { if (!caseId) return; await api.post(`/quotes/case/${caseId}/fetch`); load(caseId) }}>
          Fetch New
        </Btn>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {quotes.map((q, i) => (
            <QuoteCard key={q.id} q={q} isTop={i === 0} />
          ))}
          {!loading && quotes.length === 0 && caseId && (
            <p className="text-[#6b7280] text-sm col-span-3 text-center py-10">Currently no quotes available.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Banker Approvals ──────────────────────────────────────────────────
function BankerRecommendations() {
  const { list: cases } = useSelector(s => s.cases)
  const [caseId, setCaseId] = useState('')
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async (id) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/quotes/case/${id}`)
      setQuotes(data.quotes || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load recommendation data')
    } finally {
      setLoading(false)
    }
  }

  const recommendedQuote = quotes
    .slice()
    .sort((a, b) => (a.ai_rank ?? 999) - (b.ai_rank ?? 999) || ((b.ai_score || 0) - (a.ai_score || 0)))[0]

  const alternatives = quotes
    .slice()
    .sort((a, b) => (a.ai_rank ?? 999) - (b.ai_rank ?? 999) || ((b.ai_score || 0) - (a.ai_score || 0)))
    .filter(q => q.id !== recommendedQuote?.id)

  const formatScore = (score) => {
    if (score == null) return 'N/A'
    return `${Math.round((Number(score) || 0) * 100)}%`
  }

  return (
    <div>
      <SectionHeader title="Recommendation" subtitle="Review the AI-recommended product and alternative options" />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] mb-5">
        <Card>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-[0.2em]">Select Case</label>
              <select
                value={caseId}
                onChange={e => { setCaseId(e.target.value); setQuotes([]); }}
                className="mt-2 w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0]"
              >
                <option value="">Choose a case…</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.case_number} — {c.current_stage}</option>
                ))}
              </select>
            </div>
            <Btn onClick={() => load(caseId)} disabled={!caseId || loading} className="w-full">
              {loading ? 'Loading…' : 'Load Recommendation'}
            </Btn>
            <div className="rounded-2xl border border-[#2a2f45] bg-[#101423] p-4 text-sm text-[#9ca3af]">
              Choose a case and load quotes to see the recommended plan, score, and alternative products.
            </div>
            {error && <Alert type="error" message={error} />}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280] mb-3">Recommended Product</p>
            {!loading && !recommendedQuote && (
              <div className="text-sm text-[#6b7280]">Select a case and load quotes to view the recommendation.</div>
            )}
            {recommendedQuote && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#2a2f45] bg-[#0f1117] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#6b7280]">{recommendedQuote.insurer_name}</p>
                      <h2 className="text-2xl font-bold text-[#e8eaf0]">{recommendedQuote.product_name}</h2>
                    </div>
                    <div className="rounded-2xl bg-[#111827] px-4 py-2 text-sm font-semibold text-[#22c55e]">
                      Score: {formatScore(recommendedQuote.ai_score)}
                    </div>
                  </div>
                  <div className="mt-4 text-sm leading-7 text-[#d1d5db] whitespace-pre-wrap">
                    {recommendedQuote.ai_recommendation_text || 'No detailed reason was generated for this quote.'}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#2a2f45] bg-[#0f1117] p-5">
                  <p className="text-sm font-semibold text-[#e8eaf0] mb-3">Alternative Products</p>
                  {alternatives.length === 0 && <p className="text-sm text-[#6b7280]">No alternative products available.</p>}
                  <div className="space-y-3">
                    {alternatives.slice(0, 3).map((quote) => (
                      <div key={quote.id} className="rounded-2xl border border-[#2a2f45] bg-[#111827] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#e8eaf0]">{quote.insurer_name}</p>
                            <p className="text-xs text-[#6b7280]">{quote.product_name}</p>
                          </div>
                          <span className="rounded-full bg-[#fbbf24]/10 px-3 py-1 text-xs font-semibold text-[#fbbf24]">
                            {formatScore(quote.ai_score)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-[#9ca3af] leading-6 whitespace-pre-wrap">
                          {quote.ai_recommendation_text || 'Reason not available for this product.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function BankerApprovals() {
  const dispatch = useDispatch()
  const { list: cases, loading } = useSelector(s => s.cases)
  const [loading2, setL2] = useState({})
  const pending = cases.filter(c => c.current_stage === 'BANKER_APPROVAL' && !c.banker_approved)

  useEffect(() => { dispatch(fetchCases()) }, [dispatch])

  const approve = async id => {
    setL2(l => ({ ...l, [id]: true }))
    try { await api.post(`/cases/${id}/banker-approve`, { remarks: 'Approved' }); dispatch(fetchCases()) }
    finally { setL2(l => ({ ...l, [id]: false })) }
  }

  return (
    <div>
      <SectionHeader title="Pending Approvals" subtitle="Cases awaiting your approval before OTP consent" />
      {loading ? <Spinner /> : pending.length === 0
        ? <Card className="text-center py-12 text-[#6b7280]">No cases pending approval 🎉</Card>
        : pending.map(c => (
          <Card key={c.id} className="mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold">{c.case_number}</p>
                <Badge label={c.current_stage} />
              </div>
              <p className="text-sm font-bold text-[#22c55e]">₹{c.sum_assured?.toLocaleString()}</p>
            </div>
            <div className="flex gap-3 mt-3">
              <Btn onClick={() => approve(c.id)} disabled={loading2[c.id]} variant="success" size="sm">
                {loading2[c.id] ? 'Approving…' : '✅ Approve'}
              </Btn>
              <Btn variant="danger" size="sm">❌ Reject</Btn>
            </div>
          </Card>
        ))
      }
    </div>
  )
}

function CustomerIntake() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    annual_income: '',
    dependents: '',
    risk_appetite: 'MEDIUM',
    kyc_status: 'PENDING',
    financial_goals: '',
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/banker/customers')
      setCustomers(data.customers || [])
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  const submitManual = async () => {
    setSaving(true)
    setErr(null)
    setOk(null)
    try {
      await api.post('/banker/customers/manual', {
        ...form,
        annual_income: form.annual_income ? Number(form.annual_income) : null,
        dependents: form.dependents ? Number(form.dependents) : null,
        financial_goals: form.financial_goals
          ? form.financial_goals.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      })
      setOk('Customer profile saved and invitation sent.')
      setForm({
        name: '', email: '', phone: '', date_of_birth: '', annual_income: '', dependents: '',
        risk_appetite: 'MEDIUM', kyc_status: 'PENDING', financial_goals: '', notes: '',
      })
      load()
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const uploadCsv = async () => {
    if (!csvFile) return
    setCsvUploading(true)
    setErr(null)
    setOk(null)
    try {
      const fd = new FormData()
      fd.append('file', csvFile)
      const { data } = await api.post('/banker/customers/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOk(`CSV import completed. Imported ${data.imported || 0} customer(s).`)
      setCsvFile(null)
      load()
    } catch (e) {
      setErr(e.response?.data?.detail || 'CSV import failed')
    } finally {
      setCsvUploading(false)
    }
  }

  const cols = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'source_type', label: 'Source', render: (row) => <Badge label={row.source_type} /> },
    { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} /> },
    { key: 'created_at', label: 'Added', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
  ]

  return (
    <div>
      <SectionHeader title="Customer Intake" subtitle="Upload CSV or add customers manually for case onboarding" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Upload size={16} />
            <p className="font-semibold">CSV Import</p>
          </div>
          <p className="text-sm text-[#6b7280] mb-4">Drop a CSV file to import customers. Required columns are name and email; aliases like customer_name, customer_email, and phone_number are accepted.</p>
          {err && <Alert type="error" message={err} />}
          {ok && <Alert type="success" message={ok} />}
          <CsvDropzone
            file={csvFile}
            onFileChange={setCsvFile}
            onClear={() => setCsvFile(null)}
            description="Drag and drop a CSV here or click to browse."
          />
          <Btn onClick={uploadCsv} disabled={!csvFile || csvUploading} className="mt-4 w-full">
            {csvUploading ? 'Importing…' : 'Import CSV'}
          </Btn>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} />
            <p className="font-semibold">Manual Add</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={update('name')} placeholder="Rahul Kumar" />
            <Input label="Email" value={form.email} onChange={update('email')} placeholder="rahul@email.com" />
            <Input label="Phone" value={form.phone} onChange={update('phone')} placeholder="+91 9876543210" />
            <Input label="Date of Birth" value={form.date_of_birth} onChange={update('date_of_birth')} placeholder="1990-05-15" />
            <Input label="Annual Income" value={form.annual_income} onChange={update('annual_income')} placeholder="1200000" />
            <Input label="Dependents" value={form.dependents} onChange={update('dependents')} placeholder="2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Risk Appetite</label>
              <select value={form.risk_appetite} onChange={(e) => update('risk_appetite')(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">KYC Status</label>
              <select value={form.kyc_status} onChange={(e) => update('kyc_status')(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none">
                <option value="PENDING">PENDING</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REVIEW">REVIEW</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Financial Goals</label>
            <textarea value={form.financial_goals} onChange={(e) => update('financial_goals')(e.target.value)} rows={3}
              placeholder="Family protection, retirement, tax savings"
              className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => update('notes')(e.target.value)} rows={3}
              placeholder="KYC notes or special requirements"
              className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          </div>
          <Btn onClick={submitManual} disabled={saving} className="mt-4 w-full">
            {saving ? 'Saving…' : 'Save Customer'}
          </Btn>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Customer List" subtitle="Imported and manually added customers" />
        {loading ? <Spinner /> : <DataTable columns={cols} rows={customers} emptyText="No customers added yet." />}
      </Card>
    </div>
  )
}

function ProposalReview() {
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const loadCases = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/cases/')
      const reviewCases = (data.cases || []).filter(c => c.banker_approved)
      setCases(reviewCases)
      if (reviewCases.length > 0) {
        setSelectedCaseId(prev => prev || reviewCases[0].id)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load cases for proposal review')
    } finally {
      setLoading(false)
    }
  }

  const loadQuotes = async (caseId) => {
    if (!caseId) {
      setQuotes([])
      return
    }
    setQuoteLoading(true)
    try {
      const { data } = await api.get(`/quotes/case/${caseId}`)
      setQuotes(data.quotes || [])
    } catch (e) {
      setQuotes([])
      setError(e.response?.data?.detail || 'Failed to load quote data')
    } finally {
      setQuoteLoading(false)
    }
  }

  useEffect(() => { loadCases() }, [])

  useEffect(() => {
    if (selectedCaseId) loadQuotes(selectedCaseId)
    else setQuotes([])
  }, [selectedCaseId])

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const sortedQuotes = quotes.slice().sort((a, b) => (a.ai_rank ?? 999) - (b.ai_rank ?? 999) || ((b.ai_score || 0) - (a.ai_score || 0)))
  const selectedQuote = sortedQuotes[0] || quotes[0] || null
  const customerProfile = selectedCase?.customer_profile || {}
  const nomineeName = customerProfile.nominee_name || customerProfile.nominee?.name || customerProfile.nominee?.full_name || 'Not provided'
  const nomineeRelation = customerProfile.nominee_relationship || customerProfile.nominee?.relationship || ''
  const coverageDetails = selectedQuote?.coverage_details || selectedQuote?.coverage || selectedQuote?.benefits || {}

  const submitToUnderwriter = async () => {
    if (!selectedCase) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      await api.post(`/workflow/case/${selectedCase.id}/run`)
      setSuccess('Proposal submitted to underwriter workflow.')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit proposal to underwriter')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <SectionHeader title="Proposal Review" subtitle="Review customer details, coverage, premium and KYC before submitting to underwriting." />
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Card className="mb-5">
        <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Select Case for Proposal Review</label>
        <select value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)}
          className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">Choose a case…</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>{c.case_number} — {c.current_stage}</option>
          ))}
        </select>
      </Card>

      {loading ? <Spinner /> : !selectedCase ? (
        <Card className="text-center py-12 text-[#6b7280]">No banker-approved cases available for proposal review.</Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5">
          <div className="space-y-5">
            <Card>
              <p className="text-sm font-semibold text-[#6b7280] mb-3">Customer Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#d1d5db]">
                <div>
                  <p className="text-xs text-[#6b7280]">Name</p>
                  <p>{customerProfile.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Email</p>
                  <p>{customerProfile.email || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Phone</p>
                  <p>{customerProfile.phone || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Date of Birth</p>
                  <p>{customerProfile.dob || customerProfile.date_of_birth || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Annual Income</p>
                  <p>{customerProfile.annual_income ? `₹${Number(customerProfile.annual_income).toLocaleString()}` : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Case Stage</p>
                  <p>{selectedCase.current_stage}</p>
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-semibold text-[#6b7280] mb-3">Nominee</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#d1d5db]">
                <div>
                  <p className="text-xs text-[#6b7280]">Name</p>
                  <p>{nomineeName}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Relationship</p>
                  <p>{nomineeRelation || 'Not provided'}</p>
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-semibold text-[#6b7280] mb-3">Coverage</p>
              {selectedQuote ? (
                <div className="space-y-3 text-sm text-[#d1d5db]">
                  <div>
                    <p className="text-xs text-[#6b7280]">Plan</p>
                    <p>{selectedQuote.product_name || selectedQuote.insurer_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280]">Coverage Details</p>
                    {coverageDetails && typeof coverageDetails === 'object' ? (
                      <div className="space-y-2">
                        {Object.entries(coverageDetails).map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-[#2a2f45] bg-[#0f1117] p-3">
                            <p className="text-[10px] text-[#6b7280] uppercase tracking-[0.18em] mb-1">{key.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-[#e8eaf0]">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#9ca3af]">Coverage details are not available for this quote.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#9ca3af]">No quote loaded yet for coverage review.</p>
              )}
            </Card>

            <Card>
              <p className="text-sm font-semibold text-[#6b7280] mb-3">KYC</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#d1d5db]">
                <div>
                  <p className="text-xs text-[#6b7280]">KYC Status</p>
                  <p>{selectedCase.kyc_status || 'PENDING'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">eSign Status</p>
                  <p>{selectedCase.esign_status || 'NOT_STARTED'}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#6b7280] mb-2">Selected Quote</p>
                <p className="text-lg font-bold text-[#e8eaf0]">{selectedQuote?.product_name || 'No quote selected'}</p>
                <p className="text-sm text-[#6b7280]">{selectedQuote?.insurer_name || ''}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-[#d1d5db]">
                <div className="rounded-2xl border border-[#2a2f45] bg-[#0f1117] p-4">
                  <p className="text-[11px] text-[#6b7280]">Premium</p>
                  <p className="font-semibold text-[#22c55e]">{selectedQuote?.annual_premium ? `₹${selectedQuote.annual_premium.toLocaleString()}` : '—'}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2f45] bg-[#0f1117] p-4">
                  <p className="text-[11px] text-[#6b7280]">Sum Assured</p>
                  <p className="font-semibold text-[#e8eaf0]">{selectedQuote?.sum_assured ? `₹${selectedQuote.sum_assured.toLocaleString()}` : '—'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#2a2f45] bg-[#101423] p-5">
                <p className="text-sm text-[#6b7280] mb-3">Review Notes</p>
                <p className="text-sm text-[#d1d5db]">Submit the reviewed proposal to underwriting once customer details and KYC status are correct. This does not replace insurer underwriting review.</p>
              </div>

              <Btn onClick={submitToUnderwriter} disabled={submitting || !selectedCase} className="w-full">
                {submitting ? 'Submitting…' : 'Submit To Underwriter'}
              </Btn>
            </Card>

            <Card>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280] mb-3">Proposal Summary</p>
              <div className="space-y-3 text-sm text-[#d1d5db]">
                <div>
                  <p className="text-[#6b7280]">Case Number</p>
                  <p>{selectedCase.case_number}</p>
                </div>
                <div>
                  <p className="text-[#6b7280]">Banker Approved</p>
                  <p>{selectedCase.banker_approved ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-[#6b7280]">Current Stage</p>
                  <p>{selectedCase.current_stage}</p>
                </div>
                <div>
                  <p className="text-[#6b7280]">OTP Verified</p>
                  <p>{selectedCase.consent_given ? 'Yes' : 'Pending'}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationFeed() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/notifications/mine').then(({ data }) => setItems(data.notifications || [])).finally(() => setLoading(false))
  }, [])

  const cols = [
    { key: 'subject', label: 'Subject' },
    { key: 'reference_type', label: 'Type' },
    { key: 'status', label: 'Status', render: (row) => <Badge label={row.status} /> },
    { key: 'created_at', label: 'Time', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
  ]

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Notifications and email events for your account" />
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={items} emptyText="No notifications yet." />}</Card>
    </div>
  )
}

export default function BankerDashboard() {
  return (
    <Routes>
      <Route index element={<CaseList />} />
      <Route path="new" element={<NewCaseForm />} />
      <Route path="customers" element={<CustomerIntake />} />
      <Route path="quotes" element={<QuoteComparison />} />
      <Route path="recommendation" element={<BankerRecommendations />} />
      <Route path="proposal-review" element={<ProposalReview />} />
      <Route path="approvals" element={<BankerApprovals />} />
      <Route path="kb" element={<KnowledgeBase />} />
      <Route path="rag-chat" element={<RAGChat title="Insurance Knowledge Chat" placeholder="What is the difference between HDFC and LIC term plans?" />} />
      <Route path="notifications" element={<NotificationFeed />} />
    </Routes>
  )
}
