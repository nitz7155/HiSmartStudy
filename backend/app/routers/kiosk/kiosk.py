from fastapi import APIRouter, Depends, HTTPException, Body, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Member, Product, Order, Seat, SeatUsage, MileageHistory, TODO, UserTODO
from schemas import PinAuthRequest
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import cast, Date, func, distinct
import requests
import time
import base64
import os

router = APIRouter(prefix="/api/kiosk")

# ------------------------
# [설정] AI 카메라 서버 설정
# ------------------------
CAMERA_SERVER = "http://localhost:12454"
CAPTURE_DIR = "captures/real"
os.makedirs(CAPTURE_DIR, exist_ok=True)

# ------------------------
# [Helper] 이미지 저장 함수
# ------------------------
def save_base64_image(image_base64: str, seat_id: int, usage_id: int):
    if not image_base64:
        return None
    
    times = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"seat{seat_id}_usage{usage_id}_{times}.jpg"
    file_path = os.path.join(CAPTURE_DIR, filename)

    try:
        image_bytes = base64.b64decode(image_base64)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        return f"/{CAPTURE_DIR}/{filename}" 
    except Exception as e:
        print(f"[Error] Image save failed: {e}")
        return None

# ------------------------
# [Helper] AI 예측 요청 함수 (퇴실용)
# ------------------------
def capture_predict(seat_id: int, usage_id: int):
    try:
        res = requests.post(
            f"{CAMERA_SERVER}/camera/checkout",
            json={"seat_id": seat_id, "usage_id": usage_id},
            timeout=5
        )
        
        if res.status_code not in (200, 202):
            return False, None, [], "Camera Error"

        job_id = res.json().get("job_id", usage_id)

        for _ in range(10):
            time.sleep(0.3)
            res_poll = requests.get(f"{CAMERA_SERVER}/camera/lost-item/result/{job_id}", timeout=2)
            
            if res_poll.status_code != 200:
                continue

            result_data = res_poll.json().get("result", {})
            
            if result_data.get("done") is True:
                items = result_data.get("items", [])
                image_b64 = result_data.get("image_base64")
                
                if items:
                    img_path = save_base64_image(image_b64, seat_id, usage_id)
                    return True, img_path, items, "Detected"
                else:
                    return False, None, [], "Clean"
        
        return False, None, [], "Timeout"

    except Exception as e:
        return False, None, [], str(e)

# ------------------------
# [Helper] AI 입실 알림 요청 함수
# ------------------------
def trigger_camera_checkin(seat_id: int, usage_id: int):
    try:
        requests.post(
            f"{CAMERA_SERVER}/camera/checkin",
            json={"seat_id": seat_id, "usage_id": usage_id},
            timeout=2
        )
    except Exception as e:
        print(f"[Warning] Camera check-in request failed: {e}")

# ------------------------
# 전화번호 없이 비회원 조회 또는 생성
# ------------------------
def get_or_create_guest(db: Session):
    guest = db.query(Member).filter(Member.member_id == 2).first()

    if guest:
        if guest.role != "guest":
            guest.role = "guest"
            db.add(guest)
            db.commit()
            db.refresh(guest)
        return guest

    new_guest = Member(
        member_id=2,          
        phone="",             
        social_type="",
        role="guest",
        name="비회원",
        total_mileage=0,
        saved_time_minute=0
    )
    db.add(new_guest)
    db.commit()
    db.refresh(new_guest)
    return new_guest

# ------------------------
# 1) 회원 로그인
# ------------------------
@router.post("/auth/member-login")
def member_login(data: PinAuthRequest, db: Session = Depends(get_db)):
    member = db.query(Member).filter(
        Member.phone == data.phone,
        Member.role != "guest"
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="등록된 회원 정보가 없습니다.")
    
    if member.pin_code != data.pin:
        raise HTTPException(status_code=401, detail="PIN 번호가 일치하지 않습니다.")

    now = datetime.now()
    active_period = db.query(Order).join(Product).filter(
        Order.member_id == member.member_id,
        Order.period_end_date > now,
        Product.type == '기간제'
    ).order_by(Order.period_end_date.desc()).first()

    my_fixed_seat_id = None
    if active_period:
        if active_period.fixed_seat_id:
            my_fixed_seat_id = active_period.fixed_seat_id
        else:
            last_fix_usage = db.query(SeatUsage).join(Seat).filter(
                SeatUsage.member_id == member.member_id,
                Seat.type == 'fix'
            ).order_by(SeatUsage.check_in_time.desc()).first()
            
            if last_fix_usage:
                my_fixed_seat_id = last_fix_usage.seat_id

    return {
        "member_id": member.member_id,
        "name": member.name,
        "phone": member.phone,
        "saved_time_minute": member.saved_time_minute, 
        "total_mileage": member.total_mileage,
        "has_period_pass": True if active_period else False,
        "my_fixed_seat_id": my_fixed_seat_id
    }

# ------------------------
# 2) 이용권 목록 조회
# ------------------------
@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(
        Product.is_exposured == True,
        Product.type == "시간제"
    ).all()
    return [
        {
            "product_id": p.product_id,
            "name": p.name,
            "type": p.type,
            "price": p.price,
            "value": p.value
        } for p in products
    ]

# ------------------------
# 3) 이용권 구매
# ------------------------
@router.post("/purchase")
def purchase_ticket(
    product_id: int = Body(...),    
    member_id: int = Body(...),     
    phone: str = Body(None),
    use_mileage: int = Body(0),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="이용권이 존재하지 않습니다.")

    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        if member_id == 2:
            member = get_or_create_guest(db)
        else:
             raise HTTPException(status_code=404, detail="회원 정보가 없습니다.")

    if member.role == "guest" and phone:
        member.phone = phone
        db.add(member)
        db.flush()

    if member.saved_time_minute is None: member.saved_time_minute = 0
    if member.total_mileage is None: member.total_mileage = 0

    if use_mileage > 0:        
        if member.total_mileage < use_mileage:
            raise HTTPException(status_code=400, detail="보유 마일리지가 부족합니다.")
        if use_mileage > product.price:
            raise HTTPException(status_code=400, detail="상품 금액보다 많은 마일리지를 사용할 수 없습니다.")

        member.total_mileage -= use_mileage
        db.add(MileageHistory(member_id=member.member_id, amount=use_mileage, type="use"))

    final_payment_amount = product.price - use_mileage

    if member.role != "guest":
        if product.type == "시간제":
            member.saved_time_minute += product.value * 60

        earned_mileage = final_payment_amount // 10
        if earned_mileage > 0:
            member.total_mileage += earned_mileage
            db.add(MileageHistory(member_id=member_id, amount=earned_mileage, type="earn"))

        db.add(member)
        db.flush() 

    order = Order(
        member_id=member_id,
        product_id=product_id,
        buyer_phone=phone,
        payment_amount=final_payment_amount,
        created_at=datetime.now()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    response_data = {
        "order_id": order.order_id,
        "product_name": product.name,
        "price": product.price,
        "used_mileage": use_mileage,
        "final_price": final_payment_amount
    }
    if member.role != "guest":
        response_data["saved_time_minute"] = member.saved_time_minute 
        response_data["total_mileage"] = member.total_mileage
        
    return response_data

# ------------------------
# 4) 좌석 목록 조회 (수정됨)
# ------------------------
@router.get("/seats")
def list_seats(db: Session = Depends(get_db)):
    seats = db.query(Seat).order_by(Seat.seat_id).all()
    
    results = []
    now = datetime.now()

    for s in seats:
        seat_type_str = "기간제" if s.type == "fix" else "자유석"

        seat_data = {
            "seat_id": s.seat_id,
            "type": seat_type_str,
            "near_window": s.near_window,
            "corner_seat": s.corner_seat,
            "aisle_seat": s.aisle_seat,
            "isolated": s.isolated,
            "near_beverage_table": s.near_beverage_table,
            "is_center": s.is_center,
            "is_status": s.is_status, # 나중에 기간제 로직에 의해 덮어씌워질 수 있음
            "is_real_checkin": not s.is_status, # [추가] 실제 입실 여부 (DB 물리 상태 기준)
            "user_name": None,
            "remaining_time": None,
            "ticket_expired_time": None,
            "role": None
        }

        # 1. 고정석(fix)인 경우, 유효한 주인 및 만료일 확인
        fixed_owner_name = None
        fixed_expire_time = None

        if s.type == "fix":
            active_fixed_order = db.query(Order).filter(
                Order.fixed_seat_id == s.seat_id,
                Order.period_end_date > now
            ).order_by(Order.period_end_date.desc()).first()
            
            if active_fixed_order:
                owner_member = db.query(Member).filter(Member.member_id == active_fixed_order.member_id).first()
                if owner_member:
                    fixed_owner_name = owner_member.name
                    fixed_expire_time = active_fixed_order.period_end_date

        # 2. 실제 입실 중인지 확인
        if s.is_status: # 물리적으로 비어있음
            # 입실 안 했지만 고정석 주인이 있는 경우 -> 입실 모드에서는 '사용중'으로 보여야 함
            if fixed_owner_name:
                seat_data["is_status"] = False  
                seat_data["user_name"] = fixed_owner_name
                seat_data["role"] = "member"
                seat_data["ticket_expired_time"] = fixed_expire_time
        
        # 입실 중인 경우
        else:
            active_usage = db.query(SeatUsage).filter(
                SeatUsage.seat_id == s.seat_id,
                SeatUsage.check_out_time == None
            ).first()

            if active_usage:
                member = db.query(Member).filter(Member.member_id == active_usage.member_id).first()
                if member:
                    seat_data["user_name"] = member.name
                    seat_data["role"] = member.role
                
                if active_usage.ticket_expired_time:
                    seat_data["ticket_expired_time"] = active_usage.ticket_expired_time
                    remain_delta = active_usage.ticket_expired_time - now
                    minutes = int(remain_delta.total_seconds() / 60)
                    seat_data["remaining_time"] = max(minutes, 0)
            else:
                # [수정] 실제 이용(SeatUsage) 기록이 없으면, 실제 입실 상태가 아님을 명시
                seat_data["is_real_checkin"] = False

                # 입실은 안 했지만, 기간제/고정석 예약이 있는 경우 확인
                reserved_order = db.query(Order).filter(
                    Order.fixed_seat_id == s.seat_id,
                    Order.period_end_date > now
                ).order_by(Order.period_end_date.desc()).first()

                if reserved_order:
                    owner = db.query(Member).filter(Member.member_id == reserved_order.member_id).first()
                    if owner:
                        seat_data["user_name"] = owner.name # 예약자 이름 표시
                        seat_data["role"] = "member"
                        seat_data["ticket_expired_time"] = reserved_order.period_end_date
                else:
                    seat_data["user_name"] = "점검중" # 예약도 없고 입실도 없으면 점검중
        
        results.append(seat_data)

    return results

# ------------------------
# 5) 입실 (AI 연동)
# ------------------------
@router.post("/check-in")
def check_in(
    phone: str = Body(...),
    seat_id: int = Body(...),
    order_id: Optional[int] = Body(None), 
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.phone == phone).first()
    if not member:
        clean_phone = phone.replace("-", "")
        if clean_phone != phone:
            member = db.query(Member).filter(Member.phone == clean_phone).first()
    if not member:
        member = get_or_create_guest(db)
    
    member_id_to_use = member.member_id

    # 이미 다른 좌석에 입실 중인지 확인
    if member.role != "guest":
        active_usage = db.query(SeatUsage).filter(SeatUsage.member_id == member_id_to_use, SeatUsage.check_out_time == None).first()
        if active_usage:
            raise HTTPException(status_code=400, detail="이미 입실 중입니다.")

    seat = db.query(Seat).filter(Seat.seat_id == seat_id).first()
    if not seat: raise HTTPException(status_code=404, detail="좌석 정보 없음")
    
    # [수정 부분]
    # 물리적으로 사용 중(False)이더라도, 고정석 주인이 본인인지 먼저 확인해야 합니다.
    if not seat.is_status:
        # 현재 이 좌석을 실제로 사용 중인 기록(SeatUsage)이 있는지 확인
        active_usage = db.query(SeatUsage).filter(
            SeatUsage.seat_id == seat_id, 
            SeatUsage.check_out_time == None
        ).first()
        
        # 실제 입실 기록이 있다면 진짜로 사용 중인 것임
        if active_usage:
            # 단, 그 사용자가 본인이면 이미 입실 중인 상태이므로 예외 처리
            if active_usage.member_id == member.member_id:
                raise HTTPException(status_code=400, detail="이미 입실 중인 좌석입니다.")
            raise HTTPException(status_code=400, detail="이미 사용 중인 좌석입니다.")
    
    # 논리적 점유(기간제) 체크
    if seat.type == "fix":
        now = datetime.now()
        occupied_order = db.query(Order).filter(
            Order.fixed_seat_id == seat_id,
            Order.period_end_date > now
        ).order_by(Order.period_end_date.desc()).first()

        if occupied_order:
            # 주인이 있는데, 그게 내가 아니면 차단
            if occupied_order.member_id != member_id_to_use:
                raise HTTPException(status_code=400, detail="지정된 사용자가 있는 고정석입니다.")
            # 주인이 나면 통과

    expired_time = None
    now = datetime.now()
    
    if member.role != "guest":
        if seat.type == "fix":
            active_period_order = db.query(Order).join(Product).filter(
                Order.member_id == member.member_id,
                Order.period_end_date > now,
                Product.type == '기간제'
            ).order_by(Order.period_end_date.desc()).first()

            if not active_period_order:
                raise HTTPException(status_code=400, detail="유효한 기간제 이용권이 없습니다.")
            
            # 내가 가진 이용권이 이 좌석을 위한 것인지 확인 (선택 사항, 엄격하게 하려면 추가)
            if active_period_order.fixed_seat_id and active_period_order.fixed_seat_id != seat_id:
                 raise HTTPException(status_code=400, detail=f"회원님의 고정석은 {active_period_order.fixed_seat_id}번 입니다.")

            expired_time = active_period_order.period_end_date
        else:
            if member.saved_time_minute <= 0:
                raise HTTPException(status_code=400, detail="시간제 이용권(잔여 시간)이 부족합니다.")
            expired_time = now + timedelta(minutes=member.saved_time_minute)
    else:
        if not order_id: raise HTTPException(status_code=400, detail="주문 정보 필요")
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order: raise HTTPException(status_code=404, detail="주문 정보 없음")
        product = db.query(Product).filter(Product.product_id == order.product_id).first()
        ticket_duration_minutes = product.value * 60
        expired_time = now + timedelta(minutes=ticket_duration_minutes)
        order.period_start_date = now
        order.period_end_date = expired_time
        db.add(order)
        
    usage = SeatUsage(
        member_id=member_id_to_use,
        seat_id=seat_id,
        order_id=order_id,
        check_in_time=now,
        ticket_expired_time=expired_time
    )
    db.add(usage)
    
    seat.is_status = False
    db.add(seat)

    db.commit()
    db.refresh(usage)

    trigger_camera_checkin(seat_id, usage.usage_id)

    return {
        "usage_id": usage.usage_id,
        "check_in_time": usage.check_in_time,
        "seat_id": seat_id,  
        "ticket_expired_time": usage.ticket_expired_time
    }

# ------------------------
# 6) 퇴실 (AI YOLO 및 Todo)
# ------------------------
@router.post("/check-out")
def check_out(
    seat_id: int = Body(...),
    phone: Optional[str] = Body(None),
    pin: Optional[int] = Body(None),
    force: bool = Body(False), 
    db: Session = Depends(get_db)
):
    now = datetime.now()

    usage = db.query(SeatUsage).filter(
        SeatUsage.seat_id == seat_id,
        SeatUsage.check_out_time == None
    ).first()

    if not usage:
        raise HTTPException(status_code=404, detail="해당 좌석의 입실 기록을 찾을 수 없습니다.")

    member = db.query(Member).filter(Member.member_id == usage.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="입실자 정보를 찾을 수 없습니다.")

    if member.role == "guest":
        if not phone: raise HTTPException(status_code=400, detail="비회원은 전화번호 입력이 필요합니다.")
        if not usage.order: raise HTTPException(status_code=400, detail="비회원 주문 정보를 찾을 수 없습니다.")
        input_phone = phone.replace("-", "")
        db_phone = usage.order.buyer_phone.replace("-", "") if usage.order.buyer_phone else ""
        if input_phone != db_phone: raise HTTPException(status_code=401, detail="전화번호가 일치하지 않습니다.")
    else:
        if not force:
            if pin is None: raise HTTPException(status_code=400, detail="회원은 PIN 번호 입력이 필요합니다.")
            if member.pin_code != pin: raise HTTPException(status_code=401, detail="PIN 번호가 일치하지 않습니다.")

    if not force:
        try:
            is_detected, img_path, classes, msg = capture_predict(seat_id, usage.usage_id)
            if is_detected:
                web_image_url = img_path.replace("\\", "/") if img_path else ""

                # [수정 후] 딕셔너리에서 'name' 필드만 추출하여 문자열로 변환
                item_names = [str(item.get("name", "Unknown")) for item in classes]

                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "DETECTED",
                        "message": f"이용하신 좌석에 놓고 가신 물건이 감지되었습니다.",
                        "image_url": web_image_url
                    }
                )
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            print(f"[Warning] YOLO Error: {e}")

    time_used = now - usage.check_in_time
    time_used_minutes = int(time_used.total_seconds() / 60)
    
    seat = db.query(Seat).filter(Seat.seat_id == seat_id).first()
    already_attended = False

    if member.role != "guest":
        if time_used_minutes >= 0: 
            check_in_date = usage.check_in_time.date()
            existing_attendance = db.query(SeatUsage).filter(
                SeatUsage.member_id == member.member_id,
                cast(SeatUsage.check_in_time, Date) == check_in_date,
                SeatUsage.is_attended == True
            ).first()

            if not existing_attendance:
                usage.is_attended = True
            else:
                already_attended = True

        if seat and seat.type != "fix":
            member.saved_time_minute -= time_used_minutes
            if member.saved_time_minute < 0:
                member.saved_time_minute = 0 
    
    usage.check_out_time = now
    
    if seat:
        seat.is_status = True
        db.add(seat)

    db.add(usage)
    db.add(member)
    db.flush() 

    todo_results = []
    
    if member.role != "guest":
        active_todos = db.query(UserTODO).join(TODO).filter(
            UserTODO.member_id == member.member_id,
            UserTODO.is_achieved == False
        ).all()

        for user_todo in active_todos:
            todo_def = user_todo.todos
            is_cleared = False
            current_val = 0
            
            if todo_def.todo_type == 'time':
                total_seconds = db.query(func.sum(
                    func.extract('epoch', SeatUsage.check_out_time - SeatUsage.check_in_time)
                )).filter(
                    SeatUsage.member_id == member.member_id,
                    SeatUsage.check_out_time != None,
                    SeatUsage.check_in_time >= user_todo.started_at
                ).scalar() or 0
                
                current_val = int(total_seconds / 60)
                if current_val >= todo_def.todo_value:
                    is_cleared = True

            elif todo_def.todo_type == 'attendance':
                attend_count = db.query(func.count(distinct(cast(SeatUsage.check_in_time, Date)))).filter(
                    SeatUsage.member_id == member.member_id,
                    SeatUsage.is_attended == True,
                    SeatUsage.check_in_time >= user_todo.started_at
                ).scalar() or 0
                
                current_val = attend_count
                if current_val >= todo_def.todo_value:
                    is_cleared = True

            reward_amount = 0
            if is_cleared:
                user_todo.is_achieved = True
                user_todo.achieved_at = now
                
                payback_rate = 1 + (todo_def.payback_mileage_percent / 100.0)
                reward_amount = int(todo_def.betting_mileage * payback_rate)
                
                if reward_amount > 0:
                    member.total_mileage += reward_amount
                    db.add(MileageHistory(member_id=member.member_id, amount=reward_amount, type="prize"))
            
            todo_results.append({
                "title": todo_def.todo_title,
                "type": todo_def.todo_type,
                "goal_value": todo_def.todo_value,
                "current_value": current_val,
                "is_achieved_now": is_cleared,
                "reward_amount": reward_amount
            })

    db.commit()
    db.refresh(usage)

    return {
        "usage_id": usage.usage_id,
        "seat_id": seat_id,
        "check_out_time": usage.check_out_time.isoformat(),
        "time_used_minutes": time_used_minutes,
        "remaining_time_minutes": member.saved_time_minute if member.role != "guest" else 0,
        "is_attended": usage.is_attended, 
        "already_attended": already_attended,
        "todo_results": todo_results
    }

# ------------------------
# AI로부터 시간 업데이트 수신
# ------------------------
@router.post("/checktime")
def checktime_seat(payload: dict = Body(...), db: Session = Depends(get_db)):
    seat_id = payload.get("seat_id")
    usage_id = payload.get("usage_id")
    minutes = payload.get("minutes", 0)

    try:
        seatusage = db.query(SeatUsage).filter(
            SeatUsage.usage_id == int(usage_id), 
            SeatUsage.seat_id == int(seat_id)
        ).first()
        
        if not seatusage:
            raise HTTPException(status_code=404, detail="SeatUsage not found")

        current = seatusage.total_in_time or 0
        seatusage.total_in_time = current + int(minutes)

        db.commit()
        db.refresh(seatusage)

        return {"status": True, "message": "Success"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예기치 않은 오류: {e}")