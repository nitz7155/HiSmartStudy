# app/routers/admin/admin.py

from fastapi import APIRouter, Response, Depends, Cookie, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, distinct, or_
from typing import List, Dict, Any
from datetime import datetime

from database import get_db
from models import Member, Order, Product, SeatUsage, TODO, UserTODO, Seat
from schemas import (
    MemberLogin, DailySalesStat, TodoCreate, TodoUpdate, TodoResponse, 
    MemberAdminResponse, MemberUpdatePhone,
    ProductCreate, ProductUpdate, ProductResponse
)
from utils.auth_utils import revoke_existing_token, revoke_existing_token_by_id, password_decode, set_token_cookies

router = APIRouter(prefix="/api/admin", tags=["Admin"])

""" 관리자 전용 로그인 (Member ID 1번 고정) """
@router.post("/login")
def admin_login(
    response: Response,
    member_data: MemberLogin,
    db: Session = Depends(get_db),
    refresh_token: str = Cookie(None)
):
    revoke_existing_token(db, refresh_token)

    member = db.query(Member).filter(Member.login_id == member_data.login_id).first()

    if not member or not password_decode(member_data.password, member.password):
        raise HTTPException(status_code=400, detail="incorrect id or password")

    if member.member_id != 1:
        raise HTTPException(status_code=403, detail="Not authorized (Admin only)")

    revoke_existing_token_by_id(db, member.member_id)
    set_token_cookies(member.member_id, member.name, db, response)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "로그아웃 되었습니다."}

# ----------------------------------------------------------------------------------------------------------------------
# STATISTICS (매출 통계)
# ----------------------------------------------------------------------------------------------------------------------
"""
[GET] 월별 일간 매출 통계 조회
Query Parameter: year (YYYY), month (MM)
"""
@router.get("/stats/daily", response_model=List[DailySalesStat])
def get_daily_sales_stats(
    year: int = Query(..., description="조회할 연도"),
    month: int = Query(..., description="조회할 월"),
    db: Session = Depends(get_db)
):
    date_col = func.to_char(Order.created_at, 'YYYY-MM-DD').label("date")

    stats = (
        db.query(
            date_col,
            Product.type.label("product_type"),
            func.sum(Order.payment_amount).label("total_sales"),
            func.count(Order.order_id).label("order_count")
        )
        .join(Product, Order.product_id == Product.product_id)
        .filter(
            extract('year', Order.created_at) == year,
            extract('month', Order.created_at) == month
        )
        .group_by(date_col, Product.type)
        .order_by(date_col)
        .all()
    )

    return stats

@router.get("/stats/products")
def get_product_sales_stats(
    year: int = Query(..., description="조회할 연도"),
    month: int = Query(..., description="조회할 월"),
    db: Session = Depends(get_db)
):
    """
    [GET] 월별 상품 판매 순위 (판매량 기준 내림차순)
    """
    stats = (
        db.query(
            Product.name,
            Product.type,
            func.count(Order.order_id).label("count"),
            func.sum(Order.payment_amount).label("revenue")
        )
        .join(Order, Product.product_id == Order.product_id)
        .filter(
            extract('year', Order.created_at) == year,
            extract('month', Order.created_at) == month
        )
        .group_by(Product.product_id, Product.name, Product.type)
        .order_by(func.count(Order.order_id).desc())
        .all()
    )

    return [
        {
            "name": name,
            "type": p_type,
            "count": count,
            "revenue": revenue or 0
        }
        for name, p_type, count, revenue in stats
    ]

# ----------------------------------------------------------------------------------------------------------------------
# MEMBERS MANAGEMENT
# ----------------------------------------------------------------------------------------------------------------------
@router.get("/members", response_model=List[MemberAdminResponse])
def get_members(
    search: str = Query(None, description="이름/전화번호 검색"),
    db: Session = Depends(get_db)
):
    usage_subquery = (
        db.query(
            SeatUsage.member_id,
            func.sum(
                func.extract('epoch', SeatUsage.check_out_time - SeatUsage.check_in_time) / 60
            ).label("total_usage_minutes")
        )
        .filter(SeatUsage.check_out_time != None)
        .group_by(SeatUsage.member_id)
        .subquery()
    )

    todo_count_subquery = (
        db.query(
            UserTODO.member_id,
            func.count(UserTODO.user_todo_id).label("active_todo_count")
        )
        .filter(UserTODO.is_achieved == False) 
        .group_by(UserTODO.member_id)
        .subquery()
    )

    active_seat_subquery = (
        db.query(
            SeatUsage.member_id,
            SeatUsage.seat_id.label("current_seat_id")
        )
        .filter(SeatUsage.check_out_time == None)
        .subquery()
    )

    query = (
        db.query(
            Member, 
            func.coalesce(usage_subquery.c.total_usage_minutes, 0).label("total_usage_minutes"),
            func.coalesce(todo_count_subquery.c.active_todo_count, 0).label("active_todo_count"),
            active_seat_subquery.c.current_seat_id
        )
        .outerjoin(usage_subquery, Member.member_id == usage_subquery.c.member_id)
        .outerjoin(todo_count_subquery, Member.member_id == todo_count_subquery.c.member_id) 
        .outerjoin(active_seat_subquery, Member.member_id == active_seat_subquery.c.member_id)
        .filter(Member.member_id.notin_([1, 2]))
    )

    if search:
        clean_search = search.replace("-", "")

        query = query.filter(
            or_(
                Member.name.like(f"%{search}%"),
                Member.login_id.like(f"%{search}%"),
                func.replace(Member.phone, '-', '').like(f"%{clean_search}%")
            )
        )
    
    results = query.order_by(Member.created_at.desc()).all()
    
    response = []
    for member, usage_min, todo_count, seat_id in results:
        response.append(MemberAdminResponse(
            member_id=member.member_id,
            name=member.name,
            login_id=member.login_id,
            phone=member.phone,
            email=member.email,
            birthday=member.birthday,
            saved_time_minute=member.saved_time_minute if member.saved_time_minute is not None else 0,
            total_mileage=member.total_mileage if member.total_mileage is not None else 0,
            created_at=member.created_at,
            is_deleted_at=bool(member.is_deleted_at) if member.is_deleted_at is not None else False,
            total_usage_minutes=int(usage_min) if usage_min else 0,
            active_todo_count=int(todo_count) if todo_count else 0,
            current_seat_id=seat_id
        ))
        
    return response

@router.post("/members/{member_id}/checkout")
def force_checkout_member(
    member_id: int,
    db: Session = Depends(get_db)
):
    # 1. 현재 입실 중인 기록 찾기
    usage = db.query(SeatUsage).filter(
        SeatUsage.member_id == member_id,
        SeatUsage.check_out_time == None
    ).first()

    if not usage:
        raise HTTPException(status_code=400, detail="현재 입실 중인 회원이 아닙니다.")
    
    seat = db.query(Seat).filter(Seat.seat_id == usage.seat_id).first()
    member = db.query(Member).filter(Member.member_id == member_id).first()
    
    now = datetime.now()
    
    # 2. 이용 시간 차감 계산 (시간제 이용권일 경우만)
    # (고정석/기간제는 시간 차감이 필요 없으나, 로직에 따라 추가 가능)
    if seat and seat.type != "fix" and member.role != "guest":
        time_used = now - usage.check_in_time
        time_used_minutes = int(time_used.total_seconds() / 60)
        
        member.saved_time_minute -= time_used_minutes
        if member.saved_time_minute < 0:
            member.saved_time_minute = 0
            
    # 3. 퇴실 처리 및 좌석 상태 변경
    usage.check_out_time = now
    if seat:
        seat.is_status = True # 좌석 활성화 (비어있음)

    db.commit()
    
    return {"message": "강제 퇴실 처리되었습니다."}

@router.put("/members/{member_id}/phone")
def update_member_phone(
    member_id: int, 
    req: MemberUpdatePhone, 
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    
    if req.phone:
        exists = db.query(Member).filter(
            Member.phone == req.phone, 
            Member.member_id != member_id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="이미 존재하는 전화번호입니다.")

    member.phone = req.phone
    db.commit()
    
    return {"message": "전화번호가 수정되었습니다."}

# ----------------------------------------------------------------------------------------------------------------------
# SEAT MANAGEMENT
# ----------------------------------------------------------------------------------------------------------------------
@router.get("/stats/seats")
def get_seat_stats(db: Session = Depends(get_db)):
    """
    [GET] 구역별 실시간 좌석 점유 현황 조회
    """
    occupied_seat_ids = db.query(SeatUsage.seat_id).filter(
        SeatUsage.check_out_time == None
    ).all()
    occupied_ids = {row[0] for row in occupied_seat_ids}

    # 중앙석(Island) 범위 확장 (31~50 + 61~70)
    zones = [
        {"name": "고정석 (Private)", "range": range(1, 21)},
        {"name": "창가석 (View)", "range": range(21, 31)},
        {"name": "중앙석 (Island)", "range": list(range(31, 51)) + list(range(61, 71))},
        {"name": "독립석 (Corner)", "range": range(51, 61)},
        {"name": "음료대석 (Easy)", "range": range(71, 91)},
        {"name": "일반석 (Aisle)", "range": range(91, 101)},
    ]

    stats = []
    total_used = 0
    total_count = 0

    for zone in zones:
        zone_total = len(zone["range"])
        zone_used = sum(1 for seat_id in zone["range"] if seat_id in occupied_ids)
        
        stats.append({
            "name": zone["name"],
            "total": zone_total,
            "used": zone_used,
            "rate": round((zone_used / zone_total) * 100) if zone_total > 0 else 0
        })
        
        total_used += zone_used
        total_count += zone_total

    return {
        "total": total_count,
        "used": total_used,
        "remain": total_count - total_used,
        "usage_rate": round((total_used / total_count) * 100) if total_count > 0 else 0,
        "zones": stats
    }

@router.get("/seats/detail")
def get_seat_detail_stats(db: Session = Depends(get_db)):
    """
    [GET] 좌석 관리 페이지용 상세 데이터
    (수정: 입실하지 않은 기간제/고정석 예약자도 '사용중'으로 표시하여 점검중 오해 방지)
    """
    seats = db.query(Seat).order_by(Seat.seat_id).all()
    now = datetime.now()
    
    # 1. 현재 입실 중인 정보 조회 (Active Usage)
    active_usages = (
        db.query(SeatUsage, Member, Order, Product)
        .join(Member, SeatUsage.member_id == Member.member_id)
        .outerjoin(Order, SeatUsage.order_id == Order.order_id)
        .outerjoin(Product, Order.product_id == Product.product_id)
        .filter(SeatUsage.check_out_time == None)
        .all()
    )
    
    usage_map = {}
    for usage, member, order, product in active_usages:
        usage_map[usage.seat_id] = {
            "usage": usage,
            "member": member,
            "order": order,
            "product": product
        }

    # 2. [추가] 기간제/고정석 예약 정보 조회 (입실 안 한 상태여도 주인 있는 좌석)
    # period_end_date가 남아있고, fixed_seat_id가 설정된 주문 검색
    fixed_orders = (
        db.query(Order, Member, Product)
        .join(Member, Order.member_id == Member.member_id)
        .join(Product, Order.product_id == Product.product_id)
        .filter(
            Order.period_end_date > now,
            Order.fixed_seat_id != None
        )
        .all()
    )
    # 좌석 ID를 Key로 매핑
    fixed_map = {
        order.fixed_seat_id: {"order": order, "member": member, "product": product}
        for order, member, product in fixed_orders
    }
    
    seat_list = []
    total_seats = 0
    used_seats = 0
    
    # 구역 정의
    zones_def = [
        {"key": "fix", "name": "고정석 (Private)", "range": range(1, 21)},
        {"key": "view", "name": "창가석 (View)", "range": range(21, 31)},
        {"key": "island", "name": "중앙석 (Island)", "range": list(range(31, 51)) + list(range(61, 71))},
        {"key": "corner", "name": "독립석 (Corner)", "range": range(51, 61)},
        {"key": "easy", "name": "음료대석 (Easy)", "range": range(71, 91)},
        {"key": "aisle", "name": "일반석 (Aisle)", "range": range(91, 101)},
    ]
    
    zone_stats = {
        z["key"]: {"name": z["name"], "total": 0, "used": 0} for z in zones_def
    }

    for seat in seats:
        total_seats += 1
        
        sid = seat.seat_id
        current_zone_key = "aisle"
        for z in zones_def:
            if sid in z["range"]:
                current_zone_key = z["key"]
                break
        
        zone_stats[current_zone_key]["total"] += 1

        seat_info = {
            "seat_id": seat.seat_id,
            "type": seat.type,
            "zone_name": zone_stats[current_zone_key]["name"],
            "zone_key": current_zone_key,
            "is_status": seat.is_status,
            "is_occupied": False, # 논리적 점유 여부 (입실 or 예약)
            "member_id": None,
            "user_name": None,
            "user_phone": None,
            "login_id": None,
            "email": None,
            "created_at": None,
            "total_mileage": 0,
            "saved_time_minute": 0,
            "active_todo_count": 0,
            "total_usage_minutes": 0,
            "check_in_time": None,
            "remaining_info": None,
            "ticket_type": None
        }

        # Case A: 현재 입실 중인 경우 (가장 우선)
        if seat.seat_id in usage_map:
            used_seats += 1
            zone_stats[current_zone_key]["used"] += 1
            
            data = usage_map[seat.seat_id]
            usage = data["usage"]
            member = data["member"]
            order = data["order"]
            product = data["product"]

            seat_info["is_occupied"] = True
            seat_info["member_id"] = member.member_id
            seat_info["user_name"] = member.name
            seat_info["user_phone"] = member.phone
            seat_info["login_id"] = member.login_id
            seat_info["email"] = member.email
            seat_info["created_at"] = member.created_at
            seat_info["total_mileage"] = member.total_mileage
            seat_info["saved_time_minute"] = member.saved_time_minute
            seat_info["check_in_time"] = usage.check_in_time

            # Todo 및 총 이용시간 통계
            todo_count = db.query(func.count(UserTODO.user_todo_id))\
                .filter(UserTODO.member_id == member.member_id, UserTODO.is_achieved == False)\
                .scalar()
            seat_info["active_todo_count"] = todo_count or 0

            total_usage = db.query(func.sum(
                func.extract('epoch', SeatUsage.check_out_time - SeatUsage.check_in_time) / 60
            )).filter(SeatUsage.member_id == member.member_id, SeatUsage.check_out_time != None).scalar()
            seat_info["total_usage_minutes"] = int(total_usage) if total_usage else 0
            
            # 티켓 타입 및 남은 시간 표시
            if product and product.type == '기간제':
                seat_info["ticket_type"] = "기간권"
                if order and order.period_end_date:
                    remain_days = (order.period_end_date.date() - now.date()).days
                    seat_info["remaining_info"] = f"{remain_days}일 남음"
                else:
                    seat_info["remaining_info"] = "-"
            else:
                seat_info["ticket_type"] = "시간권"
                current_duration = (now - usage.check_in_time).total_seconds() / 60
                remain_min = member.saved_time_minute - int(current_duration)
                if remain_min < 0:
                    seat_info["remaining_info"] = f"초과 {abs(remain_min)}분"
                else:
                    h, m = divmod(remain_min, 60)
                    seat_info["remaining_info"] = f"{int(h)}시간 {int(m)}분"

        # Case B: 입실은 안 했지만, 기간제/고정석 예약이 있는 경우 (추가된 로직)
        elif seat.seat_id in fixed_map:
            # 예약되어 있으므로 사용 중(occupied)으로 간주
            used_seats += 1
            zone_stats[current_zone_key]["used"] += 1

            data = fixed_map[seat.seat_id]
            order = data["order"]
            member = data["member"]
            product = data["product"]

            seat_info["is_occupied"] = True
            seat_info["member_id"] = member.member_id
            seat_info["user_name"] = member.name
            seat_info["user_phone"] = member.phone
            seat_info["login_id"] = member.login_id
            seat_info["email"] = member.email
            seat_info["created_at"] = member.created_at
            seat_info["total_mileage"] = member.total_mileage
            seat_info["saved_time_minute"] = member.saved_time_minute
            seat_info["ticket_type"] = "기간권 (미입실)"
            
            # 남은 기간 계산
            remain_days = (order.period_end_date.date() - now.date()).days
            seat_info["remaining_info"] = f"{remain_days}일 남음"

            # 기타 통계 (필요 시 조회)
            todo_count = db.query(func.count(UserTODO.user_todo_id))\
                .filter(UserTODO.member_id == member.member_id, UserTODO.is_achieved == False)\
                .scalar()
            seat_info["active_todo_count"] = todo_count or 0

            total_usage = db.query(func.sum(
                func.extract('epoch', SeatUsage.check_out_time - SeatUsage.check_in_time) / 60
            )).filter(SeatUsage.member_id == member.member_id, SeatUsage.check_out_time != None).scalar()
            seat_info["total_usage_minutes"] = int(total_usage) if total_usage else 0

        # Case C: 입실도 예약도 없는 경우 -> 빈 좌석 or 진짜 점검중
        else:
            # is_status가 False인데 사용자 정보가 없으면 '점검중'으로 표시됨 (프론트엔드 로직)
            pass

        seat_list.append(seat_info)

    summary = {
        "total": total_seats,
        "used": used_seats,
        "remain": total_seats - used_seats,
        "rate": round((used_seats / total_seats) * 100) if total_seats > 0 else 0
    }
    
    formatted_type_stats = []
    for z in zones_def:
        key = z["key"]
        stat = zone_stats[key]
        rate = round((stat["used"] / stat["total"]) * 100) if stat["total"] > 0 else 0
        formatted_type_stats.append({
            "type": key,
            "name": stat["name"],
            "total": stat["total"],
            "used": stat["used"],
            "rate": rate
        })

    return {
        "summary": summary,
        "type_stats": formatted_type_stats,
        "seats": seat_list
    }

@router.put("/seats/{seat_id}/status")
def update_seat_status(
    seat_id: int,
    is_status: bool = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    seat = db.query(Seat).filter(Seat.seat_id == seat_id).first()
    if not seat:
        raise HTTPException(status_code=404, detail="좌석을 찾을 수 없습니다.")
    
    seat.is_status = is_status
    db.commit()
    
    return {"message": "좌석 상태가 변경되었습니다."}

# ----------------------------------------------------------------------------------------------------------------------
# TODO MANAGEMENT
# ----------------------------------------------------------------------------------------------------------------------
@router.get("/todos", response_model=List[TodoResponse])
def get_todos(db: Session = Depends(get_db)):
    todos = db.query(TODO).order_by(TODO.created_at.desc()).all()
    results = []
    for todo in todos:
        # 참가자 수
        p_count = db.query(func.count(UserTODO.user_todo_id))\
            .filter(UserTODO.todo_id == todo.todo_id).scalar()
        
        # 달성자 수 (is_achieved = True)
        a_count = db.query(func.count(UserTODO.user_todo_id))\
            .filter(
                UserTODO.todo_id == todo.todo_id,
                UserTODO.is_achieved == True
            ).scalar()

        results.append(TodoResponse(
            todo_id=todo.todo_id,
            todo_type=todo.todo_type,
            todo_title=todo.todo_title,
            todo_content=todo.todo_content,
            todo_value=todo.todo_value,
            betting_mileage=todo.betting_mileage,
            payback_mileage_percent=todo.payback_mileage_percent,
            is_exposed=todo.is_exposed,
            created_at=todo.created_at,
            updated_at=todo.updated_at,
            participant_count=p_count or 0,
            achievement_count=a_count or 0 
        ))
    return results

@router.post("/todos", response_model=TodoResponse)
def create_todo(todo_data: TodoCreate, db: Session = Depends(get_db)):
    new_todo = TODO(
        todo_type=todo_data.todo_type,
        todo_title=todo_data.todo_title,
        todo_content=todo_data.todo_content,
        todo_value=todo_data.todo_value,
        betting_mileage=todo_data.betting_mileage,
        payback_mileage_percent=todo_data.payback_mileage_percent,
        is_exposed=todo_data.is_exposed
    )
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    
    return TodoResponse(
        **new_todo.__dict__,
        participant_count=0,
        achievement_count=0
    )

@router.put("/todos/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, todo_data: TodoUpdate, db: Session = Depends(get_db)):
    todo = db.query(TODO).filter(TODO.todo_id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    update_data = todo_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(todo, key, value)
    
    db.commit()
    db.refresh(todo)
    
    # Update 시에도 count 정보를 반환하기 위해 재계산
    p_count = db.query(func.count(UserTODO.user_todo_id)).filter(UserTODO.todo_id == todo_id).scalar()
    a_count = db.query(func.count(UserTODO.user_todo_id)).filter(UserTODO.todo_id == todo_id, UserTODO.is_achieved == True).scalar()

    return TodoResponse(
        **todo.__dict__,
        participant_count=p_count or 0,
        achievement_count=a_count or 0
    )

@router.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.query(TODO).filter(TODO.todo_id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    db.delete(todo)
    db.commit()
    return None

# ----------------------------------------------------------------------------------------------------------------------
# PRODUCTS MANAGEMENT
# ----------------------------------------------------------------------------------------------------------------------
@router.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.product_id).all()

@router.post("/products", response_model=ProductResponse)
def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    new_product = Product(
        name=product_data.name,
        type=product_data.type,
        price=product_data.price,
        value=product_data.value,
        is_exposured=product_data.is_exposured
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return None

@router.get("/stats/members")
def get_member_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    
    # 전체 회원 수 (관리자, 비회원 제외)
    total_members = db.query(Member).filter(
        Member.is_deleted_at == False,
        Member.member_id.notin_([1, 2])
    ).count()
    
    # 신규 회원 수
    new_members = db.query(Member).filter(
        extract('year', Member.created_at) == now.year,
        extract('month', Member.created_at) == now.month,
        Member.is_deleted_at == False,
        Member.member_id.notin_([1, 2])
    ).count()
    
    # 기간제 회원: 현재 유효한 기간제 이용권을 가진 회원
    period_members = db.query(distinct(Order.member_id))\
        .join(Product, Order.product_id == Product.product_id)\
        .filter(
            Order.period_end_date > now,
            Product.type == '기간제',
            Order.member_id.notin_([1, 2])
        ).count()

    # 시간제 회원: 남은 시간이 있는 회원
    time_members = db.query(Member).filter(
        Member.saved_time_minute > 0,
        Member.is_deleted_at == False,
        Member.member_id.notin_([1, 2])
    ).count()
    
    # 실시간 이용자 수
    current_users = db.query(SeatUsage).filter(
        SeatUsage.check_out_time == None,
        SeatUsage.member_id != 1
    ).count()

    # 비회원(게스트) 이용 건수 (월간)
    non_members = db.query(distinct(Order.buyer_phone)).filter(
        Order.member_id == 2,
        extract('year', Order.created_at) == now.year,
        extract('month', Order.created_at) == now.month
    ).count()
    
    return {
        "total_members": total_members,
        "new_members": new_members,
        "period_members": period_members,
        "time_members": time_members,
        "current_users": current_users,
        "non_members": non_members
    }