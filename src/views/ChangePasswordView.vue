<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Input as AInput } from 'ant-design-vue'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'

const AInputPassword = AInput.Password

const router = useRouter()
const authStore = useAuthStore()

const forced = computed(() => authStore.mustChangePassword)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  if (newPassword.value.length < 6) { error.value = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; return }
  if (newPassword.value !== confirmPassword.value) { error.value = 'Xác nhận mật khẩu không khớp.'; return }
  if (newPassword.value === currentPassword.value) { error.value = 'Mật khẩu mới phải khác mật khẩu hiện tại.'; return }

  isLoading.value = true
  try {
    await authStore.changePassword(currentPassword.value, newPassword.value)
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message || err.response?.data?.Message || err.message || 'Đổi mật khẩu thất bại.'
  } finally {
    isLoading.value = false
  }
}

function logout() {
  authStore.clearToken()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>

    <div class="w-full max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-1000">
      <div class="bg-card border border-border p-8 rounded-3xl shadow-2xl relative">
        <div class="text-center mb-8">
          <h1 class="font-display text-3xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Đổi mật khẩu</h1>
          <p class="font-sans text-sm text-muted-foreground">
            {{ forced ? 'Tài khoản do công ty cấp — vui lòng đổi mật khẩu trước khi sử dụng.' : 'Cập nhật mật khẩu đăng nhập của bạn.' }}
          </p>
        </div>

        <div v-if="error" class="mb-6 p-4 bg-red-50 text-red-500 rounded-xl text-sm font-sans text-center border border-red-100">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mật khẩu hiện tại</label>
            <a-input-password v-model:value="currentPassword" placeholder="Mật khẩu hiện tại" />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mật khẩu mới</label>
            <a-input-password v-model:value="newPassword" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Xác nhận mật khẩu mới</label>
            <a-input-password v-model:value="confirmPassword" placeholder="Nhập lại mật khẩu mới" />
          </div>

          <Button type="submit" class="w-full py-6 mt-4 text-base" :disabled="isLoading">
            {{ isLoading ? 'Đang đổi...' : 'Đổi mật khẩu' }}
          </Button>
        </form>

        <button @click="logout" class="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-6 font-sans transition-colors">
          Đăng xuất
        </button>
      </div>
    </div>
  </div>
</template>
