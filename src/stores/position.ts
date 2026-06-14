import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface Position {
  id?: string
  positionCode: string
  positionName: string
  description?: string
  isActive?: boolean
}

export const usePositionStore = defineStore('position', () => {
  const positions = ref<Position[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchPositions() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Positions')
      positions.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch positions'
    } finally {
      isLoading.value = false
    }
  }

  async function createPosition(data: Position) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/Positions', data)
      positions.value.push(response.data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create position'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { positions, isLoading, error, fetchPositions, createPosition }
})
