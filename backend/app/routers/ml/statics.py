from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
import random
from typing import Optional
from database import get_db
from models import Member, Seat, SeatUsage
from datetime import datetime, timedelta
from collections import Counter, defaultdict

router = APIRouter(prefix="/api/statics", tags=["Statistics services"])

MIN_VALID_MEMBER_ID = 3

SEAT_TYPE_MESSAGES = {
    "창가석": {
        "analysis": [
            "자연광이 들어오는 밝은 환경을 선호하는 경향이 있어요.",
            "시야가 트인 자리에서 공부할 때 집중 흐름이 더 좋아 보입니다.",
            "개방감이 있는 환경에서 편안함을 느끼는 타입이에요.",
        ],
        "coaching": [
            "오늘도 창가에서 상쾌한 분위기로 집중을 시작해보세요.",
            "밝은 환경은 공부 리듬을 안정적으로 유지하는 데 도움이 돼요.",
            "자연광을 활용해 집중력을 자연스럽게 끌어올려보세요.",
        ],
    },
    "코너석": {
        "analysis": [
            "방해받지 않는 조용한 공간을 선호하는 편이에요.",
            "주변 움직임이 적은 구석 자리에서 안정감을 느끼는 스타일입니다.",
            "몰입력을 높이기 위해 외부 자극을 최소화하는 패턴을 보이고 있어요.",
        ],
        "coaching": [
            "오늘은 차분하게 몰입할 수 있는 코너석이 잘 맞을 것 같아요.",
            "조용한 위치는 집중 유지에 더욱 도움이 됩니다.",
            "코너 자리에서 안정적인 학습 흐름을 만들어보세요.",
        ],
    },
    "고립석": {
        "analysis": [
            "외부 자극이 적은 독립적 공간을 선호하는 집중형 타입이에요.",
            "혼자만의 공간에서 학습 효율이 더 높아지는 경향이 있어요.",
            "최근 고립된 환경을 더 자주 선택하는 패턴이 나타나고 있어요.",
        ],
        "coaching": [
            "깊은 집중이 필요하다면 고립된 자리에서 시작해보세요.",
            "오늘은 조용한 환경에서 몰입 세션을 만들어보는 것도 좋아요.",
            "방해 요소가 적은 공간에서 집중 퀄리티를 높여보세요.",
        ],
    },
    "통로석": {
        "analysis": [
            "이동이 편한 자리를 선호하는 경향이 있어요.",
            "자리 이동을 자주 하거나 잠깐 리프레시가 필요한 패턴이 보여요.",
            "빠른 출입이 가능해 부담 없는 환경을 선호하는 스타일입니다.",
        ],
        "coaching": [
            "짧은 휴식을 자주 취한다면 통로석이 잘 맞아요.",
            "오늘도 부담 없이 자리 이동을 할 수 있는 위치에서 시작해보세요.",
            "동선이 편한 자리를 활용해 공부 흐름을 자연스럽게 만들어보세요.",
        ],
    },
    "중앙석": {
        "analysis": [
            "적당한 주변 활동이 있는 환경에서 안정감을 느끼는 편이에요.",
            "주변 분위기가 학습 리듬을 잡는 데 도움이 되는 타입입니다.",
            "너무 조용하지 않은 공간에서 집중이 더 잘 이루어질 수 있어요.",
        ],
        "coaching": [
            "오늘은 적당한 활기가 있는 자리에서 공부를 시작해보는 건 어떨까요?",
            "중앙의 안정적인 분위기를 활용해 자연스러운 몰입을 만들어보세요.",
            "적당한 주변 소음이 집중 리듬 유지에 도움이 될 수 있어요.",
        ],
    },
    "음료바근처": {
        "analysis": [
            "물이나 음료를 자주 이용하는 편으로 보여요.",
            "짧은 리프레시를 자주 하는 학습 패턴이 있습니다.",
            "편의 접근성이 좋은 자리를 선호하는 경향이 있어요.",
        ],
        "coaching": [
            "오늘도 부담 없이 리프레시할 수 있는 자리에서 공부를 시작해보세요.",
            "간단히 물을 마시거나 휴식을 취하며 리듬을 잘 유지해보세요.",
            "편의 시설이 가까우면 공부 흐름이 더 안정적으로 유지돼요.",
        ],
    },
    "일반석": {
        "analysis": [
            "특정 환경에 크게 구애받지 않는 유연한 학습 스타일이에요.",
            "여러 좌석을 균형 있게 사용하는 패턴을 보이고 있어요.",
            "환경보다는 현재 학습 목표 자체에 더 집중하는 타입입니다.",
        ],
        "coaching": [
            "오늘은 원하는 자리에서 편하게 시작해보세요.",
            "유연한 패턴은 다양한 환경에서도 집중력을 유지하는 데 큰 장점이에요.",
            "그날의 컨디션에 맞는 자리를 자유롭게 선택해보세요.",
        ],
    },
}

WEEKDAY_LABELS = {
    0: "월요일",
    1: "화요일",
    2: "수요일",
    3: "목요일",
    4: "금요일",
    5: "토요일",
    6: "일요일",
}


def ensure_valid_member(member_id: int, db: Session) -> None:
    user = (
        db.query(Member.member_id)
        .filter(Member.member_id == member_id, Member.is_deleted_at == False)
        .first()
    )
    if member_id < MIN_VALID_MEMBER_ID or not user:
        raise HTTPException(status_code=400, detail="유효하지 않은 회원 ID입니다")


def calculate_ratio(counter: Counter) -> dict:
    total = sum(counter.values())
    if not total:
        return {}
    return {seat_type: count / total for seat_type, count in counter.items()}


def determine_trend_type(recent_ratio: dict, past_ratio: dict) -> str:
    trend = []
    for seat_type in set(list(recent_ratio.keys()) + list(past_ratio.keys())):
        diff = recent_ratio.get(seat_type, 0.0) - past_ratio.get(seat_type, 0.0)
        trend.append((seat_type, diff))

    if not trend:
        return "일반석"

    trend.sort(key=lambda x: x[1], reverse=True)
    return trend[0][0]


def pick_messages(seat_type: str) -> dict:
    data = SEAT_TYPE_MESSAGES.get(seat_type, SEAT_TYPE_MESSAGES["일반석"])
    return {
        "analysis": random.choice(data["analysis"]),
        "coaching": random.choice(data["coaching"]),
    }


def calculate_frequently_used_seats(rows: list) -> list:
    seat_time_dict = defaultdict(lambda: {"duration": 0.0, "seat": None})
    for usage, seat in rows:
        duration = (usage.check_out_time - usage.check_in_time).total_seconds() / 60.0
        record = seat_time_dict[seat.seat_id]
        record["duration"] += duration
        record["seat"] = seat

    sorted_seats = sorted(
        seat_time_dict.items(),
        key=lambda item: item[1]["duration"],
        reverse=True,
    )

    frequently_used = []
    for seat_id, data in sorted_seats[:3]:
        frequently_used.append(
            {
                "seat_id": seat_id,
                "seat_use_time": round(data["duration"], 2),
                "seat_type": classify_seat_type(data["seat"]),
            }
        )
    return frequently_used


def aggregate_seat_attr(rows: list, total_count: int):
    mid_index = 5 if 10 <= total_count < 20 else 10

    def build_ratio(segment):
        counter = Counter([classify_seat_type(seat) for _, seat in segment])
        return calculate_ratio(counter)

    recent_ratio = build_ratio(rows[:mid_index])
    past_ratio = build_ratio(rows[mid_index : mid_index * 2])
    overall_ratio = build_ratio(rows)

    seat_attr = [
        {"seat_type": seat_type, "ratio": round(ratio, 2)}
        for seat_type, ratio in overall_ratio.items()
    ]
    top_type = determine_trend_type(recent_ratio, past_ratio)
    return seat_attr, top_type


def aggregate_time_stats(usages: list, start_time: datetime) -> dict:
    total_usage = 0.0
    focus_time = 0.0

    for usage in usages:
        if usage.check_in_time < start_time:
            continue
        duration = (usage.check_out_time - usage.check_in_time).total_seconds() / 60.0
        if duration > 0:
            total_usage += duration
        focus_time += usage.total_in_time or 0

    focus_ratio = round(focus_time / total_usage, 2) if total_usage else 0.0
    return {
        "total_usage_minute": round(total_usage, 2),
        "focus_time_minute": round(focus_time, 2),
        "focus_ratio": focus_ratio,
    }


def load_usages_since(db: Session, member_id: int, start_time: datetime):
    return (
        db.query(SeatUsage)
        .filter(
            SeatUsage.member_id == member_id,
            SeatUsage.check_out_time.isnot(None),
            SeatUsage.check_in_time >= start_time,
        )
        .all()
    )

# seat type 문자열 함수
def classify_seat_type(seat):
    if seat.near_window:
        return "창가석"
    if seat.corner_seat:
        return "코너석"
    if seat.aisle_seat:
        return "통로석"
    if seat.isolated:
        return "고립석"
    if seat.near_beverage_table:
        return "음료바근처"
    if seat.is_center:
        return "중앙석"
    return "일반석"


def minutes_between(usage: SeatUsage) -> float:
    if not usage.check_in_time or not usage.check_out_time:
        return 0.0
    duration = (usage.check_out_time - usage.check_in_time).total_seconds() / 60.0
    return max(duration, 0.0)


def sum_focus_within(usages: list, start_time: datetime, end_time: Optional[datetime] = None) -> float:
    total = 0.0
    for usage in usages:
        check_in = usage.check_in_time
        if check_in < start_time:
            continue
        if end_time and check_in >= end_time:
            continue
        total += usage.total_in_time or 0
    return total


def build_trend_message(trend: str, difference: float) -> dict:
    diff_abs = round(abs(difference), 2)
    if trend == "increase":
        return {
            "analysis": f"이번 주 집중 시간이 지난주보다 {diff_abs}분 늘었어요.",
            "coaching": "상승세를 유지할 수 있도록 비슷한 루틴을 이어가보세요.",
        }
    if trend == "decrease":
        return {
            "analysis": f"이번 주 집중 시간이 지난주보다 {diff_abs}분 줄었어요.",
            "coaching": "컨디션 조절과 휴식을 통해 집중 흐름을 다시 만들어보세요.",
        }
    return {
        "analysis": "이번 주와 지난주의 집중 시간이 거의 비슷한 수준이에요.",
        "coaching": "안정적인 패턴을 유지하면서 조금씩 사용 시간을 늘려보는 건 어떨까요?",
    }


def calculate_best_focus_day(usages: list) -> dict:
    daily_stats = defaultdict(lambda: {"focus": 0.0, "usage": 0.0})
    for usage in usages:
        day_key = usage.check_in_time.date()
        daily_stats[day_key]["focus"] += usage.total_in_time or 0
        daily_stats[day_key]["usage"] += minutes_between(usage)

    best_day = None
    best_ratio = 0.0
    for day, stat in daily_stats.items():
        if not stat["usage"]:
            continue
        ratio = stat["focus"] / stat["usage"]
        if ratio > best_ratio:
            best_ratio = ratio
            best_day = day

    if not best_day:
        return {"day": None, "focus_ratio": 0.0}

    return {
        "day": WEEKDAY_LABELS[best_day.weekday()],
        "focus_ratio": round(best_ratio, 2),
    }


def calculate_top_focus_hour(usages: list) -> dict:
    hourly_focus = defaultdict(float)
    for usage in usages:
        hour = usage.check_in_time.hour
        hourly_focus[hour] += usage.total_in_time or 0

    if not hourly_focus:
        return {"hour": None, "total_focus_minute": 0.0}

    top_hour, total_focus = max(hourly_focus.items(), key=lambda item: item[1])
    return {"hour": top_hour, "total_focus_minute": round(total_focus, 2)}


def calculate_average_daily_focus(total_focus: float, days: int) -> float:
    return round(total_focus / days, 2) if days else 0.0


def calculate_longest_streak(usages: list) -> int:
    dates = sorted({usage.check_in_time.date() for usage in usages})
    if not dates:
        return 0

    longest = 1
    current = 1
    previous = dates[0]

    for day in dates[1:]:
        if day == previous + timedelta(days=1):
            current += 1
        else:
            current = 1
        longest = max(longest, current)
        previous = day

    return longest


def aggregate_daily_usage(usages: list, start_time: datetime, days: int = 7) -> list:
    end_time = start_time + timedelta(days=days)
    daily_data = defaultdict(lambda: {"usage": 0.0, "focus": 0.0})

    for usage in usages:
        check_in = usage.check_in_time
        if check_in < start_time or check_in >= end_time:
            continue
        day_key = check_in.date()
        daily_data[day_key]["usage"] += minutes_between(usage)
        daily_data[day_key]["focus"] += usage.total_in_time or 0

    day_stats = []
    for i in range(days):
        day_date = (start_time + timedelta(days=i)).date()
        stats = daily_data.get(day_date, {"usage": 0.0, "focus": 0.0})
        day_stats.append(
            {
                "date": day_date.isoformat(),
                "weekday": WEEKDAY_LABELS[day_date.weekday()],
                "usage_minute": round(stats["usage"], 2),
                "focus_minute": round(stats["focus"], 2),
            }
        )

    return day_stats


"""좌석 통계 API"""
@router.get("/seats")
def seat_statistics(member_id: int, db: Session = Depends(get_db)):
    ensure_valid_member(member_id, db)

    rows = (
        db.query(SeatUsage, Seat)
        .join(Seat, SeatUsage.seat_id == Seat.seat_id)
        .filter(
            SeatUsage.member_id == member_id,
            SeatUsage.check_out_time.isnot(None),
        )
        .order_by(SeatUsage.check_in_time.desc())
        .limit(20)
        .all()
    )

    total_count = len(rows)
    if total_count <= 10:
        return JSONResponse(
            status_code=200,
            content={
                "frequently_seat_use": [],
                "seat_attr": [],
                "message": {
                    "analysis": "아직 사용량이 적어 좌석을 제시해드릴 수 없어요",
                    "coaching": "더 많은 사용을 통해 취향에 맞는 좌석을 추천해드릴께요",
                },
            },
        )

    frequently_seat_use = calculate_frequently_used_seats(rows)
    seat_attr, top_type = aggregate_seat_attr(rows, total_count)

    return JSONResponse(
        status_code=200,
        content={
            "frequently_seat_use": frequently_seat_use,
            "seat_attr": seat_attr,
            "message": pick_messages(top_type),
        },
    )


@router.get("/times")
def time_statistics(member_id: int, db: Session = Depends(get_db)):
    ensure_valid_member(member_id, db)

    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    usages = load_usages_since(db, member_id, month_start)
    weekly_stats = aggregate_time_stats(usages, week_start)
    monthly_stats = aggregate_time_stats(usages, month_start)
    daily_stats = aggregate_daily_usage(usages, week_start)

    return JSONResponse(
        status_code=200,
        content={
            "weekly": weekly_stats,
            "monthly": monthly_stats,
            "days": daily_stats,
        },
    )


@router.get("/seat/analysis")
def seat_analysis(member_id: int, db: Session = Depends(get_db)):
    ensure_valid_member(member_id, db)

    now = datetime.utcnow()
    month_start = now - timedelta(days=30)
    usages = load_usages_since(db, member_id, month_start)

    if not usages:
        empty_message = {
            "analysis": "아직 집중 기록이 부족해 패턴을 분석하기 어려워요.",
            "coaching": "조금 더 자주 이용하면 맞춤형 코칭을 전해드릴 수 있어요.",
        }
        return JSONResponse(
            status_code=200,
            content={
                "average_focus_minute": 0.0,
                "best_record": {"minute": 0.0, "date": None},
                "weekly_change": {"difference_minute": 0.0, "trend": "flat"},
                "message": empty_message,
            },
        )

    focus_values = [usage.total_in_time or 0 for usage in usages]
    total_focus = sum(focus_values)
    average_focus = round(total_focus / len(focus_values), 2) if focus_values else 0.0

    best_usage = max(usages, key=lambda u: u.total_in_time or 0)
    best_minutes = round(best_usage.total_in_time or 0, 2)
    best_date = best_usage.check_in_time.strftime("%Y-%m-%d") if best_usage.check_in_time else None

    current_week_start = now - timedelta(days=7)
    previous_week_start = now - timedelta(days=14)
    current_week_focus = sum_focus_within(usages, current_week_start)
    previous_week_focus = sum_focus_within(usages, previous_week_start, current_week_start)
    difference = round(current_week_focus - previous_week_focus, 2)

    if difference > 0:
        trend = "increase"
    elif difference < 0:
        trend = "decrease"
    else:
        trend = "flat"

    return JSONResponse(
        status_code=200,
        content={
            "average_focus_minute": average_focus,
            "best_record": {"minute": best_minutes, "date": best_date},
            "weekly_change": {"difference_minute": difference, "trend": trend},
            "message": build_trend_message(trend, difference),
        },
    )


@router.get("/seat/pattern")
def seat_pattern(member_id: int, db: Session = Depends(get_db)):
    ensure_valid_member(member_id, db)

    now = datetime.utcnow()
    month_start = now - timedelta(days=30)
    week_start = now - timedelta(days=7)
    usages = load_usages_since(db, member_id, month_start)
    week_usages = [usage for usage in usages if usage.check_in_time >= week_start]

    best_focus_day = calculate_best_focus_day(week_usages)
    top_focus_hour = calculate_top_focus_hour(week_usages)
    total_week_focus = sum(usage.total_in_time or 0 for usage in week_usages)
    avg_daily_focus = calculate_average_daily_focus(total_week_focus, 7)
    longest_streak = calculate_longest_streak(usages)

    return JSONResponse(
        status_code=200,
        content={
            "top_focus_day": best_focus_day,
            "top_focus_hour": top_focus_hour,
            "avg_daily_focus_minute": avg_daily_focus,
            "longest_streak_days": longest_streak,
        },
    )
