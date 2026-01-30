import os
import requests
from zoneinfo import ZoneInfo
from datetime import datetime, time, timedelta
from typing import List, Optional
from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from models import AIChatLog, ScheduleEvent, SeatUsage
from schemas import AiResponse, EventResponse, ChatRequest, ManualEventRequest
from ai_models.sbert import get_embedding_model
from database import get_db
from utils.auth_utils import get_cookies_info

router = APIRouter(prefix="/api/web/plan", tags=["plan"])

load_dotenv()
baseurl = os.getenv("OPENAI_API_BASE_URL")
apikey = os.getenv("OPENAI_API_KEY")
KST = ZoneInfo("Asia/Seoul")

# ------------------------------------------------------------------
# [Helper] 소요 시간 텍스트 생성기 (예: "2시간 30분")
# ------------------------------------------------------------------
def get_duration_text(start: time, end: time) -> str:
    """
    time 객체 두 개를 받아서 'X시간 Y분' 형태의 문자열로 반환
    벡터 검색 시 '10시간 공부' 같은 쿼리에 걸리게 하기 위함
    """
    if not start or not end:
        return ""

    # datetime으로 변환하여 차이 계산 (임의의 날짜 사용)
    dummy_date = datetime(2000, 1, 1).date()
    dt_start = datetime.combine(dummy_date, start)
    dt_end = datetime.combine(dummy_date, end)

    # 종료 시간이 시작 시간보다 빠르면(자정 넘김) 하루 추가
    if dt_end < dt_start:
        dt_end += timedelta(days=1)

    diff = dt_end - dt_start
    total_minutes = int(diff.total_seconds() / 60)

    hours = total_minutes // 60
    minutes = total_minutes % 60

    result = []
    if hours > 0:
        result.append(f"{hours}시간")
    if minutes > 0:
        result.append(f"{minutes}분")

    return " ".join(result) if result else "0분"

# ------------------------------------------------------------------
# [Helper] 24:00 처리 및 시간 변환기
# ------------------------------------------------------------------
def safe_parse_time(time_str: str) -> Optional[time]:
    """
    AI나 프론트에서 '24:00'이 넘어오면 Python time 객체 최대값인 '23:59:59'로 변환
    """
    if not time_str:
        return None
    if time_str == "24:00":
        return time(23, 59, 59)
    try:
        if len(time_str.split(":")) == 2:
            return datetime.strptime(time_str, "%H:%M").time()
        else:
            return datetime.strptime(time_str, "%H:%M:%S").time()
    except ValueError:
        return time(0, 0)

# ------------------------------------------------------------------
# 토큰 교환 함수
# ------------------------------------------------------------------
def get_copilot_token(github_token: str):
    url = "https://api.github.com/copilot_internal/v2/token"
    headers = {
        "Authorization": f"token {github_token}",
        "Editor-Version": "vscode/1.85.0",
        "Editor-Plugin-Version": "copilot/1.143.0",
        "User-Agent": "GitHubCopilot/1.143.0"
    }
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    else:
        raise Exception(f"토큰 발급 실패: {response.status_code} {response.text}")

# ------------------------------------------------------------------
# [Helper] Context Injection
# ------------------------------------------------------------------
def get_recent_chat_history(db: Session, member_id: int, limit: int = 20):
    logs = db.query(AIChatLog).filter(AIChatLog.member_id == member_id) \
        .order_by(AIChatLog.created_at.desc()).limit(limit).all()
    logs.reverse()

    messages = []
    for log in logs:
        if log.role == 'user':
            messages.append(HumanMessage(content=log.message))
        else:
            messages.append(AIMessage(content=log.message))
    return messages

# ------------------------------------------------------------------
# [Helper] 벡터 검색
# ------------------------------------------------------------------
def search_similar_events(db: Session, member_id: int, query_vector: list, limit: int = 20):
    title_dist = ScheduleEvent.title_embedding.cosine_distance(query_vector)
    desc_dist = func.coalesce(
        ScheduleEvent.description_embedding.cosine_distance(query_vector),
        2.0
    )
    min_dist = func.least(title_dist, desc_dist)

    stmt = select(ScheduleEvent).filter(
        ScheduleEvent.member_id == member_id
    ).order_by(
        min_dist.asc()
    ).limit(limit)

    results = db.execute(stmt).scalars().all()

    context_str = ""
    for idx, ev in enumerate(results):
        start_str = ev.start_time.strftime("%H:%M")
        end_str = ev.end_time.strftime("%H:%M")

        # [수정] Context에 시간 소요 정보(duration) 추가
        duration_info = get_duration_text(ev.start_time, ev.end_time)

        context_str += (
            f"ID:{idx+1} | Date:{ev.schedule_date} | Time:{start_str}~{end_str} ({duration_info}) | "
            f"Color:{ev.color} | Title:{ev.title} | Desc:{ev.description or 'None'}\n"
        )

    return context_str if context_str else "검색된 관련 일정이 없습니다."

# ------------------------------------------------------------------
# [Main API] 채팅 프로세싱
# ------------------------------------------------------------------
@router.post("/chat", response_model=AiResponse)
async def process_chat_request(
    req: ChatRequest,
    db: Session = Depends(get_db),
    model: SentenceTransformer = Depends(get_embedding_model)
) -> AiResponse:

    try:
        real_access_token = get_copilot_token(apikey)
    except Exception as e:
        print(f"Token Error: {e}")
        return AiResponse(type="chat", message="GitHub 토큰 발급에 실패했습니다.", events=[])

    member_id = req.member_id
    user_input = req.user_input

    llm = ChatOpenAI(
        api_key=real_access_token,
        model="gpt-4.1",
        base_url=baseurl,
        temperature=0,
        default_headers={
            "Authorization": f"Bearer {real_access_token}",
            "Editor-Version": "vscode/1.85.0",
            "Editor-Plugin-Version": "copilot/1.143.0",
            "User-Agent": "GitHubCopilot/1.143.0"
        }
    )

    now_dt = datetime.now(KST)
    today_str = now_dt.strftime("%Y-%m-%d")
    current_time_str = now_dt.strftime("%H:%M")

    # ------------------------------------------------------------------
    # Router
    # ------------------------------------------------------------------
    router_system = """
    당신은 스터디 플래너의 분류기입니다. 
    오늘 날짜: {today}
    현재 시각: {current_time}

    사용자의 입력과 이전 대화 맥락을 보고 '검색(search)'이 필요한지 판단하세요.

    [판단 기준]
    1. 'search': 과거 일정 조회, 수정/삭제 대상이 모호할 때, 내용 기반 검색
    2. 'direct': 명확한 생성/수정/삭제 요청, 인사

    [JSON 포맷]
    {{
        "decision": "search" | "direct",
        "search_query": "검색할 키워드"
    }}
    """
    router_prompt = ChatPromptTemplate.from_messages([
        ("system", router_system),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}")
    ])
    router_chain = router_prompt | llm | JsonOutputParser()

    try:
        history_messages = get_recent_chat_history(db, member_id)
        router_res = router_chain.invoke({
            "today": today_str,
            "current_time": current_time_str,
            "chat_history": history_messages,
            "input": user_input
        })
        decision = router_res.get("decision", "direct")
        search_query = router_res.get("search_query", "")

        # ------------------------------------------------------------------
        # Vector Search
        # ------------------------------------------------------------------
        found_context = ""
        if decision == "search" and search_query:
            query_vec = model.encode(search_query).tolist()
            found_context = search_similar_events(db, member_id, query_vec)

        # ------------------------------------------------------------------
        # Solver
        # ------------------------------------------------------------------
        # 프롬프트는 요청하신 대로 제공해주신 원본 그대로 유지합니다.
        solver_system = """
        당신은 친절하고 똑똑한 스터디 플래너 AI입니다. 
        오늘 날짜: {today}
        현재 시각: {current_time}

        사용자의 질문에 대해 JSON 포맷으로 답변해야 합니다.

        [핵심 답변 원칙]
        1. <database_context>에 정보가 있다면 그것을 최우선으로 사용하여 답변하세요.
        2. <database_context>가 비어있더라도 무조건 "없다"고 답변하지 마세요. 
           - 만약 사용자가 **"이전 답변의 근거"**를 묻는다면, **대화 기록(chat_history)**을 참고하여 답변하세요.
        3. DB에는 24:00를 넣을 수 없습니다. '23:59' 또는 다음날 '00:00'로 바꾸세요.
        4. DB를 조작했으면 ~하겠습니다가 아닌 ~했습니다 라고 대답하세요.
        
        <database_context>
        {context}
        </database_context>
        
        [행동 분류 및 규칙]
        - 'create': 일정 생성. (events 배열에 여러 개 담기)
        - 'update': 일정 수정. (여러 일정 동시 수정 가능)
        - 'delete': 일정 삭제. (events 배열에 삭제할 대상들을 담기)
        - 'chat': 일반 대화.

        [삭제(delete) 규칙 - 중요]
        1. **전체 삭제 요청 시**: 사용자가 "모든 일정 삭제", "전체 삭제", "싹 다 지워줘" 등을 요청하면 **`delete_mode`를 "all"로 설정**하고 `events` 배열은 비워두세요. 
        (Context에 일정이 없어도 실행해야 함)
        2. **부분 삭제 요청 시**: `delete_mode`는 "specific"으로 설정하고 `events` 배열에 삭제 대상을 넣으세요.
        
        [매우 중요한 규칙 - 수정(update) 시]
        1. **여러 일정을 한 번에 수정할 수 있습니다.**
        2. **수정 대상 찾기**: events 배열에 `original_title`, `original_date`를 포함하세요.
        3. **변경 내용 적용(중요)**: 
           - 사용자가 구체적으로 변경을 요청한 필드만 새 값을 넣으세요.
           - **사용자가 언급하지 않은 필드(색상, 설명, 시간 등)는 반드시 `null`로 보내세요.**
           - **절대로 임의로 'blue' 등의 기본값을 채우지 마세요.**
        4. 사용자가 시간을 말하지 않았다면 절대로 임의로 시간을 바꾸지 마세요.

        [제약 사항]
        - 수정/삭제 시 검색 결과에 있는 날짜와 제목을 정확히 사용.
        - 신규 생성 시 색깔을 랜덤으로 선택하고, 랜덤으로 n개 이상 생성같은 비슷한 지시가 있으면 1시간 단위로 일정을 생성 하세요.
        - 정보가 불충분하여 대상을 찾을 수 없다면 사용자에게 질문하세요.
        
        # ▼ [추가] 검색(Search) 규칙
        - 사용자가 특정 조건(예: 가장 긴 공부, 특정 날짜 일정 등)을 검색 요청했을 때,
          조건에 맞는 일정을 찾았다면 그 상세 정보를 `search_results` 필드에 담아서 보내세요.
          이때 `type`은 'chat'으로 유지하세요.
        - 만약 일정을 찾지 못하면 search_results에 null을 반환하세요.
        - 조건에 맞는 일정을 찾았으면 해당 일정의 색상을 search_results의 color에 반영해주세요.

        [JSON 포맷]
        {{
            "type": "create" | "update" | "delete" | "chat",
            "delete_mode": "specific" | "all",
            "message": "사용자에게 할 말",
            "search_results": [
                {{ 
                    "event_id": 0 (모르면 0),
                    "title": "제목",
                    "schedule_date": "YYYY-MM-DD",
                    "start_time": "HH:MM",
                    "end_time": "HH:MM",
                    "color": "blue" | "green" | "yellow" | "red",
                }}
            ],
            "events": [
                {{
                    "original_title": "수정 대상 원본 제목 (update시 필수, 그외 null)",
                    "original_date": "수정 대상 원본 날짜 (update시 필수, 그외 null)",
                    "title": "제목 (신규 생성 혹은 수정 후 제목)",
                    "date": "YYYY-MM-DD (신규 생성 혹은 수정 후 날짜)",
                    "start": "HH:MM",
                    "end": "HH:MM",
                    "color": "blue" | "green" | "yellow" | "red",
                    "description": "내용"
                }}
            ]
        }}
        """

        solver_chain = ChatPromptTemplate.from_messages([
            ("system", solver_system),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}")
        ]) | llm | JsonOutputParser()

        ai_result = solver_chain.invoke({
            "today": today_str,
            "current_time": current_time_str,
            "context": found_context if found_context else "관련된 과거 데이터 없음.",
            "chat_history": history_messages,
            "input": user_input
        })

        res_type = ai_result.get("type", "chat")
        delete_mode = ai_result.get("delete_mode", "specific")
        ai_msg = ai_result.get("message", "")
        events_data = ai_result.get("events", [])
        search_results_raw = ai_result.get("search_results", [])
        final_search_results = []

        if search_results_raw and isinstance(search_results_raw, list):
            for item in search_results_raw:
                final_search_results.append(EventResponse(
                    event_id=item.get('event_id', 0),
                    title=item.get('title', ''),
                    schedule_date=item.get('schedule_date') or today_str,
                    start_time=item.get('start_time', '00:00'),
                    end_time=item.get('end_time', '00:00'),
                    color=item.get('color', 'blue')
                ))

        # ------------------------------------------------------------------
        # [Step 4] DB 트랜잭션
        # ------------------------------------------------------------------
        user_log = AIChatLog(member_id=member_id, role="user", message=user_input)
        db.add(user_log)
        db.flush()

        response_events = []

        if res_type == "create":
            next_default_hour = 9

            for ev in events_data:
                try:
                    s_date = datetime.strptime(ev['date'], "%Y-%m-%d").date()
                    temp_start = safe_parse_time(ev.get('start'))
                    temp_end = safe_parse_time(ev.get('end'))

                    if temp_start is None:
                        if next_default_hour >= 24:
                            next_default_hour = 9
                        s_start = time(next_default_hour, 0)
                        next_default_hour += 1
                    else:
                        s_start = temp_start
                        next_default_hour = s_start.hour + 1

                    if temp_end is None:
                        end_h = s_start.hour + 1
                        if end_h >= 24:
                            s_end = time(23, 59)
                        else:
                            s_end = time(end_h, s_start.minute)
                    else:
                        s_end = temp_end

                except (ValueError, TypeError) as e:
                    print(f"Date/Time Parse Error: {e}")
                    continue

                # 임베딩에 시간/소요시간 정보 포함 (Semantic Search 강화)
                duration_str = get_duration_text(s_start, s_end)
                time_range_str = f"{s_start.strftime('%H:%M')}~{s_end.strftime('%H:%M')}"

                # Title Embedding은 제목만
                t_vec = model.encode(ev['title']).tolist()

                # Description Embedding에 풍부한 정보(Rich Text) 포함
                rich_text_for_embedding = f"{ev['title']} {time_range_str} ({duration_str}) {ev.get('description', '')}"
                d_vec = model.encode(rich_text_for_embedding).tolist()

                new_event = ScheduleEvent(
                    member_id=member_id,
                    ai_chat_log_id=user_log.ai_chat_logs_id,
                    title=ev['title'],
                    schedule_date=s_date,
                    start_time=s_start,
                    end_time=s_end,
                    description=ev.get('description', ''),
                    color=ev.get('color', 'blue'),
                    title_embedding=t_vec,
                    description_embedding=d_vec
                )
                db.add(new_event)
                db.flush()
                response_events.append(EventResponse(
                    event_id=new_event.event_id,
                    title=new_event.title,
                    schedule_date=ev['date'],
                    start_time=s_start.strftime("%H:%M") if s_start else "",
                    end_time=s_end.strftime("%H:%M") if s_end else "",
                    color=new_event.color,
                    description=new_event.description
                ))

        elif res_type == "update" and events_data:
            updated_count = 0

            for update_data in events_data:
                # 수정 대상 찾기 (original_title/date 우선, 없으면 현재 값 Fallback)
                target_date_str = update_data.get('original_date')
                target_title = update_data.get('original_title')

                if not target_date_str:
                    target_date_str = update_data.get('date')
                if not target_title:
                    target_title = update_data.get('title')

                query = db.query(ScheduleEvent).filter(ScheduleEvent.member_id == member_id)

                if target_date_str:
                    try:
                        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                        query = query.filter(ScheduleEvent.schedule_date == target_dt)
                    except ValueError:
                        pass

                if target_title:
                    query = query.filter(ScheduleEvent.title.like(f"%{target_title}%"))

                target_event = query.order_by(ScheduleEvent.schedule_date.desc(), ScheduleEvent.start_time.asc()).first()

                if target_event:
                    # 값 업데이트 (None 체크로 기존 값 유지)
                    if update_data.get('title'):
                        target_event.title = update_data['title']

                    if update_data.get('date'):
                        try:
                            target_event.schedule_date = datetime.strptime(update_data['date'], "%Y-%m-%d").date()
                        except ValueError:
                            pass

                    if update_data.get('start') is not None:
                        target_event.start_time = safe_parse_time(update_data['start'])

                    if update_data.get('end') is not None:
                        target_event.end_time = safe_parse_time(update_data['end'])

                    if update_data.get('description') is not None:
                        target_event.description = update_data['description']

                    if update_data.get('color'):
                        target_event.color = update_data['color']

                    # 임베딩 갱신 (시간이나 내용이 바뀌었을 수 있으므로 항상 수행)
                    current_start = target_event.start_time
                    current_end = target_event.end_time
                    current_desc = target_event.description or ""
                    current_title = target_event.title

                    duration_str = get_duration_text(current_start, current_end)
                    time_range_str = f"{current_start.strftime('%H:%M')}~{current_end.strftime('%H:%M')}"

                    rich_text = f"{current_title} {time_range_str} ({duration_str}) {current_desc}"

                    target_event.title_embedding = model.encode(current_title).tolist()
                    target_event.description_embedding = model.encode(rich_text).tolist()

                    updated_count += 1

                    response_events.append(EventResponse(
                        event_id=target_event.event_id,
                        title=target_event.title,
                        schedule_date=target_event.schedule_date.strftime("%Y-%m-%d"),
                        start_time=target_event.start_time.strftime("%H:%M"),
                        end_time=target_event.end_time.strftime("%H:%M"),
                        color=target_event.color,
                        description=target_event.description
                    ))

            if updated_count == 0:
                if not ai_msg:
                    ai_msg = "조건에 맞는 수정할 일정을 찾지 못했습니다."

        elif res_type == "delete":
            deleted_count = 0

            # [삭제 모드 확인] 'all'이면 전체 삭제
            if delete_mode == "all":
                result = db.query(ScheduleEvent).filter(ScheduleEvent.member_id == member_id).delete()
                deleted_count = result
                if not ai_msg:
                    ai_msg = f"요청하신 대로 모든 일정({deleted_count}개)을 삭제했습니다."

            else:
                # 개별 삭제 로직
                targets = events_data if events_data else []
                for ev in targets:
                    query = db.query(ScheduleEvent).filter(ScheduleEvent.member_id == member_id)
                    del_date_str = ev.get('date') or ev.get('original_date')
                    del_title = ev.get('title') or ev.get('original_title')

                    if del_date_str:
                        try:
                            del_date = datetime.strptime(del_date_str, "%Y-%m-%d").date()
                            query = query.filter(ScheduleEvent.schedule_date == del_date)
                        except ValueError:
                            continue

                    if del_title:
                        query = query.filter(ScheduleEvent.title.like(f"%{del_title}%"))

                    if not del_date_str and not del_title:
                        continue

                    result = query.delete(synchronize_session=False)
                    deleted_count += result

                if not ai_msg:
                    if deleted_count > 0:
                        ai_msg = f"요청하신 대로 총 {deleted_count}개의 일정을 삭제했습니다."
                    else:
                        ai_msg = "조건에 맞는 삭제할 일정을 찾지 못했습니다."

        db.add(AIChatLog(member_id=member_id, role="ai", message=ai_msg))
        db.commit()

        return AiResponse(
            type=res_type,
            message=ai_msg,
            events=response_events,
            search_results=final_search_results
        )

    except Exception as e:
        db.rollback()
        print(f"Error process_chat_request: {e}")
        return AiResponse(
            type="chat",
            message=f"오류가 발생했습니다: {str(e)}",
            events=[]
        )

# ------------------------------------------------------------------
# [API] 일반 일정 조회 (GET)
# ------------------------------------------------------------------
@router.get("/events", response_model=List[EventResponse])
def get_schedule_events(
    member_id: int,
    db: Session = Depends(get_db)
):
    events = db.query(ScheduleEvent).filter(ScheduleEvent.member_id == member_id) \
        .order_by(ScheduleEvent.schedule_date.asc(), ScheduleEvent.start_time.asc()).all()
    return [
        EventResponse(
            event_id=e.event_id,
            title=e.title,
            schedule_date=e.schedule_date.strftime("%Y-%m-%d"),
            start_time=e.start_time.strftime("%H:%M"),
            end_time=e.end_time.strftime("%H:%M"),
            color=e.color,
            description=e.description
        ) for e in events
    ]

# ------------------------------------------------------------------
# [API] 수동 조작용 (Manual) - Create, Update, Delete
# ------------------------------------------------------------------
@router.post("/manual/create", response_model=EventResponse)
def create_manual_event(
    req: ManualEventRequest,
    db: Session = Depends(get_db),
    model: SentenceTransformer = Depends(get_embedding_model)
):
    # 수동 생성 시에도 시간/소요시간 정보를 벡터에 포함
    s_time = safe_parse_time(req.start)
    e_time = safe_parse_time(req.end)

    t_vec = model.encode(req.title).tolist()

    # Rich Text 생성 (Duration 포함)
    duration_str = get_duration_text(s_time, e_time)
    rich_text = f"{req.title} {req.start}~{req.end} ({duration_str}) {req.description}"
    d_vec = model.encode(rich_text).tolist()

    new_event = ScheduleEvent(
        member_id=req.member_id,
        title=req.title,
        schedule_date=datetime.strptime(req.date, "%Y-%m-%d").date(),
        start_time=s_time,
        end_time=e_time,
        description=req.description,
        color=req.color,
        title_embedding=t_vec,
        description_embedding=d_vec
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return EventResponse(
        event_id=new_event.event_id,
        title=new_event.title,
        schedule_date=new_event.schedule_date.strftime("%Y-%m-%d"),
        start_time=new_event.start_time.strftime("%H:%M"),
        end_time=new_event.end_time.strftime("%H:%M"),
        color=new_event.color,
        description=new_event.description
    )

@router.put("/manual/update", response_model=EventResponse)
def update_manual_event(
    req: ManualEventRequest,
    db: Session = Depends(get_db),
    model: SentenceTransformer = Depends(get_embedding_model)
):
    event = db.query(ScheduleEvent).filter(ScheduleEvent.event_id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.title = req.title
    event.schedule_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    event.start_time = safe_parse_time(req.start)
    event.end_time = safe_parse_time(req.end)
    event.description = req.description
    event.color = req.color

    # [수정] 수동 수정 시에도 임베딩 갱신
    duration_str = get_duration_text(event.start_time, event.end_time)
    rich_text = f"{req.title} {req.start}~{req.end} ({duration_str}) {req.description}"

    event.title_embedding = model.encode(req.title).tolist()
    event.description_embedding = model.encode(rich_text).tolist()

    db.commit()
    return EventResponse(
        event_id=event.event_id,
        title=event.title,
        schedule_date=event.schedule_date.strftime("%Y-%m-%d"),
        start_time=event.start_time.strftime("%H:%M"),
        end_time=event.end_time.strftime("%H:%M"),
        color=event.color,
        description=event.description
    )

@router.delete("/manual/delete/{event_id}")
def delete_manual_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    db.query(ScheduleEvent).filter(ScheduleEvent.event_id == event_id).delete()
    db.commit()
    return {"status": "success"}

@router.get("/check-attended")
def check_attended(
    member: dict = Depends(get_cookies_info),
    db: Session = Depends(get_db)
):
    seat_usage = db.query(SeatUsage).filter(
        SeatUsage.member_id == member["member_id"],
        SeatUsage.is_attended == True
    ).all()
    if not seat_usage:
        raise HTTPException(status_code=404, detail="seat usages not exists")

    return [seat.check_out_time.strftime("%Y-%m-%d") for seat in seat_usage]