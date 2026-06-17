import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface Employee {
  id?: string
  employeeCode: string
  fullName: string
  email: string
  phoneNumber?: string
  dateOfBirth?: string
  gender?: string
  address?: string
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
  const allEmployees = ref<Employee[]>([])
  const totalItems = ref<number>(0)
  const totalPages = ref<number>(0)
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchEmployees(params: any = {}) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Employees', { params })
      if (response.data.items) {
        employees.value = response.data.items
        totalItems.value = response.data.totalItems
        totalPages.value = response.data.totalPages
        currentPage.value = response.data.page
        pageSize.value = response.data.pageSize
      } else {
        employees.value = response.data
        totalItems.value = response.data.length
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch employees'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAllEmployees() {
    try {
      const response = await api.get('/Employees', { params: { page: 1, pageSize: 10000 } })
      if (response.data.items) {
        allEmployees.value = response.data.items
      } else {
        allEmployees.value = response.data
      }
    } catch (err: any) {
      console.error('Failed to fetch all employees:', err)
    }
  }

  async function createEmployee(data: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/Employees', data)
      employees.value.unshift(response.data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create employee'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateEmployee(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.put(`/Employees/${id}`, data)
      const idx = employees.value.findIndex(e => e.id === id)
      if (idx !== -1) {
        employees.value[idx] = response.data
      }
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update employee'
      return false
    } finally {
      isLoading.value = false
    }
  }


  async function resignEmployee(id: string, reason: string, resignedDate: string) {
    isLoading.value = true
    error.value = null
    try {
      await api.patch(`/Employees/${id}/resign`, { reason, resignedDate })
      await fetchEmployees()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to mark employee as resigned'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function transferEmployee(id: string, data: any) {
    isLoading.value = true
    error.value = null
    try {
      await api.post(`/Employees/${id}/transfer`, data)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to transfer employee'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchEmployeeById(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/Employees/${id}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch employee details'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDepartmentHistory(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/Employees/${id}/department-history`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch department history'
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Self-service: hồ sơ của chính mình
  async function fetchMyProfile() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Employees/me')
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data?.Message || 'Không tải được hồ sơ'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateMyProfile(payload: any) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.put('/Employees/me', payload)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data?.Message || 'Cập nhật hồ sơ thất bại'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    employees, allEmployees, totalItems, totalPages, currentPage, pageSize,
    isLoading, error, fetchEmployees, fetchAllEmployees, fetchEmployeeById, fetchDepartmentHistory,
    createEmployee, updateEmployee, resignEmployee, transferEmployee,
    fetchMyProfile, updateMyProfile
  }
})
