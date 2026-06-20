<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePayrollStore } from '../stores/payroll'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import { PrinterIcon } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  payroll: any | null
  employee?: any | null
  companyName?: string
}>(), {
  employee: null,
  companyName: 'CÔNG TY HR CORE',
})

const emit = defineEmits<{ (e: 'close'): void }>()

const payrollStore = usePayrollStore()
const cfg = ref<any | null>(null)

// Tải cấu hình lương (để tách chi tiết phụ cấp/khấu trừ) khi mở
watch(
  () => [props.open, props.payroll?.employeeId],
  async () => {
    cfg.value = null
    if (props.open && props.payroll?.employeeId) {
      cfg.value = await payrollStore.fetchSalaryConfig(props.payroll.employeeId)
    }
  },
  { immediate: true },
)

const STATUS: Record<number, string> = { 0: 'Chờ duyệt', 1: 'Đã duyệt', 2: 'Đã chi trả' }
const fmt = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫'
const num = (n: number) => (n ?? 0).toLocaleString('vi-VN')

const PS_CSS = `
.ps{max-width:720px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:24px;font-size:13px;line-height:1.45}
.ps *{box-sizing:border-box}
.ps-head{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
.ps-co{font-size:17px;font-weight:700;letter-spacing:.5px}
.ps-title{font-size:20px;font-weight:700;margin-top:6px}
.ps-period{font-size:13px;color:#444;margin-top:2px}
.ps-info{width:100%;margin-bottom:8px;border-collapse:collapse}
.ps-info td{padding:3px 6px;vertical-align:top}
.ps-info td.k{color:#555;width:90px}
.ps-sec{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;background:#f1f5f9;padding:6px 8px;margin:14px 0 8px;border-left:3px solid #0052FF}
.ps-grid{width:100%;border-collapse:collapse;text-align:center;margin-bottom:4px}
.ps-grid td{border:1px solid #ddd;padding:6px}
.ps-grid tr:first-child td{background:#f8fafc;font-size:11px;color:#555}
.ps-cols{display:flex;gap:16px}
.ps-cols>div{flex:1}
.ps-t{width:100%;border-collapse:collapse}
.ps-t td{padding:5px 8px;border-bottom:1px solid #eee}
.ps-t td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ps-t tr.sum td{font-weight:700;border-top:2px solid #111;border-bottom:none}
.ps-net{display:flex;justify-content:space-between;align-items:center;background:#0052FF;color:#fff;padding:12px 16px;border-radius:8px;margin-top:16px;font-size:16px;font-weight:700}
.ps-foot{margin-top:14px;font-size:11px;color:#666}
.ps-sign{display:flex;justify-content:space-around;margin-top:30px;text-align:center;font-size:12px;color:#444}
.ps-sign>div{width:40%}
.ps-sign>div .role{font-weight:700}
.ps-sign>div .ln{height:46px}
@media print{body{margin:0}.ps{padding:6px}}
`

const html = computed(() => {
  const p = props.payroll
  if (!p) return ''
  const e = props.employee || {}
  const c = cfg.value
  const allowance = c
    ? `<tr><td>Phụ cấp ăn</td><td class="r">${fmt(c.mealAllowance)}</td></tr>
       <tr><td>Phụ cấp đi lại</td><td class="r">${fmt(c.transportAllowance)}</td></tr>`
    : `<tr><td>Tổng phụ cấp</td><td class="r">${fmt(p.totalAllowances)}</td></tr>`
  const deduction = c
    ? `<tr><td>Bảo hiểm</td><td class="r">${fmt(c.insuranceDeduction)}</td></tr>
       <tr><td>Khấu trừ khác</td><td class="r">${fmt(c.otherDeductions)}</td></tr>`
    : `<tr><td>Tổng khấu trừ</td><td class="r">${fmt(p.totalDeductions)}</td></tr>`

  return `<div class="ps"><style>${PS_CSS}</style>
    <div class="ps-head">
      <div class="ps-co">${props.companyName}</div>
      <div class="ps-title">PHIẾU LƯƠNG</div>
      <div class="ps-period">Kỳ lương: Tháng ${p.month}/${p.year}</div>
    </div>
    <table class="ps-info">
      <tr><td class="k">Nhân viên:</td><td><b>${e.fullName || '—'}</b></td><td class="k">Mã NV:</td><td>${e.employeeCode || '—'}</td></tr>
      <tr><td class="k">Phòng ban:</td><td>${e.departmentName || '—'}</td><td class="k">Chức vụ:</td><td>${e.positionName || '—'}</td></tr>
    </table>

    <div class="ps-sec">Cơ sở tính công</div>
    <table class="ps-grid">
      <tr><td>Công chuẩn</td><td>Công thực tế</td><td>Tăng ca (giờ)</td><td>Phép có lương</td><td>Phép không lương</td></tr>
      <tr><td>${num(p.standardWorkdays)}</td><td>${num(p.actualWorkdays)}</td><td>${num(p.overtimeHours)}</td><td>${num(p.paidLeaveDays)}</td><td>${num(p.unpaidLeaveDays)}</td></tr>
    </table>

    <div class="ps-cols">
      <div>
        <div class="ps-sec">Thu nhập</div>
        <table class="ps-t">
          <tr><td>Lương cơ bản</td><td class="r">${fmt(p.baseSalary)}</td></tr>
          ${allowance}
          <tr class="sum"><td>Tổng thu nhập</td><td class="r">${fmt((p.baseSalary || 0) + (p.totalAllowances || 0))}</td></tr>
        </table>
      </div>
      <div>
        <div class="ps-sec">Khấu trừ</div>
        <table class="ps-t">
          ${deduction}
          <tr class="sum"><td>Tổng khấu trừ</td><td class="r">${fmt(p.totalDeductions)}</td></tr>
        </table>
      </div>
    </div>

    <div class="ps-net"><span>THỰC LÃNH</span><span>${fmt(p.netSalary)}</span></div>

    <div class="ps-foot">Trạng thái: ${STATUS[p.status] ?? p.status} · Phiếu lương được tạo tự động từ hệ thống HR Core.</div>
    <div class="ps-sign">
      <div><div class="role">Người lập (HR)</div><div class="ln"></div><div>(Ký, ghi rõ họ tên)</div></div>
      <div><div class="role">Nhân viên</div><div class="ln"></div><div>(Ký, ghi rõ họ tên)</div></div>
    </div>
  </div>`
})

function printPayslip() {
  const w = window.open('', 'PRINT', 'width=820,height=1000')
  if (!w) return
  w.document.write(`<html><head><meta charset="utf-8"><title>Phiếu lương</title></head><body>${html.value}</body></html>`)
  w.document.close()
  w.focus()
  // chờ render xong rồi mở hộp thoại in (người dùng chọn "Lưu PDF" nếu muốn)
  setTimeout(() => { w.print(); w.close() }, 300)
}
</script>

<template>
  <Modal :isOpen="open" title="Phiếu lương" maxWidth="2xl" @close="emit('close')">
    <div class="space-y-4">
      <div class="border border-border rounded-xl overflow-hidden bg-white" v-html="html"></div>
      <div class="flex justify-end gap-3">
        <Button variant="ghost" type="button" @click="emit('close')">Đóng</Button>
        <Button type="button" @click="printPayslip">
          <PrinterIcon class="w-4 h-4 mr-2" /> In / Lưu PDF
        </Button>
      </div>
    </div>
  </Modal>
</template>
