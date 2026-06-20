<script setup lang="ts">
/**
 * Khung hiển thị dữ liệu dạng bảng dùng chung (chuẩn nghiệp vụ, tham khảo Odoo):
 * - Header gọn: tiêu đề + mô tả + vùng nút thao tác (slot "actions")
 * - Toolbar: ô tìm kiếm (tuỳ chọn) + vùng bộ lọc (slot "filters")
 * - Bảng Ant Design `a-table` dày đặc, sort/pagination sẵn có
 *
 * Slot:
 *  - actions:      các nút bên phải header (Thêm, Xuất Excel, chuyển view...)
 *  - filters:      các select lọc nằm trên thanh toolbar
 *  - banner:       vùng cảnh báo/lỗi đặt trên bảng
 *  - bodyCell:     forward nguyên slot bodyCell của a-table ({ column, record, index, text })
 *  - default:      thay cho bảng (vd hiển thị Kanban / sơ đồ thay vì bảng)
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Table as ATable } from 'ant-design-vue'
import { SearchIcon } from 'lucide-vue-next'

// Breadcrumb: suy ra "nhóm" từ đường dẫn hiện tại (kiểu Ant Design Pro)
const route = useRoute()
const sectionCrumb = computed(() => {
  const p = route.path
  if (p.includes('/attendance/leave') || p.includes('leave-policies')) return 'Nghỉ phép'
  if (p.startsWith('/attendance')) return 'Chấm công'
  if (p.startsWith('/payroll') || p.includes('/payslip')) return 'Lương'
  if (p.startsWith('/users')) return 'Quản trị'
  if (p.includes('dashboard')) return 'Tổng quan'
  if (p.startsWith('/employees') || p.startsWith('/departments') || p.startsWith('/positions') || p.startsWith('/contracts') || p.includes('/contracts')) return 'Nhân sự'
  return ''
})

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    columns?: any[]
    dataSource?: any[]
    loading?: boolean
    rowKey?: string
    pagination?: any
    rowSelection?: any
    search?: string
    searchPlaceholder?: string
    showSearch?: boolean
    size?: 'small' | 'middle' | 'large'
    scrollX?: number | string
  }>(),
  {
    columns: () => [],
    dataSource: () => [],
    loading: false,
    rowKey: 'id',
    pagination: undefined,
    rowSelection: undefined,
    search: '',
    searchPlaceholder: 'Tìm kiếm...',
    showSearch: false,
    size: 'middle',
    scrollX: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:search', v: string): void
  (e: 'change', ...args: any[]): void
}>()
</script>

<template>
  <div class="space-y-4 motion-safe:animate-in motion-safe:fade-in duration-500 pb-12">
    <!-- Header -->
    <div
      v-if="title || $slots.actions"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div v-if="title">
        <nav v-if="sectionCrumb" class="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 font-sans">
          <span>{{ sectionCrumb }}</span>
          <span class="opacity-50">/</span>
          <span class="text-foreground/70">{{ title }}</span>
        </nav>
        <h1 class="font-display text-2xl text-foreground leading-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-muted-foreground font-sans text-sm mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <!-- Toolbar: search + filters -->
    <div
      v-if="showSearch || $slots.filters"
      class="bg-card border border-border rounded-lg shadow-sm p-3 flex flex-col lg:flex-row gap-3 lg:items-center"
    >
      <div v-if="showSearch" class="relative w-full lg:w-72 shrink-0">
        <SearchIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <slot name="filters" />
      </div>
      <div v-if="$slots['toolbar-right']" class="flex items-center gap-2">
        <slot name="toolbar-right" />
      </div>
    </div>

    <slot name="banner" />

    <!-- Nội dung: bảng mặc định, hoặc slot default tuỳ biến (Kanban/sơ đồ) -->
    <slot>
      <div class="bg-card border border-border rounded-lg shadow-sm overflow-hidden hr-table-wrap">
        <a-table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :row-key="rowKey"
          :pagination="pagination"
          :row-selection="rowSelection"
          :size="size"
          :scroll="scrollX ? { x: scrollX } : undefined"
          @change="(...a: any[]) => emit('change', ...a)"
        >
          <template #bodyCell="slotProps">
            <slot name="bodyCell" v-bind="slotProps" />
          </template>
        </a-table>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.hr-table-wrap :deep(.ant-table) {
  background: transparent;
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
.hr-table-wrap :deep(.ant-table-tbody > tr > td) {
  font-size: 0.85rem;
}
.hr-table-wrap :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(241, 245, 249, 0.45);
}
</style>
