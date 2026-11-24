<script setup lang="ts">
import { computed } from 'vue'
import { Lock } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import { fmtH } from '@/utils/format'

const store = useEffortStore()
const hpd = computed(() => store.settings?.hoursPerDay ?? 8)

const cards = computed(() =>
  store.summary.map((s) => {
    const pct = s.capacity ? Math.min(100, (s.total / s.capacity) * 100) : 0
    return { ...s, pct, md: s.total / hpd.value, remain: Math.max(0, s.capacity - s.total - s.carry) }
  }),
)

const grandTotal = computed(() => store.summary.reduce((sum, s) => sum + s.total, 0))
const ratioShare = computed(() => {
  const [a] = store.summary
  return grandTotal.value ? ((a?.total ?? 0) / grandTotal.value) * 100 : 0
})
const targetRatio = computed(() => store.members.map((m) => m.ratio).join(' : '))

const monthCsrs = computed(() =>
  store.csrs.filter((c) => !c.startDate || c.startDate.startsWith(store.month)),
)
const counts = computed(() => {
  const res = { 확정: 0, 진행: 0, 이월: 0, '입력 오류': 0, 엔솔: 0, 화학: 0 }
  for (const c of monthCsrs.value) {
    res[store.csrStatus(c)]++
    res[c.site]++
  }
  return res
})
</script>

<template>
  <section aria-label="월 요약" class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
    <div v-for="c in cards" :key="c.member.id" class="card flex flex-col gap-2.5 px-5 py-[18px]">
      <div class="flex items-center gap-2">
        <span class="size-2.5 rounded-[3px]" :style="{ background: c.member.color }" />
        <span class="font-semibold">{{ c.member.name }}</span>
        <span v-if="c.over" class="pill ml-auto bg-danger-50 text-danger">가용시간 초과</span>
        <span v-else class="pill ml-auto bg-ok-50 text-ok-700">정상</span>
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="font-mono text-[28px] font-bold">{{ fmtH(c.total) }}</span>
        <span class="text-muted">/ {{ fmtH(c.capacity) }}h · {{ c.md.toFixed(2) }} MD</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-line-soft">
        <div class="h-full" :style="{ width: `${c.pct}%`, background: c.over ? 'var(--color-danger)' : c.member.color }" />
      </div>
      <p class="text-xs text-muted">
        엔솔 {{ fmtH(c.bySite.엔솔) }}h · 화학 {{ fmtH(c.bySite.화학) }}h ·
        <template v-if="c.carry > 0">{{ fmtH(c.carry) }}h는 다음 달로 이월</template>
        <template v-else>잔여 {{ fmtH(c.remain) }}h</template>
      </p>
    </div>

    <div class="card flex flex-col gap-2.5 px-5 py-[18px]">
      <div class="font-semibold">배분 비율</div>
      <div class="flex items-baseline gap-1.5">
        <span class="font-mono text-[28px] font-bold">{{ store.ratio == null ? '—' : `${store.ratio.toFixed(2)} : 1` }}</span>
        <span class="text-muted">목표 {{ targetRatio }}</span>
      </div>
      <div class="flex h-2 overflow-hidden rounded-full bg-line-soft">
        <div
          v-for="(s, i) in store.summary"
          :key="s.member.id"
          class="h-full"
          :style="{ width: `${i === 0 ? ratioShare : 100 - ratioShare}%`, background: s.member.color }"
        />
      </div>
      <p class="text-xs text-muted">
        합계 {{ fmtH(grandTotal) }}h · {{ (grandTotal / (store.settings?.hoursPerDay ?? 8)).toFixed(2) }} MD (검토자 공수 제외)
      </p>
    </div>

    <div class="card flex flex-col gap-2.5 px-5 py-[18px]">
      <div class="font-semibold">CSR 현황</div>
      <div class="flex items-baseline gap-1.5">
        <span class="font-mono text-[28px] font-bold">{{ monthCsrs.length }}건</span>
        <span class="text-muted">엔솔 {{ counts.엔솔 }} · 화학 {{ counts.화학 }}</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span class="pill bg-line-soft text-ink-2"><Lock :size="12" aria-hidden="true" />확정 {{ counts.확정 }}</span>
        <span class="pill bg-line-soft text-ink-2">진행 {{ counts.진행 }}</span>
        <span v-if="counts.이월" class="pill bg-warn-50 text-warn-700">이월 {{ counts.이월 }}</span>
        <span v-if="counts['입력 오류']" class="pill bg-danger-50 text-danger">입력 오류 {{ counts['입력 오류'] }}</span>
      </div>
    </div>
  </section>
</template>
