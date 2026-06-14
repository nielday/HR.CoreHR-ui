import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const role = ref<string | null>(localStorage.getItem('role'))

  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => role.value)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
    
    try {
      const decoded: any = jwtDecode(newToken)
      // C# backend typically uses the schema URL for role claims
      const userRoleStr = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || 'Employee'
      role.value = userRoleStr
      localStorage.setItem('role', userRoleStr)
    } catch (e) {
      console.error('Error decoding token', e)
      role.value = 'Employee'
      localStorage.setItem('role', 'Employee')
    }
  }

  function clearToken() {
    token.value = null
    role.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
  }

  async function testLogin(username = 'admin', password = 'password') {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/TestAuth/login`, {
        username,
        password
      })
      setToken(response.data.token)
      return true
    } catch (error) {
      console.error('Login failed', error)
      throw error
    }
  }

  return { token, role, isAuthenticated, userRole, setToken, clearToken, testLogin }
})
