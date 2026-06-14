import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface Department {
  id?: string
  departmentCode: string
  departmentName: string
  parentDepartmentId?: string | null
  managerEmployeeId?: string | null
  description?: string
  isActive?: boolean
  subDepartments?: Department[]
}

export const useDepartmentStore = defineStore('department', () => {
  const departments = ref<Department[]>([])
  const departmentTree = ref<Department[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  async function fetchDepartments() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Departments')
      departments.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch departments'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDepartmentTree() {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get('/Departments/tree')
      departmentTree.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch department tree'
    } finally {
      isLoading.value = false
    }
  }

  async function createDepartment(data: Department) {
    isLoading.value = true
    error.value = null
    try {
      await api.post('/Departments', data)
      await fetchDepartmentTree()
      await fetchDepartments()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create department'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateDepartment(id: string, data: Department) {
    isLoading.value = true
    error.value = null
    try {
      await api.put(`/Departments/${id}`, data)
      await fetchDepartmentTree()
      await fetchDepartments()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to update department'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deleteDepartment(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await api.delete(`/Departments/${id}`)
      await fetchDepartmentTree()
      await fetchDepartments()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to delete department'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { 
    departments, departmentTree, isLoading, error, 
    fetchDepartments, fetchDepartmentTree, 
    createDepartment, updateDepartment, deleteDepartment 
  }
})
