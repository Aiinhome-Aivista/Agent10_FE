import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ── Async Thunks ──────────────────────────────────────────────────────

export const fetchMedicalRequests = createAsyncThunk(
  'medical/fetchRequests',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/medical/customer/requests')
      return res.data.requests || []
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to load medical requests')
    }
  }
)

export const createMedicalRequest = createAsyncThunk(
  'medical/createRequest',
  async ({ case_id, requirements }, { rejectWithValue }) => {
    try {
      const res = await api.post('/medical/customer/request', { case_id, requirements })
      return res.data
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || 'Failed to create medical request')
    }
  }
)

export const uploadMedicalDocument = createAsyncThunk(
  'medical/uploadDocument',
  async ({ medical_request_id, document_type, file }, { rejectWithValue }) => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('medical_request_id', medical_request_id)
      fd.append('document_type', document_type)
      const res = await api.post('/medical/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return { document_type, data: res.data }
    } catch (e) {
      return rejectWithValue(e.response?.data?.detail || `Failed to upload ${document_type}`)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────

const medicalSlice = createSlice({
  name: 'medical',
  initialState: {
    requests: [],
    medicalData: {
      height: '',
      weight: '',
      smoking_status: 'NO',
      alcohol_usage: 'NO',
      existing_diseases: '',
      family_medical_history: '',
    },
    uploadStatus: {},   // { [document_type]: 'idle' | 'uploading' | 'done' | 'error' }
    loading: false,
    creating: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    setMedicalData(state, action) {
      state.medicalData = { ...state.medicalData, ...action.payload }
    },
    clearMessages(state) {
      state.error = null
      state.successMessage = null
    },
  },
  extraReducers: (builder) => {
    // fetchMedicalRequests
    builder
      .addCase(fetchMedicalRequests.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMedicalRequests.fulfilled, (state, action) => {
        state.loading = false
        state.requests = action.payload
      })
      .addCase(fetchMedicalRequests.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // createMedicalRequest
    builder
      .addCase(createMedicalRequest.pending, (state) => {
        state.creating = true
        state.error = null
        state.successMessage = null
      })
      .addCase(createMedicalRequest.fulfilled, (state, action) => {
        state.creating = false
        state.successMessage = action.payload.message || 'Medical request created'
      })
      .addCase(createMedicalRequest.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload
      })

    // uploadMedicalDocument
    builder
      .addCase(uploadMedicalDocument.pending, (state, action) => {
        const docType = action.meta.arg.document_type
        state.uploadStatus[docType] = 'uploading'
        state.error = null
      })
      .addCase(uploadMedicalDocument.fulfilled, (state, action) => {
        const { document_type } = action.payload
        state.uploadStatus[document_type] = 'done'
        state.successMessage = `${document_type} uploaded successfully`
      })
      .addCase(uploadMedicalDocument.rejected, (state, action) => {
        const docType = action.meta.arg.document_type
        state.uploadStatus[docType] = 'error'
        state.error = action.payload
      })
  },
})

export const { setMedicalData, clearMessages } = medicalSlice.actions
export default medicalSlice.reducer
