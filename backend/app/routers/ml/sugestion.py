from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi.params import Body
from sqlalchemy.sql import func
import random
from database import get_db
from models import Member, Product, Order, Seat, SeatUsage
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["AI services"])

@router.post("/seat")
def seat_suggestion(member_id : int = Body(...),
                    db : Session = Depends(get_db)) :
    # 자리 추천 알고리즘
    # 1) 회원 정보 조회 / 없으면 에러
    member = db.query(Member).filter(Member.member_id == member_id).first()
    if not member :
        raise HTTPException(status_code=404, detail="회원 정보를 찾을 수 없습니다")

    # 추천을 위해 빈자리 조회
    empty_seat = db.query(Seat).filter(Seat.is_status == True, Seat.seat_id > 20).all() 
    
    # 빈자리 없는 경우 에러
    if not empty_seat :
        raise HTTPException(status_code=404, detail="이용 가능한 좌석이 없습니다")
    
    # 1-1) 비회원일 경우 비어있는 자유석 중 랜덤으로 자리 추천
    if member.member_id == 1 :
        chosen_seat = random.choice(empty_seat)
        return JSONResponse(status_code=200, content={
            "seat_id" : chosen_seat.seat_id,
            "type" : chosen_seat.type
        })

    # 2) 회원의 사용빈도 / 사용시간 / 선호도 점수
    # 2-1) 사용빈도 / 사용시간
    usage_stats_raw = (
        db.query(
            SeatUsage.seat_id,
            # 시트 별 사용횟수
            func.count(SeatUsage.usage_id).label("use_count"),
            # 시트 별 총 사용시간(분)
            func.sum(
                func.extract(
                    "epoch",
                    SeatUsage.check_out_time - SeatUsage.check_in_time,
                ) / 60.0
            ).label("total_minutes"),
        )
        .filter(
            SeatUsage.member_id == member_id,
            SeatUsage.check_out_time.isnot(None),  # 퇴실 완료된 내역만
        )
        .group_by(SeatUsage.seat_id)
        .all()
    )

    # 시트별 사용 통계 맵
    stats_map = {
        row.seat_id: {
            "use_count": row.use_count,
            "total_minutes": float(row.total_minutes or 0.0),
        }
        for row in usage_stats_raw
    }

    # 2-2) 선호도 점수
    # seat 정보 테이블 수정 필요
    # [seat_id, type, near_window,
    #  corner_seat,	aisle_seat,	isolated,
    #  near_beverage_table,	is_center]
    
    # 과거 정보 조회 - 어떤 좌석을 주로 이용했는지
    past_usage = (
        db.query(SeatUsage, Seat)
        .join(Seat, SeatUsage.seat_id == Seat.seat_id)
        .filter(
            SeatUsage.member_id == member_id,
            SeatUsage.check_out_time.isnot(None)
        ).all()
    )

    total_uses = len(past_usage)

    # 선호도 점수 계산
    # 이력이 없는 신규 회원인 경우
    if total_uses == 0 :
        chosen_seat = random.choice(empty_seat)
        return JSONResponse(status_code=200, content={
            "seat_id" : chosen_seat.seat_id,
            "type" : chosen_seat.type
        })
    
    # 속성별 카운팅
    # 속성 초기화
    preference_counts = {
        "near_window": 0,
        "corner_seat": 0,
        "aisle_seat": 0,
        "isolated": 0,
        "near_beverage_table": 0,
        "is_center": 0,
    }

    # 내가 선택한 좌석의 속성들 카운팅
    for usage, seat in past_usage:
        for attr in preference_counts.keys():
            if getattr(seat, attr, False):
                preference_counts[attr] += 1

    # 선호도 = 사용 비율(0.0 ~ 1.0)
    preference_scores = {
        attr: count / total_uses for attr, count in preference_counts.items()
    }

    # 3) 좌석 추천을 위한 빈 좌석의 점수 계산
    best_seat = None
    best_score = -1e9

    for seat in empty_seat:
        seat_id = seat.seat_id
        stats = stats_map.get(seat_id, {"use_count": 0, "total_minutes": 0.0})

        use_count = stats["use_count"]
        total_minutes = stats["total_minutes"]

        # 선호도 점수 계산 = (내 취향) * (좌석 속성)
        attr_score = (
            preference_scores["near_window"] * (1 if seat.near_window else 0) +
            preference_scores["corner_seat"] * (1 if seat.corner_seat else 0) +
            preference_scores["aisle_seat"] * (1 if seat.aisle_seat else 0) +
            preference_scores["isolated"] * (1 if seat.isolated else 0) +
            preference_scores["near_beverage_table"] * (1 if seat.near_beverage_table else 0) +
            preference_scores["is_center"] * (1 if seat.is_center else 0)
        )

        # 종합 점수 계산
        score = (
            (1 / (1 + use_count)) * 0.4 +  # 사용빈도 가중치 40%
            (1 / (1 + total_minutes)) * 0.4 +  # 사용시간 가중치 40%
            attr_score * 0.2  # 선호도 가중치 20%
        )

        if score > best_score:
            best_score = score
            best_seat = seat

    # 극단적으로 best_seat가 선정되지 않는 경우를 방지
    if not best_seat : 
        chosen_seat = random.choice(empty_seat)
        return JSONResponse(status_code=200, content={
            "seat_id" : chosen_seat.seat_id,
            "type" : chosen_seat.type
        })
    
    return JSONResponse(status_code=200, content={
        "seat_id" : best_seat.seat_id,
        "type" : best_seat.type
    })