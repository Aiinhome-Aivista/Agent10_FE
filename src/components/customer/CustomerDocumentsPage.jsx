/**
 * CustomerDocumentsPage.jsx
 * Route: /dashboard/customer/documents
 *
 * Connects only to existing backend APIs:
 *  - GET  /api/v1/cases/
 *  - GET  /api/v1/medical/customer/requests
 *  - POST /api/v1/medical/customer/request
 *  - GET  /api/v1/documents/medical-request/{id}
 *  - POST /api/v1/medical/upload
 *  - POST /api/v1/medical/customer/profile-update-request
 *  - POST /api/v1/medical/customer/esign
 */

import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchDocumentRequests,
  createDocumentRequest,
  fetchUploadedDocuments,
  fetchDocumentsByCase,
  uploadDocument,
  submitProfileUpdateRequest,
  submitESign,
  setActiveRequest,
  clearMessages,
} from '../../store/slices/documentsSlice'
import { Card, SectionHeader, Btn, Alert, Spinner, Badge, StatCard } from '../common'
import { FileText, FolderOpen, ShieldCheck, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import api from '../../services/api'

// ── KYC doc types ─────────────────────────────────────────────────────
const KYC_DOC_TYPES = [
  { key: 'PAN_CARD',      label: 'PAN Card',                   icon: '🪪', hint: 'Scanned copy of PAN Card' },
  { key: 'ADDRESS_PROOF', label: 'Address Proof',              icon: '🏠', hint: 'Aadhaar / Voter ID / Utility Bill' },
  { key: 'SELFIE',        label: 'Live Photo / Selfie',        icon: '🤳', hint: 'Recent colour passport photo or selfie' },
  { key: 'SIGNATURE',     label: 'Signature',                  icon: '✍️', hint: 'Scanned signature on white paper' },
]

// ── tiny field helpers ────────────────────────────────────────────────

function InfoRow({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#1f2436] last:border-0">
      <span className="text-xs text-[#6b7280]">{label}</span>
      {badge ? <Badge label={value || '—'} /> : <span className="text-xs font-semibold text-[#e8eaf0]">{value || '—'}</span>}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────

export default function CustomerDocumentsPage() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { user }   = useSelector(s => s.auth)
  const {
    requests, activeRequest, uploadedDocuments,
    uploadStatus, loading, creating, signingIn,
    error, successMessage,
  } = useSelector(s => s.documents)

  const [cases, setCases]             = useState([])
  const [selectedCaseId, setSCId]     = useState('')
  const [casesLoading, setCL]         = useState(true)
  const [termsAccepted, setTerms]     = useState(false)
  const [profileUpdateText, setPUT]   = useState('')
  const [showOtpPanel, setShowOtpPanel] = useState(false)
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [otpStatus, setOtpStatus] = useState('idle')
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const fileRefs = useRef({})

  // Load cases
  useEffect(() => {
    api.get('/cases/')
      .then(r => {
        const own = (r.data.cases || []).filter(c => c.customer_id === user?.id)
        setCases(own)
        if (own.length > 0) setSCId(own[0].id)
      })
      .finally(() => setCL(false))
  }, [user])

  // Load all doc requests
  useEffect(() => { dispatch(fetchDocumentRequests()) }, [dispatch])

  // When selected case changes → update activeRequest
  useEffect(() => {
    const req = requests.find(r => r.case_id === selectedCaseId) || null
    dispatch(setActiveRequest(req))
    if (req) {
      dispatch(fetchUploadedDocuments(req.id))
    } else if (selectedCaseId) {
      // No medical request found for this case in the requests list —
      // fetch any documents attached to this case so the Documents panel still shows uploaded files.
      dispatch(fetchDocumentsByCase(selectedCaseId))
    }
  }, [selectedCaseId, requests, dispatch])

  // Auto-dismiss alerts
  useEffect(() => {
    if (!error && !successMessage) return
    const t = setTimeout(() => dispatch(clearMessages()), 4500)
    return () => clearTimeout(t)
  }, [error, successMessage, dispatch])

  // ── Helpers ──────────────────────────────────────────────────────
  const refreshAll = () => {
    dispatch(fetchDocumentRequests())
    if (activeRequest) dispatch(fetchUploadedDocuments(activeRequest.id))
  }

  const handleCreateRequest = () => {
    if (!selectedCaseId) return
    dispatch(createDocumentRequest({
      case_id: selectedCaseId,
      requirements: KYC_DOC_TYPES.map(d => d.key),
    })).unwrap()
      .then(() => dispatch(fetchDocumentRequests()))
      .catch(() => {})
  }

  const handleUpload = (document_type, file) => {
    if (!file || !selectedCaseId) return
    ;(async () => {
      try {
        let reqId = activeRequest?.id
        if (!reqId) {
          const payload = await dispatch(createDocumentRequest({
            case_id: selectedCaseId,
            requirements: KYC_DOC_TYPES.map(d => d.key),
          })).unwrap()
          reqId = payload.id || payload?.data?.id
          // set active request locally so UI enables uploads immediately
          dispatch(setActiveRequest({ id: reqId, case_id: selectedCaseId, requirements: KYC_DOC_TYPES.map(d => d.key), status: 'PENDING' }))
          // refresh requests list in background
          dispatch(fetchDocumentRequests())
        }
        if (!reqId) return
        await dispatch(uploadDocument({ medical_request_id: reqId, document_type, file })).unwrap()
        dispatch(fetchUploadedDocuments(reqId))
      } catch (e) {
        // swallow — errors handled in slice
      }
    })()
  }

  const handleProfileUpdate = () => {
    if (!selectedCaseId || !profileUpdateText.trim()) return
    dispatch(submitProfileUpdateRequest({
      case_id: selectedCaseId,
      requested_changes: { notes: profileUpdateText.trim() },
    })).unwrap()
      .then(() => setPUT(''))
      .catch(() => {})
  }

  const handleESign = async () => {
    if (!selectedCaseId) return

    try {
      if (activeRequest) {
        const pendingUploads = KYC_DOC_TYPES.map(({ key }) => {
          const input = fileRefs.current[key]
          const file = input?.files?.[0]
          const alreadyDone = uploadStatus[key] === 'done'
          if (file && !alreadyDone) {
            return dispatch(uploadDocument({
              medical_request_id: activeRequest.id,
              document_type: key,
              file,
            })).unwrap()
          }
          return Promise.resolve()
        })
        await Promise.all(pendingUploads)
      }

      await dispatch(submitESign({
        case_id: selectedCaseId,
        consent_text: 'I confirm the uploaded KYC documents are authentic and I consent to policy processing.',
      })).unwrap()
      refreshAll()
    } catch (e) {
      console.error('ESign failed', e)
    }
  }

  const resetOtpForm = () => {
    setOtp(Array(6).fill(''))
    setOtpError('')
    setOtpStatus('idle')
    setOtpSent(false)
    setOtpCountdown(0)
    setVerifyingOtp(false)
  }

  const verifyOtpCode = async (code) => {
    if (!selectedCaseId) return
    setVerifyingOtp(true)
    setOtpError('')
    setOtpStatus('verifying')
    try {
      await api.post('/otp/verify', {
        case_id: selectedCaseId,
        otp_code: code,
      })
      setOtpStatus('success')
      setOtpError('')
      refreshAll()
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Invalid OTP, please try again.')
      setOtpStatus('error')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!selectedCaseId) return
    if (otp.join('').length < 6) {
      setOtpError('Enter the full 6-digit OTP.')
      return
    }
    await verifyOtpCode(otp.join(''))
  }

  const handleOtpDigit = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()

    if (next.every(d => d !== '') && otpStatus !== 'success') {
      verifyOtpCode(next.join(''))
    }
  }

  const handleSendOtp = async () => {
    if (!selectedCaseId) return
    setSendingOtp(true)
    setOtpError('')
    setOtpStatus('sending')
    try {
      await api.post('/otp/send', { case_id: selectedCaseId })
      setOtpSent(true)
      setOtpStatus('sent')
      setOtpCountdown(30)
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Unable to send OTP. Please try again.')
      setOtpStatus('error')
    } finally {
      setSendingOtp(false)
    }
  }

  const openOtpConsent = () => {
    setShowOtpPanel(true)
    resetOtpForm()
    handleSendOtp()
  }

  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setTimeout(() => setOtpCountdown(prev => Math.max(prev - 1, 0)), 1000)
    return () => clearTimeout(timer)
  }, [otpCountdown])

  // ── Derived ──────────────────────────────────────────────────────
  const uploadedCount = uploadedDocuments.length
  const allUploaded   = KYC_DOC_TYPES.every(d =>
    uploadedDocuments.some(doc => doc.document_type === d.key))
  const selectedCase  = cases.find(c => c.id === selectedCaseId) || null

  if (casesLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="KYC & Document Upload"
        subtitle="Upload PAN, address proof, selfie, and signature for policy review"
      />

      {/* Alerts */}
      {error          && <Alert type="error"   message={error} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My Cases"        value={cases.length}  icon={FolderOpen} />
        <StatCard title="Docs Uploaded"   value={uploadedCount} icon={FileText}   color="#22c55e" />
        <StatCard
          title="All Docs Complete"
          value={allUploaded ? 'Yes' : 'No'}
          icon={allUploaded ? CheckCircle2 : Clock}
          color={allUploaded ? '#22c55e' : '#f59e0b'}
        />
      </div>

      {/* ── Top Controls ─────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Select Case</label>
            <select
              value={selectedCaseId}
              onChange={e => setSCId(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1]"
            >
              <option value="">Choose a case…</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_number} — {c.current_stage}</option>
              ))}
            </select>
          </div>

          {selectedCase && (
            <div className="flex gap-2 items-center pb-0.5">
              <Badge label={selectedCase.current_stage} />
              <Badge label={selectedCase.kyc_status || 'PENDING_KYC'} />
            </div>
          )}

          <div className="flex gap-2 flex-shrink-0">
            <Btn onClick={handleCreateRequest} disabled={!selectedCaseId || creating}>
              {creating ? 'Creating…' : '+ Create Doc Request'}
            </Btn>
            <Btn variant="secondary" onClick={refreshAll} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? '' : 'Refresh'}
            </Btn>
          </div>
        </div>
        <p className="text-xs text-[#6b7280] mt-3">
          Create a document request once per case, then upload all required KYC documents below.
        </p>
      </Card>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Document Checklist ─────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <p className="font-semibold mb-4 flex items-center gap-2">
              <FileText size={16} className="text-[#6366f1]" />
              Document Checklist
            </p>

            {!activeRequest && (
              <div className="rounded-lg border border-[#2a2f45] bg-[#0b0d14] p-4 text-center text-sm text-[#6b7280]">
                No document request exists for this case yet. Click "Create Doc Request" above.
              </div>
            )}

            <div className="space-y-3">
              {KYC_DOC_TYPES.map(({ key, label, icon, hint }) => {
                const uploaded    = uploadedDocuments.find(d => d.document_type === key)
                const upStatus    = uploadStatus[key] || 'idle'
                const isUploading = upStatus === 'uploading'
                const isDone      = !!uploaded
                const isError     = upStatus === 'error'

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      isDone  ? 'border-[#22c55e]/40 bg-[#22c55e]/5' :
                      isError ? 'border-[#ef4444]/40 bg-[#ef4444]/5' :
                                'border-[#2a2f45] bg-[#0f1117]'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#e8eaf0]">{label}</p>
                          <p className="text-[10px] text-[#6b7280]">{hint}</p>
                          {uploaded && (
                            <p className="text-[10px] text-[#22c55e] mt-0.5 font-medium truncate max-w-[200px]">
                              ✓ {uploaded.file_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge label={isDone ? 'Uploaded' : isError ? 'Failed' : isUploading ? 'Uploading…' : 'Pending'} />
                    </div>

                    {/* File input */}
                    <input
                      ref={el => fileRefs.current[key] = el}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={isUploading}
                      onChange={e => handleUpload(key, e.target.files?.[0])}
                      className="block w-full text-xs text-[#6b7280]
                        file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                        file:bg-[#6366f1] file:text-white file:text-xs file:font-semibold
                        file:cursor-pointer cursor-pointer disabled:opacity-40"
                    />
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <Card>
              <p className="font-semibold mb-3 text-sm">Uploaded Documents</p>
              <div className="space-y-2">
                {uploadedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2a2f45] bg-[#0b0d14] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#e8eaf0] truncate">{doc.document_type}</p>
                      <p className="text-[10px] text-[#6b7280] truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-[#6b7280]">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : ''}
                      </p>
                    </div>
                    {doc.verified ? <Badge label="Verified" /> : <Badge label="Pending Review" />}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Review & Consent Panel ──────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Review Panel */}
          <Card>
            <p className="font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2dd4bf]" />
              Review & Consent
            </p>
            <div className="space-y-1 mb-4">
              <InfoRow label="Request ID"     value={activeRequest ? activeRequest.id.slice(0, 12) + '…' : 'No request'} />
              <InfoRow label="Status"         value={activeRequest?.status}          badge />
              <InfoRow label="Required Docs"  value={(activeRequest?.requirements || []).length + ' documents'} />
              <InfoRow label="Docs Uploaded"  value={uploadedCount + ' / ' + KYC_DOC_TYPES.length} />
              <InfoRow label="Case Stage"     value={selectedCase?.current_stage}    badge />
            </div>

            {/* Profile Update */}
            <div className="rounded-lg border border-[#2a2f45] bg-[#0b0d14] p-3 mb-3">
              <p className="text-xs font-semibold text-[#6b7280] mb-2">Request Profile Correction</p>
              <textarea
                value={profileUpdateText}
                onChange={e => setPUT(e.target.value)}
                rows={3}
                placeholder="Describe what needs to be corrected in your pre-filled profile…"
                className="w-full bg-[#111827] border border-[#2a2f45] rounded-lg px-3 py-2 text-xs outline-none resize-none text-[#e8eaf0] placeholder-[#4b5563] mb-2"
              />
              <Btn
                size="sm"
                variant="secondary"
                onClick={handleProfileUpdate}
                disabled={!profileUpdateText.trim() || !selectedCaseId}
              >
                Request Update
              </Btn>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 text-xs cursor-pointer mb-4 p-3 rounded-lg border border-[#2a2f45] bg-[#0b0d14]">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTerms(e.target.checked)}
                className="mt-0.5 accent-[#6366f1] cursor-pointer"
              />
              <span className="text-[#9ca3af] leading-relaxed">
                I confirm that the above documents are true, accurate, and I accept the Terms & Conditions for KYC and policy processing.
              </span>
            </label>

            {/* Action buttons */}
            <div className="space-y-2">
              <Btn
                className="w-full"
                onClick={openOtpConsent}
                disabled={!allUploaded || !termsAccepted}
              >
                Proceed to OTP Consent
              </Btn>
              <Btn
                className="w-full"
                onClick={handleESign}
                disabled={!allUploaded || !termsAccepted || signingIn}
              >
                {signingIn ? 'Processing eSign…' : 'Complete eSign'}
              </Btn>
              <Btn
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/dashboard/customer/policies')}
              >
                View My Policies
              </Btn>
            </div>

            {showOtpPanel && (
              <div className="mt-4 rounded-xl border border-[#2a2f45] bg-[#0b0d14] p-4">
                <p className="font-semibold text-sm mb-3">OTP Consent</p>
                <p className="text-[12px] text-[#9ca3af] mb-3">
                  Enter the 6-digit OTP to confirm your consent for case {selectedCase?.case_number || selectedCaseId}.
                 
                </p>
                {otpError && <Alert type="error" message={otpError} />}
                {otpStatus === 'success' ? (
                  <div className="space-y-3">
                    <Alert type="success" message="OTP verification completed successfully. User consent has been verified and confirmed.
" />
                    <p className="text-[12px] text-[#9ca3af]">
                      Your OTP has been accepted and the case will move to proposal generation.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          value={digit}
                          maxLength={1}
                          onChange={e => handleOtpDigit(index, e.target.value)}
                          onKeyDown={e => e.key === 'Backspace' && !digit && index > 0 && document.getElementById(`otp-${index - 1}`)?.focus()}
                          className="w-full h-12 text-center bg-[#111827] border border-[#2a2f45] rounded-lg text-lg font-semibold text-[#e8eaf0] outline-none"
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Btn
                        className="w-full"
                        onClick={handleVerifyOtp}
                        disabled={otp.join('').length < 6 || verifyingOtp}
                      >
                        {verifyingOtp ? 'Verifying…' : 'Submit OTP'}
                      </Btn>
                      <Btn
                        variant="secondary"
                        className="w-full"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || otpCountdown > 0 || !selectedCaseId}
                      >
                        {sendingOtp
                          ? 'Sending OTP…'
                          : otpCountdown > 0
                          ? `Resend OTP in ${otpCountdown}s`
                          : otpSent
                          ? 'Resend OTP'
                          : 'Send OTP'}
                      </Btn>
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-3">
                      Use <strong>123456</strong> as a developer override when email delivery is not available.
                    </p>
                  </>
                )}
              </div>
            )}

            {(!allUploaded || !termsAccepted) && (
              <p className="text-[10px] text-[#f59e0b] mt-3 text-center">
                {!allUploaded
                  ? `Upload all ${KYC_DOC_TYPES.length} required documents to proceed.`
                  : 'Accept the terms above to continue.'}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
