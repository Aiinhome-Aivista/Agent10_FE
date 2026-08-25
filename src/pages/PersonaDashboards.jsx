// ──────────────────── Underwriter Dashboard ────────────────────
import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { StatCard, DataTable, Badge, Card, SectionHeader, Btn, Alert, Input, Spinner, Modal } from "../components/common";
import { ClipboardList, ShieldCheck, Clock, FileText } from "lucide-react";
import api from "../services/api";

function UWQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("APPROVED");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/underwriting/queue").then(({ data }) => setQueue(data.queue || [])).finally(() => setLoading(false));
  }, []);

  const submit = async (policyId) => {
    setSubmitting(true); setError(null);
    try {
      await api.post("/underwriting/decision", { policy_id: policyId, decision, remarks });
      setSuccess(`Decision "${decision}" recorded.`);
      setSelected(null);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cols = [
    { key: "case_number", label: "Case #" },
    { key: "current_stage", label: "Stage", render: (r) => <Badge label={r.current_stage} /> },
    { key: "sum_assured", label: "Sum Assured", render: (r) => r.sum_assured ? `₹${r.sum_assured.toLocaleString()}` : "—" },
    { key: "last_activity_at", label: "Last Activity", render: (r) => r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString() : "—" },
    {
      key: "actions", label: "", render: (r) => (
        <Btn size="sm" onClick={() => setSelected(r)}>Review</Btn>
      )
    },
  ];

  return (
    <div>
      <SectionHeader title="Underwriting Queue" subtitle="Cases pending UW review and decision" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard title="Pending Review" value={queue.length} icon={ClipboardList} />
      </div>
      {success && <Alert type="success" message={success} />}
      {loading ? <Spinner /> : (
        <Card>
          <DataTable columns={cols} rows={queue} emptyText="No cases in UW queue." />
        </Card>
      )}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <Card style={{ width: 440, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px" }}>UW Decision — {selected.case_number}</h3>
            {error && <Alert type="error" message={error} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Decision</label>
                <select value={decision} onChange={(e) => setDecision(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13 }}>
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                  <option value="DEFERRED">Defer</option>
                </select>
              </div>
              <Input label="Remarks" value={remarks} onChange={setRemarks} placeholder="UW remarks…" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <Btn onClick={() => submit(selected.policy_id || selected.id)} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Decision"}
              </Btn>
              <Btn variant="secondary" onClick={() => setSelected(null)}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function UWPolicyIssuance() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/cases/').then(({ data }) => {
      const items = (data.cases || []).filter((c) => c.current_stage === 'POLICY_ISSUANCE');
      setQueue(items);
    }).catch((e) => {
      setError(e.response?.data?.detail || 'Failed to load policy queue');
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cols = [
    { key: 'case_number', label: 'Case #' },
    { key: 'customer_id', label: 'Customer', render: (r) => r.customer_id?.slice(0, 8) + '…' },
    { key: 'sum_assured', label: 'Sum Assured', render: (r) => r.sum_assured ? `₹${r.sum_assured.toLocaleString()}` : '—' },
    { key: 'current_stage', label: 'Stage', render: (r) => <Badge label={r.current_stage} /> },
    { key: 'created_at', label: 'Created', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : '—' },
    { key: 'actions', label: '', render: (r) => (
      <Btn size="sm" variant="primary" onClick={() => navigate(`view/${r.id}`)}>
        View
      </Btn>
    ) },
  ];

  return (
    <div>
      <SectionHeader title="Policy Issuance" subtitle="View details first, then issue the policy from the detail page" />
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Pending Policy Issuance" value={queue.length} icon={FileText} color="#22c55e" />
      </div>
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={queue} emptyText="No policies awaiting issuance." />}</Card>
    </div>
  );
}

function PolicyIssuanceDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [caseItem, setCaseItem] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseResp, policyResp, docsResp, quotesResp] = await Promise.all([
        api.get(`/cases/${caseId}`),
        api.get('/policies/'),
        api.get(`/documents/case/${caseId}`),
        api.get(`/quotes/case/${caseId}`),
      ]);
      setCaseItem(caseResp.data);
      const policyItem = (policyResp.data.policies || []).find((p) => p.case_id === caseId);
      setPolicy(policyItem || null);
      setDocs(docsResp.data.documents || []);
      setQuotes(quotesResp.data.quotes || []);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) load();
  }, [caseId]);

  const issuePolicy = async () => {
    if (!policy) {
      setError('No draft policy exists yet for this case.');
      return;
    }
    setIssuing(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post(`/policies/${policy.id}/issue`);
      setSuccess(`Policy issued successfully for ${caseItem.case_number}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to issue policy');
    } finally {
      setIssuing(false);
    }
  };

  const selectedDocExt = selectedDocTitle?.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tif', 'tiff'].includes(selectedDocExt);
  const isPdf = selectedDocExt === 'pdf';
  const previewUrl = `/api/v1/documents/${selectedDocId}/view?token=${encodeURIComponent(localStorage.getItem('access_token'))}`;

  if (loading) {
    return <Spinner />;
  }

  if (!caseItem) {
    return (
      <div>
        <SectionHeader title="Policy Issuance Details" subtitle="Case not found" action={<Btn variant="secondary" onClick={() => navigate('/dashboard/underwriter/policies')}>Back</Btn>} />
        {error && <Alert type="error" message={error} />}
      </div>
    );
  }

  const profileEntries = caseItem.customer_profile ? Object.entries(caseItem.customer_profile) : [];

  return (
    <div>
      <SectionHeader
        title={`Policy Issuance — ${caseItem.case_number}`}
        subtitle="Review customer profile, insurer selection, and medical uploads before issuing"
        action={<Btn variant="secondary" onClick={() => navigate('/dashboard/underwriter/policies')}>Back to list</Btn>}
      />

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Case Stage" value={caseItem.current_stage} icon={FileText} />
        <StatCard title="Sum Assured" value={caseItem.sum_assured ? `₹${caseItem.sum_assured.toLocaleString()}` : '—'} icon={ShieldCheck} />
        <StatCard title="Policy Tenure" value={`${caseItem.policy_tenure || '—'} yrs`} icon={Clock} />
      </div>

      <Card className="mb-5">
        <h3 className="text-lg font-semibold mb-4">Customer & Case Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          <div>
            <div className="text-sm text-pwc-text-muted mb-2">Customer ID</div>
            <div>{caseItem.customer_id}</div>
            <div className="text-sm text-pwc-text-muted mt-4 mb-2">Banker ID</div>
            <div>{caseItem.banker_id || '—'}</div>
            <div className="text-sm text-pwc-text-muted mt-4 mb-2">Premium Budget</div>
            <div>{caseItem.premium_budget ? `₹${caseItem.premium_budget.toLocaleString()}` : '—'}</div>
          </div>
          <div>
            <div className="text-sm text-pwc-text-muted mb-2">Customer Profile</div>
            {profileEntries.length > 0 ? (
              <div className="space-y-2">
                {profileEntries.map(([key, value]) => (
                  <div key={key}>
                    <span className="font-semibold">{key.replace(/_/g, ' ')}:</span> {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '—'}
                  </div>
                ))}
              </div>
            ) : (
              <div>Profile details not available.</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <h3 className="text-lg font-semibold mb-4">Selected Policy</h3>
        {policy ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            <div>
              <div className="text-sm text-pwc-text-muted mb-2">Insurer</div>
              <div>{policy.insurer_name}</div>
            </div>
            <div>
              <div className="text-sm text-pwc-text-muted mb-2">Product</div>
              <div>{policy.product_name || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-pwc-text-muted mb-2">Policy Number</div>
              <div>{policy.policy_number || 'Draft'}</div>
            </div>
            <div>
              <div className="text-sm text-pwc-text-muted mb-2">Status</div>
              <div>{policy.status || 'DRAFT'}</div>
            </div>
            <div>
              <div className="text-sm text-pwc-text-muted mb-2">Annual Premium</div>
              <div>{policy.annual_premium ? `₹${policy.annual_premium.toLocaleString()}` : '—'}</div>
            </div>
          </div>
        ) : (
          <div>No policy draft found for this case.</div>
        )}
      </Card>

      <Card className="mb-5">
        <h3 className="text-lg font-semibold mb-4">Medical Documents</h3>
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="border border-pwc-border rounded-lg p-3 hover:bg-pwc-input cursor-pointer"
                onClick={() => {
                  setSelectedDocId(doc.id)
                  setSelectedDocTitle(doc.file_name)
                  setViewOpen(true)
                }}
              >
                <div className="text-sm text-pwc-text-muted">{doc.document_type}</div>
                <div>{doc.file_name}</div>
                <div className="text-xs text-pwc-text-muted mt-1">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                <div className="text-xs text-pwc-text-muted">Verified: {doc.verified ? 'Yes' : 'No'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>No medical uploads found for this case.</div>
        )}
      </Card>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={selectedDocTitle} className="max-w-5xl">
        <div className="w-full h-[75vh] bg-pwc-bg rounded-lg overflow-hidden border border-pwc-border relative">
          {selectedDocId ? (
            isImage ? (
              <img
                src={previewUrl}
                alt={selectedDocTitle}
                className="w-full h-full object-contain bg-pwc-bg"
              />
            ) : isPdf ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-none"
                title={selectedDocTitle}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-sm text-pwc-text-muted px-4 text-center">
                <p>Preview not available for this file type.</p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 px-4 py-2 rounded-lg bg-pwc-primary text-pwc-white"
                >
                  Open file in new tab
                </a>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-pwc-text-muted">Select a document to preview</div>
          )}
        </div>
      </Modal>

      <Card className="mb-5">
        <h3 className="text-lg font-semibold mb-4">Quote Options</h3>
        {quotes.length > 0 ? (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div key={quote.id} className="border border-pwc-border rounded-lg p-3">
                <div className="font-semibold">{quote.insurer_name}</div>
                <div>{quote.product_name}</div>
                <div className="text-sm text-pwc-text-muted">Premium: ₹{quote.annual_premium?.toLocaleString() || '—'}</div>
                <div className="text-sm text-pwc-text-muted">Sum Assured: ₹{quote.sum_assured?.toLocaleString() || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>No quotes found for this case.</div>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Btn variant="success" onClick={issuePolicy} disabled={issuing || !policy}>
          {issuing ? 'Issuing...' : 'Issue Policy'}
        </Btn>
        <Btn variant="secondary" onClick={() => navigate('/dashboard/underwriter/policies')}>
          Back to list
        </Btn>
      </div>
    </div>
  );
}

export function UnderwriterDashboard() {
  return (
    <Routes>
      <Route index element={<UWQueue />} />
      <Route path="decisions" element={<UWQueue />} />
      <Route path="policies" element={<UWPolicyIssuance />} />
      <Route path="policies/view/:caseId" element={<PolicyIssuanceDetails />} />
    </Routes>
  );
}

// ──────────────────── Compliance Dashboard ────────────────────
function ComplianceOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/compliance/dashboard").then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeader title="Compliance Dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard title="Compliance Score" value={`${stats?.compliance_score || 0}%`} color="#22c55e" icon={ShieldCheck} />
        <StatCard title="Total Policies" value={stats?.total_policies || 0} icon={ClipboardList} />
        <StatCard title="Checked" value={stats?.checked_policies || 0} color="rgb(var(--color-primary))" icon={ShieldCheck} />
        <StatCard title="Exceptions" value={stats?.exception_count || 0} color="#f59e0b" icon={Clock} />
      </div>
    </div>
  );
}

function Exceptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/compliance/exceptions").then(({ data }) => setItems(data.exceptions || [])).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "policy_number", label: "Policy #" },
    { key: "insurer_name", label: "Insurer" },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    { key: "compliance_remarks", label: "Remarks" },
    { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Exception Reports" />
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={items} emptyText="No exceptions." />}</Card>
    </div>
  );
}

function Consents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/compliance/consents").then(({ data }) => setItems(data.consents || [])).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "id", label: "Consent ID", render: (r) => r.id.slice(0, 8) + "…" },
    { key: "case_id", label: "Case ID", render: (r) => r.case_id.slice(0, 8) + "…" },
    { key: "consent_type", label: "Type" },
    { key: "ip_address", label: "IP Address" },
    { key: "consented_at", label: "Date", render: (r) => r.consented_at ? new Date(r.consented_at).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Consent Records" />
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={items} emptyText="No consent records." />}</Card>
    </div>
  );
}

export function ComplianceDashboard() {
  return (
    <Routes>
      <Route index element={<ComplianceOverview />} />
      <Route path="exceptions" element={<Exceptions />} />
      <Route path="consents" element={<Consents />} />
    </Routes>
  );
}

// ──────────────────── Ops Admin Dashboard ────────────────────
function MedicalQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/medical/queue").then(({ data }) => setQueue(data.queue || [])).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "id", label: "Request ID", render: (r) => r.id.slice(0, 8) + "…" },
    { key: "case_id", label: "Case ID", render: (r) => r.case_id.slice(0, 8) + "…" },
    { key: "requirements", label: "Requirements", render: (r) => (r.requirements || []).join(", ") },
    { key: "status", label: "Status", render: (r) => <Badge label={r.status} /> },
    { key: "created_at", label: "Created", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
    {
      key: "actions", label: "",
      render: (r) => (
        <Btn size="sm" onClick={async () => {
          await api.patch(`/medical/${r.id}`, { status: "COMPLETED", ops_remarks: "Medical docs received" });
          setQueue((q) => q.filter((x) => x.id !== r.id));
        }}>Mark Done</Btn>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader title="Medical Coordination Queue" />
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={queue} emptyText="No pending medical requests." />}</Card>
    </div>
  );
}

function EscalationMonitor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/escalations").then(({ data }) => setItems(data.escalations || [])).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "case_id", label: "Case ID", render: (r) => r.case_id.slice(0, 8) + "…" },
    { key: "level", label: "Level", render: (r) => <Badge label={r.level} /> },
    { key: "stage", label: "Stage" },
    { key: "assigned_to_role", label: "Assigned To" },
    { key: "reason", label: "Reason" },
    { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Active Escalations" />
      <Card>{loading ? <Spinner /> : <DataTable columns={cols} rows={items} emptyText="No active escalations." />}</Card>
    </div>
  );
}

export function OpsAdminDashboard() {
  return (
    <Routes>
      <Route index element={<MedicalQueue />} />
      <Route path="escalations" element={<EscalationMonitor />} />
      <Route path="sla" element={<EscalationMonitor />} />
    </Routes>
  );
}
