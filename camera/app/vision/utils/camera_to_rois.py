import cv2
import json
import os
from datetime import datetime

# -----------------------------
# 설정
# -----------------------------
OUTPUT_JSON = "camera_config.generated.json"
WINDOW_NAME = "ROI Labeler (drag to draw)"
FONT = cv2.FONT_HERSHEY_SIMPLEX

# -----------------------------
# 전역 상태
# -----------------------------
drawing = False
x0, y0 = -1, -1
current_rect = None  # (x1,y1,x2,y2) in pixels
rois = {}  # seat_id(str) -> (x1,y1,x2,y2) normalized floats
seat_id_auto = 21  # 자동 증가 시작값(원하면 바꾸기)

def clamp_rect(x1, y1, x2, y2, w, h):
    x1 = max(0, min(x1, w - 1))
    x2 = max(0, min(x2, w - 1))
    y1 = max(0, min(y1, h - 1))
    y2 = max(0, min(y2, h - 1))
    return x1, y1, x2, y2

def to_norm_rect(px_rect, w, h):
    x1, y1, x2, y2 = px_rect
    return (
        round(x1 / w, 6),
        round(y1 / h, 6),
        round(x2 / w, 6),
        round(y2 / h, 6),
    )

def draw_existing_rois(img):
    h, w = img.shape[:2]
    for k, (nx1, ny1, nx2, ny2) in rois.items():
        x1, y1 = int(nx1 * w), int(ny1 * h)
        x2, y2 = int(nx2 * w), int(ny2 * h)
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(img, f"seat {k}", (x1, max(0, y1 - 8)), FONT, 0.6, (0, 255, 0), 2)

def mouse_cb(event, x, y, flags, param):
    global drawing, x0, y0, current_rect

    img, w, h = param["img"], param["w"], param["h"]

    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        x0, y0 = x, y
        current_rect = None

    elif event == cv2.EVENT_MOUSEMOVE and drawing:
        x1, y1 = x0, y0
        x2, y2 = x, y
        # 정렬
        x1, x2 = sorted([x1, x2])
        y1, y2 = sorted([y1, y2])
        x1, y1, x2, y2 = clamp_rect(x1, y1, x2, y2, w, h)
        current_rect = (x1, y1, x2, y2)

    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        if current_rect is None:
            return

        # 너무 작은 ROI는 무시
        x1, y1, x2, y2 = current_rect
        if (x2 - x1) < 10 or (y2 - y1) < 10:
            current_rect = None
            return

        # seat_id 입력(권장) 또는 자동 증가
        mode = param["mode"]  # "manual" or "auto"
        global seat_id_auto

        if mode == "manual":
            seat = input("Seat ID 입력 (예: 21): ").strip()
            if not seat.isdigit():
                print("숫자 seat_id만 허용. 취소됨.")
                current_rect = None
                return
            seat_id = seat
        else:
            seat_id = str(seat_id_auto)
            seat_id_auto += 1
            print(f"[AUTO] seat_id={seat_id}")

        rois[seat_id] = to_norm_rect(current_rect, w, h)
        print(f"Saved seat {seat_id}: {rois[seat_id]}")
        current_rect = None

def save_json(camera_id, source):
    data = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "cameras": [
            {
                "camera_id": camera_id,
                "source": source,
                "seat_rois": rois
            }
        ]
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] saved -> {OUTPUT_JSON}")

def main():
    print("=== ROI Labeler ===")
    print("1) 이미지 파일로 ROI 찍기")
    print("2) 비디오/RTSP에서 프레임 캡처 후 ROI 찍기")
    choice = input("선택(1/2): ").strip()

    mode = input("seat_id 입력 모드: manual/auto (추천: manual) : ").strip().lower()
    if mode not in ("manual", "auto"):
        mode = "manual"

    camera_id = input("camera_id 입력 (예: cam-1): ").strip() or "cam-1"

    if choice == "1":
        path = input("이미지 경로 입력: ").strip()
        if not os.path.exists(path):
            raise FileNotFoundError(path)

        img0 = cv2.imread(path)
        if img0 is None:
            raise RuntimeError("이미지를 읽을 수 없습니다.")

        source = path  # 기록용
        frame = img0

    else:
        source = input("비디오/RTSP source 입력 (예: 0 또는 rtsp://...): ").strip()
        cap_src = 0 if source.isdigit() else source
        cap = cv2.VideoCapture(cap_src)

        if not cap.isOpened():
            raise RuntimeError(f"VideoCapture 열기 실패: {source}")

        print("영상이 열렸습니다. 스페이스(SPACE)로 현재 프레임을 캡처하세요. q로 종료.")
        while True:
            ret, frame = cap.read()
            if not ret:
                continue
            view = frame.copy()
            cv2.putText(view, "Press SPACE to capture frame, q to quit", (10, 30), FONT, 0.7, (0, 255, 255), 2)
            cv2.imshow("Capture", view)
            key = cv2.waitKey(1) & 0xFF
            if key == ord(" "):
                break
            if key == ord("q"):
                cap.release()
                cv2.destroyAllWindows()
                return
        cap.release()
        cv2.destroyWindow("Capture")

    h, w = frame.shape[:2]
    param = {"img": frame, "w": w, "h": h, "mode": mode}

    cv2.namedWindow(WINDOW_NAME)
    cv2.setMouseCallback(WINDOW_NAME, mouse_cb, param)

    print("\n조작법:")
    print("- 마우스 드래그: ROI 사각형 지정")
    print("- s: JSON 저장")
    print("- u: 마지막 ROI 삭제(Undo)")
    print("- r: 모두 삭제(Reset)")
    print("- q 또는 ESC: 종료\n")

    while True:
        canvas = frame.copy()
        draw_existing_rois(canvas)

        # 드래그 중인 사각형 표시
        if current_rect is not None:
            x1, y1, x2, y2 = current_rect
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (255, 0, 0), 2)

        cv2.putText(canvas, f"ROI count: {len(rois)} | mode: {mode}", (10, h - 15), FONT, 0.6, (255, 255, 255), 2)
        cv2.imshow(WINDOW_NAME, canvas)

        key = cv2.waitKey(20) & 0xFF

        if key in (27, ord("q")):  # ESC or q
            break

        if key == ord("u"):
            # 마지막 입력 삭제(가장 최근 seat_id)
            if rois:
                last_key = list(rois.keys())[-1]
                rois.pop(last_key, None)
                print(f"[UNDO] removed seat {last_key}")

        if key == ord("r"):
            rois.clear()
            print("[RESET] cleared all rois")

        if key == ord("s"):
            save_json(camera_id=camera_id, source=str(source))

    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
