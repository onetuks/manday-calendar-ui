// 서버 API 계층. 요청/응답 스펙은 서버 REST API 명세서(API_SPEC.md)를 따른다.
// 기본은 Spring Boot 서버(/api → vite proxy → localhost:8089)를 호출하고,
// `npm run dev:mock` 으로 띄우면 서버 없이 목업 데이터로 동작한다.
//
//   GET  /api/calendar/schedule?from=&to=  → ScheduleDto { tasks, results }
//   GET  /api/csrs                          PUT  /api/csrs (목록 전체 저장)
//   POST /api/csrs/{id}/confirm             DELETE /api/csrs/{id}/confirm
//   POST /api/csrs/{id}/reset-schedule
//   POST /api/tasks (201)                   PUT  /api/tasks/{id}      DELETE /api/tasks/{id} (204)
//   GET  /api/settings                      PUT  /api/settings
//   GET  /api/members                       PUT  /api/members
//   GET  /api/holidays                      POST /api/holidays (201)  DELETE /api/holidays/{date} (204)
//   GET  /api/day-capacities?from=&to=      PUT  /api/day-capacities  DELETE /api/day-capacities/{date}/{memberId} (204)
//
// 변경 API는 응답에 바뀐 리소스만 주므로, 성공 후 스토어가 schedule(필요하면 csrs)을 다시 조회한다.
import * as mock from '@/mock/data'
import type { Csr, CsrResult, DayCapacity, Holiday, Member, Settings, Task } from '@/types'
import {
  fromCsrDto,
  fromHolidayDto,
  fromMemberDto,
  fromSettingsDto,
  fromTaskDto,
  toCsrDto,
  toHolidayDto,
  toMemberDto,
  toSettingsDto,
} from './mappers'
import type {
  CsrDto,
  DayCapacityDto,
  HolidayDto,
  MemberDto,
  ProblemDetail,
  ScheduleDto,
  SettingsDto,
  TaskCreateRequest,
  TaskDto,
  TaskUpdateRequest,
} from './types'

export type { TaskCreateRequest, TaskUpdateRequest } from './types'

export const USE_MOCK = import.meta.env.MODE === 'mock' || import.meta.env.VITE_USE_MOCK === 'true'

// Vue 반응형 프록시도 복사할 수 있도록 JSON 왕복 (structuredClone은 프록시를 못 다룸)
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const delay = <T>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(clone(v)), ms))

const FALLBACK_MESSAGE = '요청 처리 중 오류가 발생했습니다.'

/** 서버 오류. message 는 화면에 그대로 보여 줄 문구 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problem?: ProblemDetail,
  ) {
    super(message)
  }
}

/**
 * 명세 1.3: ProblemDetail.detail → (Bean Validation 기본 에러의) message → title → 기본 문구 순으로 메시지를 뽑는다.
 */
async function toApiError(res: Response): Promise<ApiError> {
  let body: (Partial<ProblemDetail> & { message?: string; error?: string }) | undefined
  try {
    body = await res.json()
  } catch {
    /* 본문 없음 */
  }
  const message = body?.detail ?? body?.message ?? body?.title ?? body?.error ?? FALLBACK_MESSAGE
  return new ApiError(message, res.status, body as ProblemDetail | undefined)
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 서버(8089)가 실행 중인지 확인하세요.', 0)
  }
  if (!res.ok) throw await toApiError(res)
  // 201 은 본문 있음, 204 는 본문 없음
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const send = (method: 'POST' | 'PUT' | 'DELETE', body?: unknown): RequestInit =>
  body === undefined ? { method } : { method, body: JSON.stringify(body) }

const query = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && q.set(k, v))
  return q.size ? `?${q}` : ''
}

export interface ScheduleData {
  tasks: Task[]
  results: CsrResult[]
}

export const api = {
  // ── 캘린더 ──────────────────────────────────────────
  /** 기간 안의 작업과 전체 CSR 결과. from/to 생략 시 전체 */
  async schedule(from?: string, to?: string): Promise<ScheduleData> {
    if (USE_MOCK) return delay({ tasks: mock.tasks, results: mock.results })
    const dto = await http<ScheduleDto>(`/calendar/schedule${query({ from, to })}`)
    return { tasks: dto.tasks.map(fromTaskDto), results: dto.results }
  },

  // ── CSR ────────────────────────────────────────────
  async csrs(): Promise<Csr[]> {
    if (USE_MOCK) return delay(mock.csrs)
    return (await http<CsrDto[]>('/csrs')).map(fromCsrDto)
  },
  /** 목록 전체 저장 (추가·수정·삭제). 확정된 CSR은 서버가 그대로 둔다 */
  async saveCsrs(list: Csr[]): Promise<Csr[]> {
    if (USE_MOCK) return delay(list)
    return (await http<CsrDto[]>('/csrs', send('PUT', list.map(toCsrDto)))).map(fromCsrDto)
  },
  /** 일정확정(POST) / 해제(DELETE). 바뀐 CSR을 돌려준다 */
  async setConfirmed(id: number, confirmed: boolean): Promise<Csr | null> {
    if (USE_MOCK) return delay(null)
    return fromCsrDto(await http<CsrDto>(`/csrs/${id}/confirm`, send(confirmed ? 'POST' : 'DELETE')))
  },
  /** 수동 조정한 작업을 버리고 자동 배정으로 */
  async resetSchedule(id: number): Promise<Csr | null> {
    if (USE_MOCK) return delay(null)
    return fromCsrDto(await http<CsrDto>(`/csrs/${id}/reset-schedule`, send('POST')))
  },

  // ── 작업 ────────────────────────────────────────────
  async addTask(req: TaskCreateRequest): Promise<Task> {
    if (USE_MOCK) return delay({ id: Date.now(), manual: true, ...req })
    return fromTaskDto(await http<TaskDto>('/tasks', send('POST', req)))
  },
  async updateTask(id: number, req: TaskUpdateRequest): Promise<Task | null> {
    if (USE_MOCK) return delay(null)
    // 명세상 수정 요청에는 csrId 를 보내지 않는다
    const body: TaskUpdateRequest = { type: req.type ?? null, date: req.date, memberId: req.memberId, hours: req.hours }
    return fromTaskDto(await http<TaskDto>(`/tasks/${id}`, send('PUT', body)))
  },
  async deleteTask(id: number): Promise<void> {
    if (USE_MOCK) return delay(undefined)
    await http<void>(`/tasks/${id}`, send('DELETE'))
  },

  // ── 설정 · 개발자 ───────────────────────────────────
  async settings(): Promise<Settings> {
    if (USE_MOCK) return delay(mock.settings)
    return fromSettingsDto(await http<SettingsDto>('/settings'))
  },
  async saveSettings(s: Settings): Promise<Settings> {
    if (USE_MOCK) return delay(s)
    return fromSettingsDto(await http<SettingsDto>('/settings', send('PUT', toSettingsDto(s))))
  },
  async members(): Promise<Member[]> {
    if (USE_MOCK) return delay(mock.members)
    return (await http<MemberDto[]>('/members')).map(fromMemberDto)
  },
  async saveMembers(list: Member[]): Promise<Member[]> {
    if (USE_MOCK) return delay(list)
    return (await http<MemberDto[]>('/members', send('PUT', list.map(toMemberDto)))).map(fromMemberDto)
  },

  // ── 날짜별 하루 상한 ────────────────────────────────
  async dayCapacities(from?: string, to?: string): Promise<DayCapacity[]> {
    if (USE_MOCK) return delay(mock.dayCapacities)
    return (await http<DayCapacityDto[]>(`/day-capacities${query({ from, to })}`)).map((d) => ({ ...d, note: d.note ?? '' }))
  },
  /** 지정 또는 변경 (날짜 + 담당자 기준으로 하나) */
  async saveDayCapacity(c: DayCapacity): Promise<DayCapacity> {
    const body: DayCapacityDto = { date: c.date, memberId: c.memberId, hours: c.hours, note: c.note?.trim() ?? '' }
    if (USE_MOCK) return delay(body)
    const d = await http<DayCapacityDto>('/day-capacities', send('PUT', body))
    return { ...d, note: d.note ?? '' }
  },
  /** 지정 해제 → 기본 상한 */
  async deleteDayCapacity(date: string, memberId: string): Promise<void> {
    if (USE_MOCK) return delay(undefined)
    await http<void>(`/day-capacities/${date}/${encodeURIComponent(memberId)}`, send('DELETE'))
  },

  // ── 공휴일 ──────────────────────────────────────────
  async holidays(): Promise<Holiday[]> {
    if (USE_MOCK) return delay(mock.holidays)
    return (await http<HolidayDto[]>('/holidays')).map(fromHolidayDto)
  },
  async addHoliday(h: Holiday): Promise<Holiday> {
    if (USE_MOCK) return delay(h)
    return fromHolidayDto(await http<HolidayDto>('/holidays', send('POST', toHolidayDto(h))))
  },
  async deleteHoliday(date: string): Promise<void> {
    if (USE_MOCK) return delay(undefined)
    await http<void>(`/holidays/${date}`, send('DELETE'))
  },
}
