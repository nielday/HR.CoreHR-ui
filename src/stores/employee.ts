import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface Employee {
  id?: string
  employeeCode: string
  fullName: string
  email: string
  phoneNumber?: string
  departmentId: string
  departmentName?: string
  positionId: string
  positionName?: string
  contractTypeId?: string
  currentContractTypeName?: string
  contractStartDate?: string
  contractEndDate?: string
  hireDate: string
  workingStatus?: string
}

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<Employee[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchEmployees() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Employees')
      employees.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch employees'
    } finally {
      isLoading.value = false
    }
  }

  async function createEmployee(data: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/Employees', data)
      employees.value.push(response.data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create employee'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { employees, isLoading, error, fetchEmployees, createEmployee }
})
