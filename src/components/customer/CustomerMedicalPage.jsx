/**
 * CustomerMedicalPage.jsx
 * Route: /dashboard/customer/medical
 *
 * Connects only to existing backend APIs:
 *  - GET  /api/v1/cases/
 *  - GET  /api/v1/medical/customer/requests
 *  - POST /api/v1/medical/customer/request
 *  - POST /api/v1/medical/upload
 */

import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMedicalRequests,
  createMedicalRequest,
  uploadMedicalDocument,
  setMedicalData,
  clearMessages,
} from '../../store/slices/medicalSlice'
import { Card, SectionHeader, Btn, Alert, Spinner, Badge, StatCard } from '../common'
import { Stethoscope, Upload, ClipboardList, Activity, CheckCircle2 } from 'lucide-react'
import api from '../../services/api'

// ── constants ─────────────────────────────────────────────────────────

const MEDICAL_REPORT_TYPES = [
  { key: 'BLOOD_TEST',          label: 'Blood Test Report',    icon: '🩸' },
  { key: 'ECG',                 label: 'ECG Report',           icon: '❤️' },
  { key: 'DOCTOR_PRESCRIPTION', label: 'Doctor Prescription',  icon: '📋' },
  { key: 'OTHER_REPORTS',       label: 'Other Medical Reports', icon: '📄' },
]

const SMOKE_OPTIONS  = ['NO', 'YES', 'OCCASIONALLY']
const ALCOHOL_OPTIONS = ['NO', 'YES', 'OCCASIONALLY', 'RARELY']

// ── helper ────────────────────────────────────────────────────────────

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1] transition-colors"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] placeholder-[#4b5563] focus:border-[#6366f1] transition-colors"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none resize-none text-[#e8eaf0] placeholder-[#4b5563] focus:border-[#6366f1] transition-colors"
      />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────

export default function CustomerMedicalPage() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { requests, medicalData, uploadStatus, loading, creating, error, successMessage } =
    useSelector(s => s.medical)

  const [cases, setCases]               = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [casesLoading, setCasesLoading] = useState(true)
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const fileInputRefs = useRef({})

  // Load cases
  useEffect(() => {
    api.get('/cases/')
      .then(r => {
        const own = (r.data.cases || []).filter(c => c.customer_id === user?.id)
        setCases(own)
        if (own.length > 0) setSelectedCaseId(own[0].id)
      })
      .finally(() => setCasesLoading(false))
  }, [user])

  // Load medical requests
  useEffect(() => { dispatch(fetchMedicalRequests()) }, [dispatch])

  // Dismiss messages after 4s
  useEffect(() => {
    if (!error && !successMessage) return
    const t = setTimeout(() => dispatch(clearMessages()), 4000)
    return () => clearTimeout(t)
  }, [error, successMessage, dispatch])

  // Active request for the selected case
  const activeRequest = requests.find(r => r.case_id === selectedCaseId) || null
  const selectedCase  = cases.find(c => c.id === selectedCaseId) || null

  // Fetch uploaded medical documents
  const fetchUploadedDocs = () => {
    if (!activeRequest) return
    setDocsLoading(true)
    api.get(`/documents/medical-request/${activeRequest.id}`)
      .then(res => setUploadedDocs(res.data.documents || []))
      .catch(() => setUploadedDocs([]))
      .finally(() => setDocsLoading(false))
  }

  useEffect(() => {
    fetchUploadedDocs()
  }, [activeRequest])

  // Update questionnaire field
  const setField = (key, val) => dispatch(setMedicalData({ [key]: val }))

  if (casesLoading) return <Spinner />

  // ── Stats ─────────────────────────────────────────────────────────
  const pendingCount  = requests.filter(r => r.status === 'PENDING').length
  const doneCount     = requests.filter(r => r.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Medical Coordination"
        subtitle="Submit your medical questionnaire and upload required medical reports"
      />

      {/* Alerts */}
      {error          && <Alert type="error"   message={error} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* ── Stat row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My Cases"     value={cases.length}   icon={ClipboardList} />
        <StatCard title="Pending"      value={pendingCount}   color="#f59e0b" icon={Activity} />
        <StatCard title="Completed"    value={doneCount}      color="#22c55e" icon={CheckCircle2} />
      </div>

      {/* ── Medical Status Card ───────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <p className="font-bold text-base flex items-center gap-2">
            <Stethoscope size={18} className="text-[#6366f1]" />
            Medical Status
          </p>
          {cases.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#6b7280]">Case:</label>
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                className="bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-1.5 text-xs outline-none text-[#e8eaf0]"
              >
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number}</option>)}
              </select>
            </div>
          )}
        </div>

        {selectedCase ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Case ID',          value: selectedCase.case_number },
              { label: 'Case Stage',       value: selectedCase.current_stage, badge: true },
              { label: 'Medical Status',   value: activeRequest?.status || 'NOT STARTED', badge: true },
              { label: 'KYC Status',       value: selectedCase.kyc_status || 'PENDING_KYC', badge: true },
            ].map(({ label, value, badge }) => (
              <div key={label} className="bg-[#0b0d14] border border-[#1f2436] rounded-lg p-3">
                <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">{label}</p>
                {badge
                  ? <Badge label={value} />
                  : <p className="text-sm font-semibold text-[#e8eaf0] truncate">{value}</p>
                }
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">No cases found. Contact your banker.</p>
        )}

        {selectedCase && !activeRequest && (
          <div className="mt-4">
            <Alert
              type="warning"
              message="No medical document request has been initiated for this case yet. Please wait for the underwriter to request your medical documents."
            />
          </div>
        )}
      </Card>

      {/* ── Medical Questionnaire ─────────────────────────────── */}
      <Card>
        <p className="font-bold text-base mb-5 flex items-center gap-2">
          <ClipboardList size={18} className="text-[#2dd4bf]" />
          Medical Questionnaire
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TextField
            label="Height (cm)"
            value={medicalData.height}
            onChange={v => setField('height', v)}
            placeholder="e.g. 170"
            type="number"
          />
          <TextField
            label="Weight (kg)"
            value={medicalData.weight}
            onChange={v => setField('weight', v)}
            placeholder="e.g. 68"
            type="number"
          />
          <SelectField
            label="Smoking Status"
            value={medicalData.smoking_status}
            options={SMOKE_OPTIONS}
            onChange={v => setField('smoking_status', v)}
          />
          <SelectField
            label="Alcohol Usage"
            value={medicalData.alcohol_usage}
            options={ALCOHOL_OPTIONS}
            onChange={v => setField('alcohol_usage', v)}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <TextareaField
              label="Existing Diseases / Medical Conditions"
              value={medicalData.existing_diseases}
              onChange={v => setField('existing_diseases', v)}
              placeholder="e.g. Diabetes, Hypertension…"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <TextareaField
              label="Family Medical History"
              value={medicalData.family_medical_history}
              onChange={v => setField('family_medical_history', v)}
              placeholder="e.g. Father: Heart disease, Mother: Diabetes…"
            />
          </div>
        </div>
        <p className="text-xs text-[#6b7280] mt-4">
          * Questionnaire data is stored locally for your reference. The underwriter will review your uploaded medical reports.
        </p>
      </Card>

      {/* ── Medical Report Status ─────────────────────────────── */}
      <Card>
        <p className="font-bold text-base mb-1 flex items-center gap-2">
          <Stethoscope size={18} className="text-[#f59e0b]" />
          Medical Reports Status
        </p>
        <p className="text-xs text-[#6b7280] mb-5">
          {activeRequest
            ? `Status for request: ${activeRequest.id.slice(0, 8)}… — Status: ${activeRequest.status}`
            : 'Please wait for the underwriter to initiate a medical document request.'}
        </p>

        {docsLoading ? (
          <Spinner />
        ) : activeRequest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MEDICAL_REPORT_TYPES.map(({ key, label, icon }) => {
              const uploaded = uploadedDocs.find(d => d.document_type === key || d.document_type.includes(key))

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    uploaded ? 'border-[#22c55e]/40 bg-[#22c55e]/5' : 'border-[#2a2f45] bg-[#0f1117]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[#e8eaf0]">{label}</p>
                      </div>
                    </div>
                    {uploaded ? (
                      <Badge label="Uploaded" />
                    ) : (
                      <span className="text-[10px] text-[#f59e0b] font-bold">Pending Underwriter Upload</span>
                    )}
                  </div>
                  {uploaded ? (
                    <div className="text-[11px] text-[#22c55e] mt-1 font-medium truncate">
                      ✓ {uploaded.file_name}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#6b7280] mt-1">
                      No report file uploaded yet.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-[#2a2f45] bg-[#0b0d14] p-4 text-center text-sm text-[#6b7280]">
            No medical document request has been initiated for this case yet. Please wait for the underwriter to request your medical documents.
          </div>
        )}

        {/* Refresh button row */}
        <div className="flex gap-3 mt-6 flex-wrap">
          <Btn
            onClick={() => {
              dispatch(fetchMedicalRequests())
              fetchUploadedDocs()
            }}
            variant="secondary"
            disabled={loading || docsLoading}
          >
            {loading || docsLoading ? 'Refreshing…' : 'Refresh Status'}
          </Btn>
          {activeRequest && (
            <div className="text-xs text-[#6b7280] flex items-center">
              Request ID: <span className="text-[#e8eaf0] ml-1 font-mono">{activeRequest.id.slice(0, 12)}…</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── All Medical Requests table ───────────────────────── */}
      {requests.length > 0 && (
        <Card>
          <p className="font-semibold mb-4 text-sm">All Medical Requests</p>
          <div className="space-y-2">
            {requests.map(req => (
              <div
                key={req.id}
                className={`rounded-lg border p-3 flex items-center justify-between gap-4 transition-colors ${
                  req.case_id === selectedCaseId
                    ? 'border-[#6366f1]/50 bg-[#6366f1]/5'
                    : 'border-[#2a2f45] bg-[#0f1117]'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#e8eaf0] truncate">
                    Case: {req.case_id.slice(0, 8)}…
                  </p>
                  <p className="text-[10px] text-[#6b7280] mt-0.5">
                    Requirements: {(req.requirements || []).join(', ') || '—'}
                  </p>
                  <p className="text-[10px] text-[#6b7280]">
                    {req.created_at ? new Date(req.created_at).toLocaleString() : ''}
                  </p>
                </div>
                <Badge label={req.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
