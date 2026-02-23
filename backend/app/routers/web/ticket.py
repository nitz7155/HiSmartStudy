from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Body
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from datetime import datetime, timedelta
from models import Product, Member, Order, Seat, MileageHistory, SeatUsage
from utils.auth_utils import get_cookies_info
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler


router = APIRouter(prefix="/api/web", tags=["웹사이트 관리"])

# 좌석 상태 초기화 스케줄러
def reset_seat_status():
    db: Session = SessionLocal()
    try:
        now = datetime.now().date()
        print("[스케줄러] 좌석 초기화 작업 시작")
    
        expired_seats = (
            db.query(Order.fixed_seat_id).filter(Order.period_end_date < now).filter(Order.fixed_seat_id.isnot(None)).distinct().all()
        )

        expired_idx = [s[0] for s in expired_seats]

        if expired_idx:
            updated = db.query(Seat).filter(Seat.seat_id.in_(expired_idx)).filter(Seat.is_status == False).update({"is_status": True}, synchronize_session=False)
            db.commit()

            if updated > 0:
                print("기간이 만료된 좌석이 발견되어 사용가능 처리했습니다. 좌석 ID :", expired_idx)
            else:
                print("사용 중인 좌석 중 기간만료된 좌석이 없습니다.")

    except Exception as e:
        db.rollback()
        print("좌석 상태 업데이트 중 오류 발생 :", str(e))

    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(reset_seat_status, 'cron', hour=0, minute=0)
    scheduler.start()

# ===== 로그인 사용자 정보 가져오기 (수정함) =====
@router.get("/me")
def getMemberInfo(token = Depends(get_cookies_info), db: Session = Depends(get_db)):
    """로그인한 사용자 정보 및 계정 상태 가져오기"""

    id = token["member_id"]
    result = db.query(Member).filter(Member.member_id == id).filter(Member.is_deleted_at == False).first()

    if not result:
        return None # 또는 404 에러 처리

    # 1. 비밀번호 보유 여부 확인 (NULL이거나 빈 문자열이면 False)
    has_password = True if result.password else False

    # 2. 소셜 연동 상태 확인 (각 컬럼에 ID가 있으면 연동된 것)
    social_connected = {
        "kakao": bool(result.kakao_id),
        "naver": bool(result.naver_id),
        "google": bool(result.google_id)
    }

    user = {
        "email": result.email,
        "phone": result.phone,
        "name": result.name,
        "total_mileage": result.total_mileage,
        "has_password": has_password,
        "social_connected": social_connected
    }

    return user

# ===== 좌석 관련 =====
# 좌석현황 조회
@router.get("/seat")
def getSeatStatus(db: Session = Depends(get_db)):
    """좌석현황 조회 (웹 사용자용 - 보안을 위해 정보 제한)"""
    seats = db.query(Seat).order_by(Seat.seat_id).all()
    
    result = []
    now = datetime.now()

    for seat in seats:
        seat_info = {
            "seat_id": seat.seat_id,
            "type": seat.type,
            "is_status": seat.is_status, # DB의 물리적 상태
            "is_occupied": False,        # 논리적 점유 여부 (사용중/점검중 구분용)
            "near_window": seat.near_window,
            "corner_seat": seat.corner_seat,
            "aisle_seat": seat.aisle_seat,
            "isolated": seat.isolated,
            "near_beverage_table": seat.near_beverage_table,
            "is_center": seat.is_center
        }

        # 좌석이 비어있지 않은 경우(is_status=False) 상세 체크
        if not seat.is_status:
            # 1. 현재 입실(사용) 중인지 확인
            usage_exists = db.query(SeatUsage).filter(
                SeatUsage.seat_id == seat.seat_id,
                SeatUsage.check_out_time == None
            ).first()

            if usage_exists:
                seat_info["is_occupied"] = True
            else:
                # 2. 입실은 안 했지만 기간제/고정석 예약이 있는지 확인
                order_exists = db.query(Order).filter(
                    Order.fixed_seat_id == seat.seat_id,
                    Order.period_end_date >= now.date()
                ).first()
                
                if order_exists:
                    seat_info["is_occupied"] = True
        
        # is_status=False인데 is_occupied=False라면 -> 실제 점검중인 상태가 됨
        result.append(seat_info)

    return result

# 좌석별 종료시간 조회
@router.get("/seat/endtime/{id}")
def getSeatEndTime(id: int, db: Session = Depends(get_db)):
    """좌석별 종료시간 안내함수"""
    now = datetime.now()

    result = db.query(Order).filter(Order.seat_id == id, Order.period_end_date > now).first()

    if not result: 
        return {"end_time" : None}

    return {"end_time" : result.period_end_date}

# ===== 이용권 관련 =====
@router.get("/tickets")
def getTicketList(db: Session = Depends(get_db)):
    """이용권 목록 조회로직"""

    # is_exposured 컬럼이 False인 데이터는 조회 X
    tickets = db.query(Product).filter(Product.is_exposured).order_by(Product.value).all()

    return tickets

# ===== 결제 관련 =====
@router.post("/payments")
def getPaymentPage(ticketData: dict = Body(...), user: dict = Body(...), SelectSeat: Optional[dict] = Body(None), db: Session = Depends(get_db), token = Depends(get_cookies_info)):
    """사용자가 이용권 선택 후 결제내역 받아오는 로직"""

    ticket = ticketData
    useMileage = ticket["price"] - ticket["total_amount"]

    id = token["member_id"]
    member = db.query(Member).filter(Member.member_id == id).first()

    order = Order(
            member_id = member.member_id,
            product_id = ticket["product_id"],
            buyer_phone = user["phone"],
            payment_amount = ticket["total_amount"]
        )
    
    # 기간제 이용권일 때만 좌석 + 날짜 정보 추가
    if SelectSeat is not None:
        now = datetime.now()

        # 기존 이용권 기간 만료 여부 확인
        latest_order = (db.query(Order.period_end_date).filter(Order.member_id == id).filter(Order.period_end_date != None).order_by(Order.order_id.desc()).first())
        latest_expiration_date = latest_order[0] if latest_order else None
        if latest_expiration_date and latest_expiration_date.date() > now.date() :
            raise HTTPException(status_code=400, detail="이용권 기간이 남아있는 상태에서는 새로운 기간제 이용권을 구매할 수 없습니다.")
        
        order.period_start_date = now.date()
        order.period_end_date = (now + timedelta(days=ticket["value"])).date()
        order.fixed_seat_id = SelectSeat["seat_id"]

        # 좌석 사용불가 처리
        seat = db.query(Seat).filter(Seat.seat_id == order.fixed_seat_id).first()
        seat.is_status = False
        db.add(seat)
    else:
        member.saved_time_minute += ticket["value"] * 60
    
    db.add(order)
    db.flush()

    # 마일리지 사용했을 경우
    if useMileage > 0:
        db.add(MileageHistory(
            member_id = order.member_id,
            amount = useMileage,
            type = "use"
        ))

        # 사용 가능한 마일리지보다 사용한 마일리지가 더 클 때 -> 데이터 변조 방지
        if member.total_mileage < useMileage:
            raise HTTPException(status_code=400, detail="사용 가능한 마일리지가 부족합니다.")
        
        # 사용자의 총 마일리지에서 사용한 만큼 차감
        member.total_mileage -= useMileage

    # 마일리지 적립 (적립률 1%)
    if order.payment_amount > 0:
        earnPoint = int(order.payment_amount * 0.01)
        db.add(MileageHistory(
                member_id = order.member_id,
                amount = earnPoint,
                type = "earn"
            ))
        # 사용자의 총 마일리지에서 적립된 마일리지 추가
        member.total_mileage += earnPoint

    db.commit()
    db.refresh(order)

    return order
