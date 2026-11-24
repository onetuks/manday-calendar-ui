// 서버 REST API 명세서(API_SPEC.md) '2. TypeScript 기준 타입 정의'를 그대로 옮긴 요청/응답 타입.
// 화면용 타입(@/types)과는 src/api/mappers.ts 에서 변환한다.

export type SiteLabel = '엔솔' | '화학'
export type DevOwnerLabel = '자체' | '운영'
/** '신규(공통)'은 예전 서버가 보내던 값. 받을 때 '공통'으로 바꾼다 */
export type CsrTypeLabel = '신규' | '신규(공통)' | '공통' | '수정' | '엔드포인트' | '직접지정' | ''

export type TaskType = 'DEV' | 'UAT' | 'TPT'

/** 날짜 문자열 (YYYY-MM-DD) */
export type IsoDate = string

export interface CsrDto {
  /** null 또는 <= 0 이면 신규 행으로 처리 */
  id: number | null
  site: SiteLabel
  /** 최대 50자 */
  csrNo: string
  /** 최대 500자 */
  title: string
  devOwner: DevOwnerLabel
  type: CsrTypeLabel
  /** 1 이상 (요청 시 null이면 1로 처리) */
  quantity: number | null
  /** type === '직접지정' 일 때 1건 MD (0 이상) */
  directMd: number | null
  startDate: IsoDate | null
  /** 멤버 ID 문자열 또는 null(자동) */
  assignedDev: string | null
  /** 멤버 ID 문자열, 'ops', 또는 null(자동) */
  assignedUat: string | null
  uatDate: IsoDate | null
  /** 멤버 ID 문자열 또는 null(자동) */
  assignedTpt: string | null
  tptDate: IsoDate | null
  /** 읽기 전용: 일정확정 여부 */
  confirmed: boolean
  /** 읽기 전용: 수동 조정 여부 */
  manualSchedule: boolean
}

export interface TaskDto {
  id: number
  csrId: number
  type: TaskType
  date: IsoDate
  hours: number
  memberId: string
  manual: boolean
}

export interface TaskCreateRequest {
  csrId: number
  type: TaskType
  date: IsoDate
  memberId: string
  /** 0 < hours <= 24 */
  hours: number
}

export interface TaskUpdateRequest {
  /** null 또는 생략 시 기존 type 유지 */
  type?: TaskType | null
  date: IsoDate
  memberId: string
  /** 0 < hours <= 24 */
  hours: number
}

export interface CsrResult {
  csrId: number
  devStart: IsoDate | null
  devEnd: IsoDate | null
  /** 멤버 ID 문자열, 'ops', 또는 null */
  developer: string | null
  uatDate: IsoDate | null
  /** 멤버 ID 문자열, 'ops', 또는 null */
  uatBy: string | null
  tptDate: IsoDate | null
  /** 멤버 ID 문자열 또는 null */
  tptBy: string | null
  /** 계획 MD (소수 4자리 반올림) */
  md: number | null
}

export interface ScheduleDto {
  tasks: TaskDto[]
  results: CsrResult[]
}

export interface SettingsDto {
  year: number
  /** > 0 */
  hoursPerDay: number
  /** >= 0 */
  uatHours: number
  /** >= 0 */
  tptHours: number
  /** >= 0 */
  reviewHours: number
  md: {
    /** 주의: JSON 키 이름이 'new' 임 (>= 0) */
    new: number
    common: number
    modify: number
    endpoint: number
  }
}

export interface MemberDto {
  id: string
  name: string
  /** >= 0 */
  ratio: number
  /** #RRGGBB */
  color: string
  /** #RRGGBB (수정 요청 시 null이면 기존값 유지) */
  tint: string | null
}

export interface HolidayDto {
  date: IsoDate
  /** 최대 100자 */
  name: string
  /** 최대 200자 (응답 시 null은 ""로 반환) */
  note: string
}

/**
 * 담당자별 특정 날짜의 하루 상한 (서버 명세에 추가된 API).
 *   GET /api/day-capacities?from=&to=   PUT /api/day-capacities   DELETE /api/day-capacities/{date}/{memberId} (204)
 */
export interface DayCapacityDto {
  date: IsoDate
  memberId: string
  /** 0 이상 24 이하. 0 이면 그날 배정 없음 (연차) */
  hours: number
  /** 최대 100자 (응답 시 null은 "") */
  note: string
}

export interface ProblemDetail {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
}
