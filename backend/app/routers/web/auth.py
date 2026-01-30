import os
import httpx
import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Depends, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
from models import Token, Member
from schemas import MemberSignup, MemberLogin, MemberGoogleOnboarding
from utils.auth_utils import (
    password_encode, password_decode, revoke_existing_token, revoke_existing_token_by_id, set_token_cookies,
    get_cookies_info, encode_temp_signup_token, decode_temp_signup_token, verify_token, encode_google_temp_token,
    decode_google_temp_token, generate_temp_password, encode_account_recovery_temp_token, get_code_hash,
    decode_account_recovery_temp_token, decrypt_data, encode_phone_token, decode_phone_token, encode_email_token,
    decode_email_token, encode_email_verified_token, decode_email_verified_token, encode_phone_verified_token,
    decode_phone_verified_token, encode_google_onboarding_phone_token, decode_google_onboarding_phone_token,
    send_password
)

router = APIRouter(prefix="/api/web/auth", tags=["Auth"])

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")
KAKAO_CLIENT_ID = os.getenv("KAKAO_CLIENT_ID")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_REDIRECT_URI = os.getenv("NAVER_REDIRECT_URI")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

########################################################################################################################
# 일반 로그인 관련 로직
########################################################################################################################
""" 일반 회원 가입 """
@router.post("/signup", status_code=201)
def signup(
    member_data: MemberSignup,
    response: Response,
    phone_verified_token: str = Cookie(None),
    email_verified_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # 휴대폰 인증 쿠키 가져오기
    phone_payload = decode_phone_verified_token(phone_verified_token)
    response.delete_cookie("phone_verified_token")

    # 휴대폰번호 인증여부 확인
    if not member_data.phone == phone_payload:
        raise HTTPException(status_code=401, detail="not verified")

    # 이메일 인증 쿠키 가져오기
    email_payload = decode_email_verified_token(email_verified_token)
    response.delete_cookie("email_verified_token")

    # 이메일 인증여부 확인
    if not member_data.email == email_payload:
        raise HTTPException(status_code=401, detail="not verified")

    # 아이디로 회원 조회
    id_exists = db.query(Member).filter(Member.login_id == member_data.login_id).first()
    if id_exists:
        raise HTTPException(status_code=409, detail="already used loginid")

    # 휴대폰 번호로 회원 조회
    existing_member = db.query(Member).filter(Member.phone == member_data.phone).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="exists phone number")

    # 회원이 존재하지 않을때, 회원가입
    else:
        try:
            # 비밀번호 해싱
            hashed_pw = password_encode(member_data.password)

            # DB에 회원 추가
            member = Member(
                login_id=member_data.login_id,
                name=member_data.name,
                password=hashed_pw,
                phone=member_data.phone,
                social_type=None,
                birthday=member_data.birthday,
                pin_code=int(member_data.pin_code),
                email=member_data.email
            )

            db.add(member)
            db.commit()

        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="already exists")

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

        # 토큰 및 쿠키 생성 함수
        set_token_cookies(member.member_id, member.name, db, response)

    return None

""" 아이디 중복 체크 """
@router.post("/signup/check-id")
def check_id(
    login_id: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # 아이디로 회원 조회
    member = db.query(Member).filter(Member.login_id == login_id).first()
    if member:
        raise HTTPException(status_code=400, detail="already exists id")

    return Response(status_code=204)

""" 휴대폰 중복 체크 및 번호 인증 보내기"""
@router.post("/signup/check-phone", status_code=204)
def check_phone(
    response: Response,
    phone: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # 휴대폰 번호로 회원 조회
    member = db.query(Member).filter(Member.phone == phone).first()
    if member:
        raise HTTPException(status_code=409, detail="already exists phone")

    encode_phone_token(response, phone)

    return

""" 휴대폰 번호 인증 검사 """
@router.post("/signup/check-verify-phone", status_code=204)
def check_verify_phone(
    response: Response,
    input_code: str = Body(..., embed=True),
    phone_token: str = Cookie(None),
):
    # 입력한 코드가 없거나 토큰 없을때
    if not input_code or not phone_token:
        raise HTTPException(status_code=404, detail="code or token not exists")

    # 입력 코드 해싱
    hashed_input_code = get_code_hash(input_code)

    # jwt 해독
    payload = decode_phone_token(phone_token)
    phone = payload.get("phone")

    if payload.get("code") == hashed_input_code:
        response.delete_cookie("phone_token")
        encode_phone_verified_token(response, phone)
        return
    else:
        raise HTTPException(status_code=400, detail="expired cookie")

""" 이메일 중복 체크 및 번호 인증 보내기"""
@router.post("/signup/check-email", status_code=204)
async def check_email(
    response: Response,
    email: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # 이메일로 회원 조회
    member = db.query(Member).filter(Member.email == email).first()
    if member:
        raise HTTPException(status_code=409, detail="already exists email")

    await encode_email_token(response, email)

    return

""" 이메일 번호 인증 검사 """
@router.post("/signup/check-verify-email", status_code=204)
def check_verify_email(
    response: Response,
    input_code: str = Body(..., embed=True),
    email_token: str = Cookie(None),
):
    # 입력한 코드가 없거나 토큰 없을때
    if not input_code or not email_token:
        raise HTTPException(status_code=404, detail="code or token not exists")

    # 입력 코드 해싱
    hashed_input_code = get_code_hash(input_code)

    # jwt 해독
    payload = decode_email_token(email_token)
    email = payload.get("email")

    if payload.get("code") == hashed_input_code:
        response.delete_cookie("email_token")
        encode_email_verified_token(response, email)
        return
    else:
        raise HTTPException(status_code=400, detail="expired cookie")

""" 일반 로그인 """
@router.post("/login")
def login(
    response: Response,
    member_data: MemberLogin,
    db: Session = Depends(get_db),
):
    if member_data.login_id:
        # 아이디 검증
        member = db.query(Member).filter(Member.login_id == member_data.login_id).first()

        # 비밀번호 검증
        if not member or not password_decode(member_data.password, member.password):
            raise HTTPException(status_code=400, detail="incorrect id or password")

        try:
            # 소셜 타입 공백으로 만들어서 일반 로그인으로 만든다.
            member.social_type = None
            db.commit()
            db.refresh(member)

        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Integrity Error")

        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    # 그외 문제 예외처리
    else:
        raise HTTPException(status_code=401, detail="missing credentials")

    # 토큰 및 쿠키 생성 함수
    set_token_cookies(member.member_id, member.name, db, response)

    return {"status": "ok"}

""" 핀코드 업데이트 """
@router.post("/login/update-pincode")
def update_pincode(
    mem_data: dict = Body(...),
    cookie_member: dict = Depends(get_cookies_info),
    db: Session = Depends(get_db)
):
    member = db.query(Member).filter(Member.member_id == cookie_member.get("member_id")).first()

    try:
        member.pin_code = int(mem_data.get("pin_code"))
        db.commit()
        db.refresh(member)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Integrity Error")

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return Response(status_code=204)
########################################################################################################################
# 카카오 로그인 관련 로직
########################################################################################################################
""" 카카오 로그인 리다이렉트 """
@router.get("/kakao/login")
def kakao_login(next: str = None):
    # 랜덤 state 생성
    state = str(uuid.uuid4())

    kakao_auth_url = (
        f"https://kauth.kakao.com/oauth/authorize"
        f"?response_type=code"
        f"&client_id={KAKAO_CLIENT_ID}"
        f"&redirect_uri={KAKAO_REDIRECT_URI}"
        f"&prompt=select_account"
        f"&state={state}"
    )

    # 카카오 oauth용 state를 쿠키에 저장
    response = RedirectResponse(url=kakao_auth_url)
    response.set_cookie(
        key="kakao_oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    if next:
        response.set_cookie(
            key="next",
            value=next,
            httponly=True,
            samesite="lax",
            max_age=60 * 5
        )

    return response

""" 카카오 로그인 콜백 """
@router.get("/kakao/callback")
def kakao_callback(
    code: str,
    kakao_oauth_state: str = Cookie(None),
    next: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # state가 없을 시
    if not kakao_oauth_state:
        raise HTTPException(status_code=401, detail="oauth state not found")

    # 리다이렉트 할 URL 주소
    if next:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web/mypage/edit")
        response.delete_cookie("next")
    else:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web")

    # 토큰 요청 URL 및 data
    token_url = "https://kauth.kakao.com/oauth/token"

    token_data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_CLIENT_ID,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "client_secret": KAKAO_CLIENT_SECRET,
        "code": code,
        "state": kakao_oauth_state
    }

    # state 쿠키 다시 제거
    response.delete_cookie("kakao_oauth_state")

    # OAUTH에서 엑세스, 리프레시 토큰 요청
    with httpx.Client() as client:
        token_response = client.post(token_url, data=token_data)

        # 카카오의 엑세스 토큰은 오직 유저 정보를 받아오는 용도로만 사용한다.
        # 유저 정보를 토대로 자체 JWT로 만든 엑세스, 리프레시 토큰으로 관리한다.
        token_json = token_response.json()
        kakao_access_token = token_json.get("access_token")

        if not kakao_access_token:
            raise HTTPException(status_code=401, detail="token create failed")

        # OAUTH의 엑세스 토큰으로 사용자 정보 가져오기
        user_info_url = "https://kapi.kakao.com/v2/user/me"
        headers = {"Authorization": f"Bearer {kakao_access_token}"}
        user_response = client.get(user_info_url, headers=headers)
        user_info = user_response.json()

    kakao_id = str(user_info.get("id"))
    kakao_phone_number = user_info.get("kakao_account").get("phone_number", {})
    kakao_email = user_info.get("kakao_account").get("email", {})
    kakao_birthday = user_info.get("kakao_account").get("birthday", {})
    kakao_birthyear = user_info.get("kakao_account").get("birthyear", {})
    kakao_name = user_info.get("kakao_account").get("name", {})

    # 전처리
    # 010-XXXX-XXXX 형식으로만 받아야 함
    kakao_phone_number = kakao_phone_number.replace(kakao_phone_number.split("-")[0], "010")

    # Member DB에서 카카오 계정 존재 확인
    kakao_account = db.query(Member).filter(Member.kakao_id == kakao_id).first()

    # 카카오 계정이 존재 할때, 로그인
    if kakao_account:
        # 토큰 및 쿠키 생성 함수
        set_token_cookies(kakao_account.member_id, kakao_account.name, db, response)

        # 소셜 타입을 카카오 로그인으로 바꾼다
        kakao_account.social_type = "kakao"
        db.commit()
        db.refresh(kakao_account)

    # 카카오 계정이 존재하지 않을 때
    else:
        # 휴대폰 번호 조회
        existing_member = db.query(Member).filter(Member.phone == kakao_phone_number).first()

        # 휴대폰 번호가 존재 할때, 연동가입
        if existing_member:
            # 이메일이 존재하지 않을 때만 업데이트
            if not existing_member.email:
                existing_member.email = kakao_email
            existing_member.social_type = "kakao"
            existing_member.kakao_id = kakao_id
            db.commit()
            db.refresh(existing_member)

            # 토큰 및 쿠키 생성 함수
            set_token_cookies(existing_member.member_id, existing_member.name, db, response)

            # 소셜 타입을 카카오 로그인으로 바꾼다
            existing_member.social_type = "kakao"
            db.commit()
            db.refresh(existing_member)

        # 휴대폰 번호가 존재하지 않을때, 회원가입
        else:
            try:
                # 카카오 계정 정보를 Member DB에 추가
                member = Member(
                    kakao_id=kakao_id,
                    phone=kakao_phone_number,
                    email=kakao_email,
                    birthday=kakao_birthyear + kakao_birthday,
                    social_type="kakao",
                    name=kakao_name,
                )
                db.add(member)
                db.commit()
                db.refresh(member)

                # 토큰 및 쿠키 생성 함수
                set_token_cookies(member.member_id, member.name, db, response)

            except Exception as e:
                raise HTTPException(status_code=401, detail=f"transaction failed: {e}")

    return response
########################################################################################################################
# 네이버 로그인 관련 로직
########################################################################################################################
""" 네이버 로그인 리다이렉트 """
@router.get("/naver/login")
def naver_login(next: str = None):
    # 랜덤 state 생성
    state = str(uuid.uuid4())

    naver_auth_url = (
        f"https://nid.naver.com/oauth2.0/authorize"
        f"?response_type=code"
        f"&client_id={NAVER_CLIENT_ID}"
        f"&redirect_uri={NAVER_REDIRECT_URI}"
        f"&state={state}"
        f"&auth_type=reauthenticate"
    )

    # 네이버 oauth용 state를 쿠키에 저장
    response = RedirectResponse(url=naver_auth_url)
    response.set_cookie(
        key="naver_oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    if next:
        response.set_cookie(
            key="next",
            value=next,
            httponly=True,
            samesite="lax",
            max_age=60 * 5
        )

    return response

""" 네이버 로그인 콜백 """
@router.get("/naver/callback")
def naver_callback(
    code: str,
    naver_oauth_state: str = Cookie(None),
    next: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # state가 없을 시
    if not naver_oauth_state:
        raise HTTPException(status_code=401, detail="oauth state not found")

    # 리다이렉트 할 URL 주소
    if next:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web/mypage/edit")
        response.delete_cookie("next")
    else:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web")

    # 토큰 요청 URL 및 data
    token_url = "https://nid.naver.com/oauth2.0/token"

    token_data = {
        "grant_type": "authorization_code",
        "client_id": NAVER_CLIENT_ID,
        "client_secret": NAVER_CLIENT_SECRET,
        "redirect_uri": NAVER_REDIRECT_URI,
        "code": code,
        "state": naver_oauth_state
    }

    # state 쿠키 다시 제거
    response.delete_cookie("naver_oauth_state")

    # OAUTH에서 엑세스, 리프레시 토큰 요청
    with httpx.Client() as client:
        token_response = client.post(token_url, data=token_data)

        # 네이버의 엑세스 토큰은 오직 유저 정보를 받아오는 용도로만 사용한다.
        # 유저 정보를 토대로 자체 JWT로 만든 엑세스, 리프레시 토큰으로 관리한다.
        token_json = token_response.json()
        naver_access_token = token_json.get("access_token")

        if not naver_access_token:
            raise HTTPException(status_code=401, detail="token create failed")

        # OAUTH의 엑세스 토큰으로 사용자 정보 가져오기
        user_info_url = "https://openapi.naver.com/v1/nid/me"
        headers = {"Authorization": f"Bearer {naver_access_token}"}
        user_response = client.get(user_info_url, headers=headers)
        user_info = user_response.json().get("response")

    naver_id = str(user_info.get("id"))
    naver_phone_number = user_info.get("mobile", {})
    naver_email = user_info.get("email", {})
    naver_birthday = user_info.get("birthday", {})
    naver_birthyear = user_info.get("birthyear", {})
    naver_name = user_info.get("name", {})

    # 전처리
    naver_birthday = naver_birthday.replace("-", "")

    # Member DB에서 네이버 계정 존재 확인
    naver_account = db.query(Member).filter(Member.naver_id == naver_id).first()

    # 네이버 계정이 존재 할때, 로그인
    if naver_account:
        # 토큰 및 쿠키 생성 함수
        set_token_cookies(naver_account.member_id, naver_account.name, db, response)

        # 소셜 타입을 네이버 로그인으로 바꾼다
        naver_account.social_type = "naver"
        db.commit()
        db.refresh(naver_account)
    else:
        # 휴대폰 번호 조회
        existing_member = db.query(Member).filter(Member.phone == naver_phone_number).first()

        # 휴대폰 번호가 존재 할때, 연동가입
        if existing_member:
            # 이메일이 존재하지 않을 때만 업데이트
            if not existing_member.email:
                existing_member.email = naver_email
            existing_member.social_type = "naver"
            existing_member.naver_id = naver_id
            db.commit()
            db.refresh(existing_member)

            # 토큰 및 쿠키 생성 함수
            set_token_cookies(existing_member.member_id, existing_member.name, db, response)

            # 소셜 타입을 네이버 로그인으로 바꾼다
            existing_member.social_type = "naver"
            db.commit()
            db.refresh(existing_member)
        # 휴대폰 번호가 존재하지 않을때, 회원가입
        else:
            try:
                # 네이버 계정 정보를 Member DB에 추가
                member = Member(
                    naver_id=naver_id,
                    phone=naver_phone_number,
                    email=naver_email,
                    birthday=naver_birthyear + naver_birthday,
                    social_type="naver",
                    name=naver_name,
                )
                db.add(member)
                db.commit()
                db.refresh(member)

                # 토큰 및 쿠키 생성 함수
                set_token_cookies(member.member_id, member.name, db, response)

            except Exception as e:
                raise HTTPException(status_code=401, detail=f"transaction failed: {e}")

    return response
########################################################################################################################
# 구글 로그인 관련 로직
########################################################################################################################
""" 구글 로그인 리다이렉트 """
@router.get("/google/login")
def google_login(next: str = None):
    # 랜덤 state 생성
    state = str(uuid.uuid4())

    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/auth"
        f"?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&scope=openid%20email%20profile"
        f"&prompt=select_account"
        f"&state={state}"
    )

    # 구글 oauth용 state를 쿠키에 저장
    response = RedirectResponse(url=google_auth_url)
    response.set_cookie(
        key="google_oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    if next:
        response.set_cookie(
            key="next",
            value=next,
            httponly=True,
            samesite="lax",
            max_age=60 * 5
        )

    return response

""" 구글 로그인 콜백 """
@router.get("/google/callback")
def google_callback(
    code: str,
    request: Request,
    google_oauth_state: str = Cookie(None),
    next: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # state가 없을 시
    if not google_oauth_state:
        raise HTTPException(status_code=401, detail="oauth state not found")

    # 리다이렉트 할 URL 주소
    if next:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web/mypage/edit")
        response.delete_cookie("next")
    else:
        response = RedirectResponse(url=f"{FRONTEND_URL}/web")

    # 토큰 요청 URL 및 data
    token_url = "https://oauth2.googleapis.com/token"

    token_data = {
        "grant_type": "authorization_code",
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "code": code,
        "state": google_oauth_state
    }

    # state 쿠키 다시 제거
    response.delete_cookie("google_oauth_state")

    # OAUTH에서 엑세스, 리프레시 토큰 요청
    with httpx.Client() as client:
        token_response = client.post(token_url, data=token_data)

        # 구글의 엑세스 토큰은 오직 유저 정보를 받아오는 용도로만 사용한다.
        # 유저 정보를 토대로 자체 JWT로 만든 엑세스, 리프레시 토큰으로 관리한다.
        token_json = token_response.json()
        google_access_token = token_json.get("access_token")

        if not google_access_token:
            raise HTTPException(status_code=401, detail="token create failed")

        # OAUTH의 엑세스 토큰으로 사용자 정보 가져오기
        user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {google_access_token}"}
        user_response = client.get(user_info_url, headers=headers)
        user_info = user_response.json()

    # 구글은 phone_number, birthday, birthyear 안보냄
    google_id = str(user_info.get("sub"))
    google_email = user_info.get("email", {})
    google_name = user_info.get("name", {})

    # Member DB에서 구글 계정 존재 확인
    google_account = db.query(Member).filter(Member.google_id == google_id).first()

    # 구글 계정이 존재 할때, 로그인
    if google_account:
        # 토큰 및 쿠키 생성 함수
        set_token_cookies(google_account.member_id, google_account.name, db, response)

        # 소셜 타입을 구글 로그인으로 바꾼다
        google_account.social_type = "google"
        db.commit()
        db.refresh(google_account)
    # 구글 계정이 존재하지 않을때
    else:
        # 쿠키 정보 가져오기
        access_token = request.cookies.get("access_token")
        refresh_token = request.cookies.get("refresh_token")
        current_member_id = None

        # 엑세스 토큰 검증
        if access_token:
            mem_info, error = verify_token(access_token, "access")
            if not error:
                current_member_id = mem_info["member_id"]

        # 엑세스 토큰 실패 시, 리프레시 토큰 검증
        if not current_member_id and refresh_token:
            mem_info, error = verify_token(refresh_token, "refresh")
            if not error:
                # DB에서도 유효한지 확인
                db_token = db.query(Token).filter((Token.token == refresh_token) & (Token.is_revoked == False)).first()
                if db_token:
                    current_member_id = mem_info["member_id"]

        # 휴대폰 번호 조회
        existing_member = db.query(Member).filter(Member.member_id == current_member_id).first()

        # 휴대폰 번호가 존재 할때, 연동가입
        if existing_member:
            # 이메일이 존재하지 않을 때만 업데이트
            if not existing_member.email:
                existing_member.email = google_email
            existing_member.social_type = "google"
            existing_member.google_id = google_id
            db.commit()
            db.refresh(existing_member)

            # 토큰 및 쿠키 생성 함수
            set_token_cookies(existing_member.member_id, existing_member.name, db, response)

            # 소셜 타입을 구글 로그인으로 바꾼다
            existing_member.social_type = "google"
            db.commit()
            db.refresh(existing_member)
        # 휴대폰 번호가 존재하지 않을 때
        else:
            # phone_number, birthday, birthyear 추가 정보 입력을 위한 페이지 이동
            # 리다이렉트 url 설정
            response = RedirectResponse(url=f"{FRONTEND_URL}/web/google/onboarding")

            # 쿠키로 저장하기 위해 정보 담기 및 JWT 변환
            payload = {
                "google_id": google_id,
                "google_email": google_email,
                "google_name": google_name
            }
            temp_member = encode_temp_signup_token(payload)

            # 쿠키에 그 외 정보 저장
            response.set_cookie(
                key="temp_member",
                value=temp_member,
                httponly=True,
                samesite="lax",
                max_age=60 * 5
            )

            # 임시 페이지 인증용 쿠키 발급
            temp_google_check = encode_google_temp_token()
            response.set_cookie(
                key="temp_google_check",
                value=temp_google_check,
                httponly=True,
                samesite="lax",
                max_age=60 * 5
            )

    return response

""" 구글 로그인 추가 정보 입력 """
@router.post("/google/onboarding")
def google_onboarding(
    response: Response,
    member: MemberGoogleOnboarding,
    temp_member: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # 쿠키 가져오기
    # 쿠키가 없을때 예외 처리
    if not temp_member:
        raise HTTPException(status_code=401, detail="session expired")

    # 쿠키 내용 언패킹 및 해독
    mem_info = decode_temp_signup_token(temp_member)

    # 휴대폰 번호 조회
    existing_member = db.query(Member).filter(Member.phone == member.phone).first()

    # 휴대폰 번호 중복체크
    if existing_member:
        raise HTTPException(status_code=400, detail="phone number exists")

    # 휴대폰 번호가 존재하지 않을때, 회원가입
    else:
        try:
            # 추가 정보를 담은 쿠키 및 임시 체크 쿠키 제거
            response.delete_cookie("temp_member")
            response.delete_cookie("temp_google_check")

            # 구글 계정 정보를 Member DB에 추가
            member = Member(
                google_id=mem_info["google_id"],
                email=mem_info["google_email"],
                social_type="google",
                name=mem_info["google_name"],
                phone=member.phone,
                birthday=member.birthday,
                pin_code=int(member.pin_code)
            )
            db.add(member)
            db.commit()
            db.refresh(member)

            # 토큰 및 쿠키 생성 함수
            set_token_cookies(member.member_id, mem_info["google_name"], db, response)

        except Exception as e:
            raise HTTPException(status_code=401, detail=f"transaction failed: {e}")

    return {"status": "ok"}

""" 구글 추가정보 검증 토큰 가져오기 """
@router.post("/google/onboarding/invalid-access")
def google_onboarding_invalid_access(
    temp_google_check: str = Cookie(None)
):
    if not temp_google_check:
        raise HTTPException(status_code=403, detail="cookie not exists")
    try:
        temp_info = decode_google_temp_token(temp_google_check)

        if temp_info and temp_info["check"] == "check":
            return {"status": "ok"}

        raise HTTPException(status_code=403, detail="invalid check")
    except Exception:
        raise HTTPException(status_code=403, detail="token error")

""" 휴대폰 중복 체크 및 번호 인증 보내기"""
@router.post("/google/onboarding/check-phone", status_code=204)
def google_onboarding_check_phone(
    response: Response,
    phone: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    # 휴대폰 번호로 회원 조회
    member = db.query(Member).filter(Member.phone == phone).first()
    if member:
        raise HTTPException(status_code=409, detail="already exists phone")

    encode_google_onboarding_phone_token(response, phone)

    return

""" 휴대폰 번호 인증 검사 """
@router.post("/google/onboarding/check-verify-phone", status_code=204)
def google_onboarding_check_verify_phone(
    response: Response,
    input_code: str = Body(..., embed=True),
    google_phone_token: str = Cookie(None),
):
    # 입력한 코드가 없거나 토큰 없을때
    if not input_code or not google_phone_token:
        raise HTTPException(status_code=404, detail="code or token not exists")

    # 입력 코드 해싱
    hashed_input_code = get_code_hash(input_code)

    # jwt 해독
    payload = decode_google_onboarding_phone_token(google_phone_token)

    if payload.get("code") == hashed_input_code:
        response.delete_cookie("google_phone_token")
        return
    else:
        raise HTTPException(status_code=400, detail="expired cookie")
########################################################################################################################
# 공통 로직
########################################################################################################################
""" 로그아웃 """
@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str = Cookie(None),
    member: dict = Depends(get_cookies_info),
    db: Session = Depends(get_db)
):
    # 리프레시 토큰 무효화
    revoke_existing_token_by_id(db, member["member_id"])
    revoke_existing_token(db, refresh_token)

    # 쿠키 삭제
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"message": "logout successful"}

""" 로그인 정보 가져오는 함수 """
@router.post("/cookies")
def get_cookies(
    response: Response,
    member: dict = Depends(get_cookies_info),
    db: Session = Depends(get_db)
):

    try:
        mem_db = db.query(Member).filter(Member.member_id == member.get("member_id")).first()

    except Exception as e:
        # DB에 회원정보가 없다면 쿠키 삭제
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail=f"unauthorized: {e}")

    return {
        **member,
        "pin_code": mem_db.pin_code
    }

""" 아이디 찾기 """
@router.post("/account-recovery/id")
async def account_recovery_id(
    response: Response,
    id_recovery_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    # 이메일이 존재하는지 검증
    valid_member = db.query(Member).filter(Member.email == id_recovery_data.get("email")).first()
    if not valid_member or not valid_member.login_id:
        raise HTTPException(status_code=404, detail="email or loginid not exists")

    # 아이디, 이메일 반환 준비
    login_id = valid_member.login_id
    email = valid_member.email

    # 인증코드 검증용 jwt 쿠키 생성
    await encode_account_recovery_temp_token(
        response, "recovery_id", login_id, email
    )

    return None

""" 비밀번호 찾기 """
@router.post("/account-recovery/pw")
async def account_recovery_pw(
    response: Response,
    pw_recovery_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    # 이메일이랑 아이디가 존재하는지 검증
    valid_member = db.query(Member).filter(
        (Member.email == pw_recovery_data.get("email")),
        (Member.login_id == pw_recovery_data.get("login_id"))
    ).first()
    if not valid_member:
        raise HTTPException(status_code=404, detail="email or id not exists")

    # 아이디, 이메일 반환 준비
    login_id = valid_member.login_id
    email = valid_member.email

    # 인증코드 검증용 jwt 쿠키 생성
    await encode_account_recovery_temp_token(
        response, "recovery_pw", login_id, email
    )

    return None

""" 아이디/비밀번호 찾기 인증번호 입력 검증 """
@router.post("/account-recovery/code")
async def account_recovery_code(
    response: Response,
    input_code: str = Body(..., embed=True),
    recovery_id: str = Cookie(None),
    recovery_pw: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # 입력한 코드가 없을때
    if not input_code:
        raise HTTPException(status_code=404, detail="code not exists")

    # 입력 코드 해싱
    hashed_input_code = get_code_hash(input_code)

    # 아이디 찾기
    if recovery_id:
        payload = decode_account_recovery_temp_token(recovery_id)

        # 이메일로 보낸 코드가 일치하면
        if hashed_input_code == payload.get("code"):
            response.delete_cookie("recovery_id")

            # 해싱된 로그인 아이디 가져오기
            encrypted_id = payload.get("login_id")
            login_id = decrypt_data(encrypted_id)

            return {"login_id": login_id, "recovery_type": "id"}

        raise HTTPException(status_code=404, detail="incorrect code")

    # 비밀번호 찾기
    elif recovery_pw:
        payload = decode_account_recovery_temp_token(recovery_pw)

        # 이메일로 보낸 코드가 일치하면
        if hashed_input_code == payload.get("code"):
            response.delete_cookie("recovery_pw")

            # 이메일 가져오기
            email = payload.get("email")

            # 해싱된 로그인 아이디 가져오기
            encrypted_id = payload.get("login_id")
            login_id = decrypt_data(encrypted_id)

            # 비밀번호 생성 (10자리)
            password = generate_temp_password()

            # 임시 비밀번호 변경
            member = db.query(Member).filter(Member.login_id == login_id).first()
            member.password = password_encode(password)
            db.commit()
            db.refresh(member)

            await send_password(email, password)

            return {"password": password, "recovery_type": "pw"}

        raise HTTPException(status_code=404, detail="incorrect code")

    else:
        raise HTTPException(status_code=400, detail="expired cookie")