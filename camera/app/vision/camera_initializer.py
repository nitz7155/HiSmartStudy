import json 
from vision.seat_manager import SeatManager
from vision.camera_manager import CameraManager

def load_camera_config(path : str = 'vision/config/camera_config.json') :
    with open(path, 'r') as f :
        config = json.load(f)

    cameras = []
    for cam in config["cameras"] :
        seat_rois = { int(k) : tuple(v) for k, v in cam["seat_rois"].items() }
        cam["seat_rois"] = seat_rois
        cameras.append(cam)

    return cameras

def init_camera_system() :
    configs = load_camera_config()
    event_manager = SeatManager(camera_manager=None)
    camera_manager = CameraManager(configs, event_manager)
    event_manager.camera_manager = camera_manager
    return event_manager, camera_manager

            