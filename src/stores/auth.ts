import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const role = ref<string | null>(localStorage.getItem('role'))
  const mustChangePassword = ref<boolean>(localStorage.getItem('mustChangePassword') === 'true')

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

  function setMustChangePassword(val: boolean) {
    mustChangePassword.value = val
    localStorage.setItem('mustChangePassword', val ? 'true' : 'false')
  }

  function clearToken() {
    token.value = null
    role.value = null
    mustChangePassword.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('mustChangePassword')
  }

  async function testLogin(username = 'admin', password = 'password') {
    try {
      const response = await axios.post(`${API_BASE}/Auth/login`, { username, password })
      setToken(response.data.token)
      setMustChangePassword(!!response.data.mustChangePassword)
      return true
    } catch (error) {
      console.error('Login failed', error)
      throw error
    }
  }

  // Đổi mật khẩu (dùng cho cả luồng buộc đổi lần đầu)
  async function changePassword(currentPassword: string, newPassword: string) {
    await axios.post(
      `${API_BASE}/Auth/change-password`,
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token.value}` } }
    )
    setMustChangePassword(false)
  }

  return { token, role, mustChangePassword, isAuthenticated, userRole, setToken, setMustChangePassword, clearToken, testLogin, changePassword }
})
