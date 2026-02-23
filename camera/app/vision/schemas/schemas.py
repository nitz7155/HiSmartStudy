from enum import Enum
from pydantic import BaseModel
from datetime import datetime

class SeatEventType(str, Enum) :
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"
    LOST_ITEM = "LOST_ITEM"

class SeatEvent(BaseModel) :
    seat_id : int
    event_type : SeatEventType
    detected_at : datetime
    minutes : int | None = None
    usage_id : int | None = None
    camera_id : str | None = None
    items : list | None = None
    image_base64 : str | None = None
