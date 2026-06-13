import { configureStore } from '@reduxjs/toolkit'
import authReducer      from './slices/authSlice'
import casesReducer     from './slices/casesSlice'
import uiReducer        from './slices/uiSlice'
import medicalReducer   from './slices/medicalSlice'
import documentsReducer from './slices/documentsSlice'

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    cases:     casesReducer,
    ui:        uiReducer,
    medical:   medicalReducer,
    documents: documentsReducer,
  },
})
