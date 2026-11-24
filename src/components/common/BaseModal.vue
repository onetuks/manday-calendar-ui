<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { X } from 'lucide-vue-next'

withDefaults(defineProps<{ open: boolean; title: string; subtitle?: string; width?: string }>(), {
  width: 'max-w-[820px]',
})
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <!-- Esc, 바깥 클릭, 포커스 가두기는 Headless UI Dialog가 처리 -->
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="duration-150 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-100 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-ink/45" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-start justify-center px-4 pt-[12vh] pb-10">
          <TransitionChild
            as="template"
            enter="duration-150 ease-out"
            enter-from="opacity-0 translate-y-2"
            enter-to="opacity-100 translate-y-0"
            leave="duration-100 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <DialogPanel class="w-full overflow-hidden rounded-[14px] bg-white shadow-[0_20px_48px_rgba(23,25,28,0.25)]" :class="width">
              <div class="flex items-center gap-3 border-b border-line px-[22px] py-[18px]">
                <div class="flex flex-col gap-0.5">
                  <DialogTitle class="text-lg font-bold">{{ title }}</DialogTitle>
                  <p v-if="subtitle" class="text-[13px] text-muted">{{ subtitle }}</p>
                </div>
                <!-- 닫기 버튼 왼쪽에 붙는 추가 버튼 (예: 이전날/다음날) -->
                <div v-if="$slots.actions" class="ml-auto flex items-center gap-1.5">
                  <slot name="actions" />
                </div>
                <button
                  type="button"
                  class="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-line hover:bg-subtle"
                  :class="$slots.actions ? '' : 'ml-auto'"
                  aria-label="닫기"
                  @click="emit('close')"
                >
                  <X :size="18" aria-hidden="true" />
                </button>
              </div>
              <slot />
              <div v-if="$slots.footer" class="flex items-center gap-3 border-t border-line bg-subtle px-[22px] py-3.5">
                <slot name="footer" />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
