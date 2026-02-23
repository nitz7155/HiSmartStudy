from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Body
from sqlalchemy import desc, exists, extract
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Member, Order, Seat, MileageHistory, SeatUsage, UserTODO, TODO
from utils.auth_utils import get_cookies_info, password_encode, password_decode
from schemas import ModifyEmail, ModifyPin, TodoSelectReq, CheckOrModifyPw
from datetime import datetime

router = APIRouter(prefix="/api/web/mypage", tags=["마이페이지"])

# ===== 로그인 사용자 정보 가져오기 =====
@router.get("")
def get_member_info(token = Depends(get_cookies_info), db: Session = Depends(get_db)):
    """로그인한 사용자 정보 가져오는 로직"""
    current_month = datetime.now().month
    
    id = token["member_id"]
    user = db.query(Member).filter(Member.member_id == id).filter(Member.is_deleted_at == False).first()

    # 이번달에 todo 선택했는지 조회
    selected_todo = db.query(UserTODO).filter(UserTODO.member_id == id, extract('month', UserTODO.started_at) == current_month).order_by(UserTODO.started_at.desc()).first()

    # 선택하지 않았다면
    if not selected_todo:
        return {"user" : user, "todo" : selected_todo}
    
    # 선택했을 경우

    # 선택한 todo의 정보 가져오기
    select_todo_info = db.query(TODO).filter(TODO.todo_id == selected_todo.todo_id).first()
    
    select_time = selected_todo.started_at
    total_minutes = 0

    # 선택날짜 이후 입퇴실 기록 가져오기
    seat_usages = db.query(SeatUsage).filter(SeatUsage.check_in_time >= select_time).filter(SeatUsage.member_id == id).all()

    for usage in seat_usages:
        if usage.check_out_time is not None:
            start = usage.check_in_time
            end = usage.check_out_time
            diff = end - start
            minutes = int(diff.total_seconds() // 60)
            total_minutes += minutes
        else:
            continue
        
    result = {
        # 선택한 todo 이름
        "todo_name": select_todo_info.todo_title,
        # 선택한 todo의 달성조건
        "target_value": select_todo_info.todo_value,
        # 선택한 todo의 현재 달성 값
        "current_value": total_minutes, 
        # 선택한 todo의 타입
        "todo_type": select_todo_info.todo_type
    }

    return {"user" : user, "todo" : result}

# 비밀번호 확인
@router.post("/check/password")
def modify_pw(req: CheckOrModifyPw, db = Depends(get_db), token = Depends(get_cookies_info)):
    """정보수정 전 비밀번호 확인 로직입니다"""

    member = db.query(Member).filter(Member.member_id == token["member_id"]).first()

    if password_decode(req.password, member.password):
        return True
    else:
        return False

# ===== 주문 내역 조회 =====
@router.get("/orders")
def get_member_orders(token = Depends(get_cookies_info), db: Session = Depends(get_db)):
    """로그인한 사용자의 주문 내역 가져오는 로직"""
    member_id = token["member_id"]

    # 주문 + 상품 조인
    orders = (
        db.query(Order, Product)
        .join(Product, Order.product_id == Product.product_id)
        .filter(Order.member_id == member_id)
        .order_by(desc(Order.created_at))
        .all()
    )

    result = []
    for order, product in orders:


        # 체크인 여부 존재하는지 확인
        has_check_in = db.query(
            exists().where(SeatUsage.order_id == order.order_id)
        ).scalar()

        check_in_time = None

        if has_check_in:
            latest_usage = (db.query(SeatUsage).filter(SeatUsage.order_id == order.order_id).order_by(desc(SeatUsage.check_in_time)).first())

            if latest_usage:
                check_in_time = latest_usage.check_in_time

        result.append({
            "order_id": order.order_id,
            "order_date": order.created_at,
            "expiry_date": order.period_end_date,
            "seat_id": order.fixed_seat_id,
            "ticket_name": product.name,
            "ticket_type": product.type,
            "ticket_price": product.price,
            "payment_amount": order.payment_amount,
            "check_in_time" : check_in_time,
            "is_check_in": has_check_in
        })

    return result


# ===== 정보 수정 =====
# 이메일 수정
@router.post("/modify/email")
def modify_email(input: ModifyEmail, db = Depends(get_db), token = Depends(get_cookies_info)):
    """이메일 변경 로직"""

    member = db.query(Member).filter(Member.member_id == token["member_id"]).first()

    if member.email == input.email:
        raise HTTPException(status_code=400, detail="현재 사용중인 이메일입니다.")
    
    member.email = input.email
    db.commit()

    return {"message" : "이메일이 성공적으로 변경되었습니다."}

# 핀코드 수정
@router.post("/modify/pin")
def modify_pin_code(input: ModifyPin, db = Depends(get_db), token = Depends(get_cookies_info)):
    """PIN 코드 변경 로직"""

    member = db.query(Member).filter(Member.member_id == token["member_id"]).first()


    if member.pin_code == input.pin:
        raise HTTPException(status_code=400, detail="현재 사용중인 코드입니다.")
    
    member.pin_code = input.pin
    db.commit()

    return {"message" : "핀코드가 성공적으로 변경되었습니다."}

# 비밀번호 수정
@router.post("/modify/password")
def modify_pw(input: CheckOrModifyPw, db = Depends(get_db), token = Depends(get_cookies_info)):
    """비밀번호 변경 로직"""

    member = db.query(Member).filter(Member.member_id == token["member_id"]).first()

    if password_decode(input.password, member.password):
        raise HTTPException(status_code=400, detail="현재 사용중인 비밀번호입니다.")
    
    member.password = password_encode(input.password)
    db.commit()

    return {"message" : "비밀번호가 성공적으로 변경되었습니다."}
    
    
# ===== todo 목록 관련 =====
# 현재 달(1월, 2월, ... ) todo 정보 가져오기
@router.get("/todo/selected")
def read_selected_todos(db = Depends(get_db)):
    current_month = datetime.now().month

    todoList = db.query(TODO).filter(TODO.is_exposed, extract('month', TODO.created_at) == current_month).all()

    return todoList

# 선택한 todo DB에 저장
@router.post("/todo/select")
def insert_select_todo(data: TodoSelectReq, db = Depends(get_db), token = Depends(get_cookies_info)):
    current_month = datetime.now().month

    # JWT 토큰에서 멤버 ID 꺼내오기
    member_id = token["member_id"]

    # 선택한 todo가 있는지 조회
    selected_todo = db.query(UserTODO).filter(UserTODO.member_id == member_id).filter(extract('month', UserTODO.started_at) == current_month).all()

    # 선택한 todo가 있으면 에러처리
    if len(selected_todo) > 0:
        raise HTTPException(status_code=400, detail="이번달에 이미 도전하고 있는 과제가 있습니다.")
    
    print(data)

    # 없을 경우 insert
    todo = UserTODO(
            member_id = member_id,
            todo_id = data.todo_id
    )

    db.add(todo)
    db.commit()

    return {"message" : "정상 처리되었습니다."}
