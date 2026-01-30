import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../utils/authApi.js';

const GoogleOnBoarding = () => {
    const navigate = useNavigate();

    // 1. 기존 데이터 State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthday, setBirthday] = useState('');
    const [pincode, setPincode] = useState('');
    const [birthError, setBirthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // 2. [추가됨] 휴대폰 인증 관련 State
    const [authCode, setAuthCode] = useState('');        // 입력한 인증코드
    const [timer, setTimer] = useState(300);             // 타이머 (5분)
    const [isCodeSent, setIsCodeSent] = useState(false); // 인증번호 발송 여부
    const [isPhoneVerified, setIsPhoneVerified] = useState(false); // 최종 인증 완료 여부
    const [phoneMessage, setPhoneMessage] = useState(''); // 안내 메시지
    const [isPhoneError, setIsPhoneError] = useState(false); // 에러 상태(빨간색/파란색)

    // 구글 소셜 로그인 외 클라이언트 접근 차단
    useEffect(() => {
        const checkClient = async () => {
            try {
                setIsChecking(true);
                const result = await authApi.onBoardingInvalidAccess();

                if (result.status === 200) {
                    setIsChecking(false);
                }
            } catch (error) {
                console.log(error);
                navigate('/web', { replace: true });
            }
        };
        void checkClient();
    }, [navigate]);

    // 3. [추가됨] 타이머 로직
    useEffect(() => {
        let interval;
        // 인증번호가 발송되었고, 타이머가 남아있고, 아직 인증완료 전이라면 타이머 가동
        if (isCodeSent && timer > 0 && !isPhoneVerified) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0 && isCodeSent && !isPhoneVerified) {
            // 시간 초과 시
            setIsCodeSent(false);
            setPhoneMessage('인증 시간이 만료되었습니다. 다시 시도해주세요.');
            setIsPhoneError(true);
        }
        return () => clearInterval(interval);
    }, [isCodeSent, timer, isPhoneVerified]);

    // 시간 포맷팅 함수 (MM:SS)
    const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec < 10 ? `0${sec}` : sec}`;
    };

    // 4. [추가됨] 휴대폰 인증 요청 핸들러
    const handleRequestVerification = async () => {
        if (phoneNumber.length < 12) {
            setPhoneMessage('휴대폰 번호를 올바르게 입력해주세요.');
            setIsPhoneError(true);
            return;
        }

        try {
            // 중복 체크 및 인증번호 발송 API 호출
            // (authApi 수정사항 반영: 객체가 아닌 값만 전달)
            const result = await authApi.onBoardCheckPhone(phoneNumber);

            if (result.status === 200 || result.status === 204) {
                setIsCodeSent(true);
                setTimer(300); // 5분 리셋
                setIsPhoneVerified(false);
                setPhoneMessage(`인증번호가 발송되었습니다. (남은 시간: ${formatTime(300)})`);
                setIsPhoneError(false);
            }
        } catch (error) {
            setIsCodeSent(false);
            if (error.response && error.response.status === 409) {
                setPhoneMessage('이미 가입된 휴대폰 번호입니다.');
                setIsPhoneError(true);
            } else if (error.response && error.response.status === 400) {
                setPhoneMessage('이미 사용 중인 번호입니다.');
                setIsPhoneError(true);
            } else {
                setPhoneMessage('서버 통신 오류가 발생했습니다.');
                setIsPhoneError(true);
            }
        }
    };

    // 5. [추가됨] 인증번호 확인 핸들러
    const handleVerifyCode = async () => {
        if (!authCode) return;

        try {
            // 인증번호 확인 API 호출
            // (authApi 수정사항 반영: 객체가 아닌 값만 전달)
            const res = await authApi.onBoardCheckVerifyPhone(authCode);

            if (res.status === 204) {
                setIsPhoneVerified(true);
                setIsCodeSent(false); // 타이머 정지
                setPhoneMessage('인증이 완료되었습니다.');
                setIsPhoneError(false);
            }
        } catch (error) {
            console.error(error);
            setPhoneMessage('인증번호가 일치하지 않거나 만료되었습니다.');
            setIsPhoneError(true);
        }
    };

    // 6. [수정됨] 추가 정보 폼 제출 이벤트
    const handleSetupSubmit = async (e) => {
        e.preventDefault();

        // 휴대폰 인증 여부 확인
        if (!isPhoneVerified) {
            setPhoneMessage('휴대폰 인증을 완료해주세요!');
            setIsPhoneError(true);
            alert("휴대폰 인증이 완료되지 않았습니다.");
            return;
        }

        setIsLoading(true);

        const data = {
            "phone": phoneNumber,
            "birthday": birthday,
            "pin_code": pincode
        };

        try {
            const result = await authApi.onBoarding(data);

            if (result.status === 200 || result.status === 204) {
                navigate('/web');
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 400) {
                    alert('이미 가입된 휴대폰 번호입니다');
                } else {
                    alert(`오류 발생: ${error.response.status}`);
                }
            } else {
                alert('서버 통신 실패');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 7. [수정됨] 휴대폰 번호 입력 및 상태 초기화 핸들러
    const handlePhoneInput = (e) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '');
        let formatted = '';

        if (rawValue.length < 4) {
            formatted = rawValue;
        } else if (rawValue.length < 8) {
            formatted = `${rawValue.slice(0, 3)}-${rawValue.slice(3)}`;
        } else {
            formatted = `${rawValue.slice(0, 3)}-${rawValue.slice(3, 7)}-${rawValue.slice(7, 11)}`;
        }

        setPhoneNumber(formatted);

        // ★★★ 번호 수정 시 인증 상태 리셋 (사용자 실수 방지)
        if (isCodeSent || isPhoneVerified) {
            setIsCodeSent(false);
            setIsPhoneVerified(false);
            setTimer(300);
            setAuthCode("");
            setPhoneMessage("");
            setIsPhoneError(false);
        }
    };

    // 생년월일 입력 및 검증 로직
    const handleBirthChange = (e) => {
        const val = e.target.value.replace(/[^0-9]/g, "");
        setBirthday(val);
        setBirthError('');

        if (val.length === 8) {
            const year = parseInt(val.substring(0, 4));
            const month = parseInt(val.substring(4, 6));
            const day = parseInt(val.substring(6, 8));
            const currentYear = new Date().getFullYear();

            if (year < 1900 || year > currentYear - 16) {
                setBirthError(`${year}년은 올바르지 않습니다. (1900~${currentYear - 16})`);
                return;
            }
            if (month < 1 || month > 12) {
                setBirthError('월은 1월부터 12월까지만 가능합니다.');
                return;
            }
            const date = new Date(year, month - 1, day);
            if (
                date.getFullYear() !== year ||
                date.getMonth() + 1 !== month ||
                date.getDate() !== day
            ) {
                setBirthError(`${month}월에는 ${day}일이 존재하지 않습니다.`);
            }
        }
    };

    if (isChecking) {
        return <div className="flex justify-center items-center h-screen">권한 확인 중...</div>;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f0f4f8] dark:bg-slate-950 transition-colors duration-500 font-sans">

            {/* 배경 데코레이션 */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px]
                        bg-blue-400/20 dark:bg-blue-600/10
                        rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px]
                        bg-purple-400/20 dark:bg-indigo-600/10
                        rounded-full blur-[80px]" />
            </div>

            {/* 메인 카드 */}
            <div className="relative z-10 w-full max-w-[420px] p-8 mx-4">
                {/* 유리 패널 */}
                <div className="absolute inset-0
                        bg-white/60 dark:bg-slate-900/50
                        backdrop-blur-2xl rounded-2xl
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                        border border-white/60 dark:border-white/10 transition-colors duration-300"></div>

                {/* 컨텐츠 */}
                <div className="relative z-20 flex flex-col gap-6">

                    <div className="space-y-2 text-center mt-2">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            추가 정보 입력
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            구글 계정 연동을 완료하기 위해<br/>
                            휴대폰 번호와 생년월일이 필요합니다.
                        </p>
                    </div>

                    <form className="space-y-5 mt-2" onSubmit={handleSetupSubmit}>

                        {/* 휴대폰 번호 입력 및 인증 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1">
                                휴대폰 번호
                            </label>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2
                                text-slate-400 dark:text-slate-500
                                group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400
                                transition-colors duration-200">
                                    {/* 아이콘이 들어갈 자리 */}
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="휴대폰번호"
                                    value={phoneNumber}
                                    maxLength="13"
                                    onChange={handlePhoneInput}
                                    disabled={isPhoneVerified} // 인증 완료되면 수정 불가
                                    className={`w-full h-12 pl-12 pr-24 
                                        bg-white/50 dark:bg-slate-950/50
                                        border rounded-xl text-sm outline-none
                                        text-slate-800 dark:text-slate-200
                                        focus:bg-white dark:focus:bg-slate-900
                                        focus:border-blue-500/50 dark:focus:border-blue-400/50
                                        transition-all duration-200
                                        placeholder:text-slate-400 dark:placeholder:text-slate-600
                                        ${isPhoneVerified ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : ''}
                                        ${isPhoneError ? 'border-red-500' : 'border-slate-200/80 dark:border-slate-700/80'}
                                    `}
                                />

                                {/* 인증요청/완료 버튼 */}
                                <div className="absolute right-1.5 top-1.5 bottom-1.5">
                                    <button
                                        type="button"
                                        onClick={handleRequestVerification}
                                        disabled={isPhoneVerified || isCodeSent}
                                        className={`h-full px-3 rounded-lg text-xs font-semibold transition-all duration-200
                                            ${isPhoneVerified
                                            ? 'bg-green-500 text-white cursor-default'
                                            : isCodeSent
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer'
                                        }
                                        `}
                                    >
                                        {isPhoneVerified ? '인증완료' : isCodeSent ? '발송됨' : '인증요청'}
                                    </button>
                                </div>
                            </div>

                            {/* 상태 메시지 및 타이머 */}
                            {phoneMessage && (
                                <p className={`text-xs ml-1 font-medium ${isPhoneError ? 'text-red-500' : 'text-blue-500'}`}>
                                    {isCodeSent && !isPhoneVerified ? (
                                        <span className="text-red-500 animate-pulse">
                                            남은 시간: {formatTime(timer)}
                                        </span>
                                    ) : (
                                        phoneMessage
                                    )}
                                </p>
                            )}

                            {/* [추가] 인증번호 입력란 (발송됨 상태일 때만 표시) */}
                            {isCodeSent && !isPhoneVerified && (
                                <div className="flex gap-2 mt-2 animate-fadeIn">
                                    <input
                                        type="text"
                                        placeholder="인증번호 입력"
                                        maxLength="6"
                                        value={authCode}
                                        // ★ 입력값 강제 대문자 변환
                                        onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                                        // ★ uppercase 클래스로 시각적 대문자 적용
                                        className="flex-1 h-12 px-4 pl-12
                                                uppercase
                                                bg-white/50 dark:bg-slate-950/50
                                                border border-slate-200/80 dark:border-slate-700/80
                                                rounded-xl text-sm outline-none
                                                text-slate-800 dark:text-slate-200
                                                focus:bg-white dark:focus:bg-slate-900
                                                focus:border-blue-500/50 dark:focus:border-blue-400/50
                                                focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                                transition-all duration-200
                                                placeholder:text-slate-400 dark:placeholder:text-slate-600
                                                placeholder:normal-case
                                                hover:bg-white/80 dark:hover:bg-slate-900/80"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyCode}
                                        className="h-12 px-5
                                                bg-slate-900 hover:bg-slate-800
                                                dark:bg-blue-600 dark:hover:bg-blue-500
                                                text-white rounded-xl text-sm font-bold
                                                transition-all duration-200 cursor-pointer
                                                shadow-md"
                                    >
                                        확인
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 생년월일 입력 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1">
                                생년월일
                            </label>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400...">
                                    {/* 아이콘 */}
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$"
                                    required
                                    placeholder="생년월일 (19990101)"
                                    title="생년월일 (19990101)"
                                    maxLength="8"
                                    value={birthday}
                                    onChange={handleBirthChange}
                                    className={`w-full h-12 pl-12 pr-4
                                 bg-white/50 dark:bg-slate-950/50
                                 border rounded-xl text-sm outline-none
                                 text-slate-800 dark:text-slate-200
                                 transition-all duration-200
                                 placeholder:text-slate-400 dark:placeholder:text-slate-600
                                 hover:bg-white/80 dark:hover:bg-slate-900/80
                                 ${birthError
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
                                        : 'border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500/50 dark:focus:border-blue-400/50 focus:ring-blue-500/10'
                                    }`}
                                />
                            </div>
                            {birthError && (
                                <p className="text-xs text-red-500 ml-1 font-medium animate-pulse">
                                    {birthError}
                                </p>
                            )}
                        </div>

                        {/* 핀코드 입력 */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1">
                                핀코드
                            </label>
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2
                                text-slate-400 dark:text-slate-500
                                group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400
                                transition-colors duration-200">
                                </div>
                                <input
                                    type="password"
                                    pattern="\d{4}"
                                    maxLength="4"
                                    inputMode="numeric"
                                    required
                                    placeholder="숫자 핀코드 (4자)"
                                    title="숫자 핀코드 (4자)"
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="w-full h-12 pl-12 pr-4
                             bg-white/50 dark:bg-slate-950/50
                             border border-slate-200/80 dark:border-slate-700/80
                             rounded-xl text-sm outline-none
                             text-slate-800 dark:text-slate-200
                             focus:bg-white dark:focus:bg-slate-900
                             focus:border-blue-500/50 dark:focus:border-blue-400/50
                             focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                             transition-all duration-200
                             placeholder:text-slate-400 dark:placeholder:text-slate-600
                             hover:bg-white/80 dark:hover:bg-slate-900/80
                             dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* 제출 버튼 */}
                        {isLoading ? (
                            <div>제출 중...</div>
                        ) : (
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full h-12
                           bg-slate-900 hover:bg-slate-800
                           dark:bg-blue-600 dark:hover:bg-blue-500
                           text-white rounded-xl font-bold text-[15px]
                           transition-all duration-200
                           shadow-lg shadow-slate-900/10 dark:shadow-blue-900/20
                           flex items-center justify-center gap-2
                           active:scale-[0.98] cursor-pointer group"
                                >
                                    <span>완료 및 시작하기</span>
                                </button>
                            </div>
                        )}

                        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                            입력하신 정보는 계정 보안 및 본인 확인 용도로만 사용됩니다.
                        </p>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default GoogleOnBoarding;