from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health_check(request : Request) :
    """ 카메라 헬스 체크 """
    camera_manager = request.app.state.camera_manager
    seat_manager = request.app.state.seat_manager

    camera_status = camera_manager.get_status()
    queue_size = seat_manager.event_queue.qsize()

    return JSONResponse(status_code=200, content={
        "status" : "ok",
        "camera_server" : "running",
        "cameras" : camera_status,
        "event_queue_backlog" : queue_size
    })

@router.get("/seat_states")
def seat_states(request : Request) :
    seat_manager = request.app.state.seat_manager

    return seat_manager.seat_states

@router.get("/test")
def test(event) :
    return event