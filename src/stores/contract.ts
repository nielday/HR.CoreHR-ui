import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface ContractType {
  id?: string
  contractTypeCode: string
  contractTypeName: string
  defaultDurationMonths?: number | null
  description?: string
  isActive?: boolean
}

export const useContractStore = defineStore('contract', () => {
  const contracts = ref<ContractType[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchContracts(includeInactive: boolean = false) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/ContractTypes?includeInactive=${includeInactive}`)
      contracts.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch contract types'
    } finally {
      isLoading.value = false
    }
  }

  async function createContract(data: ContractType) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/ContractTypes', data)
      contracts.value.push(response.data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create contract type'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateContract(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.put(`/ContractTypes/${id}`, data)
      const idx = contracts.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        contracts.value[idx] = response.data
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update contract type'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deleteContract(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await api.delete(`/ContractTypes/${id}`)
      contracts.value = contracts.value.filter(c => c.id !== id)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete contract type'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function restoreContract(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await api.patch(`/ContractTypes/${id}/restore`)
      const idx = contracts.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        contracts.value[idx].isActive = true
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to restore contract type'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { contracts, isLoading, error, fetchContracts, createContract, updateContract, deleteContract, restoreContract }
})
