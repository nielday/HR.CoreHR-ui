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

  async function updatePosition(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.put(`/Positions/${id}`, data)
      const idx = positions.value.findIndex(p => p.id === id)
      if (idx !== -1) {
        positions.value[idx] = response.data
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update position'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deletePosition(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await api.delete(`/Positions/${id}`)
      positions.value = positions.value.filter(p => p.id !== id)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete position'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { positions, isLoading, error, fetchPositions, createPosition, updatePosition, deletePosition }
})
