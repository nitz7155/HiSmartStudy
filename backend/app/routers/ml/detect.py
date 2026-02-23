from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi.params import Body
from sqlalchemy.sql import func
from database import get_db
from models import Member, Product, Order, Seat, SeatUsage
import os
import base64
from datetime import datetime
import asyncio
import httpx
from pydantic import BaseModel


router = APIRouter(prefix="/ai", tags=["Detect services"])

# 카메라서버
CAMERA_SERVER = "http://localhost:12454"

# 저장폴더
CAPTURE_DIR = "captures/real"
os.makedirs(CAPTURE_DIR, exist_ok=True)


class CheckTimePayload(BaseModel):
    seat_id: int
    usage_id: int
    minutes: int
    event_type: str | None = None

# 프레임 캡처 후 저장하는 함수
def save_base64_image_and_get_path( image_base64 : str,
                                    seat_id : int,
                                    usage_id : int ) :
    
    # 전달된 이미지 없으면 None 반환
    if not image_base64 :
        return None
    
    # 파일 명 구성
    times = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"seat{seat_id}_usage{usage_id}_{times}.jpg"
    file_path = os.path.join(CAPTURE_DIR, filename)

    # base64 -> bytes -> 파일 저장
    image_bytes = base64.b64decode(image_base64)
    with open(file_path, "wb") as f :
        f.write(image_bytes)

    return f'{CAPTURE_DIR}/{filename}'


@router.post("/checkin")
async def checkin_web_to_camera(request : Request,
                         seat_id : int = Body(...),
                         usage_id : int = Body(...)) :
    """키오스크에서 요청 받은 것을 카메라로 전달"""
    # 1) 카메라로 전달
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.post(
                f"{CAMERA_SERVER}/camera/checkin",
                json={"seat_id": seat_id, "usage_id": usage_id},
            )
    except httpx.HTTPError as exc:
        return JSONResponse(
            status_code=502,
            content={"status": False, "message": "camera server failed", "detail": str(exc)},
        )

    if r.status_code != 200 :
        return JSONResponse(status_code=502,
                            content={"status" : False,
                                     "message" : "camera server failed",
                                     "detail" : r.text})
    
    return r.json()

@router.post("/checkout")
async def checkout_web_to_camera(request : Request,
                         seat_id : int = Body(...),
                         usage_id : int = Body(...)) :
    """키오스크에서 요청 받은 것을 카메라로 전달 후 결과 리턴"""
    
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.post(
                f"{CAMERA_SERVER}/camera/checkout",
                json={"seat_id": seat_id, "usage_id": usage_id},
            )
            if r.status_code not in (200, 202) :
                return JSONResponse(status_code=502,
                                    content={"status" : False,
                                             "message" : "camera server failed",
                                             "detail" : r.text})

            job_id = r.json().get("job_id", usage_id)

            # 2) 결과 가져오기
            # 결과 가져오는데 시간 1~2초 소요
            for _ in range(6) :
                await asyncio.sleep(0.3)
                try:
                    rr = await client.get(f"{CAMERA_SERVER}/camera/lost-item/result/{job_id}")
                except httpx.HTTPError:
                    continue
                if rr.status_code != 200 :
                    continue
            
            #     return_content = {
            #     "detected" : False, 
            #     "img_path" : None, 
            #     "classes" : [], 
            #     "message" : ""
            # }
                
                result = rr.json().get("result", {})

                if result.get("done") is True :
                    if not result.get("image_base64") :
                        return JSONResponse(status_code=200,
                                            content={
                                                "detected" : False,
                                                "img_path" : None,
                                                "classes" : [],
                                                "message" : "Success"
                                            })
                    
                    else :
                        image_base64 = result.get("image_base64")
                        img_path = save_base64_image_and_get_path(image_base64,seat_id,usage_id)
                        
                        return JSONResponse(status_code=200, content = {
                            "detected" : True,
                            "img_path" : img_path,
                            "classes" : result.get("items"),
                            "message" : "Success"
                        })
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=502,
                            content={"status" : False,
                                     "message" : "camera server failed",
                                     "detail" : str(exc)})
    
    return JSONResponse(
        status_code=504,
        content={
            "status": False,
            "message": "카메라 서버 결과를 기다리는 중 타임아웃이 발생했습니다.",
            "detail": "retry later",
        },
    )
            
@router.post("/checktime")
def checktime_seat(payload: CheckTimePayload, db: Session = Depends(get_db)) :
    
    #  payload = {
    #         'seat_id' : event.seat_id,
    #         'event_type' : event.event_type,
    #         'minutes' : event.minutes,
    #         'usage_id' : event.usage_id
    #     }
    
    data = payload.model_dump()
    seat_id = data["seat_id"]
    usage_id = data["usage_id"]
    try :
        seatusage = db.query(SeatUsage).filter(
            SeatUsage.usage_id == int(usage_id),
            SeatUsage.seat_id == int(seat_id),
        ).first()
        
        if not seatusage:
            raise HTTPException(status_code=404, detail="SeatUsage not found")

        current = seatusage.total_in_time or 0
        seatusage.total_in_time = current + int(data["minutes"])

        db.commit()
        db.refresh(seatusage)

    except HTTPException :
        raise

    except Exception as e :
        raise HTTPException(status_code=500, detail=f"예기치 않은 오류 : {e}")

    return JSONResponse(status_code=200, content={ "status" : True, "message" : "Success"})


    
