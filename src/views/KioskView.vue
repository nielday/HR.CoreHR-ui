<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { LogInIcon, LogOutIcon, ScanLineIcon, CheckCircle2Icon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'

const store = useAttendanceStore()

const code = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const result = ref<any>(null)         // { fullName, employeeCode, action, record }
let clearTimer: any = null

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

function showResult(r: any) {
  result.value = r
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = setTimeout(() => { result.value = null }, 6000)
}

async function doCheck(kind: 'in' | 'out') {
  const c = code.value.trim()
  if (!c) { message.warning('Vui lòng nhập mã nhân viên'); focusInput(); return }
  const r = kind === 'in' ? await store.kioskCheckIn(c) : await store.kioskCheckOut(c)
  if (r) {
    showResult(r)
    code.value = ''
  } else {
    message.error(store.error || 'Chấm công thất bại')
  }
  focusInput()
}

const fmtTime = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

onMounted(focusInput)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Kiosk chấm công</h1>
      <p class="text-muted-foreground font-sans text-lg">Nhập mã nhân viên rồi bấm Vào ca / Tan ca. Dùng cho nhân viên không có tài khoản.</p>
    </div>

    <div class="max-w-2xl mx-auto">
      <div class="bg-card border border-border rounded-3xl shadow-xl p-8 sm:p-10">
        <!-- Ô nhập mã -->
        <label class="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
          <ScanLineIcon class="w-4 h-4" /> Mã nhân viên
        </label>
        <input
          ref="inputRef"
          v-model="code"
          type="text"
          autocomplete="off"
          placeholder="VD: EMP-001"
          class="w-full h-20 px-6 rounded-2xl border-2 border-border bg-transparent focus:ring-4 focus:ring-accent/30 focus:border-accent outline-none font-mono text-3xl text-center tracking-widest text-foreground transition-all"
          @keyup.enter="doCheck('in')"
        />

        <!-- 2 nút lớn -->
        <div class="grid grid-cols-2 gap-4 mt-6">
          <button
            @click="doCheck('in')"
            :disabled="store.isLoading"
            class="h-24 rounded-2xl font-sans font-semibold text-white text-xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all bg-gradient-to-br from-blue-500 to-blue-600 disabled:opacity-50 inline-flex flex-col items-center justify-center gap-1"
          >
            <LogInIcon class="w-7 h-7" /> Vào ca
          </button>
          <button
            @click="doCheck('out')"
            :disabled="store.isLoading"
            class="h-24 rounded-2xl font-sans font-semibold text-white text-xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all bg-gradient-to-br from-rose-500 to-orange-500 disabled:opacity-50 inline-flex flex-col items-center justify-center gap-1"
          >
            <LogOutIcon class="w-7 h-7" /> Tan ca
          </button>
        </div>
      </div>

      <!-- Kết quả xác nhận -->
      <transition name="fade">
        <div v-if="result" class="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
          <CheckCircle2Icon class="w-12 h-12 text-emerald-500 shrink-0" />
          <div class="font-sans">
            <p class="text-lg font-semibold text-foreground">{{ result.fullName }}
              <span class="font-mono text-sm text-muted-foreground">({{ result.employeeCode }})</span>
            </p>
            <p class="text-emerald-700">
              {{ result.action === 'check-in' ? 'Đã vào ca lúc' : 'Đã tan ca lúc' }}
              <strong class="font-mono">
                {{ result.action === 'check-in' ? fmtTime(result.record?.checkInTime) : fmtTime(result.record?.checkOutTime) }}
              </strong>
              <span v-if="result.action === 'check-in' && result.record?.lateMinutes > 0" class="text-red-600 ml-1">
                (đi muộn {{ result.record.lateMinutes }} phút)
              </span>
            </p>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
