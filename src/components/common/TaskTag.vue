<script setup lang="ts">
import type { TaskType } from '@/types'
import { TASK_CLASS, TASK_LABEL } from '@/utils/format'

withDefaults(defineProps<{ task: TaskType; size?: 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <span
    class="inline-block shrink-0 rounded font-semibold"
    :class="[TASK_CLASS[task], size === 'sm' ? 'px-[5px] text-[11px] leading-[18px]' : 'px-[7px] py-0.5 text-xs']"
  >
    {{ TASK_LABEL[task] }}
  </span>
</template>
