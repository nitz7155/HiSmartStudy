import os
import random
import string
import hashlib
import base64
import time
import uuid
import hmac
import requests
from fastapi import HTTPException, Response, Cookie, Depends
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from database import get_db
from models import Token, Member

load_dotenv()

SECRET_KEY  = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
SOLAPI_API_KEY = os.getenv("SOLAPI_API_KEY")
SOLAPI_API_SECRET = os.getenv("SOLAPI_API_SECRET")
SOLAPI_SENDER_PHONE = os.getenv("SOLAPI_SENDER_PHONE")

ACCESS_TOKEN_EXPIRE_MINUTES = 15
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = 7
REFRESH_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS

KST = ZoneInfo("Asia/Seoul")
BCRYPT = CryptContext(schemes=["bcrypt"], deprecated="auto")
FERNET = Fernet(base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()))

conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fast_mail = FastMail(conf)

""" 비밀번호 인코딩 """
def password_encode(password: str):
    return BCRYPT.hash(password)

""" 비밀번호 디코딩 """
def password_decode(password: str, hashed_password: str):
    return BCRYPT.verify(password, hashed_password)

""" 엑세스 토큰 생성 """
def create_access_token(member_id, name):
    exp = datetime.now(KST) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "member_id": member_id,
        "name": name,
        "type": "access",
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

""" 리프레시 토큰 생성 """
def create_refresh_token(member_id, name, db: Session):
    exp = datetime.now(KST) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "member_id": member_id,
        "name": name,
        "type": "refresh",
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    refresh_token = Token(
        member_id=member_id,
        token=token,
        expires_at=exp,
    )
    db.add(refresh_token)
    db.commit()

    return token

""" JWT 토큰 검증 """
def verify_token(token: str, token_type: str = "access"):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        member_id = payload.get("member_id")
        name = payload.get("name")
        type_check = payload.get("type")

        mem_info = {
            "member_id": member_id,
            "name": name
        }

        if type_check != token_type:
            return None, "invalid"

        return mem_info, None

    except ExpiredSignatureError:
        return None, "expired"

    except JWTError:
        return None, "invalid"

""" JWT 토큰이 포함된 쿠키 정보 받기 """
def get_cookies_info(
    response: Response,
    access_token: str = Cookie(None),
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    # 엑세스 토큰이 있을때
    if access_token:
        mem_info, error = verify_token(access_token, "access")

        if not error:
            return mem_info
        print(f"⚠️ Access Token 만료/유효하지 않음: {error}")

    # 엑세스 토큰이 없거나 만료되었을때
    # 리프레시 토큰이 있을때
    if refresh_token:
        mem_info, error = verify_token(refresh_token, "refresh")

        # 리프레시 토큰도 만료되었거나 유효하지 않으면 -> 로그인 실패
        if error or not mem_info:
            return None

        # DB에 있는 리프레시 토큰과 일치 여부 검증
        db_token = db.query(Token).filter((Token.token == refresh_token) & (Token.is_revoked == False)).first()
        if not db_token:
            return None

        # 엑세스 토큰 재발급
        new_access_token = create_access_token(mem_info["member_id"], mem_info["name"])
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_SECONDS
        )
        return mem_info

    # 리프레시 토큰이 없을때
    return None

""" 기존 리프레시 토큰 무효화 (쿠키 기반) """
def revoke_existing_token(db: Session, refresh_token: str = None):
    if refresh_token:
        token = db.query(Token).filter(Token.token == refresh_token).first()
        if token:
            token.is_revoked = True
            db.commit()
            db.refresh(token)

""" 기존 리프레시 토큰 무효화 (id 기반) """
def revoke_existing_token_by_id(db: Session, member_id: int):
    prev_refresh = db.query(Token).filter(Token.member_id == member_id).all()
    if prev_refresh:
        for refresh in prev_refresh:
            refresh.is_revoked = True
        db.commit()

""" 토큰 및 쿠키 생성 함수 """
def set_token_cookies(member_id: int, name: str, db: Session, response: Response):
    # 엑세스 토큰 생성
    access_token = create_access_token(member_id, name)

    # 리프레시 토큰 생성 및 DB에 저장
    refresh_token = create_refresh_token(member_id, name, db)

    # 토큰들을 쿠키에 저장
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_SECONDS
    )

    return response

""" 회원가입용 임시 토큰 생성 """
def encode_temp_signup_token(data: dict):
    exp = datetime.now(KST) + timedelta(minutes=5)

    payload = {
        **data,
        "type": "temp_signup",
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

""" 회원가입용 임시 토큰 해독 """
def decode_temp_signup_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "temp_signup":
            raise HTTPException(status_code=401, detail="invalid token")

        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")

""" 구글 추가정보 입력 페이지 검증 토큰 생성 """
def encode_google_temp_token():
    exp = datetime.now(KST) + timedelta(minutes=5)

    payload = {
        "type": "temp_google_check",
        "exp": exp,
        "check": "check"
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

""" 구글 추가정보 입력 페이지 검증 토큰 해독 """
def decode_google_temp_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "temp_google_check":
            raise HTTPException(status_code=401, detail="invalid token")

        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")

""" 암호화 함수 """
def encrypt_data(data: str):
    if not data:
        return ""
    return FERNET.encrypt(data.encode()).decode()

""" 복호화 함수 """
def decrypt_data(encrypted_data: str):
    if not encrypted_data:
        return ""
    try:
        return FERNET.decrypt(encrypted_data.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="decryption failed")

""" 랜덤 인증번호 생성 """
def generate_random_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

""" 랜덤 비밀번호 생성 """
def generate_temp_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$"
    return ''.join(random.choices(chars, k=length))

""" 코드 해싱 함수 """
def get_code_hash(code: str):
    return hashlib.sha256((code + SECRET_KEY).encode('utf-8')).hexdigest()

""" 아이디 및 비밀번호 찾기 jwt 쿠키 생성 """
async def encode_account_recovery_temp_token(response: Response, recovery_type: str, login_id: str, email: str):
    # 인증번호 생성 (6자리)
    code = generate_random_code()

    # 인증번호 암호화
    hashed_code = get_code_hash(code)

    # 쿠키 만료시간 생성
    exp = datetime.now(KST) + timedelta(minutes=5)

    # 아이디 암호화
    encrypted_login_id = encrypt_data(login_id)

    # 아이디 찾기 일때
    if recovery_type == "recovery_id":
        payload = {
            "type": "recovery_id",
            "exp": exp,
            "code": hashed_code,
            "login_id": encrypted_login_id
        }

        # jwt 생성
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        # 쿠키 생성
        response.set_cookie(
            key="recovery_id",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=60 * 5
        )

        # 메일 보내기 및 전송
        message = MessageSchema(
            subject="하이미디어 스터디카페, 아이디 요청 인증코드",
            recipients=[email],
            body=f"""
                <p>인증코드: {code}</p>
                <p>인증코드는 5분 뒤에 만료됩니다.</p>
                """,
            subtype=MessageType.html
        )
        await fast_mail.send_message(message)

    # 비밀번호 찾기 일때
    elif recovery_type == "recovery_pw":
        payload = {
            "type": "recovery_pw",
            "exp": exp,
            "code": hashed_code,
            "login_id": encrypted_login_id,
            "email": email
        }

        # jwt 생성
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

        # 쿠키 생성
        response.set_cookie(
            key="recovery_pw",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=60 * 5
        )

        # 메일 보내기 및 전송
        message = MessageSchema(
            subject="하이미디어 스터디카페, 비밀번호 요청 인증코드",
            recipients=[email],
            body=f"""
                <p>인증코드: {code}</p>
                <p>인증코드는 5분 뒤에 만료됩니다.</p>
                """,
            subtype=MessageType.html
        )
        await fast_mail.send_message(message)
    else:
        raise HTTPException(status_code=400, detail="invalid type")

    return response

""" 아이디 및 비밀번호 찾기 jwt 쿠키 해독 """
def decode_account_recovery_temp_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") == "recovery_id" or payload.get("type") == "recovery_pw":
            return payload
        else:
            raise HTTPException(status_code=400, detail="invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid token")

""" 솔라피 인증 헤더 생성 함수 """
def get_iso_datetime():
    utc_offset_sec = time.altzone if time.localtime().tm_isdst else time.timezone
    utc_offset = -utc_offset_sec / 60 / 60
    hours = int(utc_offset)
    minutes = int((utc_offset - hours) * 60)
    return '%s%+03d:%02d' % (time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime()), hours, minutes)

def get_solapi_headers(api_key, api_secret):
    date = get_iso_datetime()
    salt = str(uuid.uuid4().hex)
    combined_string = date + salt
    signature = hmac.new(api_secret.encode(), combined_string.encode(), hashlib.sha256).hexdigest()
    return {
        'Authorization': f'HMAC-SHA256 apiKey={api_key}, date={date}, salt={salt}, signature={signature}',
        'Content-Type': 'application/json'
    }

""" 휴대폰 인증번호 jwt 쿠키 생성 """
def encode_phone_token(response: Response, phone: str):
    # 인증번호 생성
    code = generate_random_code()

    # 인증번호 암호화
    hashed_code = get_code_hash(code)

    # 쿠키 만료시간 생성
    exp = datetime.now(KST) + timedelta(minutes=5)

    payload = {
        "type": "phone_verification",
        "exp": exp,
        "code": hashed_code,
        "phone": phone
    }

    # jwt 토큰 생성
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 쿠키에 인증번호 저장
    response.set_cookie(
        key="phone_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    # 솔라피 전송 로직
    url = "https://api.solapi.com/messages/v4/send"
    headers = get_solapi_headers(SOLAPI_API_KEY, SOLAPI_API_SECRET)
    data = {
        "message": {
            "to": phone.replace("-", ""),
            "from": SOLAPI_SENDER_PHONE,
            "text": f"[테스트] 인증번호는 [{code}] 입니다."
        }
    }

    try:
        res = requests.post(url, json=data, headers=headers)
        res.raise_for_status()
        return {"status": "success", "message": "인증번호가 발송되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문자 전송 실패 {e}")

""" 휴대폰 jwt 쿠키 해독 """
def decode_phone_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") == "phone_verification":
            return payload
        else:
            raise HTTPException(status_code=400, detail="invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid token")

""" 휴대폰 인증 성공후 jwt 생성 """
def encode_phone_verified_token(response: Response, phone: str):
    exp = datetime.now(KST) + timedelta(minutes=10) # 가입까지 10분 여유
    payload = {
        "type": "phone_verified_success",
        "phone": phone,
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 쿠키에 저장
    response.set_cookie(
        key="phone_verified_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 10
    )

""" 회원가입시 휴대폰 인증 성공후 jwt 해독 """
def decode_phone_verified_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "phone_verified_success":
            return None
        return payload.get("phone")
    except JWTError:
        return None

""" 이메일 인증번호 jwt 쿠키 생성 """
async def encode_email_token(response: Response, email: str):
    # 인증번호 생성
    code = generate_random_code()

    # 인증번호 암호화
    hashed_code = get_code_hash(code)

    # 쿠키 만료시간 생성
    exp = datetime.now(KST) + timedelta(minutes=5)

    payload = {
        "type": "email_verification",
        "exp": exp,
        "code": hashed_code,
        "email": email
    }

    # jwt 토큰 생성
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 쿠키에 인증번호 저장
    response.set_cookie(
        key="email_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    # 메일 보내기 및 전송
    message = MessageSchema(
        subject="하이미디어 스터디카페, 이메일 인증번호",
        recipients=[email],
        body=f"""
                <p>인증코드: {code}</p>
                <p>인증코드는 5분 뒤에 만료됩니다.</p>
                """,
        subtype=MessageType.html
    )
    await fast_mail.send_message(message)

""" 이메일 jwt 쿠키 해독 """
def decode_email_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") == "email_verification":
            return payload
        else:
            raise HTTPException(status_code=400, detail="invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid token")

""" 이메일 인증 성공후 jwt 생성 """
def encode_email_verified_token(response: Response, email: str):
    exp = datetime.now(KST) + timedelta(minutes=10) # 가입까지 10분 여유
    payload = {
        "type": "email_verified_success",
        "email": email,
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 쿠키에 저장
    response.set_cookie(
        key="email_verified_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 10
    )

""" 회원가입시 이메일 인증 성공후 jwt 해독 """
def decode_email_verified_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "email_verified_success":
            return None
        return payload.get("email")
    except JWTError:
        return None

""" 구글 온보딩 휴대폰 인증번호 jwt 쿠키 생성 """
def encode_google_onboarding_phone_token(response: Response, phone: str):
    # 인증번호 생성
    code = generate_random_code()

    # 인증번호 암호화
    hashed_code = get_code_hash(code)

    # 쿠키 만료시간 생성
    exp = datetime.now(KST) + timedelta(minutes=5)

    payload = {
        "type": "google_phone_verification",
        "exp": exp,
        "code": hashed_code,
    }

    # jwt 토큰 생성
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 쿠키에 인증번호 저장
    response.set_cookie(
        key="google_phone_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 5
    )

    # 솔라피 전송 로직
    url = "https://api.solapi.com/messages/v4/send"
    headers = get_solapi_headers(SOLAPI_API_KEY, SOLAPI_API_SECRET)
    data = {
        "message": {
            "to": phone.replace("-", ""),
            "from": SOLAPI_SENDER_PHONE,
            "text": f"[테스트] 인증번호는 [{code}] 입니다."
        }
    }

    try:
        res = requests.post(url, json=data, headers=headers)
        res.raise_for_status()
        return {"status": "success", "message": "인증번호가 발송되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문자 전송 실패 {e}")

""" 구글 온보딩 휴대폰 jwt 쿠키 해독 """
def decode_google_onboarding_phone_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") == "google_phone_verification":
            return payload
        else:
            raise HTTPException(status_code=400, detail="invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid token")

""" 비밀번호도 이메일로 보내기 """
async def send_password(email: str, password: str):
    # 메일 보내기 및 전송
    message = MessageSchema(
        subject="하이미디어 스터디카페, 새 비밀번호",
        recipients=[email],
        body=f"""
                    <p>새 비밀번호: {password}</p>
               """,
        subtype=MessageType.html
    )
    await fast_mail.send_message(message)