<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Input as AInput } from 'ant-design-vue'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'

const AInputPassword = AInput.Password

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const error = ref('')

const username = ref('admin')
const password = ref('123456')

async function handleLogin() {
  isLoading.value = true
  error.value = ''
  try {
    await authStore.testLogin(username.value, password.value)
    router.push('/') // Trang chủ tự phân theo vai trò (nhân viên → tổng quan cá nhân)
  } catch (err: any) {
    error.value = err.response?.data?.message || err.response?.data?.Message || err.message || 'Đăng nhập thất bại. Hệ thống cần token API hợp lệ để tiếp tục.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
    <!-- Abstract background elements -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>

    <div class="w-full max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-1000">
      <div class="bg-card border border-border p-8 rounded-3xl shadow-2xl relative">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/30 mb-6">
            <span class="font-display text-2xl text-foreground">HR</span>
          </div>
          <h1 class="font-display text-3xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">HR Core</h1>
          <p class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Cổng quản trị</p>
        </div>

        <div v-if="error" class="mb-6 p-4 bg-red-50 text-red-500 rounded-xl text-sm font-sans text-center border border-red-100">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="username" class="sr-only">Tên đăng nhập</label>
            <a-input v-model:value="username" placeholder="Tên đăng nhập (admin, hr, manager, employee)" style="width:100%" />
          </div>
          <div>
            <label for="password" class="sr-only">Mật khẩu</label>
            <a-input-password v-model:value="password" placeholder="Mật khẩu" />
          </div>
          
          <Button type="submit" class="w-full py-6 mt-4 text-base" :disabled="isLoading">
            {{ isLoading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </Button>
        </form>

        <p class="text-center text-xs text-muted-foreground/80 mt-6 font-sans">
          Đăng nhập thử với: admin/123456, hr/123456, manager/123456
        </p>
      </div>
    </div>
  </div>
</template>
