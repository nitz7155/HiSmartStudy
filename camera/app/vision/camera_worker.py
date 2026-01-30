import cv2
import threading
import time
from base64 import b64encode
from datetime import datetime
from ultralytics import YOLO
from vision.schemas.schemas import SeatEvent, SeatEventType
from vision.seat_state_machine import SeatStateMachine
from vision.utils.detectors import detect_person_boxes, detect_loss_items

##########################################################################
# 카메라 객체
# - 각 카메라 상태 관리(열고 닫기)
# - 프레임 캡쳐
##########################################################################
class CameraWorker :
    def __init__(self, camera_id, source, seat_rois, event_manager) :
        """
        :param camera_id: 카메라 고유 id
        :param source: 영상 소스
        :param seat_rois: {seat_id : (x1, y1, x2, y2)}
        :param event_manager: SeatEventManager
        """
        # 카메라 기본 정보
        self.camera_id = camera_id
        self.source = source
        self.cap = cv2.VideoCapture(source)
        self.event_manager = event_manager # 카메라 이벤트를 처리하기 위한 이벤트 관리 객체
        self.seat_rois = seat_rois

        # 좌석 별 상태머신 설정
        self.state_machines = {}
        for seat_id, roi in seat_rois.items():
            pixel_roi = self._to_pixel_roi(roi)
            self.state_machines[seat_id] = SeatStateMachine(seat_id, pixel_roi)

        # 자리마다 usage_id 저장
        self.usage_ids = {seat_id : None for seat_id in seat_rois.keys()}

        # 모드 플래그
        self.tracking_enabled = False
        self.lost_item_mode = False
        self.lost_item_target_seat_id = None

        # Yolo 모델
        self.person_model = YOLO("app/vision/models/yolo11n.pt")
        self.lost_item_model = YOLO("app/vision/models/semi_yolo_model.pt")

        # 메인 루프 시작
        threading.Thread(target=self._loop, daemon=True).start()

    def start_tracking(self, seat_id, usage_id) :
        """입실 요청 시 checkin-out 탐지 플래그 업데이트"""
        self.tracking_enabled = True
        self.usage_ids[seat_id] = usage_id
        print(f'[{self.camera_id}] Tracking Start(seat {seat_id}, usage {usage_id})')

    def start_lost_item_check(self, seat_id, usage_id) :
        """퇴실 요청 시 유실물 탐지 플래그 업데이트"""
        self.tracking_enabled = False
        self.lost_item_mode = True
        self.lost_item_target_seat_id = seat_id
        self.usage_ids[seat_id] = usage_id

    def _loop(self) :
        """ 메인 루프 """
        while True :
            ret, frame = self.cap.read()
            if not ret :
                time.sleep(0.01)
                continue

            # 착석 / 이탈 감지(연속)
            if self.tracking_enabled :
                person_boxes = detect_person_boxes(self.person_model, frame)

                for seat_id, machine in self.state_machines.items() :
                    event = machine.update(person_boxes)

                    if event :
                        event.camera_id = self.camera_id
                        event.usage_id = self.usage_ids.get(seat_id)
                        self.event_manager.push_event(event)
            
            # 유실물 감지(one-shot)
            if self.lost_item_mode :
                self._run_lost_item_detection(frame)
                self.lost_item_mode = False

    # 유실물 감지 로직
    def _run_lost_item_detection(self, frame) :
        seat_id = self.lost_item_target_seat_id
        if seat_id is None :
            print(f'[{self.camera_id}] lost_item_target_seat_id 없음')
            return
        
        roi = self.seat_rois[seat_id]
        if roi is None :
            print(f'[{self.camera_id}] ROI 존재하지 않음')
            return

        h, w, _ = frame.shape

        # 정규화된 ROI라면 픽셀로 변환
        if max(roi) <= 1.0:
            x1 = int(roi[0] * w)
            y1 = int(roi[1] * h)
            x2 = int(roi[2] * w)
            y2 = int(roi[3] * h)
        else:
            x1, y1, x2, y2 = map(int, roi)

        crop = frame[y1:y2, x1:x2]

        items = detect_loss_items(self.lost_item_model, crop)
        print(items)
        # 전체 좌표로 역변환
        for item in items:
            bx1, by1, bx2, by2 = item["box"]
            item["box"] = (bx1 + x1, by1 + y1, bx2 + x2, by2 + y2)
        
        # 이미지를 외부로 전달하기 위해 base64 encode
        image_base64 = None
        if len(items) > 0 :
            ok, buf = cv2.imencode(".jpg", crop)
            if ok :
                image_base64 = b64encode(buf).decode("utf-8")

        event = SeatEvent(
            seat_id=seat_id,
            event_type=SeatEventType.LOST_ITEM,
            detected_at=datetime.now(),
            usage_id=self.usage_ids.get(seat_id),
            camera_id=self.camera_id,
            items=items,
            image_base64=image_base64
        )

        self.event_manager.push_event(event)
    def _to_pixel_roi(self, roi):
        if max(roi) <= 1.0:
            width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if not width or not height:
                # 기본 FHD에 맞춰 임시 변환
                width, height = 1920, 1080
            x1 = int(roi[0] * width)
            y1 = int(roi[1] * height)
            x2 = int(roi[2] * width)
            y2 = int(roi[3] * height)
            return (x1, y1, x2, y2)
        return tuple(map(int, roi))
