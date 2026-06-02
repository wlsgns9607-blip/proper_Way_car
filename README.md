# 세차의 정석 (The Art of Car Wash) 🧼✨

**세차의 정석**은 프리미엄 차량 관리에 대한 UX 혁신을 목표로 개발된 **지능형 하이엔드 컨시어지 솔루션**입니다. 단순한 세차 정보 제공을 넘어, AI 비전 분석, 전문가 실시간 매칭, 데이터 기반의 정량적 리포트 시스템을 한데 모은 통합 플랫폼입니다.

---

## 🎨 Design Identity & UX Strategy

본 프로젝트는 사용자에게 신뢰감과 전문성을 전달하기 위해 다음과 같은 디자인 원칙을 준수했습니다.

-   **Deep Slate & Emerald Palette**: 전문성과 청결함을 상징하는 딥 슬레이트와 에메랄드 그린 컬러를 메인 테마로 채택하여 세련된 인터페이스를 구축했습니다.
-   **Micro-Interactions**: 모든 뷰 전환 및 버튼 인터랙션에 `Framer Motion`을 적용하여 리드미컬하고 매끄러운 유저 경험(App-like Experience)을 제공합니다.
-   **Adaptive Layout**: 모바일 웹 환경에 최적화된 하단 탭 내비게이션과 카드 UI를 통해 한 손 조작 편의성을 극대화했습니다.

---

## 🚀 Key Features (Core Functionalities)

### 1. 지능형 실시간 세차 지수 (Wash Index)
-   OpenWeather 및 미세먼지 API 데이터를 실시간 대조 가공하여, 향후 48시간 내 최적의 세차 타이밍을 0~90% 수치로 가시화합니다.

### 2. 하이브리드 AI 도슨트 시스템
-   **AI Vision Analysis**: `Google Gemini 1.5 Flash` 모델을 연동하여, 사용자가 업로드한 차량 사진을 실시간 분석합니다. 도장면 상태에 따른 맞춤형 도구를 추천합니다.
-   **Expert Live Chat**: Firebase SDK를 이용한 실시간 데이터 스트리밍으로 현장 전문가와 1:1 상담 세션을 유지합니다.

### 3. 고속 위치 기반 탐색 (Quick Location Service)
-   **Searching Splash UX**: 기기 GPS와 통신하는 찰나의 대기 시간을 감각적인 애니메이션 스플래시로 처리하여 지루함을 최소화했습니다.
-   **Native Map Deep-link**: 사용자 선택에 따라 네이버 지도 혹은 카카오 맵 앱으로 직접 좌표 정보를 전달하여 즉각적인 길 안내를 지원합니다.

### 4. 정량적 세차 품질 검증 (Matrix Report)
-   **2D Matrix UI**: 세차 품질(세밀함)과 소요 시간을 2축 좌표계로 시각화하여, 서비스 만족도를 데이터 중심으로 평가합니다.
-   **Automated AI Summary**: 수집된 평가 데이터를 바탕으로 AI가 핵심 인사이트를 요약하여 리포트를 발행합니다.

### 5. 마스터 관리 대시보드 (Admin Dashboard)
-   **RBAC (Role-Based Access Control)**: 특정 관리자 계정(`wlsgns9607@gmail.com`)에만 활성화되는 전용 대시보드를 통해 실시간 상담 현황과 리뷰 데이터를 통합 모니터링합니다.

---

## 🛠 Tech Stack (Architecture)

-   **Core**: React 18 (Hooks), TypeScript, Vite
-   **Styling**: Tailwind CSS, Framer Motion
-   **Backend & Infrastructure**: 
    -   **Firebase**: Authentication (Google/Email), Cloud Firestore (Real-time DB)
    -   **AI**: Google Generative AI (Gemini SDK) via Secure API Proxy Server
-   **Deployment**: Cloud Run (Containerized)

---

## 🌐 Deployment Guide (for Portfolio)

본 프로젝트는 Vercel 혹은 Cloud Run에 즉시 배포 가능하도록 환경이 최적화되어 있습니다.

### 1. Firebase 설정
1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성.
2. `Firestore Database` 및 `Authentication` (Google, Email) 활성화.
3. 프로젝트 루트의 `firestore.rules`를 Firebase 규칙 탭에 배포.

### 2. 환경 변수 (`.env`) 설정
`.env.example` 파일을 참고하여 다음 변수들을 등록합니다.
```env
# Client-side (Vite)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Social Login (Vite)
VITE_NAVER_CLIENT_ID=...
VITE_KAKAO_CLIENT_ID=...

# Server-side (Private Secrets)
GEMINI_API_KEY=...
NAVER_CLIENT_SECRET=...
KAKAO_CLIENT_SECRET=...
```

### 3. 로컬 실행
```bash
npm install
npm run dev
```

---

## 📝 Portfolio Note
이 프로젝트는 단순한 코딩을 넘어 **"사용자가 기술을 통해 어떻게 더 나은 일상을 경험할 수 있는가"**에 대한 고민을 담았습니다. 특히 위치 정보 접근 권한 획득 시의 UX 처리와 AI를 활용한 비주얼 분석 기능은 차별화된 기술적 셀링 포인트입니다.

---
**Contact & Feedback**: wlsgns9607@gmail.com


--------------------
## 🚀 Vercel 배포 시 API 연동 가이드

Vercel에 배포할 때 소셜 로그인(네이버/카카오) 및 AI 기능을 정상적으로 사용하려면 대시보드의 **Settings > Environment Variables** 메뉴에서 다음 변수들을 반드시 등록해야 합니다.

### 1. 필수 환경 변수 목록

| 변수명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini AI 인증 키 | [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급 |
| `VITE_NAVER_CLIENT_ID` | 네이버 개발자 센터 Client ID | 클라이언트 사이드 사용 (`VITE_` 접두사 필수) |
| `NAVER_CLIENT_SECRET` | 네이버 개발자 센터 Client Secret | 서버 사이드 보안 키 |
| `VITE_KAKAO_CLIENT_ID` | 카카오 개발자 센터 REST API 키 | 클라이언트 사이드 사용 (`VITE_` 접두사 필수) |
| `KAKAO_CLIENT_SECRET` | 카카오 개발자 센터 Client Secret | (선택) 보안 활성화 시 필요 |

### 2. 소셜 로그인 Redirect URI 설정
배포된 사이트 도메인에 맞춰 각 개발자 센터에서 **Callback URL**을 반드시 등록해야 로그인이 작동합니다.

- **네이버**: `https://<당신의-도메인>/api/auth/naver/callback`
- **카카오**: `https://<당신의-도메인>/api/auth/kakao/callback`
  - *Kakao 플랫폼 설정 내 'Web' 도메인에 `https://<당신의-도메인>` 추가 필수*

---

## 🛠 깃허브(GitHub) 수정 및 관리 방법

본 프로젝트를 깃허브에 올린 후 코드를 수정하거나 관리할 때 다음 사항을 유의하십시오.

### 1. 환경 변수 설정 (필수)
보안을 위해 `firebase-applet-config.json` 등 민감한 설정 파일은 깃허브에 올라가지 않도록 설정되어 있습니다. 따라서 배포 플랫폼(Vercel 등)에서 앱이 정상 동작하려면 반드시 다음 환경 변수를 설정해야 합니다:

- `VITE_FIREBASE_API_KEY` 등 `VITE_`로 시작하는 Firebase 설정값들
- `GEMINI_API_KEY`: AI 기능을 사용하기 위한 구글 Gemini API 키

### 2. 로컬 개발 환경 구축
1. 레포지토리를 클론합니다: `git clone <your-repo-url>`
2. 의존성을 설치합니다: `npm install`
3. 로컬 서버를 실행합니다: `npm run dev`

### 3. 수정 사항 반영
코드를 수정한 후에는 깃허브의 Standard Workflow(`add` -> `commit` -> `push`)를 통해 원격 저장소에 반영하면 배포 자동화(CI/CD)가 설정된 경우 즉시 업데이트됩니다.

--------------------

