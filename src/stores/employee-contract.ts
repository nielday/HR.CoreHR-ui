import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface EmployeeContract {
  id?: string
  employeeId: string
  contractTypeId: string
  contractTypeName?: string
  contractCode?: string
  startDate: string
  endDate?: string
  actualEndDate?: string
  status: number
  note?: string
}

export const useEmployeeContractStore = defineStore('employeeContract', () => {
  const contracts = ref<EmployeeContract[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchContractsByEmployee(employeeId: string) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/EmployeeContracts/employee/${employeeId}`)
      contracts.value = response.data
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch employee contracts'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function createContract(data: any) {
    isLoading.value = true
    error.value = null
    try {
      await api.post('/EmployeeContracts', data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create contract'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateContract(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      await api.put(`/EmployeeContracts/${id}`, data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update contract'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function terminateContract(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      await api.post(`/EmployeeContracts/${id}/terminate`, data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to terminate contract'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function renewContract(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      await api.post(`/EmployeeContracts/${id}/renew`, data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to renew contract'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { 
    contracts, isLoading, error, 
    fetchContractsByEmployee, createContract, updateContract, terminateContract, renewContract 
  }
})
