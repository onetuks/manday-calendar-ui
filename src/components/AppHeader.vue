<script setup lang="ts">
const links = [
  { to: '/calendar', label: '캘린더' },
  { to: '/csrs', label: 'CSR 목록' },
  { to: '/settings', label: '설정 · 공휴일' },
]
</script>

<template>
  <header class="border-b border-line bg-white">
    <div class="mx-auto flex min-h-16 max-w-[1360px] flex-wrap items-center gap-6 px-4 sm:px-8">
      <RouterLink to="/calendar" class="flex items-center gap-2.5">
        <span class="flex size-7 items-center justify-center rounded-[7px] bg-ink text-[13px] font-bold text-white">공</span>
        <span class="text-base font-bold">공수기록캘린더</span>
        <span class="hidden rounded-full border border-line px-2 py-0.5 text-xs text-muted md:inline">LG엔솔 · LG화학 SAP PI</span>
      </RouterLink>

      <nav aria-label="주 메뉴" class="flex flex-wrap gap-1">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-lg px-3.5 py-2.5 font-medium text-ink-2 hover:bg-subtle"
          active-class="!bg-ink !text-white font-semibold"
        >
          {{ l.label }}
        </RouterLink>
      </nav>

      <!-- <div class="ml-auto flex items-center gap-2 text-[13px] text-muted">
        <span class="flex size-[30px] items-center justify-center rounded-full bg-info-50 font-semibold text-info-700">박</span>
        <span>박세영</span>
      </div> -->
    </div>
  </header>
</template>
