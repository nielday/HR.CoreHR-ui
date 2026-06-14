import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../utils/axios'

export interface Department {
  id?: string
  departmentCode: string
  departmentName: string
}

export const useDepartmentStore = defineStore('department', () => {
  const departments = ref<Department[]>([])
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

  async function createDepartment(data: Department) {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post('/Departments', data)
      // Append the newly created object to state
      departments.value.push(response.data)
      return true
    } catch (err: any) {
      // HR Core returns 400 Bad Request with exception string if domain fails
      error.value = err.response?.data?.message || err.response?.data || err.message || 'Failed to create department'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { departments, isLoading, error, fetchDepartments, createDepartment }
})
