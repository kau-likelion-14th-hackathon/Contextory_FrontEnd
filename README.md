# Contextory Frontend

Contextory는 GitHub에서 발생한 작업과 변경을 AI 분석 초안으로 정리하고, 사람이 검토·승인한 내용을 프로젝트 메모리로 축적하는 웹 기반 협업 서비스입니다.

## 실행 명령

```bash
npm install
npm run dev
```

## 검증 명령

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`lint`는 ESLint flat config를 사용하고, `test`는 Vitest로 독립적인 공통 로직을 검증합니다.

## 환경 변수

루트 경로에 `.env` 파일을 만들고 `.env.example`을 기준으로 값을 채웁니다.

```env
VITE_CONTEXTORY_API_BASE_URL=
VITE_CONTEXTORY_APP_ENV=local
```

- `VITE_CONTEXTORY_API_BASE_URL`: 최신 백엔드 API 명세 기준의 공개 API base URL입니다.
- `VITE_CONTEXTORY_APP_ENV`: `local`, `development`, `staging`, `production` 등 실행 환경 구분 값입니다.

프론트엔드에 GitHub 민감 토큰이나 서버 비밀키를 저장하지 않습니다.

## 현재 구조

```txt
src/
├─ features/
│  ├─ account/           # 개인 계정 설정 영역
│  ├─ projects/          # 프로젝트 선택과 프로젝트 요약
│  └─ workspace/         # 프로젝트 내부 셸과 주요 화면
├─ root/                 # React Router 설정
└─ shared/
   ├─ api/               # 공통 API 클라이언트와 오류 처리
   ├─ components/        # 로딩, 빈 상태, 오류 상태 등 공통 UI
   ├─ constants/         # 색상 등 공통 상수
   ├─ navigation/        # 임시 route 타입과 내비게이션 정의
   ├─ styles/
   └─ types/
```

## 현재 기반

- React + Vite + TypeScript
- React Router 기반 URL 라우팅
- 비로그인 영역과 로그인 이후 영역의 임시 경계 구성
- 프로젝트 선택 전과 프로젝트 진입 후 레이아웃 분리
- 메인 내비게이션 정의: 홈, GitHub 작업, 프로젝트 메모리, 팀 및 설정
- 내 계정 설정을 상단 사용자 메뉴 진입 영역으로 분리
- 공통 API 클라이언트와 오류 타입 기반 생성
- 로딩, 빈 상태, 오류 상태 공통 컴포넌트 생성

## 라우팅 상태

현재 라우팅은 React Router 기반입니다. 브라우저 새로고침 복원, 초대 링크, 비밀번호 재설정 링크, 프로젝트 ID 기반 직접 진입 구조는 `docs/contextory-routing-plan.md`에 정리했습니다.

## 아직 확정하지 않은 부분

백엔드 API와 ERD 최신 명세를 source of truth로 사용합니다. 명세가 제공되기 전까지 아래 항목은 placeholder 상태입니다.

- 이메일 인증, 세션 유지, 토큰 갱신
- GitHub 저장소 연결과 권한 오류 처리
- PR 수집, 분석 요청, 승인 워크플로
- 프로젝트 멤버 권한 정책
- 결제, 플랜, 크레딧 소비 정책
