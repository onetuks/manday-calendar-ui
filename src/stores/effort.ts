import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { api, USE_MOCK, type TaskCreateRequest } from '@/api'
import type {
  Assignee,
  Csr,
  DayCapacity,
  CsrResult,
  CsrStatus,
  Holiday,
  Member,
  Settings,
  Task,
} from '@/types'
import { OPS } from '@/types'

export const useEffortStore = defineStore('effort', () => {
  // ── state ────────────────────────────────────────────
  const loaded = ref(false)
  /** 화면 상단에 보여 줄 오류 메시지 */
  const error = ref<string | null>(null)
  const busy = ref(false)
  const members = ref<Member[]>([])
  const settings = ref<Settings | null>(null)
  const holidays = ref<Holiday[]>([])
  /** 담당자별 특정 날짜의 하루 상한 */
  const dayCapacities = ref<DayCapacity[]>([])
  const csrs = ref<Csr[]>([])
  const results = ref<CsrResult[]>([])
  const tasks = ref<Task[]>([])
  /** 보고 있는 달 (YYYY-MM) */
  const month = ref('2026-11')

  /** 서버 호출을 감싸 오류를 화면에 보여 준다 */
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    busy.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return undefined
    } finally {
      busy.value = false
    }
  }

  async function load() {
    await run(async () => {
      const [m, s, h, c, caps] = await Promise.all([
        api.members(),
        api.settings(),
        api.holidays(),
        api.csrs(),
        api.dayCapacities(),
      ])
      members.value = m
      settings.value = s
      holidays.value = h
      csrs.value = c
      dayCapacities.value = caps
      await refreshSchedule()
    })
    loaded.value = true
  }

  /** 배정 결과 다시 받기 (월 경계 없이 전체) */
  async function refreshSchedule() {
    const sch = await api.schedule()
    results.value = sch.results
    tasks.value = sch.tasks
  }

  // ── lookup ───────────────────────────────────────────
  const memberMap = computed(() => new Map(members.value.map((m) => [m.id, m])))
  const csrMap = computed(() => new Map(csrs.value.map((c) => [c.id, c])))
  const resultMap = computed(() => new Map(results.value.map((r) => [r.csrId, r])))
  const holidayMap = computed(() => new Map(holidays.value.map((h) => [h.date, h])))

  const assigneeName = (id: Assignee | null | undefined) =>
    id == null ? '—' : id === OPS ? '운영' : (memberMap.value.get(id)?.name ?? '—')

  // ── month ────────────────────────────────────────────
  const monthStart = computed(() => dayjs(`${month.value}-01`))
  const monthEnd = computed(() => monthStart.value.endOf('month'))
  const shiftMonth = (n: number) => (month.value = monthStart.value.add(n, 'month').format('YYYY-MM'))
  const goToday = () => (month.value = dayjs().format('YYYY-MM'))

  const isHoliday = (date: string) => holidayMap.value.has(date)
  const isWorkday = (d: dayjs.Dayjs) => d.day() !== 0 && d.day() !== 6 && !isHoliday(d.format('YYYY-MM-DD'))

  const workdays = computed(() => {
    let n = 0
    for (let d = monthStart.value; !d.isAfter(monthEnd.value, 'day'); d = d.add(1, 'day')) if (isWorkday(d)) n++
    return n
  })
  /** 기본 인당 월 가용시간 (근무일 × 하루 근무시간) */
  const capacity = computed(() => workdays.value * (settings.value?.hoursPerDay ?? 8))

  // ── 날짜별 하루 상한 ─────────────────────────────────
  const capKey = (memberId: string, date: string) => `${memberId}@${date}`
  const dayCapacityMap = computed(() => new Map(dayCapacities.value.map((c) => [capKey(c.memberId, c.date), c])))
  /** 지정값 (없으면 undefined) */
  const customCapOf = (memberId: string, date: string) => dayCapacityMap.value.get(capKey(memberId, date))
  /** 그날 상한: 지정값 → 평일이면 하루 근무시간 → 주말·공휴일 0 */
  const capOf = (memberId: string, date: string) =>
    customCapOf(memberId, date)?.hours ?? (isWorkday(dayjs(date)) ? (settings.value?.hoursPerDay ?? 8) : 0)
  /** 담당자의 이번 달 가용시간 (날짜별 상한 반영) */
  const capacityOfMember = (memberId: string) => {
    let sum = 0
    for (let d = monthStart.value; !d.isAfter(monthEnd.value, 'day'); d = d.add(1, 'day')) sum += capOf(memberId, d.format('YYYY-MM-DD'))
    return sum
  }

  const monthTasks = computed(() => tasks.value.filter((a) => a.date.startsWith(month.value)))

  /** 날짜(YYYY-MM-DD) → 작업 목록 */
  const tasksByDate = computed(() => {
    const map = new Map<string, Task[]>()
    for (const a of monthTasks.value) {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    }
    return map
  })

  /** 담당자별 월 요약 */
  const summary = computed(() =>
    members.value.map((m) => {
      const mine = monthTasks.value.filter((a) => a.memberId === m.id)
      const bySite = { 엔솔: 0, 화학: 0 }
      for (const a of mine) {
        const site = csrMap.value.get(a.csrId)?.site
        if (site) bySite[site] += a.hours
      }
      const total = bySite.엔솔 + bySite.화학
      // 이번 달에 시작했지만 다음 달 이후로 넘어간 시간
      const carry = tasks.value
        .filter((a) => a.memberId === m.id && a.date > monthEnd.value.format('YYYY-MM-DD'))
        .filter((a) => {
          const start = resultMap.value.get(a.csrId)?.devStart
          return !!start && start.startsWith(month.value)
        })
        .reduce((s, a) => s + a.hours, 0)
      const cap = capacityOfMember(m.id)
      return { member: m, bySite, total, carry, capacity: cap, over: total + carry > cap + 0.01 }
    }),
  )

  const ratio = computed(() => {
    const [a, b] = summary.value
    if (!a || !b || b.total === 0) return null
    return a.total / b.total
  })

  // ── CSR status / validation ─────────────────────────
  function csrErrors(c: Csr): string[] {
    const e: string[] = []
    if (!c.csrNo) e.push('CSR번호')
    if (!c.title) e.push('CSR명')
    if (c.devOwner === '자체' && !c.type) e.push('신규/수정')
    if (!c.startDate) e.push('개발시작일')
    if (c.type === '직접지정' && !c.directMd) e.push('MD')
    if (c.assignedDev && c.assignedTpt && c.assignedDev === c.assignedTpt) e.push('개발자와 3테담당이 같음')
    for (const d of [c.uatDate, c.tptDate]) {
      if (d && !isWorkday(dayjs(d))) e.push('주말·공휴일 지정')
    }
    return e
  }

  function csrStatus(c: Csr): CsrStatus {
    if (csrErrors(c).length) return '입력 오류'
    if (c.confirmed) return '확정'
    const r = resultMap.value.get(c.id)
    if (r?.devStart && r.devEnd && r.devEnd.slice(0, 7) > r.devStart.slice(0, 7)) return '이월'
    return '진행'
  }

  /** CSR별 작업 시간 합계 (MH) */
  const loggedHours = computed(() => {
    const map = new Map<number, number>()
    for (const a of tasks.value) map.set(a.csrId, (map.get(a.csrId) ?? 0) + a.hours)
    return map
  })

  const totalMd = computed(() => results.value.reduce((s, r) => s + (r.md ?? 0), 0))

  // ── actions ──────────────────────────────────────────
  async function setConfirmed(id: number, confirmed: boolean) {
    await run(async () => {
      // 확정은 서버에 저장된 값 기준으로 고정되므로 먼저 목록을 저장한다
      if (confirmed && !USE_MOCK) await persistCsrs()
      const saved = await api.setConfirmed(id, confirmed)
      applyFlags(id, saved ?? { confirmed })
      // 확정은 재계산이 없지만, 해제는 서버가 다시 배정하므로 다시 받는다
      if (!USE_MOCK && !confirmed) await refreshSchedule()
    })
  }

  /** 새 행은 음수 임시 id → 서버가 저장할 때 실제 id를 준다 */
  let tempId = 0
  function addCsr() {
    const id = --tempId
    csrs.value.push({
      id,
      site: '엔솔',
      csrNo: '',
      title: '',
      devOwner: '자체',
      type: '',
      quantity: 1,
      directMd: null,
      startDate: null,
      assignedDev: null,
      assignedUat: null,
      uatDate: null,
      assignedTpt: null,
      tptDate: null,
      confirmed: false,
      manualSchedule: false,
    })
    return id
  }

  function removeCsr(id: number) {
    const c = csrMap.value.get(id)
    if (!c || c.confirmed) return
    csrs.value = csrs.value.filter((x) => x.id !== id)
  }

  async function persistCsrs() {
    csrs.value = await api.saveCsrs(csrs.value)
    await refreshSchedule()
  }

  async function saveCsrs() {
    await run(persistCsrs)
    return !error.value
  }

  async function saveSettings() {
    await run(async () => {
      if (!settings.value) return
      members.value = await api.saveMembers(members.value)
      settings.value = await api.saveSettings(settings.value)
      await refreshSchedule()
    })
    return !error.value
  }

  // ── 작업 수정 ─────────────────────────────────────
  /** 서버가 준 CSR의 읽기 전용 플래그만 반영 (화면에서 편집 중인 다른 입력값은 건드리지 않음) */
  function applyFlags(csrId: number, flags: Partial<Pick<Csr, 'confirmed' | 'manualSchedule'>>) {
    const c = csrMap.value.get(csrId)
    if (!c) return
    if (flags.confirmed !== undefined) c.confirmed = flags.confirmed
    if (flags.manualSchedule !== undefined) c.manualSchedule = flags.manualSchedule
  }

  /** 작업 변경 뒤: 일정과 CSR 플래그(manualSchedule)를 서버 기준으로 다시 맞춘다 (명세 4-1) */
  async function afterTaskChange(csrId: number) {
    if (USE_MOCK) {
      applyFlags(csrId, { manualSchedule: true })
      return
    }
    const [, fresh] = await Promise.all([refreshSchedule(), api.csrs()])
    fresh.forEach((c) => applyFlags(c.id, c))
  }

  async function addTask(req: TaskCreateRequest) {
    await run(async () => {
      const saved = await api.addTask(req)
      if (USE_MOCK) tasks.value = [...tasks.value, saved]
      await afterTaskChange(req.csrId)
    })
    return !error.value
  }

  async function updateTask(log: Task, patch: Partial<Pick<Task, 'type' | 'date' | 'memberId' | 'hours'>>) {
    const req = { type: log.type, date: log.date, memberId: log.memberId, hours: log.hours, ...patch }
    await run(async () => {
      await api.updateTask(log.id, req)
      if (USE_MOCK) Object.assign(log, req, { manual: true })
      await afterTaskChange(log.csrId)
    })
  }

  async function deleteTask(log: Task) {
    await run(async () => {
      await api.deleteTask(log.id)
      if (USE_MOCK) tasks.value = tasks.value.filter((a) => a !== log)
      await afterTaskChange(log.csrId)
    })
  }

  async function resetSchedule(csrId: number) {
    await run(async () => {
      const saved = await api.resetSchedule(csrId)
      applyFlags(csrId, saved ?? { manualSchedule: false })
      if (!USE_MOCK) await refreshSchedule()
    })
  }

  /** 하루 상한 지정·변경. 서버가 다시 배정하므로 일정도 다시 받는다 */
  async function setDayCapacity(cap: DayCapacity) {
    await run(async () => {
      const saved = await api.saveDayCapacity(cap)
      dayCapacities.value = [
        ...dayCapacities.value.filter((c) => capKey(c.memberId, c.date) !== capKey(saved.memberId, saved.date)),
        saved,
      ]
      if (!USE_MOCK) await refreshSchedule()
    })
    return !error.value
  }

  /** 하루 상한 지정 해제 → 기본값 */
  async function clearDayCapacity(date: string, memberId: string) {
    await run(async () => {
      await api.deleteDayCapacity(date, memberId)
      dayCapacities.value = dayCapacities.value.filter((c) => capKey(c.memberId, c.date) !== capKey(memberId, date))
      if (!USE_MOCK) await refreshSchedule()
    })
  }

  async function addHoliday(h: Holiday) {
    if (holidayMap.value.has(h.date)) return
    await run(async () => {
      const saved = await api.addHoliday(h)
      holidays.value = [...holidays.value, saved].sort((a, b) => a.date.localeCompare(b.date))
      await refreshSchedule()
    })
  }

  async function removeHoliday(date: string) {
    await run(async () => {
      await api.deleteHoliday(date)
      holidays.value = holidays.value.filter((h) => h.date !== date)
      await refreshSchedule()
    })
  }

  return {
    loaded, error, busy, members, settings, holidays, csrs, results, tasks, month,
    load, refreshSchedule, memberMap, csrMap, resultMap, holidayMap, assigneeName,
    monthStart, monthEnd, shiftMonth, goToday, isHoliday, workdays, capacity,
    dayCapacities, customCapOf, capOf, setDayCapacity, clearDayCapacity,
    monthTasks, tasksByDate, summary, ratio, totalMd,
    csrErrors, csrStatus, setConfirmed, loggedHours, addTask, updateTask, deleteTask, resetSchedule, addCsr, removeCsr, saveCsrs, saveSettings,
    addHoliday, removeHoliday,
  }
})
