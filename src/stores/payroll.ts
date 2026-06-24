import { ref } from 'vue'
import { defineStore } from 'pinia'
import payrollApi from '../utils/payrollApi'

// status: 0 = Pending, 1 = Approved, 2 = Paid (enum serialize dạng số)
export interface PayrollRecord {
  id: string
  employeeId: string
  month: number
  year: number
  baseSalary: number
  totalAllowances: number
  totalDeductions: number
  netSalary: number
  // Số liệu chấm công đã dùng để tính (audit)
  standardWorkdays: number
  actualWorkdays: number
  overtimeHours: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  status: number
  calculatedAt: string
}

export interface DepartmentSalary {
  departmentId: string | null
  departmentName: string
  employeeCount: number
  totalSalaryFund: number
  totalAllowances: number
  totalDeductions: number
}

export interface DashboardReport {
  total: number
  totalEmployeesProcessed: number
  totalSalaryFund: number
  totalAllowances: number
  totalDeductions: number
  month: number
  year: number
  byDepartment: DepartmentSalary[]
}

export interface SalaryConfig {
  id?: string
  employeeId: string
  baseSalary: number
  mealAllowance: number
  transportAllowance: number
  insuranceDeduction: number
  otherDeductions: number
}

export const usePayrollStore = defineStore('payroll', () => {
  const payrolls = ref<PayrollRecord[]>([])
  const dashboard = ref<DashboardReport | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function pickError(err: any, fallback: string) {
    return err.response?.data?.message || err.response?.data?.Message || err.message || fallback
  }

  async function fetchDashboard(month: number, year: number) {
    isLoading.value = true
    error.value = null
    try {
      const res = await payrollApi.get('/Reports/dashboard', { params: { month, year } })
      dashboard.value = res.data
    } catch (err: any) {
      error.value = pickError(err, 'Không tải được báo cáo dashboard')
      dashboard.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPayrolls(month?: number, year?: number, employeeId?: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await payrollApi.get('/Payrolls', { params: { month, year, employeeId } })
      payrolls.value = res.data
    } catch (err: any) {
      error.value = pickError(err, 'Không tải được bảng lương')
    } finally {
      isLoading.value = false
    }
  }

  async function calculatePayroll(month: number, year: number, employeeId?: string) {
    isLoading.value = true
    error.value = null
    try {
      await payrollApi.post('/Payrolls/calculate', { month, year, employeeId: employeeId || null })
      return true
    } catch (err: any) {
      error.value = pickError(err, 'Tính lương thất bại')
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function approvePayroll(id: string) {
    error.value = null
    try {
      const res = await payrollApi.post(`/Payrolls/${id}/approve`)
      const idx = payrolls.value.findIndex(p => p.id === id)
      if (idx !== -1) payrolls.value[idx] = res.data
      return true
    } catch (err: any) {
      error.value = pickError(err, 'Duyệt lương thất bại')
      return false
    }
  }

  async function payPayroll(id: string) {
    error.value = null
    try {
      const res = await payrollApi.post(`/Payrolls/${id}/pay`)
      const idx = payrolls.value.findIndex(p => p.id === id)
      if (idx !== -1) payrolls.value[idx] = res.data
      return true
    } catch (err: any) {
      error.value = pickError(err, 'Chi trả lương thất bại')
      return false
    }
  }

  // Thu hồi duyệt: Approved -> Pending
  async function revertApproval(id: string) {
    error.value = null
    try {
      const res = await payrollApi.post(`/Payrolls/${id}/revert-approval`)
      const idx = payrolls.value.findIndex(p => p.id === id)
      if (idx !== -1) payrolls.value[idx] = res.data
      return true
    } catch (err: any) {
      error.value = pickError(err, 'Thu hồi duyệt thất bại')
      return false
    }
  }

  // Thu hồi chi trả: Paid -> Approved
  async function revertPayment(id: string) {
    error.value = null
    try {
      const res = await payrollApi.post(`/Payrolls/${id}/revert-payment`)
      const idx = payrolls.value.findIndex(p => p.id === id)
      if (idx !== -1) payrolls.value[idx] = res.data
      return true
    } catch (err: any) {
      error.value = pickError(err, 'Thu hồi chi trả thất bại')
      return false
    }
  }

  async function fetchSalaryConfig(employeeId: string): Promise<SalaryConfig | null> {
    error.value = null
    try {
      const res = await payrollApi.get(`/SalaryConfigs/${employeeId}`)
      return res.data
    } catch (err: any) {
      if (err.response?.status === 404) return null // chưa cấu hình
      error.value = pickError(err, 'Không tải được cấu hình lương')
      return null
    }
  }

  async function saveSalaryConfig(payload: SalaryConfig) {
    isLoading.value = true
    error.value = null
    try {
      const res = await payrollApi.post('/SalaryConfigs', payload)
      return res.data as SalaryConfig
    } catch (err: any) {
      error.value = pickError(err, 'Lưu cấu hình lương thất bại')
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    payrolls, dashboard, isLoading, error,
    fetchDashboard, fetchPayrolls, calculatePayroll,
    approvePayroll, payPayroll, revertApproval, revertPayment, fetchSalaryConfig, saveSalaryConfig,
  }
})
