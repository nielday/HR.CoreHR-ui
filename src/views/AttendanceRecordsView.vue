<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Input as AInput, Select as ASelect, Tag as ATag, Segmented as ASegmented, message } from 'ant-design-vue'
const ATextarea = AInput.TextArea
import { PlusIcon, PencilIcon, XIcon, TriangleAlertIcon, DownloadIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = useAttendanceStore()
const empStore = useEmployeeStore()
const route = useRoute()

// Deep-link từ tìm kiếm tổng: ?employeeId= → lọc sẵn theo nhân viên đó
function applyEmployeeIdFromQuery() {
  const id = route.query.employeeId
  if (typeof id === 'string' && id) {
    viewMode.value = 'detail'
    fEmpIds.value = [id]
  }
}

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

// Chế độ: Chi tiết (từng ngày) | Tổng hợp (mỗi NV một dòng)
const viewMode = ref<'detail' | 'summary'>('detail')

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
const fDays = ref<number[]>([])
const onlyExceptions = ref(false)

// Bản ghi "cần xử lý": vắng, đi muộn, về sớm, hoặc quên check-out
function isException(r: any) {
  return r.status === 1 || (r.lateMinutes || 0) > 0 || (r.earlyLeaveMinutes || 0) > 0 || (!!r.checkInTime && !r.checkOutTime)
}

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const dayOptions = computed<any[]>(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => ({ value: i + 1, label: `Ngày ${i + 1}` })),
)
const departmentOptions = computed<any[]>(() => {
  const set = new Set<string>()
  for (const e of empStore.allEmployees as any[]) set.add(e.departmentName || 'Chưa phân phòng')
  return [...set].sort().map((d) => ({ value: d, label: d }))
})
const hasFilter = computed(() =>
  !!searchText.value.trim() || fDeptNames.value.length > 0 || fEmpIds.value.length > 0 || fDays.value.length > 0 || onlyExceptions.value,
)
function clearFilters() { searchText.value = ''; fDeptNames.value = []; fEmpIds.value = []; fDays.value = []; onlyExceptions.value = false }

// reset ngày đã chọn nếu vượt quá số ngày của tháng mới
watch(daysInMonth, (n) => { fDays.value = fDays.value.filter((d) => d <= n) })

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
// Đi muộn/về sớm: <1 giờ ghi phút, ≥1 giờ ghi giờ (+ phút lẻ)
function formatLate(n?: number | null) {
  const m = Math.round(n ?? 0)
  if (m <= 0) return '0 phút'
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} giờ ${r} phút` : `${h} giờ`
}
const dayOf = (v: any) => Number(String(v).slice(8, 10))

// ===== CHI TIẾT (danh sách phẳng từng bản ghi) =====
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
const detailFiltered = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return enriched.value.filter((r: any) => {
    if (fDeptNames.value.length && !fDeptNames.value.includes(r._dept)) return false
    if (fEmpIds.value.length && !fEmpIds.value.includes(r.employeeId)) return false
    if (fDays.value.length && !fDays.value.includes(dayOf(r.workDate))) return false
    if (onlyExceptions.value && !isException(r)) return false
    if (q && !`${r._name} ${r._code}`.toLowerCase().includes(q)) return false
    return true
  })
})
const statusOptions = [
  { value: 0, label: 'Có mặt' }, { value: 1, label: 'Vắng' }, { value: 2, label: 'Nghỉ phép' }, { value: 3, label: 'Ngày lễ' },
]

// ===== TỔNG HỢP THÁNG (mỗi NV một dòng) =====
const summaryEmployees = computed(() =>
  (empStore.allEmployees as any[]).filter((e) => {
    const dept = e.departmentName || 'Chưa phân phòng'
    if (e.workingStatus === 'Resigned') return false
    if (fDeptNames.value.length && !fDeptNames.value.includes(dept)) return false
    if (fEmpIds.value.length && !fEmpIds.value.includes(e.id)) return false
    const q = searchText.value.trim().toLowerCase()
    if (q && !`${e.fullName} ${e.employeeCode}`.toLowerCase().includes(q)) return false
    return true
  }),
)
const summaryRows = computed(() =>
  summaryEmployees.value.map((e: any) => {
    const recs = (store.attendanceList as any[]).filter((r) => r.employeeId === e.id)
    return {
      id: e.id, _name: e.fullName, _code: e.employeeCode, _dept: e.departmentName || 'Chưa phân phòng',
      present: recs.filter((r) => r.status === 0).length,
      worked: recs.reduce((s, r) => s + (r.workedHours || 0), 0),
      ot: recs.reduce((s, r) => s + (r.overtimeHours || 0), 0),
      leave: recs.filter((r) => r.status === 2).length,
      absent: recs.filter((r) => r.status === 1).length,
      late: recs.filter((r) => (r.lateMinutes || 0) > 0).length,
    }
  })
)
async function reload() {
  await store.fetchAttendance(undefined, month.value, year.value)
}

// ===== Xuất file (CSV mở bằng Excel) — theo đúng bộ lọc & chế độ đang xem =====
function csvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','))
  // BOM ﻿ để Excel đọc đúng tiếng Việt (UTF-8)
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function exportCsv() {
  if (viewMode.value === 'detail') {
    const headers = [
      'Ngày', 'Mã NV', 'Họ tên', 'Phòng ban', 'Ca', 'Giờ vào', 'Giờ ra',
      'Giờ làm', 'Tăng ca', 'Đi muộn (phút)', 'Về sớm (phút)', 'Trạng thái', 'Ghi chú',
    ]
    const rows = detailFiltered.value.map((r: any) => [
      formatDate(r.workDate), r._code, r._name, r._dept, r._shift,
      formatTime(r.checkInTime), formatTime(r.checkOutTime),
      r.workedHours ?? 0, r.overtimeHours ?? 0, r.lateMinutes ?? 0, r.earlyLeaveMinutes ?? 0,
      ATTENDANCE_STATUS[r.status]?.label || r.status, r.note || '',
    ])
    if (!rows.length) { message.info('Không có dữ liệu để xuất'); return }
    downloadCsv(`cham-cong-chi-tiet-${pad2(month.value)}-${year.value}.csv`, headers, rows)
  } else {
    const headers = ['Mã NV', 'Họ tên', 'Phòng ban', 'Ngày công', 'Tổng giờ', 'Tăng ca', 'Nghỉ phép', 'Vắng', 'Đi muộn (lần)']
    const rows = summaryRows.value.map((r: any) => [
      r._code, r._name, r._dept, r.present, r.worked, r.ot, r.leave, r.absent, r.late,
    ])
    if (!rows.length) { message.info('Không có dữ liệu để xuất'); return }
    downloadCsv(`cham-cong-tong-hop-${pad2(month.value)}-${year.value}.csv`, headers, rows)
  }
}

// ===== Modal nhập/sửa tay =====
const modalOpen = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const form = reactive<{ employeeId: string | undefined; workDate: string; shiftId: string | undefined; status: number; checkInTime: string; checkOutTime: string; note: string }>({
  employeeId: undefined, workDate: '', shiftId: undefined, status: 0, checkInTime: '', checkOutTime: '', note: '',
})
// Tùy chọn ca trong form (để trống = tự nhận ca theo giờ check-in).
const shiftOptions = computed(() =>
  (store.shifts as any[]).map((s) => ({ value: s.id, label: s.shiftName || s.shiftCode })),
)
function openCreate() {
  isEditMode.value = false
  form.employeeId = undefined; form.workDate = ''; form.shiftId = undefined; form.status = 0; form.checkInTime = ''; form.checkOutTime = ''; form.note = ''
  modalOpen.value = true
}
function toLocalInput(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
// datetime-local là giờ local của trình duyệt → đổi sang ISO UTC để khớp với chấm công tự động.
function toUtcIso(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
function openEdit(record: any) {
  isEditMode.value = true
  form.employeeId = record.employeeId
  form.workDate = record.workDate ? String(record.workDate).slice(0, 10) : ''
  form.shiftId = record.shiftId || undefined
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
    employeeId: form.employeeId, workDate: form.workDate, shiftId: form.shiftId || null, status: form.status,
    checkInTime: toUtcIso(form.checkInTime), checkOutTime: toUtcIso(form.checkOutTime), note: form.note || null,
  })
  submitting.value = false
  if (ok) { message.success('Đã lưu chấm công'); modalOpen.value = false; await reload() }
  else message.error(store.error || 'Lưu chấm công thất bại')
}

onMounted(async () => {
  if (!empStore.allEmployees.length) await empStore.fetchAllEmployees()
  if (!store.shifts.length) await store.fetchShifts()
  applyEmployeeIdFromQuery()
  await reload()
})
watch([month, year], reload)
// Deep-link mới khi đang ở sẵn trang này (đổi ?employeeId=)
watch(() => route.query.employeeId, applyEmployeeIdFromQuery)
</script>

<template>
  <DataTableShell
    title="Bảng chấm công"
    subtitle="Theo dõi chấm công theo tháng — lọc theo ngày, phòng ban, nhân viên."
  >
    <!-- Header actions -->
    <template #actions>
      <ASegmented
        v-model:value="viewMode"
        :options="[{ label: 'Chi tiết', value: 'detail' }, { label: 'Tổng hợp', value: 'summary' }]"
      />
      <Button variant="secondary" @click="exportCsv()">
        <DownloadIcon class="w-4 h-4 mr-2" /> Xuất Excel
      </Button>
      <Button @click="openCreate()">
        <PlusIcon class="w-4 h-4 mr-2" /> Nhập tay
      </Button>
    </template>

    <!-- Filters -->
    <template #filters>
      <div class="relative w-full sm:w-52">
        <a-input v-model:value="searchText" placeholder="Tìm theo tên/mã nhân viên..." style="width:100%" />
      </div>
      <ASelect v-model:value="month" :options="months" class="min-w-[120px]" />
      <ASelect v-model:value="year" :options="years" class="min-w-[100px]" />
      <ASelect
        v-if="viewMode === 'detail'"
        v-model:value="fDays" mode="multiple" :options="dayOptions" allow-clear :max-tag-count="3"
        placeholder="Ngày trong tháng" class="hr-multi" style="min-width: 180px"
      />
      <ASelect
        v-model:value="fDeptNames" mode="multiple" :options="departmentOptions" allow-clear :max-tag-count="2"
        placeholder="Phòng ban" class="hr-multi" style="min-width: 180px"
      />
      <ASelect
        v-model:value="fEmpIds" mode="multiple" :options="employeeOptions" allow-clear :max-tag-count="2"
        show-search
        :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
        placeholder="Nhân viên" class="hr-multi" style="min-width: 200px"
      />
      <button
        v-if="viewMode === 'detail'"
        type="button"
        @click="onlyExceptions = !onlyExceptions"
        class="h-9 px-3 inline-flex items-center gap-1 rounded-lg border text-sm transition-all"
        :class="onlyExceptions ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
        title="Chỉ hiện bản ghi cần xử lý: vắng, đi muộn, về sớm, quên check-out"
      >
        <TriangleAlertIcon class="w-4 h-4" /> Chỉ cần xử lý
      </button>
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
        Lỗi tải dữ liệu: {{ store.error }}
      </div>
    </template>

    <!-- CHI TIẾT -->
    <div v-if="viewMode === 'detail'" class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto hr-scroll">
        <table class="w-full text-sm border-collapse min-w-[1000px]">
          <thead>
            <tr class="bg-muted/40 text-left">
              <th class="hr-th text-center w-[110px]">Ngày</th>
              <th class="hr-th">Nhân viên</th>
              <th class="hr-th">Phòng ban</th>
              <th class="hr-th">Ca</th>
              <th class="hr-th text-center">Giờ vào</th>
              <th class="hr-th text-center">Giờ ra</th>
              <th class="hr-th text-right">Giờ làm</th>
              <th class="hr-th text-right">Tăng ca</th>
              <th class="hr-th text-right">Đi muộn</th>
              <th class="hr-th text-center">Trạng thái</th>
              <th class="hr-th"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailFiltered" :key="r.id" class="border-b border-border/60 hover:bg-muted/20">
              <td class="hr-td text-center font-mono">{{ formatDate(r.workDate) }}</td>
              <td class="hr-td">
                <div class="font-medium text-foreground">{{ r._name }}</div>
                <div class="font-mono text-xs text-muted-foreground">{{ r._code }}</div>
              </td>
              <td class="hr-td">{{ r._dept }}</td>
              <td class="hr-td">{{ r._shift }}</td>
              <td class="hr-td text-center font-mono">{{ formatTime(r.checkInTime) }}</td>
              <td class="hr-td text-center font-mono">{{ formatTime(r.checkOutTime) }}</td>
              <td class="hr-td text-right font-mono">{{ formatHours(r.workedHours) }}</td>
              <td class="hr-td text-right font-mono text-emerald-600">{{ formatHours(r.overtimeHours) }}</td>
              <td class="hr-td text-right font-mono" :class="r.lateMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ formatLate(r.lateMinutes) }}</td>
              <td class="hr-td text-center"><ATag :color="ATTENDANCE_STATUS[r.status]?.color">{{ ATTENDANCE_STATUS[r.status]?.label || r.status }}</ATag></td>
              <td class="hr-td text-right">
                <button @click="openEdit(r)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa chấm công"><PencilIcon class="w-4 h-4" /></button>
              </td>
            </tr>
            <tr v-if="detailFiltered.length === 0">
              <td colspan="11" class="text-center py-10 text-muted-foreground text-sm">Chưa có dữ liệu chấm công cho kỳ/bộ lọc này</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TỔNG HỢP -->
    <div v-else class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto hr-scroll">
        <table class="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr class="bg-muted/40 text-left">
              <th class="hr-th">Nhân viên</th>
              <th class="hr-th">Phòng ban</th>
              <th class="hr-th text-right">Ngày công</th>
              <th class="hr-th text-right">Tổng giờ</th>
              <th class="hr-th text-right">Tăng ca</th>
              <th class="hr-th text-right">Nghỉ phép</th>
              <th class="hr-th text-right">Vắng</th>
              <th class="hr-th text-right">Đi muộn</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in summaryRows" :key="r.id" class="border-b border-border/60 hover:bg-muted/20">
              <td class="hr-td">
                <div class="font-medium text-foreground">{{ r._name }}</div>
                <div class="font-mono text-xs text-muted-foreground">{{ r._code }}</div>
              </td>
              <td class="hr-td">{{ r._dept }}</td>
              <td class="hr-td text-right font-mono">{{ r.present }}</td>
              <td class="hr-td text-right font-mono">{{ formatHours(r.worked) }}</td>
              <td class="hr-td text-right font-mono text-emerald-600">{{ formatHours(r.ot) }}</td>
              <td class="hr-td text-right font-mono">{{ r.leave }}</td>
              <td class="hr-td text-right font-mono" :class="r.absent > 0 ? 'text-red-600' : ''">{{ r.absent }}</td>
              <td class="hr-td text-right font-mono">{{ r.late }}</td>
            </tr>
            <tr v-if="summaryRows.length === 0">
              <td colspan="8" class="text-center py-10 text-muted-foreground text-sm">Chưa có nhân viên / dữ liệu cho bộ lọc này</td>
            </tr>
          </tbody>
        </table>
      </div>
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
        <label class="block text-sm font-medium text-foreground mb-1.5">Ca làm việc</label>
        <ASelect
          v-model:value="form.shiftId"
          :options="shiftOptions"
          allow-clear
          placeholder="Tự động theo giờ check-in"
          style="width: 100%"
          size="large"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
        <a-textarea v-model:value="form.note" :rows="3" placeholder="Ghi chú (tùy chọn)" />
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
.hr-scroll {
  max-height: calc(100vh - 360px);
  overflow: auto;
}
.hr-th {
  padding: 0.5rem 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #f1f5f9;
  z-index: 5;
}
.hr-td {
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
  white-space: nowrap;
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
