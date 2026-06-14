import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {

  function logout() {
    token.value = null
    isAuthenticated.value = false
    localStorage.removeItem('jwt_token')
  }

  return { token, isAuthenticated, isLoading, error, login, logout }
})
