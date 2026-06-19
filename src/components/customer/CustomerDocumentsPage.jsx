import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, SectionHeader, Btn, Alert, Spinner, Badge, StatCard } from '../common'
import { FileText, FolderOpen, ShieldCheck, RefreshCw, CheckCircle2, Clock, Upload, Eye } from 'lucide-react'
import api from '../../services/api'

export default function CustomerDocumentsPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)

  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [casesLoading, setCasesLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState(null)
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [uploading, setUploading] = useState({ KYC: false, MEDICAL: false })
  const [esignChecked, setEsignChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const activeCase = selectedCaseId ? cases.find(c => c.id === selectedCaseId) : null

  const loadCases = async () => {
    try {
      const { data } = await api.get('/cases/')
      const own = (data.cases || []).filter(c => c.customer_id === user?.id)
      setCases(own)
      if (own.length > 0 && !selectedCaseId) {
        setSelectedCaseId(own[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCasesLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [user])

  const loadCaseDetails = async (caseId) => {
    if (!caseId) return
    setLoadingDetails(true)
    setErr('')
    setMsg('')
    setActiveRequest(null)
    setUploadedDocs([])
    setEsignChecked(false)

    try {
      // Fetch medical requests
      const { data: reqRes } = await api.get('/medical/customer/requests')
      const match = (reqRes.requests || []).find(r => r.case_id === caseId)
      
      if (match) {
        setActiveRequest(match)
        // Fetch uploaded documents for this medical request
        const { data: docsRes } = await api.get(`/documents/medical-request/${match.id}`)
        setUploadedDocs(docsRes.documents || [])
      }
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to load document requests')
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId)
    }
  }, [selectedCaseId, cases])

  const handleUpload = async (docType, file) => {
    if (!file || !activeRequest) return
    setUploading(prev => ({ ...prev, [docType]: true }))
    setErr('')
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('medical_request_id', activeRequest.id)
      fd.append('document_type', docType) // KYC or MEDICAL
      await api.post('/medical/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg(`${docType} document uploaded successfully!`)
      // Refresh documents list
      const { data: docsRes } = await api.get(`/documents/medical-request/${activeRequest.id}`)
      setUploadedDocs(docsRes.documents || [])
    } catch (e) {
      setErr(e.response?.data?.detail || `Failed to upload ${docType} document`)
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }))
    }
  }

  const handleESign = async () => {
    if (!selectedCaseId || !esignChecked) return
    setSubmitting(true)
    setErr('')
    setMsg('')
    try {
      await api.post('/medical/customer/esign', {
        case_id: selectedCaseId,
        consent_text: 'I confirm the uploaded KYC and Medical documents are authentic and I consent to policy underwriting.'
      })
      setMsg('KYC & Medical documents signed and submitted successfully to underwriting!')
      await loadCases() // Reload cases to get the updated stage
      if (selectedCaseId) {
        await loadCaseDetails(selectedCaseId)
      }
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to complete e-Sign submission')
    } finally {
      setSubmitting(false)
    }
  }

  const openDoc = (id) => {
    const token = localStorage.getItem('access_token') || ''
    const url = `/api/v1/documents/${id}/view${token ? `?token=${token}` : ''}`
    window.open(url, '_blank')
  }

  if (casesLoading) return <Spinner />

  const kycDocs = uploadedDocs.filter(d => d.document_type === 'KYC')
  const medDocs = uploadedDocs.filter(d => d.document_type === 'MEDICAL')
  const hasKyc = kycDocs.length > 0
  const hasMed = medDocs.length > 0
  const allUploaded = hasKyc && hasMed
  const isEsignCompleted = activeCase?.esign_status === 'COMPLETED' || activeCase?.current_stage === 'UNDERWRITING' || activeCase?.status === 'COMPLETED'

  return (
    <div className="space-y-6">
      <SectionHeader title="KYC & Medical Document Upload" subtitle="Upload case-specific KYC and Medical files for underwriter review" />

      {err && <Alert type="error" message={err} />}
      {msg && <Alert type="success" message={msg} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Cases" value={cases.length} icon={FolderOpen} />
        <StatCard title="Docs Uploaded" value={uploadedDocs.length} icon={FileText} color="#22c55e" />
        <StatCard title="Upload Status" value={allUploaded ? 'Complete' : 'Pending'} icon={allUploaded ? CheckCircle2 : Clock} color={allUploaded ? '#22c55e' : '#f59e0b'} />
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-[#6b7280] block mb-1.5">Select Case</label>
            <select
              value={selectedCaseId}
              onChange={e => setSelectedCaseId(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2f45] rounded-lg px-3 py-2 text-sm outline-none text-[#e8eaf0] focus:border-[#6366f1]"
            >
              <option value="">Choose a case…</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_number} — Stage: {c.current_stage.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          {activeCase && (
            <div className="flex gap-2 items-center flex-shrink-0">
              <Badge label={`Stage: ${activeCase.current_stage.replace(/_/g, ' ')}`} />
              <Badge label={`eSign: ${activeCase.esign_status || 'NOT_STARTED'}`} />
            </div>
          )}
        </div>
      </Card>

      {loadingDetails ? (
        <Spinner />
      ) : !activeCase ? (
        <Card className="text-center py-12 text-[#6b7280]">Select a case above to manage your documents.</Card>
      ) : activeCase.current_stage !== 'MEDICAL_COORDINATION' && activeCase.current_stage !== 'UNDERWRITING' && activeCase.current_stage !== 'POLICY_ISSUANCE' && activeCase.current_stage !== 'COMPLETED' ? (
        <Card className="text-center py-12 bg-[#0b0d14] border border-dashed border-[#2a2f45] rounded-xl">
          <p className="text-sm text-yellow-500 font-semibold mb-1">Document Upload Not Active</p>
          <p className="text-xs text-[#6b7280]">
            Document upload is only available when the case is in the <strong>MEDICAL COORDINATION</strong> stage.
          </p>
          <p className="text-[11px] text-[#525876] mt-2">Current stage: {activeCase.current_stage.replace(/_/g, ' ')}</p>
        </Card>
      ) : !activeRequest ? (
        <Card className="text-center py-12 bg-[#0b0d14] border border-dashed border-[#2a2f45] rounded-xl">
          <p className="text-sm text-yellow-500 font-semibold mb-1">Waiting for Underwriter Request</p>
          <p className="text-xs text-[#6b7280]">
            Underwriter has not initiated a document request for this case yet. Please wait for the underwriter to request KYC and Medical documents.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Document list & upload boxes */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* KYC Documents Section */}
            <Card className={`border ${hasKyc ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#2a2f45] bg-[#0f1117]'}`}>
              <div className="flex items-start justify-between gap-4 mb-3 border-b border-[#2a2f45]/50 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪪</span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">KYC Documents</h4>
                    <p className="text-[10px] text-[#6b7280]">Upload your identity and address proof documents individually.</p>
                  </div>
                </div>
                <Badge label={hasKyc ? `${kycDocs.length} Uploaded` : 'Pending'} />
              </div>
              
              {/* List of uploaded KYC files */}
              {hasKyc && (
                <div className="space-y-2 mb-4 bg-[#0f1117]/80 rounded-lg p-2.5 border border-[#2a2f45]/40">
                  {kycDocs.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#22c55e] truncate flex-1">📄 {d.file_name}</span>
                      <button 
                        onClick={() => openDoc(d.id)} 
                        className="text-[10px] bg-[#1f2436] hover:bg-[#2c334e] text-[#a5b4fc] px-2 py-1 rounded flex items-center gap-1 cursor-pointer font-semibold border border-[#313955]"
                      >
                        <Eye size={10} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Mandatory requirements checklist */}
              <div className="p-3 bg-[#1e2235]/40 rounded-lg text-xs text-[#9ca3af] border border-[#2a2f45]/40 mb-4">
                <span className="font-bold text-white block mb-1">⚠️ Mandatory KYC Documents to Upload:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>PAN Card (Mandatory Identity Proof)</li>
                  <li>Aadhaar Card / Voter ID / Passport (Address Proof)</li>
                  <li>Passport size photograph / Selfie image</li>
                  <li>Scan of Signature (On blank white paper)</li>
                </ul>
              </div>
              
              {!isEsignCompleted && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.zip"
                    id="kyc-file-input"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload('KYC', file)
                    }}
                    disabled={uploading.KYC}
                  />
                  <Btn 
                    size="sm" 
                    onClick={() => document.getElementById('kyc-file-input')?.click()}
                    disabled={uploading.KYC}
                    className="w-full justify-center gap-2"
                  >
                    <Upload size={14} />
                    {uploading.KYC ? 'Uploading…' : 'Upload File (PDF / Image)'}
                  </Btn>
                </div>
              )}
            </Card>

            {/* Medical Documents Section */}
            <Card className={`border ${hasMed ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-[#2a2f45] bg-[#0f1117]'}`}>
              <div className="flex items-start justify-between gap-4 mb-3 border-b border-[#2a2f45]/50 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🩺</span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Medical Documents</h4>
                    <p className="text-[10px] text-[#6b7280]">Upload your diagnostic medical reports and declarations.</p>
                  </div>
                </div>
                <Badge label={hasMed ? `${medDocs.length} Uploaded` : 'Pending'} />
              </div>

              {/* List of uploaded Medical files */}
              {hasMed && (
                <div className="space-y-2 mb-4 bg-[#0f1117]/80 rounded-lg p-2.5 border border-[#2a2f45]/40">
                  {medDocs.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[#22c55e] truncate flex-1">📄 {d.file_name}</span>
                      <button 
                        onClick={() => openDoc(d.id)} 
                        className="text-[10px] bg-[#1f2436] hover:bg-[#2c334e] text-[#a5b4fc] px-2 py-1 rounded flex items-center gap-1 cursor-pointer font-semibold border border-[#313955]"
                      >
                        <Eye size={10} /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Mandatory requirements checklist */}
              <div className="p-3 bg-[#1e2235]/40 rounded-lg text-xs text-[#9ca3af] border border-[#2a2f45]/40 mb-4">
                <span className="font-bold text-white block mb-1">⚠️ Mandatory Medical Documents to Upload:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Latest Blood Test Report (CBC, Blood Sugar, Cholesterol)</li>
                  <li>Urine Analysis Report</li>
                  <li>Medical Questionnaire Grid / Self-declaration Health Form</li>
                </ul>
              </div>

              {!isEsignCompleted && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.zip"
                    id="med-file-input"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload('MEDICAL', file)
                    }}
                    disabled={uploading.MEDICAL}
                  />
                  <Btn 
                    size="sm" 
                    onClick={() => document.getElementById('med-file-input')?.click()}
                    disabled={uploading.MEDICAL}
                    className="w-full justify-center gap-2"
                  >
                    <Upload size={14} />
                    {uploading.MEDICAL ? 'Uploading…' : 'Upload File (PDF / Image)'}
                  </Btn>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: eSign & Submission */}
          <div className="lg:col-span-2">
            <Card>
              <h3 className="font-bold text-sm text-[#e8eaf0] mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#2dd4bf]" />
                e-Sign & Submit
              </h3>
              
              <div className="space-y-2 mb-4 text-xs text-[#9ca3af]">
                <div className="flex justify-between border-b border-[#2a2f45] py-1.5">
                  <span>KYC Files:</span>
                  <span className={hasKyc ? 'text-[#22c55e] font-semibold' : 'text-[#f59e0b]'}>{hasKyc ? `${kycDocs.length} uploaded` : 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2f45] py-1.5">
                  <span>Medical Files:</span>
                  <span className={hasMed ? 'text-[#22c55e] font-semibold' : 'text-[#f59e0b]'}>{hasMed ? `${medDocs.length} uploaded` : 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-[#2a2f45] py-1.5">
                  <span>Case Stage:</span>
                  <span className="font-semibold text-white">{activeCase.current_stage.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {isEsignCompleted ? (
                <div className="p-4 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-xl text-center">
                  <p className="text-sm text-[#22c55e] font-bold">Proposal Signed & Submitted</p>
                  <p className="text-[11px] text-[#6b7280] mt-1">Underwriter has been notified. Review is in progress.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-start gap-2.5 text-xs cursor-pointer p-3 rounded-lg border border-[#2a2f45] bg-[#0b0d14]">
                    <input
                      type="checkbox"
                      checked={esignChecked}
                      onChange={e => setEsignChecked(e.target.checked)}
                      className="mt-0.5 accent-[#6366f1] cursor-pointer"
                      disabled={!allUploaded}
                    />
                    <span className={`leading-relaxed ${!allUploaded ? 'opacity-50' : 'text-[#9ca3af]'}`}>
                      I confirm that the uploaded KYC and Medical documents are authentic, and I accept the terms of policy underwriting.
                    </span>
                  </label>

                  <Btn
                    className="w-full"
                    onClick={handleESign}
                    disabled={!allUploaded || !esignChecked || submitting}
                  >
                    {submitting ? 'Submitting…' : 'Sign & Submit to Underwriter'}
                  </Btn>
                  
                  {!allUploaded && (
                    <p className="text-[10px] text-[#f59e0b] text-center mt-2 font-medium">
                      ⚠️ Upload at least one KYC and one Medical document to enable e-Signing.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
