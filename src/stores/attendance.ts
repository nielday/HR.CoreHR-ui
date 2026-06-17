import { ref } from 'vue'
import { defineStore } from 'pinia'
import attendanceApi from '../utils/attendanceApi'

// ===== Enum (backend serialize dạng SỐ) =====
// AttendanceStatus: 0 Present, 1 Absent, 2 OnLeave, 3 Holiday
export const ATTENDANCE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Có mặt', color: 'green' },
  1: { label: 'Vắng', color: 'red' },
  2: { label: 'Nghỉ phép', color: 'blue' },
  3: { label: 'Ngày lễ', color: 'purple' },
}
// LeaveStatus: 0 Pending, 1 Approved, 2 Rejected
export const LEAVE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ duyệt', color: 'orange' },
  1: { label: 'Đã duyệt', color: 'green' },
  2: { label: 'Từ chối', color: 'red' },
}
// LeaveType: 0 Annual, 1 Sick, 2 Unpaid
export const LEAVE_TYPE: Record<number, string> = {
  0: 'Phép năm',
  1: 'Nghỉ ốm',
  2: 'Không lương',
}

// ===== Types =====
export interface AttendanceRecord {
  id: string
  employeeId: string
  workDate: string
  shiftId?: string | null
  checkInTime?: string | null
  checkOutTime?: string | null
  workedHours: number
  overtimeHours: number
  lateMinutes: number
  earlyLeaveMinutes: number
  status: number
  note?: string | null
}
export interface MonthlyAttendanceSummary {
  id: string
  employeeId: string
  month: number
  year: number
  standardWorkdays: number
  actualWorkdays: number
  totalWorkedHours: number
  overtimeHours: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  absentDays: number
  isClosed: boolean
  closedAt?: string | null
}
export interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: number
  leaveTypeName: string
  fromDate: string
  toDate: string
  totalDays: number
  reason: string
  status: number
  approverEmployeeId?: string | null
  approvedAt?: string | null
  rejectReason?: string | null
  createdAt: string
}
export interface LeavePolicy {
  id: string
  leaveType: number
  name: string
  isPaid: boolean
  annualQuotaDays?: number | null
  description?: string | null
  isActive: boolean
}
export interface LeaveBalance {
  leaveType: number
  name: string
  entitledDays?: number | null
  usedDays: number
  remainingDays?: number | null
}
export interface Shift {
  id?: string
  shiftCode: string
  shiftName: string
  startTime: string   // "HH:mm:ss"
  endTime: string
  standardHours: number
  isActive: boolean
}

export const useAttendanceStore = defineStore('attendance', () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const myAttendance = ref<AttendanceRecord[]>([])
  const attendanceList = ref<AttendanceRecord[]>([])
  const summaries = ref<MonthlyAttendanceSummary[]>([])
  const myLeaves = ref<LeaveRequest[]>([])
  const pendingLeaves = ref<LeaveRequest[]>([])
  const leavePolicies = ref<LeavePolicy[]>([])
  const myLeaveBalance = ref<LeaveBalance[]>([])
  const selectedLeaveBalance = ref<LeaveBalance[]>([])
  const shifts = ref<Shift[]>([])

  const pickErr = (e: any, f: string) =>
    e.response?.data?.message || e.response?.data?.Message || e.message || f

  async function wrap<T>(fn: () => Promise<T>, fallback: string): Promise<T | null> {
    isLoading.value = true
    error.value = null
    try { return await fn() }
    catch (e: any) { error.value = pickErr(e, fallback); return null }
    finally { isLoading.value = false }
  }

  // ===== Chấm công =====
  async function checkIn() {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/check-in'); return r.data }, 'Chấm công vào thất bại')
  }
  async function checkOut() {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/check-out'); return r.data }, 'Chấm công ra thất bại')
  }
  // Kiosk: chấm công bằng mã nhân viên (Admin/HR thao tác)
  async function kioskCheckIn(employeeCode: string) {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/kiosk/check-in', { employeeCode }); return r.data }, 'Chấm công vào thất bại')
  }
  async function kioskCheckOut(employeeCode: string) {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/kiosk/check-out', { employeeCode }); return r.data }, 'Chấm công ra thất bại')
  }
  async function kioskStatus() {
    return wrap(async () => { const r = await attendanceApi.get('/attendance/kiosk/status'); return r.data }, 'Không tải được trạng thái kiosk')
  }
  async function kioskToggle(enabled: boolean) {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/kiosk/toggle', { enabled }); return r.data }, 'Đổi trạng thái kiosk thất bại')
  }
  async function fetchMine(month: number, year: number) {
    await wrap(async () => { const r = await attendanceApi.get('/attendance/me', { params: { month, year } }); myAttendance.value = r.data }, 'Không tải được chấm công của bạn')
  }
  async function fetchAttendance(employeeId: string | undefined, month: number, year: number) {
    await wrap(async () => { const r = await attendanceApi.get('/attendance', { params: { employeeId, month, year } }); attendanceList.value = r.data }, 'Không tải được bảng chấm công')
  }
  async function upsertManual(payload: any) {
    return wrap(async () => { const r = await attendanceApi.post('/attendance', payload); return r.data }, 'Lưu chấm công thất bại')
  }
  async function closeMonth(month: number, year: number) {
    return wrap(async () => { const r = await attendanceApi.post('/attendance/close', null, { params: { month, year } }); return r.data }, 'Chốt công thất bại')
  }
  async function fetchSummary(month: number, year: number) {
    await wrap(async () => { const r = await attendanceApi.get('/attendance/summary', { params: { month, year } }); summaries.value = r.data }, 'Không tải được bảng chốt công')
  }

  // ===== Nghỉ phép =====
  async function createLeave(payload: any) {
    return wrap(async () => { const r = await attendanceApi.post('/leave-requests', payload); return r.data }, 'Gửi đơn nghỉ thất bại')
  }
  async function fetchMyLeaves() {
    await wrap(async () => { const r = await attendanceApi.get('/leave-requests/me'); myLeaves.value = r.data }, 'Không tải được đơn nghỉ')
  }
  async function fetchPendingLeaves() {
    await wrap(async () => { const r = await attendanceApi.get('/leave-requests/pending'); pendingLeaves.value = r.data }, 'Không tải được đơn chờ duyệt')
  }
  async function approveLeave(id: string) {
    return wrap(async () => { await attendanceApi.post(`/leave-requests/${id}/approve`); return true }, 'Duyệt thất bại')
  }
  async function rejectLeave(id: string, reason: string) {
    return wrap(async () => { await attendanceApi.post(`/leave-requests/${id}/reject`, { reason }); return true }, 'Từ chối thất bại')
  }
  async function fetchMyLeaveBalance(year: number) {
    await wrap(async () => { const r = await attendanceApi.get('/leave-requests/balance', { params: { year } }); myLeaveBalance.value = r.data }, 'Không tải được số phép còn lại')
  }
  async function fetchLeaveBalance(employeeId: string, year: number) {
    await wrap(async () => { const r = await attendanceApi.get(`/leave-requests/balance/${employeeId}`, { params: { year } }); selectedLeaveBalance.value = r.data }, 'Không tải được số phép của nhân viên')
  }
  async function fetchLeavePolicies() {
    await wrap(async () => { const r = await attendanceApi.get('/leave-policies'); leavePolicies.value = r.data }, 'Không tải được cấu hình nghỉ phép')
  }
  async function updateLeavePolicy(id: string, payload: Partial<LeavePolicy>) {
    return wrap(async () => { const r = await attendanceApi.put(`/leave-policies/${id}`, payload); return r.data }, 'Cập nhật loại nghỉ thất bại')
  }
  async function createLeavePolicy(payload: Partial<LeavePolicy>) {
    return wrap(async () => { const r = await attendanceApi.post('/leave-policies', payload); return r.data }, 'Tạo loại nghỉ thất bại')
  }
  async function deleteLeavePolicy(id: string) {
    return wrap(async () => { await attendanceApi.delete(`/leave-policies/${id}`); return true }, 'Xóa loại nghỉ thất bại')
  }

  // ===== Ca làm việc =====
  async function fetchShifts() {
    await wrap(async () => { const r = await attendanceApi.get('/shifts'); shifts.value = r.data }, 'Không tải được ca làm việc')
  }
  async function createShift(payload: Shift) {
    return wrap(async () => { const r = await attendanceApi.post('/shifts', payload); return r.data }, 'Tạo ca thất bại')
  }
  async function updateShift(id: string, payload: Shift) {
    return wrap(async () => { const r = await attendanceApi.put(`/shifts/${id}`, payload); return r.data }, 'Cập nhật ca thất bại')
  }
  async function deactivateShift(id: string) {
    return wrap(async () => { await attendanceApi.delete(`/shifts/${id}`); return true }, 'Ngừng ca thất bại')
  }

  return {
    isLoading, error,
    myAttendance, attendanceList, summaries, myLeaves, pendingLeaves, leavePolicies, myLeaveBalance, selectedLeaveBalance, shifts,
    checkIn, checkOut, kioskCheckIn, kioskCheckOut, kioskStatus, kioskToggle, fetchMine, fetchAttendance, upsertManual, closeMonth, fetchSummary,
    createLeave, fetchMyLeaves, fetchPendingLeaves, approveLeave, rejectLeave,
    fetchMyLeaveBalance, fetchLeaveBalance, fetchLeavePolicies, updateLeavePolicy, createLeavePolicy, deleteLeavePolicy,
    fetchShifts, createShift, updateShift, deactivateShift,
  }
})
