// 화면에서 쓰는 도메인 타입. 서버 요청/응답 타입은 src/api/types.ts (API_SPEC.md 기준)에 있고 src/api/mappers.ts 에서 변환한다.

export type MemberId = string

export interface Member {
  id: MemberId
  name: string
  /** 배분 비율 (기본 2:1) */
  ratio: number
  /** 캘린더 색상 */
  color: string
  tint: string
}

export type Site = '엔솔' | '화학'
export type DevOwner = '자체' | '운영'
/** CSR 유형 (1건당 MD: 신규 3 · 공통 1.1 · 수정 1.1 · 엔드포인트 0.5 · 직접지정은 직접 입력) */
export type CsrType = '신규' | '공통' | '수정' | '엔드포인트' | '직접지정'
export type TaskType = 'DEV' | 'UAT' | 'TPT'

/** 담당 지정값: 멤버 id 또는 '운영'(사테만) */
export const OPS = 'ops' as const
export type Assignee = MemberId | typeof OPS

export interface Csr {
  id: number
  site: Site
  csrNo: string
  title: string
  devOwner: DevOwner
  type: CsrType | ''
  /** 같은 CSR이 여러 건일 때의 수량 (엑셀의 중복 행 대체) */
  quantity: number
  /** 직접지정일 때 MD */
  directMd: number | null
  /** YYYY-MM-DD */
  startDate: string | null
  assignedDev: MemberId | null
  assignedUat: Assignee | null
  uatDate: string | null
  assignedTpt: MemberId | null
  tptDate: string | null
  /** 일정확정: 결재 완료되어 수정 불가, 일정 고정 */
  confirmed: boolean
  /** 작업을 직접 고친 CSR (자동 재배정에서 빠짐). 서버가 정하는 읽기 전용 값 */
  manualSchedule: boolean
}

/**
 * 작업 (CSR 1 : N 작업). 개발/사테/3테를 며칠에, 누가, 몇 MH 했는지 한 줄.
 * 물량 여러 건은 건마다, 하루 8h를 넘는 개발은 날짜마다 따로 온다 (예: 8.5h → 7.9h + 0.6h).
 */
export interface Task {
  id: number
  csrId: number
  type: TaskType
  date: string
  hours: number
  memberId: MemberId
  /** 사람이 직접 추가하거나 고친 작업 */
  manual: boolean
}

/** CSR 목록 오른쪽 '자동 계산 결과' */
export interface CsrResult {
  csrId: number
  devStart: string | null
  devEnd: string | null
  developer: Assignee | null
  uatDate: string | null
  uatBy: Assignee | null
  tptDate: string | null
  tptBy: MemberId | null
  md: number | null
}

export interface Settings {
  year: number
  hoursPerDay: number
  uatHours: number
  tptHours: number
  reviewHours: number
  md: {
    new: number
    common: number
    modify: number
    endpoint: number
  }
}

export interface Holiday {
  date: string
  name: string
  note: string
}

/** 담당자별 특정 날짜의 하루 상한 (반차 4h · 연차 0h · 야근 12h · 주말 출근 8h …) */
export interface DayCapacity {
  date: string
  memberId: MemberId
  hours: number
  note: string
}

export type CsrStatus = '확정' | '진행' | '이월' | '입력 오류'

