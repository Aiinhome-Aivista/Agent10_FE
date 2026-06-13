import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ── Async Thunks ──────────────────────────────────────────────────────

export const fetchDocumentRequests = createAsyncThunk(
  'documents/fetchRequests',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/medical/customer/requests')
      return res.data.requests || []
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to load document requests')
    }
  }
)

export const createDocumentRequest = createAsyncThunk(
  'documents/createRequest',
  async ({ case_id, requirements }, { rejectWithValue }) => {
    try {
      const res = await api.post('/medical/customer/request', { case_id, requirements })
      return res.data
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to create document request')
    }
  }
)

export const fetchUploadedDocuments = createAsyncThunk(
  'documents/fetchUploaded',
  async (medical_request_id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/documents/medical-request/${medical_request_id}`)
      return res.data.documents || []
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to load documents')
    }
  }
)

export const fetchDocumentsByCase = createAsyncThunk(
  'documents/fetchByCase',
  async (case_id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/documents/case/${case_id}`)
      return res.data.documents || []
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to load documents for case')
    }
  }
)

export const uploadDocument = createAsyncThunk(
  'documents/upload',
  async ({ medical_request_id, document_type, file }, { rejectWithValue }) => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('medical_request_id', medical_request_id)
      fd.append('document_type', document_type)
      const res = await api.post('/medical/upload', fd)
      return { document_type, data: res.data }
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || `Failed to upload ${document_type}`)
    }
  }
)

export const submitProfileUpdateRequest = createAsyncThunk(
  'documents/profileUpdate',
  async ({ case_id, requested_changes }, { rejectWithValue }) => {
    try {
      const res = await api.post('/medical/customer/profile-update-request', {
        case_id,
        requested_changes,
      })
      return res.data
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to submit profile update')
    }
  }
)

export const submitESign = createAsyncThunk(
  'documents/esign',
  async ({ case_id, consent_text }, { rejectWithValue }) => {
    try {
      const res = await api.post('/medical/customer/esign', { case_id, consent_text })
      return res.data
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to complete eSign')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────

const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    requests: [],          // all medical/doc requests for this customer
    activeRequest: null,   // currently selected request for the chosen case
    uploadedDocuments: [], // docs under activeRequest
    uploadStatus: {},      // { [document_type]: 'idle'|'uploading'|'done'|'error' }
    loading: false,
    creating: false,
    signingIn: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    setActiveRequest(state, action) {
      state.activeRequest = action.payload
    },
    clearMessages(state) {
      state.error = null
      state.successMessage = null
    },
  },
  extraReducers: (builder) => {
    // fetchDocumentRequests
    builder
      .addCase(fetchDocumentRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDocumentRequests.fulfilled, (state, action) => {
        state.loading = false
        state.requests = action.payload
      })
      .addCase(fetchDocumentRequests.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // createDocumentRequest
    builder
      .addCase(createDocumentRequest.pending, (state) => { state.creating = true; state.error = null; state.successMessage = null })
      .addCase(createDocumentRequest.fulfilled, (state, action) => {
        state.creating = false
        state.successMessage = action.payload.message || 'Document request created'
      })
      .addCase(createDocumentRequest.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload
      })

    // fetchUploadedDocuments
    builder
      .addCase(fetchUploadedDocuments.pending, (state) => { state.loading = true })
      .addCase(fetchUploadedDocuments.fulfilled, (state, action) => {
        state.loading = false
        state.uploadedDocuments = action.payload
      })
      .addCase(fetchUploadedDocuments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // fetchDocumentsByCase
    builder
      .addCase(fetchDocumentsByCase.pending, (state) => { state.loading = true })
      .addCase(fetchDocumentsByCase.fulfilled, (state, action) => {
        state.loading = false
        state.uploadedDocuments = action.payload
      })
      .addCase(fetchDocumentsByCase.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // uploadDocument
    builder
      .addCase(uploadDocument.pending, (state, action) => {
        const dt = action.meta.arg.document_type
        state.uploadStatus[dt] = 'uploading'
        state.error = null
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        const { document_type } = action.payload
        state.uploadStatus[document_type] = 'done'
        state.successMessage = `${document_type} uploaded successfully`
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        const dt = action.meta.arg.document_type
        state.uploadStatus[dt] = 'error'
        state.error = action.payload
      })

    // submitProfileUpdateRequest
    builder
      .addCase(submitProfileUpdateRequest.pending, (state) => { state.error = null; state.successMessage = null })
      .addCase(submitProfileUpdateRequest.fulfilled, (state, action) => {
        state.successMessage = action.payload.message || 'Profile update request submitted'
      })
      .addCase(submitProfileUpdateRequest.rejected, (state, action) => {
        state.error = action.payload
      })

    // submitESign
    builder
      .addCase(submitESign.pending, (state) => { state.signingIn = true; state.error = null; state.successMessage = null })
      .addCase(submitESign.fulfilled, (state, action) => {
        state.signingIn = false
        state.successMessage = action.payload.message || 'eSign completed successfully'
      })
      .addCase(submitESign.rejected, (state, action) => {
        state.signingIn = false
        state.error = action.payload
      })
  },
})

export const { setActiveRequest, clearMessages } = documentsSlice.actions
export default documentsSlice.reducer
