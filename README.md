<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" /><img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" /><img src="https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" /><img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />

# 세미프로젝트
## 주제 - 스터디 카페 관리 시스템
## 프로젝트 가이드라인
### 프로젝트 규칙
|       | 프론트엔드                          | 백엔드                        |
|-------|--------------------------------|----------------------------|
| 폴더명   | 소문자                            | 소문자                        |
| 파일명   | 파스칼케이스(js는 카멜케이스, css는 파스칼케이스) | 스네이크케이스(라우터 주소는 케밥케이스('-')) |
### 깃 규칙
| 브랜치     | 설명               |
|---------|------------------|
| main    | 출시, 최종 merge, 백업 |
| develop | 출시 버전, 중간 merge  |
| feature | 기능 개발, 담당 부분     |
| 예시      | feature/login    |

| 커밋         | 설명                                |
|------------|-----------------------------------|
| [FEAT]     | 코드 추가                             |
| [FIX]      | 코드 수정                             |
| [STYLE]    | 코드 로직 말고 형식만 수정, 세미콜론 추가 및 들여쓰기 등 |
| [REFACTOR] | 코드 리팩토링, 결과물은 같지만 코드 로직이 수정됨      |
| [DOCS]     | 문서가 수정됨                           |
| 예시         | [FEAT] 로그인 API 엔드포인트 추가           |
## 프로젝트 전체 구조도
```
📂 SemiProject/
├─ 📂 backend/
│  ├─ 📂 app/
│  │  ├─ 📂 ai_models/
│  │  │  ├─ sbert.py
│  │  │  └─ yolo11n.pt
│  │  ├─ 📂 captures/
│  │  │  └─ real/
│  │  ├─ database.py
│  │  ├─ main.py
│  │  ├─ models.py
│  │  ├─ 📂 routers/
│  │  │  ├─ 📂 admin/
│  │  │  │  └─ admin.py
│  │  │  ├─ 📂 kiosk/
│  │  │  │  └─ kiosk.py
│  │  │  ├─ 📂 ml/
│  │  │  │  ├─ detect.py
│  │  │  │  ├─ statics.py
│  │  │  │  ├─ sugestion.py
│  │  │  │  └─ _archive.py
│  │  │  └─ 📂 web/
│  │  │     ├─ auth.py
│  │  │     ├─ mypage.py
│  │  │     ├─ plan.py
│  │  │     └─ ticket.py
│  │  ├─ schemas.py
│  │  ├─ 📂 utils/
│  │  │  └─ auth_utils.py
│  │  └─ __init__.py
│  ├─ pyproject.toml
│  └─ README.md
├─ 📂camera/
│  ├─ 📂 app/
│  │  ├─ 📂 app/
│  │  │  └─ 📂 vision/
│  │  │     └─ 📂 models/
│  │  │        └─ yolo11n.pt
│  │  ├─ app.py
│  │  ├─ 📂 routers/
│  │  │  ├─ health_api.py
│  │  │  └─ vision_api.py
│  │  ├─ 📂 vision/
│  │  │  ├─ camera_initializer.py
│  │  │  ├─ camera_manager.py
│  │  │  ├─ camera_worker.py
│  │  │  ├─ 📂 config/
│  │  │  │  └─ camera_config.json
│  │  │  ├─ 📂 models/
│  │  │  │  └─ yolo11n.pt
│  │  │  ├─ 📂 schemas/
│  │  │  │  └─ schemas.py
│  │  │  ├─ seat_manager.py
│  │  │  ├─ seat_state_machine.py
│  │  │  ├─ 📂 utils/
│  │  │  │  ├─ camera_config.generated.json
│  │  │  │  ├─ camera_to_rois.py
│  │  │  │  └─ detectors.py
│  │  │  └─ __init__.py
│  │  └─ __init__.py
│  ├─ pyproject.toml
│  └─ README.md
├─ 📂 frontend/
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ README.md
│  ├─ 📂 src/
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ index.css
│  │  ├─ 📂 kiosk/
│  │  │  ├─ 📂 components/
│  │  │  │  ├─ KioskAlertModal.jsx
│  │  │  │  ├─ KioskCheckIn.jsx
│  │  │  │  ├─ KioskCheckOut.jsx
│  │  │  │  ├─ KioskHeader.jsx
│  │  │  │  └─ KioskPaymentModal.jsx
│  │  │  ├─ KioskApp.jsx
│  │  │  ├─ 📂 screens/
│  │  │  │  ├─ KioskLogin.jsx
│  │  │  │  ├─ KioskPhoneInput.jsx
│  │  │  │  ├─ KioskPinInput.jsx
│  │  │  │  ├─ KioskSeatStatus.jsx
│  │  │  │  ├─ KioskTicketList.jsx
│  │  │  │  └─ KioskUserSelect.jsx
│  │  │  └─ 📂 styles/
│  │  │     └─ Kiosk.css
│  │  ├─ main.jsx
│  │  ├─ 📂 utils/
│  │  │  ├─ authApi.js
│  │  │  ├─ authClient.js
│  │  │  └─ useAuthStores.js
│  │  └─ 📂 web/
│  │     ├─ 📂 components/
│  │     │  ├─ AdminHeader.jsx
│  │     │  ├─ AdminLayout.jsx
│  │     │  ├─ AdminSidebar.jsx
│  │     │  ├─ AuthButton.jsx
│  │     │  ├─ DailySalesChart.jsx
│  │     │  ├─ DashboardTodoList.jsx
│  │     │  ├─ FocusAnalysis.jsx
│  │     │  ├─ MemberStatusChart.jsx
│  │     │  ├─ SeatAnalysis.jsx
│  │     │  ├─ SeatBox.jsx
│  │     │  ├─ SeatSelector.jsx
│  │     │  ├─ SeatStatus.jsx
│  │     │  ├─ SeatUsageChart.jsx
│  │     │  ├─ StudyTimeSummary.jsx
│  │     │  ├─ TicketSalesChart.jsx
│  │     │  ├─ TodoModal.jsx
│  │     │  ├─ TodoProgress.jsx
│  │     │  └─ WebLayout.jsx
│  │     ├─ 📂 pages/
│  │     │  ├─ AccountRecovery.jsx
│  │     │  ├─ AdminDashboard.jsx
│  │     │  ├─ AdminLogin.jsx
│  │     │  ├─ AdminMembersManage.jsx
│  │     │  ├─ AdminProductsManage.jsx
│  │     │  ├─ AdminSeatsManage.jsx
│  │     │  ├─ AdminTodoManage.jsx
│  │     │  ├─ GoogleOnBoarding.jsx
│  │     │  ├─ Login.jsx
│  │     │  ├─ MyPage.jsx
│  │     │  ├─ MyPageCheckPw.jsx
│  │     │  ├─ MyPageEdit.jsx
│  │     │  ├─ MyPageOrder.jsx
│  │     │  ├─ Payment.jsx
│  │     │  ├─ PaymentSuccess.jsx
│  │     │  ├─ Planner.jsx
│  │     │  ├─ Signup.jsx
│  │     │  ├─ TicketList.jsx
│  │     │  └─ WebIndex.jsx
│  │     └─ 📂 styles/
│  │        ├─ Payment.css
│  │        └─ TicketList.css
│  └─ vite.config.js
└─ README.md
```
## 프론트엔드
### 프레임워크
- React
### 라이브러리
- React Router
- Zustand
- React Query
- Tailwind CSS
### 프로젝트 설치
1. (node.js 설치, 최신 LTS 다운로드) https://nodejs.org/ko/download
2. cd frontend 
3. npm install
### 프로젝트 실행
1. npm run dev
## 백엔드
### 프레임워크
- FastAPI
### 라이브러리
- pyproject.toml 참고
### 프로젝트 설치
1. (윈도우 기준 uv 설치) `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` 
2. (맥 기준 uv 설치) `brew install uv` 또는 `curl -LsSf https://astral.sh/uv/install.sh | sh` 
3. uv sync
### 프로젝트 실행
1. cd backend/app
2. uv run main.py