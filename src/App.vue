<script setup lang="ts">
import { onMounted } from 'vue'
import { CircleAlert, X } from 'lucide-vue-next'
import AppHeader from '@/components/AppHeader.vue'
import { USE_MOCK } from '@/api'
import { useEffortStore } from '@/stores/effort'

const store = useEffortStore()
onMounted(() => store.load())
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />
    <main class="mx-auto flex max-w-[1360px] flex-col gap-5 px-4 pt-6 pb-12 sm:px-8">
      <div
        v-if="store.error"
        role="alert"
        class="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-50 px-4 py-3 text-[13px] text-danger"
      >
        <CircleAlert :size="18" class="mt-px shrink-0" aria-hidden="true" />
        <span class="flex-1">{{ store.error }}</span>
        <button type="button" class="shrink-0 rounded p-0.5 hover:bg-white/60" aria-label="오류 닫기" @click="store.error = null">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
      <p v-if="USE_MOCK" class="m-0 text-xs text-warn-700">목업 모드: 서버 없이 엑셀 11월 데이터로 동작합니다. 저장해도 배정은 다시 계산되지 않습니다.</p>
      <div v-if="!store.loaded" class="py-24 text-center text-muted">불러오는 중…</div>
      <RouterView v-else />
    </main>
  </div>
</template>
