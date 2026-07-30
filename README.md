# 세차의 정석 (The Art of Car Wash) 🧼✨

**세차의 정석**은 프리미엄 차량 관리를 위해 구현된 **AI 기반 하이엔드 서비스 구축 프로젝트**입니다. 
AI 비전 분석, 실시간 데이터 기반 세차 지수 대시보드, 2D 매트릭스 리포트 UI를 반응형 웹 코드로 직접 구축했습니다.

---

## 🚀 구현 완료 핵심 기능 (Implemented Live Features)

### 1. 지능형 실시간 세차 지수 (Wash Index)
- OpenWeather 및 미세먼지 API 데이터를 수신하여, 향후 48시간 내 최적의 세차 타이밍을 가시화하는 대시보드 UI 구현.

### 2. 하이브리드 AI 도슨트 & 실시간 UI
- **AI Vision Analysis**: 사용자가 업로드한 차량 사진을 Gemini API로 전달하여 도장면 상태 분석 결과를 가시화하는 UI 구현.
- **Expert Live Chat UI**: Firebase SDK 연동으로 현장 전문가와 1:1 상담이 가능한 실시간 채팅 인터페이스 구축.

### 3. 위치 기반 지도 연동 (Location Service)
- 기기 GPS(`navigator.geolocation`) 데이터를 수신하여, 사용자가 네이버 지도 / 카카오 맵 딥링크(Deep-link)로 즉시 전환되는 위치 안내 UI 마크업.

### 4. 정량적 세차 품질 검증 (Matrix Report UI)
- 세차 품질과 소요 시간을 2축 좌표계로 시각화한 2D Matrix UI 및 AI 요약 리포트 레이아웃 구축.

---

## 💡 추후 비즈니스 확장 로드맵 (Future Roadmap)

> **"비즈니스 생태계 확장 및 오프라인 대기 시간 축소(Time-Reduction)를 위한 차세대 기획"**

* **차량 인포테인먼트(Android Auto / CarPlay) UI 확장**
  * 모바일 레이아웃을 넘어 차량 디스플레이 규격(Big Button UI)으로 인터페이스를 확장하여 운전석 내 결제 및 지오펜싱(Geofencing) 무인 체크인 UI 구축 예정.
* **서울 주요 거점 중심 선결제 인프라 연동**
  * 현장 대기 시간을 최소화하는 서울 주요 세차장 거점 결제 시스템 연동 계획.
