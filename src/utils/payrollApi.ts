import axios from 'axios'
import { useAuthStore } from '../stores/auth'

// Axios riêng cho Payroll Service (Nhóm 3) — backend khác với HR Core.
// Token JWT dùng chung (shared secret) nên lấy từ cùng auth store.
const payrollApi = axios.create({
  baseURL: import.meta.env.VITE_PAYROLL_API_BASE_URL || 'http://localhost:5003/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

payrollApi.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
}, (error) => Promise.reject(error))

payrollApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()
      authStore.clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default payrollApi
