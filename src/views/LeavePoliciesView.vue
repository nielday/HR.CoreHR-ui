<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Table as ATable, Tag as ATag, message } from 'ant-design-vue'
import { PencilIcon } from 'lucide-vue-next'
import { LEAVE_TYPE, useAttendanceStore, type LeavePolicy } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useAttendanceStore()

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  leaveType: 0,
  annualQuotaDays: null as number | null,
  description: '',
  isActive: true,
})

const columns = [
  { title: 'Loại nghỉ', key: 'leaveType' },
  { title: 'Hạn mức/năm', key: 'annualQuotaDays', align: 'center' as const },
  { title: 'Mô tả', key: 'description' },
  { title: 'Trạng thái', key: 'isActive', align: 'center' as const },
  { title: 'Thao tác', key: 'actions', align: 'right' as const },
]

function openEdit(policy: LeavePolicy | Record<string, any>) {
  editingId.value = policy.id
  form.value = {
    leaveType: policy.leaveType,
    annualQuotaDays: policy.annualQuotaDays ?? null,
    description: policy.description || '',
    isActive: policy.isActive,
  }
  store.error = null
  isModalOpen.value = true
}

async function submit() {
  if (!editingId.value) return
  const ok = await store.updateLeavePolicy(editingId.value, {
    annualQuotaDays: form.value.annualQuotaDays === null ? null : Number(form.value.annualQuotaDays),
    description: form.value.description,
    isActive: form.value.isActive,
  })

  if (ok) {
    message.success('Đã cập nhật chính sách nghỉ phép')
    isModalOpen.value = false
    await store.fetchLeavePolicies()
  } else {
    message.error(store.error || 'Cập nhật thất bại')
  }
}

onMounted(() => {
  store.fetchLeavePolicies()
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Cấu hình nghỉ phép</h1>
      <p class="text-muted-foreground font-sans text-lg">Thiết lập hạn mức ngày nghỉ theo từng loại nghỉ phép.</p>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.leavePolicies" :loading="store.isLoading" :pagination="false" row-key="id" class="font-sans">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'leaveType'">
            <span class="font-sans font-medium text-foreground">{{ LEAVE_TYPE[record.leaveType] || record.leaveType }}</span>
          </template>

          <template v-else-if="column.key === 'annualQuotaDays'">
            <span class="font-mono text-sm">
              {{ record.annualQuotaDays === null || record.annualQuotaDays === undefined ? 'Không giới hạn' : `${record.annualQuotaDays} ngày` }}
            </span>
          </template>

          <template v-else-if="column.key === 'description'">
            <span class="font-sans text-sm text-muted-foreground">{{ record.description || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'isActive'">
            <ATag :color="record.isActive ? 'green' : 'default'">
              {{ record.isActive ? 'Đang áp dụng' : 'Tạm ngừng' }}
            </ATag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center justify-end">
              <button @click="openEdit(record)" class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
                <PencilIcon class="w-4 h-4" />
              </button>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <Modal :isOpen="isModalOpen" title="Sửa chính sách nghỉ phép" @close="isModalOpen = false">
      <form @submit.prevent="submit" class="space-y-5">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Loại nghỉ</label>
          <input :value="LEAVE_TYPE[form.leaveType] || form.leaveType" disabled class="w-full h-12 px-3 rounded-xl border border-border bg-muted/40 text-muted-foreground outline-none font-sans text-sm" />
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Hạn mức ngày/năm</label>
          <input v-model.number="form.annualQuotaDays" type="number" min="0" step="0.5" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="Để trống = không giới hạn" />
          <p class="mt-2 text-xs text-muted-foreground font-sans">Để trống nếu loại nghỉ không giới hạn, ví dụ nghỉ không lương.</p>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
          <textarea v-model="form.description" rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Mô tả chính sách..."></textarea>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <input id="leavePolicyActive" v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
          <label for="leavePolicyActive" class="font-sans text-sm text-foreground">Đang áp dụng</label>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Đang lưu...' : 'Lưu' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
