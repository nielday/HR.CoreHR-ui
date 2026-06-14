import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const api = axios.create({
  baseURL: 'https://hrcore-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add the JWT token to every request
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

export default api
