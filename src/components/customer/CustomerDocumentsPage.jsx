import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, SectionHeader, Btn, Alert, Spinner, Badge, StatCard } from '../common'
import { FileText, FolderOpen, ShieldCheck, RefreshCw, CheckCircle2, Clock, Upload, Eye } from 'lucide-react'
import api from '../../services/api'

function Dropzone({ docType, onUpload, uploading, isEsignCompleted }) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (isEsignCompleted) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(docType, Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(docType, Array.from(e.target.files))
    }
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
        ${isDragActive 
          ? 'border-pwc-primary bg-pwc-primary/5 scale-[1.01]' 
          : 'border-pwc-border hover:border-[#4f46e5] bg-[#0b0d14]'
        }`}
      onClick={() => document.getElementById(`file-input-${docType}`).click()}
    >
      <input
        type="file"
        id={`file-input-${docType}`}
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.zip"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="text-2xl text-pwc-primary">☁️</span>
        <p className="text-xs font-semibold text-pwc-text">
          Drag & drop files here, or <span className="text-pwc-primary hover:underline">browse</span>
        </p>
        <p className="text-[10px] text-pwc-text-muted">Supports multiple PDF, JPG, PNG, or ZIP files</p>
        {uploading && <span className="text-xs text-pwc-primary mt-1 font-semibold animate-pulse">Uploading files…</span>}
      </div>
    </div>
  )
}

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

  const handleUploadMultiple = async (docType, files) => {
    if (!files || files.length === 0 || !activeRequest) return
    setUploading(prev => ({ ...prev, [docType]: true }))
    setErr('')
    setMsg('')
    let successCount = 0
    let failCount = 0

    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('medical_request_id', activeRequest.id)
        fd.append('document_type', docType)
        await api.post('/medical/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        successCount++
      } catch (e) {
        failCount++
        console.error(e)
      }
    }

    try {
      const { data: docsRes } = await api.get(`/documents/medical-request/${activeRequest.id}`)
      setUploadedDocs(docsRes.documents || [])
    } catch (e) {
      console.error(e)
    }

    if (successCount > 0 && failCount === 0) {
      setMsg(`Successfully uploaded ${successCount} ${docType} document(s).`)
    } else if (successCount > 0 && failCount > 0) {
      setMsg(`Uploaded ${successCount} document(s) successfully, but ${failCount} failed.`)
    } else if (failCount > 0) {
      setErr(`Failed to upload ${failCount} ${docType} document(s).`)
    }

    setUploading(prev => ({ ...prev, [docType]: false }))
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
  const isQuery = activeRequest?.ops_remarks === 'Underwriter raised query'
  const allUploaded = isQuery ? (hasKyc || hasMed) : (hasKyc && hasMed)
  const isEsignCompleted = (activeCase?.esign_status === 'COMPLETED' || activeCase?.current_stage === 'UNDERWRITING' || activeCase?.status === 'COMPLETED') && activeRequest?.status !== 'PENDING'

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
            <label className="text-xs font-semibold text-pwc-text-muted block mb-1.5">Select Case</label>
            <select
              value={selectedCaseId}
              onChange={e => setSelectedCaseId(e.target.value)}
              className="w-full bg-pwc-bg border border-pwc-border rounded-lg px-3 py-2 text-sm outline-none text-pwc-text focus:border-pwc-primary"
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
        <Card className="text-center py-12 text-pwc-text-muted">Select a case above to manage your documents.</Card>
      ) : activeCase.current_stage !== 'MEDICAL_COORDINATION' && activeCase.current_stage !== 'UNDERWRITING' && activeCase.current_stage !== 'POLICY_ISSUANCE' && activeCase.current_stage !== 'COMPLETED' ? (
        <Card className="text-center py-12 bg-[#0b0d14] border border-dashed border-pwc-border rounded-xl">
          <p className="text-sm text-yellow-500 font-semibold mb-1">Document Upload Not Active</p>
          <p className="text-xs text-pwc-text-muted">
            Document upload is only available when the case is in the <strong>MEDICAL COORDINATION</strong> stage.
          </p>
          <p className="text-[11px] text-[#525876] mt-2">Current stage: {activeCase.current_stage.replace(/_/g, ' ')}</p>
        </Card>
      ) : !activeRequest ? (
        <Card className="text-center py-12 bg-[#0b0d14] border border-dashed border-pwc-border rounded-xl">
          <p className="text-sm text-yellow-500 font-semibold mb-1">Waiting for Underwriter Request</p>
          <p className="text-xs text-pwc-text-muted">
            Underwriter has not initiated a document request for this case yet. Please wait for the underwriter to request KYC and Medical documents.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Document list & upload boxes */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Underwriter Query Remarks Display */}
            {activeRequest.requirements && activeRequest.requirements.length > 0 && activeRequest.requirements[0] !== 'QUERY_RESPONSE' && (
              <Card className="border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h4 className="text-sm font-semibold text-yellow-500">Underwriter Query Notes</h4>
                </div>
                <p className="text-xs text-pwc-white bg-pwc-bg border border-pwc-border p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {activeRequest.requirements.join('\n')}
                </p>
                {activeRequest.ops_remarks && activeRequest.ops_remarks !== 'Underwriter raised query' && (
                  <p className="text-[11px] text-pwc-text-muted mt-2 italic">
                    Status: {activeRequest.ops_remarks}
                  </p>
                )}
              </Card>
            )}

            {/* KYC Documents Section */}
            <Card className={`border ${hasKyc ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-pwc-border bg-pwc-bg'}`}>
              <div className="flex items-start justify-between gap-4 mb-3 border-b border-pwc-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪪</span>
                  <div>
                    <h4 className="text-sm font-semibold text-pwc-white">KYC Documents</h4>
                    <p className="text-[10px] text-pwc-text-muted">Upload your identity and address proof documents individually.</p>
                  </div>
                </div>
                <Badge label={hasKyc ? `${kycDocs.length} Uploaded` : 'Pending'} />
              </div>
              
              {/* List of uploaded KYC files */}
              {hasKyc && (
                <div className="space-y-2 mb-4 bg-pwc-bg/80 rounded-lg p-2.5 border border-pwc-border/40">
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
              <div className="p-3 bg-pwc-input/40 rounded-lg text-xs text-[#9ca3af] border border-pwc-border/40 mb-4">
                <span className="font-bold text-pwc-white block mb-1">⚠️ KYC Documents to Upload:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>PAN Card (Mandatory Identity Proof)</li>
                  <li>Aadhaar Card / Voter ID / Passport (Address Proof)</li>
                  <li>Passport size photograph / Selfie image</li>
                  <li>Scan of Signature (On blank white paper)</li>
                </ul>
              </div>
              
              {!isEsignCompleted && (
                <div className="pt-2">
                  <Dropzone 
                    docType="KYC" 
                    onUpload={handleUploadMultiple} 
                    uploading={uploading.KYC} 
                    isEsignCompleted={isEsignCompleted} 
                  />
                </div>
              )}
            </Card>

            {/* Medical Documents Section */}
            <Card className={`border ${hasMed ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-pwc-border bg-pwc-bg'}`}>
              <div className="flex items-start justify-between gap-4 mb-3 border-b border-pwc-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🩺</span>
                  <div>
                    <h4 className="text-sm font-semibold text-pwc-white">Medical Documents</h4>
                    <p className="text-[10px] text-pwc-text-muted">Upload your diagnostic medical reports and declarations.</p>
                  </div>
                </div>
                <Badge label={hasMed ? `${medDocs.length} Uploaded` : 'Pending'} />
              </div>

              {/* List of uploaded Medical files */}
              {hasMed && (
                <div className="space-y-2 mb-4 bg-pwc-bg/80 rounded-lg p-2.5 border border-pwc-border/40">
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
              <div className="p-3 bg-pwc-input/40 rounded-lg text-xs text-[#9ca3af] border border-pwc-border/40 mb-4">
                <span className="font-bold text-pwc-white block mb-1">⚠️ Medical Documents to Upload:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Latest Blood Test Report (CBC, Blood Sugar, Cholesterol)</li>
                  <li>Urine Analysis Report</li>
                  <li>Medical Questionnaire Grid / Self-declaration Health Form</li>
                </ul>
              </div>

              {!isEsignCompleted && (
                <div className="pt-2">
                  <Dropzone 
                    docType="MEDICAL" 
                    onUpload={handleUploadMultiple} 
                    uploading={uploading.MEDICAL} 
                    isEsignCompleted={isEsignCompleted} 
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: eSign & Submission */}
          <div className="lg:col-span-2">
            <Card>
              <h3 className="font-bold text-sm text-pwc-text mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#2dd4bf]" />
                e-Sign & Submit
              </h3>
              
              <div className="space-y-2 mb-4 text-xs text-[#9ca3af]">
                <div className="flex justify-between border-b border-pwc-border py-1.5">
                  <span>KYC Files:</span>
                  <span className={hasKyc ? 'text-[#22c55e] font-semibold' : 'text-[#f59e0b]'}>{hasKyc ? `${kycDocs.length} uploaded` : 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-pwc-border py-1.5">
                  <span>Medical Files:</span>
                  <span className={hasMed ? 'text-[#22c55e] font-semibold' : 'text-[#f59e0b]'}>{hasMed ? `${medDocs.length} uploaded` : 'None'}</span>
                </div>
                <div className="flex justify-between border-b border-pwc-border py-1.5">
                  <span>Case Stage:</span>
                  <span className="font-semibold text-pwc-white">{activeCase.current_stage.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {isEsignCompleted ? (
                <div className="p-4 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-xl text-center">
                  <p className="text-sm text-[#22c55e] font-bold">Proposal Signed & Submitted</p>
                  <p className="text-[11px] text-pwc-text-muted mt-1">Underwriter has been notified. Review is in progress.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-start gap-2.5 text-xs cursor-pointer p-3 rounded-lg border border-pwc-border bg-[#0b0d14]">
                    <input
                      type="checkbox"
                      checked={esignChecked}
                      onChange={e => setEsignChecked(e.target.checked)}
                      className="mt-0.5 accent-pwc-primary cursor-pointer"
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
                      {isQuery
                        ? '⚠️ Upload at least one document to enable e-Signing.'
                        : '⚠️ Upload at least one KYC and one Medical document to enable e-Signing.'
                      }
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
