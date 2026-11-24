# 공수기록캘린더 UI

LG엔솔/LG화학 SAP PI 개발 공수를 관리하는 웹 화면입니다. 디자인 목업(월 캘린더, 일자 상세 모달, CSR 목록, 설정·공휴일)을 Vue 3로 구현했습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3009  (서버 ../002.server 필요, /api → 8089)
npm run dev:mock   # 서버 없이 목업 데이터로 실행
npm run build      # 타입 체크(vue-tsc) + 빌드 → dist/
```

Node.js 20.19 이상 또는 22.12 이상이 필요합니다.

## 스택

| 용도 | 라이브러리 |
|---|---|
| 프레임워크 | Vue 3 (`<script setup>` + TypeScript), Vite 7 |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`), 디자인 토큰은 `src/assets/main.css`의 `@theme` |
| 라우팅 / 상태 | vue-router 4, Pinia 3 |
| 모달 | @headlessui/vue (Esc 닫기, 포커스 가두기, 바깥 클릭 처리) |
| 날짜 | dayjs |
| 아이콘 | lucide-vue-next |
| 폰트 | IBM Plex Sans KR / Mono (@fontsource: 사내망에서도 외부 CDN 없이 동작) |

캘린더는 FullCalendar 대신 직접 만든 그리드를 씁니다. 칸마다 담당자별 합계, 작업 태그, 8h 초과 표시처럼 일반적인 이벤트 바가 아닌 형태라 직접 그리는 편이 더 단순합니다.

## 구조

```
src/
├─ api/
│  ├─ index.ts            서버 API 호출 (--mode mock 이면 목업 데이터 반환)
│  ├─ types.ts            요청/응답 타입 — 서버 API 명세서(API_SPEC.md) 2장과 동일
│  └─ mappers.ts          서버 DTO ↔ 화면 모델 변환 (요청은 명세 필드만 골라 보냄)
├─ mock/data.ts            엑셀 '11월' 시트의 실제 값으로 만든 목업
├─ types/index.ts          도메인 타입 (서버 DTO와 맞출 예정)
├─ stores/effort.ts        Pinia 스토어: 월 이동, 요약 계산, 입력 검증, 일정확정
├─ utils/format.ts         시간·날짜 포맷, 작업 라벨
├─ components/
│  ├─ AppHeader.vue
│  ├─ common/              BaseModal, TaskTag
│  └─ calendar/            MonthSummary, CalendarFilters, CalendarGrid, CalendarCell, DayDetailModal
└─ views/                  CalendarView, CsrListView, SettingsView
```

## 서버 연동

API 스펙은 서버 명세서(API_SPEC.md)를 기준으로 맞췄습니다.

- **에러 메시지:** `detail → message → title → 기본 문구` 순서로 뽑아 화면 위쪽에 보여 줍니다(명세 1.3).
- **변경 후 재조회:** 변경 API가 성공하면 `GET /api/calendar/schedule`을 다시 부릅니다. 작업을 추가·수정·삭제한 뒤에는 `GET /api/csrs`로 `confirmed`·`manualSchedule` 플래그만 다시 맞춥니다. 편집 중인 다른 입력값은 건드리지 않아요(명세 4-1).
- **작업 요청:** 추가는 `TaskCreateRequest`, 수정은 `TaskUpdateRequest`로 csrId 없이 보냅니다.
- **CSR 저장:** 음수 임시 id는 `null`로 바꾸고, 명세에 있는 필드만 보냅니다. 응답에 딸려 오는 `new` 같은 필드는 무시해요(명세 4-3).
- **예전 값 호환:** 예전 서버의 `'신규(공통)'`은 받을 때 `'공통'`으로 바꿉니다.


1. `../002.server/lg_manday_calendar`에서 `./gradlew bootRun`으로 서버를 8089 포트에 띄웁니다.
2. `npm run dev`로 화면을 띄우면 `vite.config.ts`의 proxy가 `/api`를 8089로 넘깁니다. 엔드포인트 목록은 `src/api/index.ts` 상단 주석에 있습니다.
3. 저장, 확정, 설정 변경, 공휴일 변경이 일어날 때마다 서버에서 배정을 다시 받아옵니다. 서버 오류 메시지는 화면 위쪽에 표시됩니다.
4. jar 하나로 배포하려면 `npm run build` 후 서버에서 `./gradlew bootJar -PwithUi`를 실행합니다.

## 참고

- 일자별 배정(Allocation)과 CSR 계산 결과(CsrResult)는 서버 스케줄러가 계산한다는 전제입니다. 프론트는 표시와 입력만 맡습니다.
- 목업 데이터에 남아 있는 하루 12h 배정은 엑셀의 '초과허용' 계산 결과입니다. 서버에서는 8h 기준으로 배정됩니다.
- 새 CSR 행은 음수 임시 id를 쓰고, 저장하면 서버가 실제 id를 줍니다. 일정확정을 누르면 먼저 목록을 저장한 뒤 확정합니다.
- 일정확정(`confirmed`)된 CSR은 입력칸이 잠깁니다. 해제할 때는 확인 모달을 한 번 거칩니다.
- 일자 상세 모달에서 작업마다 유형·담당자·날짜·시간을 바로 고칠 수 있습니다(시간에 0을 넣으면 삭제). 날짜를 바꾸면 그 날짜로 옮겨지고, 작업 추가도 여기서 합니다. 고친 CSR은 '수동'으로 표시되고, CSR 목록에서 자동 배정으로 되돌릴 수 있습니다.
- 일자 상세 모달의 '하루 상한' 칸에 담당자별로 그날 상한 MH를 직접 키인합니다(0~24, 0.1 단위). 칸을 비우면 기본 상한(평일 하루 근무시간, 주말·공휴일 0)으로 돌아가요. 지정한 날은 캘린더 칸에 '박 4.0h'처럼 표시되고, 월 요약의 가용시간에도 반영됩니다.
- 작업(Task)은 CSR 1 : N입니다. 서버에서는 물량 건마다, 날짜마다 한 줄씩 옵니다. 목업 데이터는 엑셀 계산 결과를 날짜별로 합친 값이에요.
