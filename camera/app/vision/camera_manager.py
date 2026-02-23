from typing import Dict, List
from vision.camera_worker import CameraWorker

class CameraManager :
    def __init__(self, camera_configs : List[Dict], event_manager) :
        """
        camera_configs 
        [
            { 
            "camera_id" : "cam-1",
            "source" : "rtsp://192.168.0.10/live",
            "seat_rois" : {
                    21 : (0.12, 0.33, 0.22, 0.50),
                    22 : (0.25, 0.33, 0.35, 0.50)
                }
            },...
        ]
        """

        self.event_manager = event_manager
        self.camera_workers : Dict[str, CameraWorker] = {}
        self.seat_to_camera_map : Dict[int, str] = {}

        # camera worker 생성 및 seat mapping
        for cfg in camera_configs :
            cam_id = cfg["camera_id"]
            source = cfg["source"]
            seat_rois = cfg["seat_rois"]

            worker = CameraWorker(
                camera_id=cam_id,
                source=source,
                seat_rois=seat_rois,
                event_manager=event_manager
            )

            self.camera_workers[cam_id] = worker
        
            # 좌석 카메라 매핑 저장
            for seat_id in seat_rois.keys() :
                self.seat_to_camera_map[seat_id] = cam_id
        
        print("[CameraManager] 초기화 완료")

    def get_worker_by_seat(self, seat_id : int) -> CameraWorker :
        """시트에 매핑된 카메라 객체 가져오기"""
        cam_id = self.seat_to_camera_map.get(seat_id)
        if cam_id is None :
            raise ValueError(f'{seat_id}에 대응하는 카메라가 존재하지 않습니다.')
        
        return self.camera_workers[cam_id]
    
    def start_tracking(self, seat_id : int, usage_id : int) :
        """입실 이벤트 처리 : 입실 시 해당 카메라에게 탐지하도록"""
        worker = self.get_worker_by_seat(seat_id)
        worker.start_tracking(seat_id, usage_id)
    
    def start_lost_item_check(self, seat_id:int, usage_id : int) :
        """퇴실 이벤트 처리 : 퇴실 시 해당 카메라에게 분실물 탐지하도록"""
        worker = self.get_worker_by_seat(seat_id)
        worker.start_lost_item_check(seat_id, usage_id)

    def get_status(self) :
        status_list = []
        for cam_id, worker in self.camera_workers.items() :
            status_list.append({
                "cam_id" : cam_id,
                "source" : worker.source,
                "status" : worker.cap.isOpened()
            })
        return status_list

    