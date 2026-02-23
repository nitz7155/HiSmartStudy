import queue
import threading
import requests
from datetime import datetime
from vision.schemas.schemas import SeatEventType
import math


"""
seat_manager
1. 모든 카메라에서 발생하는 이벤트 수집
    - 감지시작 / 감지종료
    - 착석 / 이탈
    - 퇴실 -> 유실물 처리
2. 좌석별 상태 업데이트
    - 빈자리 / 입실 / 퇴실
3. 입/퇴실 이벤트 발생 시 웹서버로 전달
4. 각 좌석별 usage_id관리
5. 유실물 검사 요청 상황 처리
"""

CAMERA_SERVER_URL = 'http://localhost:12454'

class SeatManager :
    def __init__(self, camera_manager) :
        # 카메라 id에 매칭된 카메라 객체
        self.camera_manager = camera_manager
        # 큐에 이벤트 담을 수 있도록 큐 객체 생성
        self.event_queue = queue.Queue()
        self.seat_states = {}
        """
        seat_seates[seat_id] = {
            "status" : "VACANT" | "OCCUPIED",
            "usage_id" : int | None,
            "in_out_times" : {in_time : datetime, out_time : datetime}
            "last_update" : datetime
        }
        """

        self.runnig = False
        self.lost_item_results = {}
        self.result_lock = threading.Lock()

    def handle_web_checkin(self, seat_id, usage_id) :
        """웹으로 부터 입실요청 받았을 때 처리하는 메서드"""
        # seat상태 업데이트
        # 현재 좌석 상태 정보 불러오기
        current = self.seat_states.get(seat_id)

        # 이미 착석 중 : 무시
        if current and current["status"] == "OCCUPIED" :
            return
        
        # 좌석 상태 갱신
        self.seat_states[seat_id] = {
            "status" : "OCCUPIED",
            "usage_id" : usage_id,
            "in_out_times" : {"in_time" : None, "out_time" : None},
            "last_update" : datetime.now()
        }

        # 카메라에 감지 시작 요청
        self.camera_manager.start_tracking(seat_id, usage_id)
    
    def handle_web_checkout(self, seat_id, usage_id) :
        """웹으로 부터 퇴실요청 받았을 때 처리하는 메서드"""
        # seat상태 업데이트
        # 현재 좌석 상태 정보 불러오기
        current = self.seat_states.get(seat_id)

        # 자리 비어있으면 무시
        if not current or current["status"] == "EMPTY" :
            return

        # 카메라에 유실물 감지 시작 요청
        self.camera_manager.start_lost_item_check(seat_id, usage_id)
        
        # 좌석 상태 갱신
        self.seat_states[seat_id] = {
            "status" : "EMPTY",
            "usage_id" : None,
            "in_out_times" : {"in_time" : None, "out_time" : None},
            "last_update" : None
        }


    def push_event(self, event) :
        """카메라로부터 이벤트 전달 받는 메서드"""
        self.event_queue.put(event)

    def start(self) :
        """seat_manger 시작(백그라운드 실행)"""
        self.running = True
        threading.Thread(target=self._event_loop, daemon=True).start()

    def _event_loop(self) :
        """카메라로부터 받은 이벤트 처리 메서드"""
        while self.running :
            event = self.event_queue.get()
            try:
                current = self.seat_states.get(event.seat_id)
                if not current:
                    continue

                current["last_update"] = event.detected_at
                in_out_times = current["in_out_times"]
                event_type = event.event_type
                if isinstance(event_type, str):
                    try:
                        event_type = SeatEventType(event_type)
                    except ValueError:
                        continue

                if event_type == SeatEventType.CHECK_IN:
                    in_out_times["in_time"] = event.detected_at
                    current["in_out_times"] = in_out_times

                elif event_type == SeatEventType.CHECK_OUT:
                    in_time = in_out_times.get("in_time")
                    in_out_times["out_time"] = event.detected_at
                    if in_time:
                        event.minutes = math.ceil((event.detected_at - in_time).total_seconds() / 60)
                        self._notify_web(event)
                    current["in_out_times"] = {"in_time": None, "out_time": None}

                elif event_type == SeatEventType.LOST_ITEM:
                    self._store_lost_item_result(event)
            except Exception as exc:
                print(f"[SeatManager] event 처리 중 오류: {exc}")

    def _store_lost_item_result(self, event) :
        usage_id = event.usage_id
        with self.result_lock :
            self.lost_item_results[usage_id] = {
                "done" : True,
                "seat_id" : event.seat_id,
                "usage_id" : usage_id,
                "items" : event.items,
                "image_base64" : event.image_base64,
                "detected_at" : event.detected_at.isoformat()
            }

    def _notify_web(self, event) :
        """check inout 이벤트 발생 시 웹으로 전달"""
        payload = {
            'seat_id': event.seat_id,
            'event_type': event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type),
            'detected_at': event.detected_at.isoformat(),
            'minutes': event.minutes,
            'usage_id': event.usage_id,
        }
        try :
            requests.post(
                f'{CAMERA_SERVER_URL}/camera/event',
                json=payload,
                timeout=3)
            
        except Exception as e :
            print('[ERROR] 웹 서버 전달 실패 : ', e)
