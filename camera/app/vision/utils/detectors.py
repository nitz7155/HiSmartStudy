import cv2

def detect_person_boxes(model, frame) :
    """ 사람 감지만 하고 BBOX만 리턴"""
    results = model(frame, imgsz=768, conf=0.2, iou=0.3)[0]

    boxes = []
    for box in results.boxes :
        if int(box.cls[0]) == 0:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            boxes.append((x1,y1,x2,y2))

    return boxes

def detect_loss_items(model, frame) :
    """ 유실물 감지하는 함수"""
    results = model(frame)[0]

    items = []
    for box in results.boxes :
        cls_id = int(box.cls[0])
        name = model.names[cls_id]

        x1, y1, x2, y2 = box.xyxy[0].tolist()
        items.append({
            "name" : name,
            "box" : (x1, y1, x2, y2)
        })

    return items