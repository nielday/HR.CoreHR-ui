import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('jwt_token'))
  const isAuthenticated = ref<boolean>(!!token.value)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function login() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/TestAuth/login')
      token.value = response.data.token
      isAuthenticated.value = true
      localStorage.setItem('jwt_token', token.value!)
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    token.value = null
    isAuthenticated.value = false
    localStorage.removeItem('jwt_token')
  }

  return { token, isAuthenticated, isLoading, error, login, logout }
})
