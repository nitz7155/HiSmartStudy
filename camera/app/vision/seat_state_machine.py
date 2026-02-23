from datetime import datetime
from vision.schemas.schemas import SeatEvent, SeatEventType

class SeatStateMachine :
    def __init__(self, seat_id:int, roi : tuple, threshold : int = 20) :
        """
        :param seat_id: 좌석번호
        :type seat_id: int
        :param roi: (x1, y1, x2, y2)좌표
        :type roi: tuple
        :param threshold: 안정화 프레임 수
        :type threshold: int
        """

        self.seat_id = seat_id
        self.roi = roi

        # 초기 상태 정의
        self.state = "EMPTY"
        self.threshold = threshold
        self.counter = 0 # 상태 변화 카운터

    # ROI안에 사람이 있는지 판정
    # boxes : YOLO에서 반환한 bounding boxes
    def _person_in_roi(self, boxes):
        x1, y1, x2, y2 = self.roi
        for bx1, by1, bx2, by2 in boxes:
            # 겹치지 않는 조건이 False이면 (= 겹친다면) True 반환
            if not (bx2 < x1 or bx1 > x2 or by2 < y1 or by1 > y2):
                return True
        return False

    
    # YOLO 감지 결과 기반 상태 업데이트
    def update(self, boxes) -> SeatEvent | None :
        now = datetime.now()

        person_inside = self._person_in_roi(boxes)
        
        # Empty 상태일 때 사람이 들어오면 Check_in
        if self.state == "EMPTY" :
            if person_inside :
                self.counter += 1
                if self.counter >= self.threshold :
                    # Check_in 이벤트 발생
                    self.state = "OCCUPIED"
                    self.counter = 0
                    return SeatEvent(seat_id = self.seat_id,
                                     event_type=SeatEventType.CHECK_IN,
                                     detected_at=now)
            
            # threshold 이전이면 카운터 초기화
            else :
                self.counter = 0
        
        # OCCUPIED일 때 사람이 나가면 check_out
        elif self.state == "OCCUPIED" :
            if not person_inside :
                self.counter += 1
                if self.counter >= self.threshold :
                    # Checkout 이벤트 발생
                    self.state = "EMPTY"
                    self.counter = 0
                    return SeatEvent(seat_id = self.seat_id,
                                     event_type=SeatEventType.CHECK_OUT,
                                     detected_at=now)
            
            # threshold 이전이면 카운터 초기화
            else :
                self.counter = 0

        return None
    



        



