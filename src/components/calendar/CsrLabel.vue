<script setup lang="ts">
import { PencilLine } from 'lucide-vue-next'
import type { Csr } from '@/types'

defineProps<{ csr?: Csr }>()
</script>

<template>
  <span class="flex min-w-0 flex-col leading-[18px]">
    <span class="flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
      {{ csr?.csrNo }}
      <span class="font-sans text-muted">{{ csr?.site }}</span>
      <span v-if="csr?.manualSchedule && !csr?.confirmed" class="pill bg-field px-1.5 py-0 font-sans text-[11px] text-field-ink">
        <PencilLine :size="10" aria-hidden="true" />수동
      </span>
    </span>
    <span class="truncate" :title="csr?.title">{{ csr?.title || '(CSR명 없음)' }}</span>
  </span>
</template>
