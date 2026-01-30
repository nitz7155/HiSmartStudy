import uvicorn
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import create_tables, SessionLocal
from ai_models.sbert import model_manager
from database import create_tables
from routers.kiosk import kiosk
from routers.web import auth, ticket, mypage, plan
from routers.admin import admin
from routers.ml import detect, statics
from datetime import datetime
from models import SeatUsage, Seat
from apscheduler.schedulers.background import BackgroundScheduler
from zoneinfo import ZoneInfo # 시간대 처리

# ---------------------------------------------------------
# 자동 퇴실 스케줄러 (Timezone 문제 해결)
# ---------------------------------------------------------
def auto_checkout_job():
    """1분마다 만료된 좌석을 찾아 자동 퇴실 처리"""
    db = SessionLocal()
    try:
        # [핵심] 한국 시간(KST) 기준 현재 시간 설정
        KST = ZoneInfo("Asia/Seoul")
        now = datetime.now(KST).replace(tzinfo=None)

        # 퇴실하지 않았는데(check_out_time IS NULL), 만료시간이 지난 기록 조회
        expired_usages = db.query(SeatUsage).filter(
            SeatUsage.check_out_time == None,
            SeatUsage.ticket_expired_time < now
        ).all()

        if expired_usages:
            print(f"[Auto Checkout] 만료된 사용자 {len(expired_usages)}명 퇴실 처리 진행")
            
            for usage in expired_usages:
                # 1. 퇴실 시간 기록
                usage.check_out_time = now
                
                # 2. 좌석 상태 변경 (사용 가능으로)
                seat = db.query(Seat).filter(Seat.seat_id == usage.seat_id).first()
                if seat:
                    seat.is_status = True
            
            db.commit()
            print(" -> DB 업데이트 완료")
            
    except Exception as e:
        print(f"[Scheduler Error] {e}")
        db.rollback()
    finally:
        db.close()

# ---------------------------------------------------------
# Lifespan
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 서버 시작 중...")
    create_tables()

    print("✅ 시스템 및 자동 퇴실 스케줄러가 시작되었습니다.")
    # 스케줄러 시작
    scheduler = BackgroundScheduler()
    scheduler.add_job(auto_checkout_job, 'interval', seconds=30)
    scheduler.start()

    model_manager.load_models()
    ticket.start_scheduler()

    print("✅ 서버 시작 완료!\n")
    yield  # 서버 실행 중
    print("\n🛑 서버 종료 중...")
    print("🛑 시스템 종료, 스케줄러 셧다운...")

    scheduler.shutdown()
    model_manager.unload_models()

    print("✅ 서버 종료 완료!")

app = FastAPI(lifespan=lifespan)

os.makedirs("captures", exist_ok=True)
app.mount("/captures", StaticFiles(directory="captures"), name="captures")

app.include_router(auth.router)
app.include_router(kiosk.router)
app.include_router(ticket.router)
app.include_router(detect.router)
app.include_router(mypage.router)
app.include_router(admin.router)
app.include_router(plan.router)
app.include_router(statics.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:12454", "http://192.168.0.31:5173", "http://172.24.16.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )