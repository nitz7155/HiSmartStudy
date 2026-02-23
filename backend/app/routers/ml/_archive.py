from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi.params import Body
from sqlalchemy.sql import func
import random
from database import get_db
from models import Member, Product, Order, Seat, SeatUsage
import cv2
import os
from datetime import datetime
from ultralytics import YOLO

router = APIRouter(prefix="/ai", tags=["Detect services"])
# coco-dataset으로 학습된 yolo 모델
model = YOLO(model="models/yolo11n.pt")

# 저장폴더
CAPTURE_DIR = "captures/real"
DETECT_DIR = "captures/detect"
os.makedirs(CAPTURE_DIR, exist_ok=True)
os.makedirs(DETECT_DIR, exist_ok=True)

# 자리번호 + 카메라 인덱스 
SEAT_CAMERA_MAP = {
    40:0,
}

# 프레임 캡처 후 저장하는 함수
def capture_predict(seat_index : int) :
    # return (detected(감지여부), img_path(파일경로), classes(클래스리스트), message)
   
    camera_idx = SEAT_CAMERA_MAP.get(seat_index)

    # 카메라 열기
    cap = cv2.VideoCapture(camera_idx)

    # 카메라가 정상적으로 열렸는지 확인 / 아니면 return false
    if not cap.isOpened() :
        return False, None, [], f'좌석 {seat_index}의 카메라 오픈에 실패하였습니다'
    
    # 카메라를 통해 현재 프레임 캡쳐 
    # retval : 정상적으로 작동했는지(T/F)
    # frame : 캡쳐된 이미지
    retval, frame = cap.read()
    
    # 캡쳐 이후 카메라 닫기
    cap.release()

    # 캡쳐가 정상적으로 이루어졌는 지 확인
    if not retval or frame is None :
        return False, None, [], f'좌석 {seat_index}의 카메라 프레임 캡쳐에 실패했습니다'
    
    # Yolo를 이용한 감지
    # model(frame, conf) 
    # frame(탐지하고자 하는 이미지), conf(conf에 설정한 예측값 보다 높은 값을 탐지)
    # result = 추론한 사진별로 결과를 따로 생성 후 리스트로 주어짐
    # boxes : 탐지된 박스의 정보, 좌표, 라벨 등
    result = model(frame, conf=0.28)

    # 탐지된 결과가 없는 경우 
    if not len(result[0].boxes) :
        return False, None, [], 'Success'
    
    # 탐지된 경우 
    # cls : 탐지된 클래스 리스트(type tensor)
    class_ids = result[0].boxes.cls.tolist()
    class_name = [model.names[int(c)] for c in class_ids]

    # 이미지 저장
    times = datetime.now().strftime("%Y%m%d_%H%M%S")
    real_filename = f'real_seat{seat_index}_{times}.jpg'
    real_capture_path = os.path.join(CAPTURE_DIR, real_filename)
    # 1) 캡쳐된 이미지 저장(사용자에게 보여줄)
    cv2.imwrite(real_capture_path, frame)

    # 2) 감지된 이미지 저장(관리자가 관리할)
    annotated = result[0].plot()
    detect_filename = f'detect_seat{seat_index}_{times}.jpg'
    detect_capture_path = os.path.join(DETECT_DIR, detect_filename)
    cv2.imwrite(detect_capture_path, annotated)

    return True, real_capture_path, class_name, 'Success'


@router.get("/")
def root() :
    return {"msg" : "hello~~~"}

@router.post("/cap")
def capture_endpoint(data : dict) :
    # data : seat_index(int), flag(True/False) 
    # seat_index 검증
    
    # 기본반환값
    return_content = {
        "detected" : False, 
        "img_path" : None, 
        "classes" : [], 
        "message" : ""
    }

    # 좌석번호가 없을 경우 Error
    if not (data["seat_index"] in SEAT_CAMERA_MAP.keys()) :
        raise HTTPException(status_code=400, detail="좌석번호가 존재하지 않습니다")
    
    # flag false 였을 경우 탐지되지 않음 반환
    if not data["flag"] :
        return JSONResponse(status_code=200, content=return_content)
    
    # seat_index를 이용한 탐지 실행 
    return_content["detected"], return_content["img_path"], return_content["classes"], return_content["message"]= capture_predict(data["seat_index"])

    # 결과 리턴
    return JSONResponse(status_code=200, content=return_content)

# {"seat_index" : 0, "flag" : False }