# Frontend

## 실행 방법

```bash
npm install
npm run start
```

## 실행 참고

현재 프로젝트는 Expo SDK 57 기준입니다. App Store의 Expo Go가 프로젝트 SDK를 지원하지 않는 경우 QR 실행이 실패할 수 있으며, 이 경우 iOS 시뮬레이터 또는 지원되는 Expo Go 버전으로 확인합니다.

## 환경 변수

`.env.example`을 참고해서 루트 경로에 `.env` 파일을 생성합니다.

```env
EXPO_PUBLIC_API_BASE_URL=
```

## 폴더 구조

```txt
src/
├─ root/       # 앱 루트 컴포넌트
├─ screens/    # 화면 단위 컴포넌트
└─ shared/     # 공통 컴포넌트, 상수, 타입, API 설정
```

## 현재 세팅 범위

아직 해커톤 주제가 확정되지 않았기 때문에 최소 세팅만 진행했습니다.

포함된 항목:

- Expo
- React Native
- TypeScript
- 최소 폴더 구조
- 공통 색상 상수
- API config
- 환경변수 예시