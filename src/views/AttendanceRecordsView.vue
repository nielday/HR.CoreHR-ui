<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Tag as ATag, Table as ATable, Segmented as ASegmented, Tooltip as ATooltip, message } from 'ant-design-vue'
import { PlusIcon, PencilIcon, XIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = useAttendanceStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

// Chế độ hiển thị: Lưới tháng | Tổng hợp | Nhật ký
const viewMode = ref<'grid' | 'summary' | 'log'>('grid')

// ===== Map nhân viên =====
const empMap = computed<Record<string, { code: string; name: string; dept: string }>>(() => {
  const m: Record<string, { code: string; name: string; dept: string }> = {}
  for (const e of empStore.allEmployees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName, dept: e.departmentName || 'Chưa phân phòng' }
  }
  return m
})
const employeeOptions = computed(() =>
  (empStore.allEmployees as any[]).map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
)
const shiftMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const s of store.shifts as any[]) if (s.id) m[s.id] = s.shiftName || s.shiftCode
  return m
})

// ===== Lọc =====
const searchText = ref('')
const fDeptNames = ref<string[]>([])
const fEmpIds = ref<string[]>([])
const departmentOptions = computed<any[]>(() => {
  const set = new Set<string>()
  for (const e of empStore.allEmployees as any[]) set.add(e.departmentName || 'Chưa phân phòng')
  return [...set].sort().map((d) => ({ value: d, label: d }))
})
const hasFilter = computed(() => !!searchText.value.trim() || fDeptNames.value.length > 0 || fEmpIds.value.length > 0)
function clearFilters() { searchText.value = ''; fDeptNames.value = []; fEmpIds.value = [] }

// Nhân viên hiển thị (lưới/tổng hợp) — lấy từ danh sách đầy đủ để thấy cả người chưa chấm công
const gridEmployees = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return (empStore.allEmployees as any[]).filter((e) => {
    const dept = e.departmentName || 'Chưa phân phòng'
    if (e.workingStatus === 'Resigned') return false
    if (fDeptNames.value.length && !fDeptNames.value.includes(dept)) return false
    if (fEmpIds.value.length && !fEmpIds.value.includes(e.id)) return false
    if (q && !`${e.fullName} ${e.employeeCode}`.toLowerCase().includes(q)) return false
    return true
  })
})

// ===== Helper định dạng =====
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`)
function formatDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v); return isNaN(d.getTime()) ? '—' : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
function formatTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v); return isNaN(d.getTime()) ? '—' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const formatHours = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN')

// ===== LƯỚI THÁNG (ma trận NV × ngày) =====
const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))
function isWeekend(d: number) {
  const dow = new Date(year.value, month.value - 1, d).getDay()
  return dow === 0 || dow === 6
}
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
function weekday(d: number) { return WEEKDAY[new Date(year.value, month.value - 1, d).getDay()] }

// index bản ghi theo employeeId + ngày (dùng slice tránh lệch múi giờ)
const recByEmpDay = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const r of store.attendanceList as any[]) {
    const day = Number(String(r.workDate).slice(8, 10))
    if (day) m[`${r.employeeId}-${day}`] = r
  }
  return m
})
function cellRec(empId: string, day: number) { return recByEmpDay.value[`${empId}-${day}`] }

// nền màu cho ô lưới theo trạng thái
const CELL: Record<number, { bg: string; short: string }> = {
  0: { bg: 'bg-green-100 text-green-700', short: '✓' },
  1: { bg: 'bg-red-100 text-red-600', short: 'V' },
  2: { bg: 'bg-blue-100 text-blue-700', short: 'P' },
  3: { bg: 'bg-purple-100 text-purple-700', short: 'L' },
}
function cellLabel(rec: any) {
  if (!rec) return ''
  if (rec.status === 0) return rec.workedHours ? formatHours(rec.workedHours) : '✓'
  return CELL[rec.status]?.short || ''
}
function cellTitle(empName: string, day: number, rec: any) {
  const dStr = `${pad2(day)}/${pad2(month.value)}/${year.value}`
  if (!rec) return `${empName} · ${dStr}: chưa chấm công (bấm để nhập)`
  const st = ATTENDANCE_STATUS[rec.status]?.label || rec.status
  const io = rec.checkInTime ? ` · Vào ${formatTime(rec.checkInTime)}${rec.checkOutTime ? ' – Ra ' + formatTime(rec.checkOutTime) : ''}` : ''
  const ot = rec.overtimeHours ? ` · TC ${formatHours(rec.overtimeHours)}h` : ''
  return `${empName} · ${dStr}: ${st}${io}${ot} (bấm để sửa)`
}
function onCell(emp: any, day: number) {
  const rec = cellRec(emp.id, day)
  if (rec) openEdit(rec)
  else openCreate(emp.id, `${year.value}-${pad2(month.value)}-${pad2(day)}`)
}

// ===== TỔNG HỢP THÁNG (cộng dồn từ dữ liệu chấm công) =====
const summaryRows = computed(() =>
  gridEmployees.value.map((e: any) => {
    const recs = (store.attendanceList as any[]).filter((r) => r.employeeId === e.id)
    return {
      id: e.id,
      _name: e.fullName,
      _code: e.employeeCode,
      _dept: e.departmentName || 'Chưa phân phòng',
      present: recs.filter((r) => r.status === 0).length,
      worked: recs.reduce((s, r) => s + (r.workedHours || 0), 0),
      ot: recs.reduce((s, r) => s + (r.overtimeHours || 0), 0),
      leave: recs.filter((r) => r.status === 2).length,
      holiday: recs.filter((r) => r.status === 3).length,
      absent: recs.filter((r) => r.status === 1).length,
      late: recs.filter((r) => (r.lateMinutes || 0) > 0).length,
    }
  })
)
const summaryTotals = computed(() => {
  const r = summaryRows.value
  return {
    present: r.reduce((s, x) => s + x.present, 0),
    worked: r.reduce((s, x) => s + x.worked, 0),
    ot: r.reduce((s, x) => s + x.ot, 0),
    leave: r.reduce((s, x) => s + x.leave, 0),
    absent: r.reduce((s, x) => s + x.absent, 0),
  }
})
const summaryColumns = computed<any[]>(() => [
  { title: 'Nhân viên', key: 'employee', fixed: 'left', width: 200, sorter: (a: any, b: any) => (a._name || '').localeCompare(b._name || '', 'vi') },
  { title: 'Phòng ban', dataIndex: '_dept', key: '_dept' },
  { title: 'Ngày công', dataIndex: 'present', key: 'present', align: 'right', width: 100, sorter: (a: any, b: any) => a.present - b.present },
  { title: 'Tổng giờ', dataIndex: 'worked', key: 'worked', align: 'right', width: 100, sorter: (a: any, b: any) => a.worked - b.worked },
  { title: 'Tăng ca', dataIndex: 'ot', key: 'ot', align: 'right', width: 100, sorter: (a: any, b: any) => a.ot - b.ot },
  { title: 'Nghỉ phép', dataIndex: 'leave', key: 'leave', align: 'right', width: 100 },
  { title: 'Ngày lễ', dataIndex: 'holiday', key: 'holiday', align: 'right', width: 90 },
  { title: 'Vắng', dataIndex: 'absent', key: 'absent', align: 'right', width: 80 },
  { title: 'Đi muộn', dataIndex: 'late', key: 'late', align: 'right', width: 90 },
])

// ===== NHẬT KÝ (danh sách phẳng từng bản ghi) =====
const enriched = computed(() =>
  (store.attendanceList as any[]).map((r) => {
    const e = empMap.value[r.employeeId]
    return {
      ...r,
      _name: e?.name || 'NV chưa đồng bộ',
      _code: e?.code || r.employeeId?.slice(0, 8),
      _dept: e?.dept || 'Chưa phân phòng',
      _shift: r.shiftId ? (shiftMap.value[r.shiftId] || '—') : '—',
    }
  })
)
const logFiltered = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return enriched.value.filter((r: any) => {
    if (fDeptNames.value.length && !fDeptNames.value.includes(r._dept)) return false
    if (fEmpIds.value.length && !fEmpIds.value.includes(r.employeeId)) return false
    if (q && !`${r._name} ${r._code}`.toLowerCase().includes(q)) return false
    return true
  })
})
const statusOptions = [
  { value: 0, label: 'Có mặt' }, { value: 1, label: 'Vắng' }, { value: 2, label: 'Nghỉ phép' }, { value: 3, label: 'Ngày lễ' },
]
const logColumns = computed<any[]>(() => [
  { title: 'Ngày', key: 'workDate', align: 'center', width: 110, sorter: (a: any, b: any) => String(a.workDate).localeCompare(String(b.workDate)) },
  { title: 'Nhân viên', key: 'employee', sorter: (a: any, b: any) => (a._name || '').localeCompare(b._name || '', 'vi') },
  { title: 'Ca', dataIndex: '_shift', key: 'shift', width: 130 },
  { title: 'Giờ vào', key: 'checkInTime', align: 'center', width: 90 },
  { title: 'Giờ ra', key: 'checkOutTime', align: 'center', width: 90 },
  { title: 'Giờ làm', key: 'workedHours', align: 'right', width: 90 },
  { title: 'Tăng ca', key: 'overtimeHours', align: 'right', width: 90 },
  { title: 'Đi muộn', key: 'lateMinutes', align: 'right', width: 100 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', width: 120, filters: statusOptions.map((s) => ({ text: s.label, value: s.value })), onFilter: (val: any, rec: any) => rec.status === val },
  { title: '', key: 'actions', align: 'right', width: 60 },
])
const logPagination = { pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (t: number) => `${t} dòng` }

async function reload() {
  await store.fetchAttendance(undefined, month.value, year.value)
}

// ===== Modal nhập/sửa tay =====
const modalOpen = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const form = reactive<{ employeeId: string | undefined; workDate: string; status: number; checkInTime: string; checkOutTime: string; note: string }>({
  employeeId: undefined, workDate: '', status: 0, checkInTime: '', checkOutTime: '', note: '',
})
function openCreate(empId?: string, dateStr?: string) {
  isEditMode.value = false
  form.employeeId = empId; form.workDate = dateStr || ''; form.status = 0; form.checkInTime = ''; form.checkOutTime = ''; form.note = ''
  modalOpen.value = true
}
function toLocalInput(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function openEdit(record: any) {
  isEditMode.value = true
  form.employeeId = record.employeeId
  form.workDate = record.workDate ? String(record.workDate).slice(0, 10) : ''
  form.status = record.status
  form.checkInTime = toLocalInput(record.checkInTime)
  form.checkOutTime = toLocalInput(record.checkOutTime)
  form.note = record.note || ''
  modalOpen.value = true
}
async function submitManual() {
  if (!form.employeeId) { message.error('Vui lòng chọn nhân viên'); return }
  if (!form.workDate) { message.error('Vui lòng chọn ngày'); return }
  submitting.value = true
  const ok = await store.upsertManual({
    employeeId: form.employeeId, workDate: form.workDate, status: form.status,
    checkInTime: form.checkInTime || null, checkOutTime: form.checkOutTime || null, note: form.note || null,
  })
  submitting.value = false
  if (ok) { message.success('Đã lưu chấm công'); modalOpen.value = false; await reload() }
  else message.error(store.error || 'Lưu chấm công thất bại')
}

onMounted(async () => {
  if (!empStore.allEmployees.length) await empStore.fetchAllEmployees()
  if (!store.shifts.length) await store.fetchShifts()
  await reload()
})
watch([month, year], reload)
</script>

<template>
  <DataTableShell
    title="Bảng chấm công"
    subtitle="Theo dõi chấm công theo tháng — lưới ngày, tổng hợp và nhật ký chi tiết."
  >
    <!-- Header actions -->
    <template #actions>
      <ASegmented
        v-model:value="viewMode"
        :options="[{ label: 'Lưới tháng', value: 'grid' }, { label: 'Tổng hợp', value: 'summary' }, { label: 'Nhật ký', value: 'log' }]"
      />
      <Button @click="openCreate()">
        <PlusIcon class="w-4 h-4 mr-2" /> Nhập tay
      </Button>
    </template>

    <!-- Filters -->
    <template #filters>
      <div class="relative w-full sm:w-56">
        <input
          v-model="searchText"
          type="text"
          placeholder="Tìm theo tên/mã nhân viên..."
          class="w-full h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <ASelect v-model:value="month" :options="months" class="min-w-[120px]" />
      <ASelect v-model:value="year" :options="years" class="min-w-[100px]" />
      <ASelect
        v-model:value="fDeptNames" mode="multiple" :options="departmentOptions" allow-clear :max-tag-count="2"
        placeholder="Phòng ban" class="hr-multi" style="min-width: 200px"
      />
      <ASelect
        v-model:value="fEmpIds" mode="multiple" :options="employeeOptions" allow-clear :max-tag-count="2"
        show-search
        :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
        placeholder="Nhân viên" class="hr-multi" style="min-width: 220px"
      />
      <button
        v-if="hasFilter"
        @click="clearFilters"
        class="h-9 px-3 inline-flex items-center gap-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-all"
      >
        <XIcon class="w-4 h-4" /> Xóa lọc
      </button>
    </template>

    <!-- Banner -->
    <template #banner>
      <div v-if="store.error && !modalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <!-- ===== LƯỚI THÁNG ===== -->
    <div v-if="viewMode === 'grid'" class="bg-card border border-border rounded-xl shadow-sm">
      <!-- chú thích -->
      <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span> Có mặt (số giờ)</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> Nghỉ phép (P)</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-100 border border-red-300"></span> Vắng (V)</span>
        <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-purple-100 border border-purple-300"></span> Ngày lễ (L)</span>
        <span class="ml-auto">Bấm vào ô để nhập / sửa chấm công</span>
      </div>
      <div class="overflow-x-auto hr-grid">
        <table class="border-collapse text-sm">
          <thead>
            <tr>
              <th class="sticky left-0 z-20 bg-muted/40 text-left px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-r border-border min-w-[200px]">Nhân viên</th>
              <th v-for="d in days" :key="d" class="px-1 py-1 text-center border-b border-border min-w-[34px]" :class="isWeekend(d) ? 'bg-slate-100' : 'bg-muted/20'">
                <div class="font-mono text-[11px] text-foreground leading-none">{{ d }}</div>
                <div class="text-[9px] text-muted-foreground leading-none mt-0.5">{{ weekday(d) }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in gridEmployees" :key="emp.id" class="hover:bg-muted/20">
              <td class="sticky left-0 z-10 bg-card px-3 py-1.5 border-b border-r border-border min-w-[200px]">
                <div class="font-medium text-foreground leading-tight truncate max-w-[180px]">{{ emp.fullName }}</div>
                <div class="font-mono text-[11px] text-muted-foreground">{{ emp.employeeCode }}</div>
              </td>
              <td
                v-for="d in days" :key="d"
                class="text-center border-b border-border/60 p-0"
                :class="isWeekend(d) ? 'bg-slate-50' : ''"
              >
                <ATooltip :title="cellTitle(emp.fullName, d, cellRec(emp.id, d))">
                  <button
                    type="button"
                    @click="onCell(emp, d)"
                    class="w-full h-8 flex items-center justify-center text-[11px] font-mono rounded transition-all hover:ring-2 hover:ring-accent/40"
                    :class="cellRec(emp.id, d) ? CELL[cellRec(emp.id, d).status]?.bg : 'text-transparent hover:bg-muted'"
                  >
                    {{ cellLabel(cellRec(emp.id, d)) || '·' }}
                  </button>
                </ATooltip>
              </td>
            </tr>
            <tr v-if="gridEmployees.length === 0">
              <td :colspan="days.length + 1" class="text-center py-10 text-muted-foreground text-sm">Không có nhân viên phù hợp bộ lọc</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== TỔNG HỢP ===== -->
    <div v-else-if="viewMode === 'summary'" class="space-y-3">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-card border border-border rounded-xl p-3"><div class="text-xs text-muted-foreground">Tổng ngày công</div><div class="text-xl font-display text-foreground">{{ summaryTotals.present }}</div></div>
        <div class="bg-card border border-border rounded-xl p-3"><div class="text-xs text-muted-foreground">Tổng giờ làm</div><div class="text-xl font-display text-foreground">{{ formatHours(summaryTotals.worked) }}</div></div>
        <div class="bg-card border border-border rounded-xl p-3"><div class="text-xs text-muted-foreground">Tổng tăng ca</div><div class="text-xl font-display text-emerald-600">{{ formatHours(summaryTotals.ot) }}</div></div>
        <div class="bg-card border border-border rounded-xl p-3"><div class="text-xs text-muted-foreground">Ngày nghỉ phép</div><div class="text-xl font-display text-blue-600">{{ summaryTotals.leave }}</div></div>
        <div class="bg-card border border-border rounded-xl p-3"><div class="text-xs text-muted-foreground">Ngày vắng</div><div class="text-xl font-display text-red-600">{{ summaryTotals.absent }}</div></div>
      </div>
      <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden hr-table-wrap">
        <a-table :columns="summaryColumns" :data-source="summaryRows" row-key="id" :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20','50','100'], showTotal: (t:number)=>`${t} nhân viên` }" :scroll="{ x: 900 }" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'employee'">
              <div class="leading-tight"><div class="font-medium text-foreground">{{ record._name }}</div><div class="font-mono text-xs text-muted-foreground">{{ record._code }}</div></div>
            </template>
            <template v-else-if="column.key === 'worked'"><span class="font-mono">{{ formatHours(record.worked) }}</span></template>
            <template v-else-if="column.key === 'ot'"><span class="font-mono text-emerald-600">{{ formatHours(record.ot) }}</span></template>
            <template v-else-if="column.key === 'absent'"><span class="font-mono" :class="record.absent > 0 ? 'text-red-600' : ''">{{ record.absent }}</span></template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- ===== NHẬT KÝ ===== -->
    <div v-else class="bg-card border border-border rounded-xl shadow-sm overflow-hidden hr-table-wrap">
      <a-table :columns="logColumns" :data-source="logFiltered" :loading="store.isLoading" row-key="id" :pagination="logPagination" :scroll="{ x: 1000 }" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'workDate'"><span class="font-mono text-sm">{{ formatDate(record.workDate) }}</span></template>
          <template v-else-if="column.key === 'employee'">
            <div class="leading-tight"><div class="font-medium text-foreground">{{ record._name }}</div><div class="font-mono text-xs text-muted-foreground">{{ record._code }}</div></div>
          </template>
          <template v-else-if="column.key === 'checkInTime'"><span class="font-mono text-sm">{{ formatTime(record.checkInTime) }}</span></template>
          <template v-else-if="column.key === 'checkOutTime'"><span class="font-mono text-sm">{{ formatTime(record.checkOutTime) }}</span></template>
          <template v-else-if="column.key === 'workedHours'"><span class="font-mono text-sm">{{ formatHours(record.workedHours) }}</span></template>
          <template v-else-if="column.key === 'overtimeHours'"><span class="font-mono text-sm text-emerald-600">{{ formatHours(record.overtimeHours) }}</span></template>
          <template v-else-if="column.key === 'lateMinutes'"><span class="font-mono text-sm" :class="record.lateMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ formatHours(record.lateMinutes) }} phút</span></template>
          <template v-else-if="column.key === 'status'"><ATag :color="ATTENDANCE_STATUS[record.status]?.color">{{ ATTENDANCE_STATUS[record.status]?.label || record.status }}</ATag></template>
          <template v-else-if="column.key === 'actions'">
            <button @click="openEdit(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa chấm công"><PencilIcon class="w-4 h-4" /></button>
          </template>
        </template>
      </a-table>
    </div>
  </DataTableShell>

  <!-- Modal nhập/sửa tay -->
  <Modal :title="isEditMode ? 'Sửa chấm công' : 'Nhập chấm công thủ công'" :is-open="modalOpen" max-width="lg" @close="modalOpen = false">
    <form class="space-y-5 font-sans" @submit.prevent="submitManual">
      <div>
        <label class="block text-sm font-medium text-foreground mb-1.5">Nhân viên</label>
        <ASelect
          v-model:value="form.employeeId"
          :options="employeeOptions"
          show-search
          :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
          placeholder="Chọn nhân viên"
          style="width: 100%"
          size="large"
          :disabled="isEditMode"
        />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Ngày</label>
          <input v-model="form.workDate" type="date" :disabled="isEditMode" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60" />
        </div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Trạng thái</label>
          <ASelect v-model:value="form.status" :options="statusOptions" style="width: 100%" size="large" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Giờ vào</label>
          <input v-model="form.checkInTime" type="datetime-local" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Giờ ra</label>
          <input v-model="form.checkOutTime" type="datetime-local" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
        <textarea v-model="form.note" rows="3" placeholder="Ghi chú (tùy chọn)" class="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" @click="modalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="submitting">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</Button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.hr-multi :deep(.ant-select-selector) {
  border-radius: 0.5rem;
  min-height: 36px;
}
.hr-grid {
  max-height: calc(100vh - 320px);
  overflow: auto;
}
.hr-grid table {
  width: max-content;
}
.hr-grid thead th {
  position: sticky;
  top: 0;
  z-index: 15;
}
.hr-grid thead th.sticky {
  z-index: 25;
}
.hr-table-wrap :deep(.ant-table-thead > tr > th) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 600;
  background: rgba(241, 245, 249, 0.5);
}
</style>
