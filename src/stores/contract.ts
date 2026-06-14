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

  async function fetchContracts() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/ContractTypes')
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

  return { contracts, isLoading, error, fetchContracts, createContract }
})
