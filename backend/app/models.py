from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, BigInteger, Text, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base

# ----------------------------------------------------------------------------------------------------------------------
# PRODUCTS
# ----------------------------------------------------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    product_id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    price = Column(Integer, nullable=False)
    value = Column(Integer, nullable=False)
    is_exposured = Column(Boolean, server_default="true")

    orders = relationship("Order", back_populates="product")

# ----------------------------------------------------------------------------------------------------------------------
# SEATS
# ----------------------------------------------------------------------------------------------------------------------
class Seat(Base):
    __tablename__ = "seats"

    seat_id = Column(BigInteger, primary_key=True, autoincrement=True)
    type = Column(String(10), nullable=False)
    is_status = Column(Boolean, server_default="true")
    near_window = Column(Boolean, server_default="false")
    corner_seat = Column(Boolean, server_default="false")
    aisle_seat = Column(Boolean, server_default="false")
    isolated = Column(Boolean, server_default="false")
    near_beverage_table = Column(Boolean, server_default="false")
    is_center = Column(Boolean, server_default="false")

    seat_usages = relationship("SeatUsage", back_populates="seat")

# ----------------------------------------------------------------------------------------------------------------------
# MEMBERS
# ----------------------------------------------------------------------------------------------------------------------
class Member(Base):
    __tablename__ = "members"

    member_id = Column(BigInteger, primary_key=True, autoincrement=True)
    login_id = Column(String(50), unique=True, nullable=True)
    password = Column(String(255), nullable=True)
    phone = Column(String(20), unique=True)
    email = Column(String(100))
    birthday = Column(String(20), nullable=True)
    pin_code = Column(Integer, nullable=True)
    social_type = Column(String(20), nullable=True)
    total_mileage = Column(Integer, server_default="0")
    saved_time_minute = Column(Integer, server_default="0")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted_at = Column(Boolean, server_default="false")
    name = Column(String(30), nullable=False)
    role = Column(String(20), nullable=False, server_default="user")
    kakao_id = Column(String(255), unique=True)
    naver_id = Column(String(255), unique=True)
    google_id = Column(String(255), unique=True)

    tokens = relationship("Token", back_populates="member", cascade="all, delete")
    orders = relationship("Order", back_populates="member")
    seat_usages = relationship("SeatUsage", back_populates="member", cascade="all, delete")
    mileage_history = relationship("MileageHistory", back_populates="member", cascade="all, delete")
    user_todos = relationship("UserTODO", back_populates="member", cascade="all, delete")
    ai_chat_logs = relationship("AIChatLog", back_populates="member", cascade="all, delete")
    schedule_events = relationship("ScheduleEvent", back_populates="member", cascade="all, delete")

# ----------------------------------------------------------------------------------------------------------------------
# TOKENS
# ----------------------------------------------------------------------------------------------------------------------
class Token(Base):
    __tablename__ = "tokens"

    token_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="CASCADE"))
    token = Column(String(512))
    expires_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, server_default="false")
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", back_populates="tokens")

# ----------------------------------------------------------------------------------------------------------------------
# ORDERS
# ----------------------------------------------------------------------------------------------------------------------
class Order(Base):
    __tablename__ = "orders"

    order_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="SET NULL"), nullable=True)
    product_id = Column(BigInteger, ForeignKey("products.product_id", ondelete="SET NULL"), nullable=True)
    buyer_phone = Column(String(20), nullable=True)
    payment_amount = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    period_start_date = Column(DateTime, nullable=True)
    period_end_date = Column(DateTime, nullable=True)
    fixed_seat_id = Column(BigInteger, nullable=True)

    member = relationship("Member", back_populates="orders")
    product = relationship("Product", back_populates="orders")
    seat_usage = relationship("SeatUsage", back_populates="order", uselist=False)

# ----------------------------------------------------------------------------------------------------------------------
# SEAT_USAGE
# ----------------------------------------------------------------------------------------------------------------------
class SeatUsage(Base):
    __tablename__ = "seat_usage"

    usage_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id", ondelete="SET NULL"), nullable=True)
    seat_id = Column(BigInteger, ForeignKey("seats.seat_id", ondelete="SET NULL"), nullable=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="CASCADE"), nullable=True)
    check_in_time = Column(DateTime, server_default=func.now())
    check_out_time = Column(DateTime, nullable=True)
    is_attended = Column(Boolean, server_default="false")
    ticket_expired_time = Column(DateTime, nullable=True)
    total_in_time = Column(Integer, nullable=True)

    order = relationship("Order", back_populates="seat_usage")
    seat = relationship("Seat", back_populates="seat_usages")
    member = relationship("Member", back_populates="seat_usages")

# ----------------------------------------------------------------------------------------------------------------------
# MILEAGE_HISTORY
# ----------------------------------------------------------------------------------------------------------------------
class MileageHistory(Base):
    __tablename__ = "mileage_history"

    history_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="CASCADE"))
    amount = Column(Integer, nullable=False)
    type = Column(String(10), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", back_populates="mileage_history")

# ----------------------------------------------------------------------------------------------------------------------
# TODOS
# ----------------------------------------------------------------------------------------------------------------------
class TODO(Base):
    __tablename__ = "todos"

    todo_id = Column(BigInteger, primary_key=True, autoincrement=True)
    todo_type = Column(String(20))
    todo_title = Column(String(100))
    todo_content = Column(Text)
    todo_value = Column(Integer)
    betting_mileage = Column(Integer)
    payback_mileage_percent = Column(Integer)
    is_exposed = Column(Boolean, server_default="true")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user_todos = relationship("UserTODO", back_populates="todos", cascade="all, delete")

# ----------------------------------------------------------------------------------------------------------------------
# USER_TODOS
# ----------------------------------------------------------------------------------------------------------------------
class UserTODO(Base):
    __tablename__ = "user_todos"

    user_todo_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="SET NULL"), nullable=True)
    todo_id = Column(BigInteger, ForeignKey("todos.todo_id", ondelete="SET NULL"), nullable=True)
    is_achieved = Column(Boolean, server_default="false")
    started_at = Column(DateTime, server_default=func.now())
    achieved_at = Column(DateTime, onupdate=func.now())

    member = relationship("Member", back_populates="user_todos")
    todos = relationship("TODO", back_populates="user_todos")

# ----------------------------------------------------------------------------------------------------------------------
# AI CHAT LOGS
# ----------------------------------------------------------------------------------------------------------------------
class AIChatLog(Base):
    __tablename__ = "ai_chat_logs"

    ai_chat_logs_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20)) # 'user' 또는 'ai'
    message = Column(Text)    # 실제 대화 내용
    created_at = Column(DateTime, server_default=func.now())

    member = relationship("Member", back_populates="ai_chat_logs")
    schedule_events = relationship("ScheduleEvent", back_populates="ai_chat_logs")

# ----------------------------------------------------------------------------------------------------------------------
# SCHEDULE EVENTS
# ----------------------------------------------------------------------------------------------------------------------
class ScheduleEvent(Base):
    __tablename__ = "schedule_events"

    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    member_id = Column(BigInteger, ForeignKey("members.member_id", ondelete="CASCADE"), nullable=False)
    ai_chat_log_id = Column(BigInteger, ForeignKey("ai_chat_logs.ai_chat_logs_id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    schedule_date = Column(Date)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    description = Column(Text)
    color = Column(String(20), default="blue")
    title_embedding = Column(Vector(768))
    description_embedding = Column(Vector(768))

    member = relationship("Member", back_populates="schedule_events")
    ai_chat_logs = relationship("AIChatLog", back_populates="schedule_events")