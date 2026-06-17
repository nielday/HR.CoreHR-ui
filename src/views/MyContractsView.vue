<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Table as ATable, Tag as ATag } from 'ant-design-vue'
import { FileTextIcon } from 'lucide-vue-next'
import { useEmployeeContractStore } from '../stores/employee-contract'
import { useEmployeeStore } from '../stores/employee'

const contractStore = useEmployeeContractStore()
const empStore = useEmployeeStore()

const notLinked = ref(false)

// ContractStatus: 0 Pending, 1 Active, 2 Expired, 3 Cancelled, 4 Terminated
const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ hiệu lực', color: 'orange' },
  1: { label: 'Đang hiệu lực', color: 'green' },
  2: { label: 'Hết hạn', color: 'default' },
  3: { label: 'Đã hủy', color: 'default' },
  4: { label: 'Đã chấm dứt', color: 'red' },
}

const activeContract = computed(() => contractStore.contracts.find(c => c.status === 1) || null)

const columns = [
  { title: 'Mã HĐ', key: 'contractCode', width: 140 },
  { title: 'Loại hợp đồng', key: 'contractTypeName' },
  { title: 'Từ ngày', key: 'startDate', align: 'center' as const, width: 120 },
  { title: 'Đến ngày', key: 'endDate', align: 'center' as const, width: 120 },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 140 },
  { title: 'Ghi chú', key: 'note' },
]

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

onMounted(async () => {
  const me = await empStore.fetchMyProfile()
  if (me?.id) {
    await contractStore.fetchContractsByEmployee(me.id)
  } else {
    notLinked.value = true
  }
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div>
      <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Hợp đồng của tôi</h1>
      <p class="text-muted-foreground font-sans text-lg">Lịch sử hợp đồng lao động của bạn.</p>
    </div>

    <div v-if="notLinked" class="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-sans">
      Tài khoản của bạn chưa được gắn với hồ sơ nhân viên nên chưa có dữ liệu hợp đồng.
    </div>
    <div v-else-if="contractStore.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ contractStore.error }}</div>

    <template v-if="!notLinked">
      <!-- Hợp đồng hiện hành -->
      <div v-if="activeContract" class="bg-card border border-border rounded-2xl shadow-sm p-6 flex items-start gap-4">
        <div class="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <FileTextIcon class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Hợp đồng hiện hành</p>
          <p class="font-display text-2xl text-foreground">{{ activeContract.contractTypeName || '—' }}</p>
          <p class="text-sm text-muted-foreground font-sans mt-1">
            {{ activeContract.contractCode || '—' }} ·
            Từ {{ formatDate(activeContract.startDate) }}
            <template v-if="activeContract.endDate"> đến {{ formatDate(activeContract.endDate) }}</template>
            <template v-else> (không thời hạn)</template>
          </p>
        </div>
      </div>

      <!-- Lịch sử hợp đồng -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6">
        <ATable :columns="columns" :data-source="contractStore.contracts" :loading="contractStore.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
          <template #emptyText>
            <div class="py-8 text-center text-muted-foreground font-sans text-sm">
              <FileTextIcon class="w-6 h-6 mx-auto mb-2 opacity-50" />
              Chưa có hợp đồng nào.
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'contractCode'"><span class="font-mono text-sm text-muted-foreground">{{ record.contractCode || '—' }}</span></template>
            <template v-else-if="column.key === 'contractTypeName'"><span class="font-sans font-medium text-foreground">{{ record.contractTypeName || '—' }}</span></template>
            <template v-else-if="column.key === 'startDate'"><span class="font-mono text-sm">{{ formatDate(record.startDate) }}</span></template>
            <template v-else-if="column.key === 'endDate'"><span class="font-mono text-sm">{{ formatDate(record.endDate) }}</span></template>
            <template v-else-if="column.key === 'status'">
              <ATag :color="STATUS[record.status]?.color">{{ STATUS[record.status]?.label || record.status }}</ATag>
            </template>
            <template v-else-if="column.key === 'note'"><span class="font-sans text-sm text-muted-foreground">{{ record.note || '—' }}</span></template>
          </template>
        </ATable>
      </div>
    </template>
  </div>
</template>
