<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { LogInIcon, LogOutIcon, ScanLineIcon, CheckCircle2Icon, LockIcon, RefreshCwIcon, ShieldIcon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'

const store = useAttendanceStore()

const code = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const result = ref<any>(null)
const enabled = ref(true)
const checking = ref(true)
const now = ref(new Date())
let clearTimer: any = null
let clockTimer: any = null
let statusTimer: any = null

const focusInput = () => nextTick(() => inputRef.value?.focus())

async function refreshStatus() {
  const s = await store.kioskStatus()
  if (s) enabled.value = !!s.isEnabled
  checking.value = false
  if (enabled.value) focusInput()
}

function showResult(r: any) {
  result.value = r
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = setTimeout(() => { result.value = null }, 6000)
}

const msg = ref<string>('')
async function doCheck(kind: 'in' | 'out') {
  msg.value = ''
  const c = code.value.trim()
  if (!c) { msg.value = 'Vui lòng nhập mã nhân viên'; focusInput(); return }
  const r = kind === 'in' ? await store.kioskCheckIn(c) : await store.kioskCheckOut(c)
  if (r) {
    showResult(r); code.value = ''
  } else {
    msg.value = store.error || 'Chấm công thất bại'
    if (/khóa/i.test(msg.value)) enabled.value = false   // bị admin khóa giữa chừng
  }
  focusInput()
}

const fmtTime = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const clock = () => now.value.toLocaleTimeString('vi-VN')
const today = () => now.value.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

onMounted(() => {
  refreshStatus()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
  statusTimer = setInterval(refreshStatus, 30000) // tự cập nhật trạng thái khóa/mở mỗi 30s
})
onUnmounted(() => { clearInterval(clockTimer); clearInterval(statusTimer); if (clearTimer) clearTimeout(clearTimer) })
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 sm:px-10 py-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-accent-secondary flex items-center justify-center">
          <ScanLineIcon class="w-5 h-5 text-white" />
        </div>
        <div>
          <p class="font-display text-lg leading-tight">Máy chấm công</p>
          <p class="text-xs text-white/50 font-mono">{{ today() }}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-mono text-2xl sm:text-3xl tabular-nums tracking-wider">{{ clock() }}</p>
        <RouterLink to="/login" class="text-xs text-white/40 hover:text-white/80 transition-colors inline-flex items-center gap-1 mt-1">
          <ShieldIcon class="w-3 h-3" /> Đăng nhập hệ thống
        </RouterLink>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 flex items-center justify-center px-4 pb-16">
      <!-- Đang kiểm tra -->
      <div v-if="checking" class="text-white/60 font-sans">Đang tải…</div>

      <!-- Bị khóa -->
      <div v-else-if="!enabled" class="max-w-md text-center">
        <div class="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <LockIcon class="w-10 h-10 text-amber-400" />
        </div>
        <h2 class="font-display text-3xl mb-2">Kiosk đang tạm khóa</h2>
        <p class="text-white/50 font-sans">Máy chấm công hiện đang được tạm dừng. Vui lòng liên hệ quản trị viên.</p>
        <button @click="refreshStatus" class="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm">
          <RefreshCwIcon class="w-4 h-4" /> Kiểm tra lại
        </button>
      </div>

      <!-- Màn chấm công -->
      <div v-else class="w-full max-w-xl">
        <label class="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-white/40 mb-4">
          <ScanLineIcon class="w-4 h-4" /> Nhập mã nhân viên của bạn
        </label>
        <input
          ref="inputRef"
          v-model="code"
          type="text"
          inputmode="numeric"
          pattern="[0-9]+"
          autocomplete="off"
          placeholder="VD: 1001"
          class="w-full h-24 px-6 rounded-3xl border-2 border-white/15 bg-white/5 focus:ring-4 focus:ring-accent/40 focus:border-accent outline-none font-mono text-4xl text-center tracking-widest text-white placeholder:text-white/20 transition-all"
          @keyup.enter="doCheck('in')"
        />

        <div class="grid grid-cols-2 gap-4 mt-6">
          <button @click="doCheck('in')" :disabled="store.isLoading"
            class="h-28 rounded-3xl font-sans font-semibold text-white text-2xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all bg-gradient-to-br from-blue-500 to-blue-600 disabled:opacity-50 inline-flex flex-col items-center justify-center gap-1">
            <LogInIcon class="w-8 h-8" /> Vào ca
          </button>
          <button @click="doCheck('out')" :disabled="store.isLoading"
            class="h-28 rounded-3xl font-sans font-semibold text-white text-2xl shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all bg-gradient-to-br from-rose-500 to-orange-500 disabled:opacity-50 inline-flex flex-col items-center justify-center gap-1">
            <LogOutIcon class="w-8 h-8" /> Tan ca
          </button>
        </div>

        <p v-if="msg" class="mt-5 text-center text-rose-300 font-sans">{{ msg }}</p>

        <transition name="fade">
          <div v-if="result" class="mt-6 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-6 flex items-center gap-4">
            <CheckCircle2Icon class="w-12 h-12 text-emerald-400 shrink-0" />
            <div class="font-sans">
              <p class="text-xl font-semibold">{{ result.fullName }}
                <span class="font-mono text-sm text-white/50">({{ result.employeeCode }})</span>
              </p>
              <p class="text-emerald-300">
                {{ result.action === 'check-in' ? 'Đã vào ca lúc' : 'Đã tan ca lúc' }}
                <strong class="font-mono">
                  {{ result.action === 'check-in' ? fmtTime(result.record?.checkInTime) : fmtTime(result.record?.checkOutTime) }}
                </strong>
                <span v-if="result.action === 'check-in' && result.record?.lateMinutes > 0" class="text-rose-300 ml-1">
                  (đi muộn {{ result.record.lateMinutes }} phút)
                </span>
              </p>
            </div>
          </div>
        </transition>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
