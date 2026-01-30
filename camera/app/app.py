import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from vision.camera_initializer import init_camera_system
from routers import vision_api, health_api

@asynccontextmanager
async def lifespan(app : FastAPI):
    print("🚀 FastAPI 서버 시작 : Vision Backend 초기화 중...")
    # 1) Vison backend 초기화
    seat_manager, camera_manager = init_camera_system()
    app.state.seat_manager = seat_manager
    app.state.camera_manager = camera_manager
    print("backend 초기화")

    # 2) seat_manager 이벤트 루프 시작
    seat_manager.start()
    print("seatmanager 루프 시작 완료")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://192.168.0.31:5173", "http://172.24.16.1:5173",
                   "http://localhost:8000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(vision_api.router)
app.include_router(health_api.router)

@app.get('/')
def test() :
    return {"msg" : "jjjjjjj"}

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=12454,
        reload=True
    )
