import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../utils/authApi.js';
import { useAuthCookieStore } from '../../utils/useAuthStores.js';

const AccountRecovery = () => {
    const navigate = useNavigate();
    const [findIdEmail, setFindIdEmail] = useState('');
    const [findPwId, setFindPwId] = useState('');
    const [findPwEmail, setFindPwEmail] = useState('');
    const [step, setStep] = useState(1);
    const [authCode, setAuthCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(300);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [resultData, setResultData] = useState('');
    const [activeTab, setActiveTab] = useState('find_id');
    const [isLoading, setIsLoading] = useState(false);
    const { member, fetchMember, isLoading: isAuthLoading } = useAuthCookieStore();

    // 컴포넌트 마운트 시 최신 인증 정보를 확인
    useEffect(() => {
        void fetchMember();
    }, [fetchMember]);

    // member 상태가 변하면 리다이렉트 체크
    useEffect(() => {
        if (member) {
            navigate('/web', { replace: true });
        }
    }, [member, navigate]);

    // [수정 완료] 타이머 로직 통합 (ESLint 에러 해결 버전)
    useEffect(() => {
        let interval = null;

        // 타이머가 활성화되었을 때만 실행
        if (isTimerActive) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => {
                    // 다음 틱에서 시간이 0 이하가 될 경우
                    if (prevTime <= 1) {
                        clearInterval(interval);

                        // ★ [핵심 해결 포인트]
                        // setState(setTimeLeft) 내부에서 다른 setState(setIsTimerActive)를
                        // 동기적으로 호출하면 리액트 렌더링 충돌이 발생합니다.
                        // setTimeout(() => {}, 0)을 사용하여 종료 로직을 '다음 렌더링 사이클'로 미루면 에러가 사라집니다.
                        setTimeout(() => {
                            setIsTimerActive(false);
                            alert("인증 시간이 만료되었습니다. 다시 시도해주세요.");
                            setStep(1);
                        }, 0);

                        return 0; // 시간은 0으로 설정
                    }
                    // 아니면 1초 감소
                    return prevTime - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
        // 의존성 배열에서 timeLeft를 제거했습니다. (prevTime을 사용하므로 없어도 됨)
    }, [isTimerActive]);

    // 비동기 통신 동안 보여줄 로딩 문구
    if (isAuthLoading) {
        return <div>pending...</div>
    }

    // [추가] 탭 변경 시 상태 초기화
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setStep(1);
        setAuthCode('');
        setIsTimerActive(false);
        setResultData('');
    };

    // [추가] 시간을 00:00 포맷으로 변환
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // [수정] 인증코드 발송 요청 (Step 1 -> Step 2)
    const handleSendCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // 탭 상태 체크 'find_id' | 'find_pw'
        try {
            if (activeTab === 'find_id') {
                const data = {
                    'email': findIdEmail
                };
                await authApi.accountRecoveryId(data);
            } else {
                const data = {
                    'email': findPwEmail,
                    'login_id': findPwId
                };
                await authApi.accountRecoveryPw(data);
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    if (activeTab === 'find_id') {
                        setIsLoading(false);
                        return alert('해당되는 계정이 없습니다. 이메일을 다시 입력하세요.');
                    } else {
                        setIsLoading(false);
                        return alert('해당되는 계정이 없습니다. 아이디, 이메일을 다시 입력하세요.');
                    }
                } else {
                    return alert(`에러발생: ${error.status}`);
                }
            } else {
                return alert(`통신불가: ${error}`);
            }
        }
        setIsLoading(false);
        setStep(2); // 인증 코드 입력 단계로 이동
        setTimeLeft(300); // 5분 리셋
        setIsTimerActive(true);
    };

    // [추가] 인증코드 확인 요청 (Step 2 -> Step 3) 'find_id' | 'find_pw'
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        // API: 인증코드 검증 요청
        setIsLoading(true);

        try {
            const result = await authApi.accountRecoveryCode({'input_code': authCode});
            if (result.data.login_id) {
                setResultData(result.data.login_id);
            } else if (result.data.password) {
                setResultData(result.data.password);
            }
            setStep(3);
        } catch (error) {
            if (error.response) {
                if (error.response === 404) {
                    setIsLoading(false);
                    return alert('올바른 인증번호를 다시 입력해주세요.')
                } else if (error.response === 400) {
                    navigate('/web/login');
                } else {
                    return alert(`에러발생: ${error.status}`);
                }
            } else {
                return alert(`통신불가: ${error}`);
            }
        } finally {
            setIsLoading(false);
            setIsTimerActive(false);
        }
    };

    return (
        // [전체 컨테이너]
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f0f4f8] dark:bg-slate-950 transition-colors duration-500 font-sans">

            {/* [배경 데코레이션] */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px]
                        bg-blue-400/20 dark:bg-blue-600/10
                        rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px]
                        bg-purple-400/20 dark:bg-indigo-600/10
                        rounded-full blur-[80px]" />
            </div>

            {/* [메인 카드] */}
            <div className="relative z-10 w-full max-w-[440px] p-8 mx-4">

                {/* 유리 패널 레이어 */}
                <div className="absolute inset-0
                        bg-white/60 dark:bg-slate-900/50
                        backdrop-blur-2xl rounded-3xl
                        shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                        border border-white/60 dark:border-white/10 transition-colors duration-300"></div>

                {/* 컨텐츠 레이어 */}
                <div className="relative z-20 flex flex-col gap-6">

                    {/* 헤더 및 탭 전환 (결과 화면인 Step 3에서는 숨김 처리) */}
                    {step !== 3 && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <button
                                    onClick={() => navigate('/web')}
                                    className="flex items-center gap-2 px-3 py-1.5
                                       bg-white/40 dark:bg-slate-800/40
                                       backdrop-blur-md border border-white/60 dark:border-white/10
                                       rounded-full shadow-sm
                                       text-slate-600 dark:text-slate-300
                                       hover:bg-white/80 dark:hover:bg-slate-700/80
                                       hover:scale-105 hover:shadow-md
                                       transition-all duration-300 group cursor-pointer"
                                >
                                    <span className="text-xs font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">홈으로</span>
                                </button>
                            </div>

                            {/* 타이틀 */}
                            <div className="relative text-center">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                                    계정 찾기
                                </h2>
                                <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
                                    {step === 1 ? "가입 시 등록한 정보로 찾을 수 있습니다." : "이메일로 전송된 인증 코드를 입력하세요."}
                                </p>
                            </div>

                            {/* 탭 스위처 */}
                            <div className="grid grid-cols-2 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
                                <button
                                    onClick={() => handleTabChange('find_id')}
                                    className={`text-sm font-semibold py-2.5 rounded-lg transition-all duration-300 cursor-pointer
                                    ${activeTab === 'find_id'
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    아이디 찾기
                                </button>
                                <button
                                    onClick={() => handleTabChange('find_pw')}
                                    className={`text-sm font-semibold py-2.5 rounded-lg transition-all duration-300 cursor-pointer
                                    ${activeTab === 'find_pw'
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    비밀번호 찾기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 메인 폼 영역 */}
                    <div className="min-h-[260px] flex flex-col justify-center">

                        {/* ================= STEP 1: 정보 입력 및 인증코드 발송 ================= */}
                        {step === 1 && (
                            <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleSendCode}>
                                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed text-center font-medium">
                                        {activeTab === 'find_id'
                                            ? "회원가입 시 등록한 이메일로 인증번호를 발송합니다."
                                            : "가입된 아이디와 이메일을 입력하면 이메일로 인증번호를 발송합니다."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* 비밀번호 찾기일 때만 아이디 입력 필드 노출 */}
                                    {activeTab === 'find_pw' && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1">아이디</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="아이디 입력"
                                                value={findPwId}
                                                onChange={(e) => setFindPwId(e.target.value)}
                                                className="w-full h-12 pl-4 pr-4 bg-white/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}

                                    {/* 이메일 입력 (공통) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1">이메일</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="이메일 주소 입력"
                                            value={activeTab === 'find_id' ? findIdEmail : findPwEmail}
                                            onChange={(e) => activeTab === 'find_id' ? setFindIdEmail(e.target.value) : setFindPwEmail(e.target.value)}
                                            className="w-full h-12 pl-4 pr-4 bg-white/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="cursor-pointer w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold text-[15px] transition-all shadow-lg shadow-slate-900/10 dark:shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? '발송 중...' : '인증번호 받기'}
                                </button>
                            </form>
                        )}

                        {/* ================= STEP 2: 인증번호 입력 (타이머 포함) ================= */}
                        {step === 2 && (
                            <form className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500" onSubmit={handleVerifyCode}>
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">인증번호 입력</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        이메일로 발송된 6자리 코드를 입력해주세요.
                                    </p>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="6자리 인증번호를 입력해주세요"
                                        required
                                        value={authCode}
                                        onChange={(e) => setAuthCode(e.target.value)}
                                        className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold bg-white/50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl outline-none text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-sm"
                                    />
                                    {/* 타이머 표시 */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setIsTimerActive(false); }}
                                        className="flex-1 h-12 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        재전송
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] h-12 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold text-[15px] transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        {isLoading ? '확인 중...' : '인증하기'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ================= STEP 3: 결과 확인 (보안 - 뒤로가기 불가) ================= */}
                        {step === 3 && (
                            <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500 py-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-3xl mb-2 animate-bounce">
                                    🔐
                                </div>

                                <div className="text-center space-y-4 w-full">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                        {activeTab === 'find_id' ? '아이디 찾기 성공' : '임시 비밀번호 발급'}
                                    </h3>

                                    <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 w-full select-all">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">
                                            {activeTab === 'find_id' ? '회원님의 아이디' : ''}
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-blue-400 tracking-tight break-all">
                                            {resultData}
                                        </p>
                                    </div>

                                    {activeTab === 'find_pw' && (
                                        <p className="text-xs text-red-500 font-medium">
                                            * 보안을 위해 로그인 후 반드시 비밀번호를 변경해 주세요. <br/>
                                            * 해당 이메일로도 비밀번호를 발송했습니다.
                                        </p>
                                    )}
                                </div>

                                <div className="w-full space-y-3 pt-2">
                                    <button
                                        onClick={() => navigate('/web/login')}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold text-[15px] transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        로그인 페이지로 이동
                                    </button>
                                    <p className="text-[11px] text-slate-400 text-center">
                                        이 페이지를 벗어나면 정보는 다시 표시되지 않습니다.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 하단 링크 (결과 화면이 아닐 때만 표시) */}
                    {step !== 3 && (
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <button onClick={() => navigate('/web/login')} className="hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                                로그인
                            </button>
                            <span className="w-[1px] h-3 bg-slate-300 dark:bg-slate-700"></span>
                            <button onClick={() => navigate('/web/signup')} className="hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                                회원가입
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AccountRecovery;