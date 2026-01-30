from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Literal, List

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------------------------------------------------------------------------
# 마이페이지
# ----------------------------------------------------------------------------------------------------------------------
class ModifyEmail(BaseSchema):
    email: str
class CheckOrModifyPw(BaseSchema):
    password: str
class ModifyPin(BaseSchema):
    pin: int
# === 사용자가 선택한 todo 정보 insert 요청 스키마 ===
class TodoSelectReq(BaseSchema):
    todo_id : int

# ----------------------------------------------------------------------------------------------------------------------
# Web Auth
# ----------------------------------------------------------------------------------------------------------------------
class MemberBase(BaseSchema):
    pass

class MemberSignup(MemberBase):
    name: str
    login_id: str
    password: str
    phone: str
    email: str
    birthday: str
    pin_code: str

class MemberLogin(MemberBase):
    login_id: str
    password: str

class MemberGoogleOnboarding(MemberBase):
    phone: str
    birthday: str
    pin_code: str

class TokenBase(BaseSchema):
    member_id: int
    token: str
    expires_at: Optional[datetime] = None

class TokenResponse(TokenBase):
    is_revoked: bool
    created_at: datetime

# ----------------------------------------------------------------------------------------------------------------------
# 키오스크 AUTH (추가)
# ----------------------------------------------------------------------------------------------------------------------
class PinAuthRequest(BaseSchema):
    phone: str
    pin: int

# ----------------------------------------------------------------------------------------------------------------------
# 관리자 관련 스키마
# ----------------------------------------------------------------------------------------------------------------------
class DailySalesStat(BaseSchema):
    date: str
    product_type: str
    total_sales: int
    order_count: int

class TodoCreate(BaseSchema):
    todo_type: str              # 'attendance' (출석) or 'time' (학습시간)
    todo_title: str
    todo_content: str
    todo_value: int             # 목표치 (일수 or 시간)
    betting_mileage: int        # 참가 비용
    payback_mileage_percent: int # 성공 시 페이백 비율 (%)
    is_exposed: bool = True     # 노출 여부

class TodoUpdate(BaseSchema):
    todo_type: Optional[str] = None
    todo_title: Optional[str] = None
    todo_content: Optional[str] = None
    todo_value: Optional[int] = None
    betting_mileage: Optional[int] = None
    payback_mileage_percent: Optional[int] = None
    is_exposed: Optional[bool] = None

class TodoResponse(TodoCreate):
    todo_id: int
    created_at: datetime
    updated_at: datetime
    participant_count: int = 0
    achievement_count: int = 0  # [추가] 달성자 수

class MemberAdminResponse(BaseSchema):
    member_id: int
    name: str
    login_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    birthday: Optional[str] = None
    saved_time_minute: int = 0
    total_mileage: int
    created_at: datetime
    is_deleted_at: bool
    total_usage_minutes: int = 0
    active_todo_count: int = 0
    current_seat_id: Optional[int] = None

class MemberUpdatePhone(BaseSchema):
    phone: str

class ProductCreate(BaseSchema):
    name: str
    type: str               # '기간제', '시간제' 등
    price: int
    value: int              # 기간(일) 또는 시간(분)
    is_exposured: bool = True

class ProductUpdate(BaseSchema):
    name: Optional[str] = None
    type: Optional[str] = None
    price: Optional[int] = None
    value: Optional[int] = None
    is_exposured: Optional[bool] = None

class ProductResponse(ProductCreate):
    product_id: int

# ----------------------------------------------------------------------------------------------------------------------
# ai planner
# ----------------------------------------------------------------------------------------------------------------------
# 응답용
class EventResponse(BaseSchema):
    event_id: int
    title: str
    schedule_date: str      # React는 "YYYY-MM-DD" 문자열을 좋아함 (date 객체 대신)
    start_time: str     # "09:00"
    end_time: str       # "10:30"
    color: str # green, blue, yellow, red
    description: Optional[str] = None

# 통합 응답 포맷
class AiResponse(BaseSchema):
    type: Literal["chat", "create", "update", "delete"]
    message: str # 챗봇의 대답 (말풍선에 들어갈 내용)
    events: List[EventResponse] = [] # 플래너 조작일 경우에만 데이터가 들어감 (단순 대화면 null or empty list)
    target_event_id: Optional[int] = None # 수정/삭제 시 대상 ID
    search_results: List[EventResponse] = []

# 입력 포맷
class ChatRequest(BaseModel):
    member_id: int
    user_input: str

# 수동 요청용 스키마 정의
class ManualEventRequest(BaseModel):
    event_id: Optional[int] = None
    member_id: int
    title: str
    date: str       # YYYY-MM-DD
    start: str      # HH:MM
    end: str        # HH:MM
    color: str
    description: str