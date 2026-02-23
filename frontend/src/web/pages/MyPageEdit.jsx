import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MyPageCheckPw from "./MyPageCheckPw";

// SVG 아이콘 컴포넌트들 (기존 유지)
const NaverIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M11.7042 9.77492L6.87704 2.8999H2.6001V17.0999H6.4251V10.2249L11.2522 17.0999H15.5292V2.8999H11.7042V9.77492Z" fill="white"/></svg>);
const KakaoIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#3C1E1E" d="M12 3C7.58 3 4 5.69 4 9C4 11.27 5.46 13.26 7.68 14.28L6.87 17.26C6.82 17.44 7.02 17.59 7.18 17.48L10.87 14.93C11.24 14.98 11.62 15 12 15C16.42 15 20 12.31 20 9C20 5.69 16.42 3 12 3Z"/></svg>);
const GoogleIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" /></svg>);

export default function MyPageEdit() {
    const navigate = useNavigate();

    // 유저 정보 상태
    const [user, setUser] = useState({
        name: "",
        email: "",
        time: 0,
        hasPassword: false,
        social: { kakao: false, naver: false, google: false }
    });

    // --- [이메일 변경 관련 상태] ---
    const [newEmail, setNewEmail] = useState("");
    const [emailStep, setEmailStep] = useState(1); // 1:입력, 2:인증코드입력, 3:인증완료
    const [emailAuthCode, setEmailAuthCode] = useState("");
    const [emailTimer, setEmailTimer] = useState(300); // 5분
    const [isEmailTimerActive, setIsEmailTimerActive] = useState(false);

    // 비밀번호 & 핀코드 관련 상태
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [canModify, setCanModify] = useState(false);

    // --- [타이머 로직 (AccountRecovery와 동일)] ---
    useEffect(() => {
        let interval = null;
        if (isEmailTimerActive) {
            interval = setInterval(() => {
                setEmailTimer((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(interval);
                        setTimeout(() => {
                            setIsEmailTimerActive(false);
                            alert("인증 시간이 만료되었습니다. 다시 시도해주세요.");
                            setEmailStep(1); // 다시 입력 단계로
                        }, 0);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isEmailTimerActive]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // --- [초기 데이터 로드] ---
    const loginCheck = async () => {
        try {
            const res = await fetch(`/api/web/me`, { credentials: 'include' });
            if (!res.ok) return navigate("/web/login");
            const data = await res.json();
            setUser({
                name: data.name,
                email: data.email,
                time: data.total_mileage,
                hasPassword: data.has_password,
                social: data.social_connected || { kakao: false, naver: false, google: false }
            });
            if (!data.has_password) setCanModify(true);
        } catch (err) {
            console.error(err);
            navigate("/web/login");
        }
    };

    useEffect(() => { loginCheck(); }, []);

    // 스크롤 잠금
    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = !canModify && user.hasPassword ? "hidden" : "auto";
        return () => { document.body.style.overflow = "auto"; };
    }, [canModify, user.hasPassword]);


    // --- [핸들러: 이메일 인증 번호 발송 (Step 1 -> 2)] ---
    const handleSendVerification = async () => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!newEmail) return alert("변경하실 이메일을 입력하세요.");
        if (!emailRegex.test(newEmail)) return alert("유효한 이메일 주소를 입력하세요.");
        if (newEmail === user.email) return alert("현재 사용 중인 이메일과 동일합니다.");

        try {
            // auth.py의 중복체크 및 인증번호 발송 API 사용
            const res = await fetch("/api/web/auth/signup/check-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: newEmail })
            });

            if (res.ok) {
                alert("인증번호가 발송되었습니다.");
                setEmailStep(2);
                setEmailTimer(300);
                setIsEmailTimerActive(true);
            } else {
                const data = await res.json();
                alert(data.detail || "인증번호 발송 실패");
            }
        } catch (err) {
            console.error(err);
            alert("서버 오류가 발생했습니다.");
        }
    };

    // --- [핸들러: 인증 번호 검증 (Step 2 -> 3)] ---
    const handleVerifyEmailCode = async () => {
        if (!emailAuthCode) return alert("인증번호를 입력하세요.");

        try {
            // auth.py의 인증번호 검증 API 사용
            const res = await fetch("/api/web/auth/signup/check-verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input_code: emailAuthCode })
            });

            if (res.ok) {
                alert("이메일 인증이 완료되었습니다.");
                setIsEmailTimerActive(false);
                setEmailStep(3); // 인증 완료 단계
            } else {
                const data = await res.json();
                alert(data.detail || "인증번호가 일치하지 않습니다.");
            }
        } catch (err) {
            console.error(err);
            alert("인증 중 오류가 발생했습니다.");
        }
    };

    // --- [핸들러: 최종 이메일 변경 (Step 3 -> 완료)] ---
    const handleEmailChangeSubmit = async () => {
        // Step 3 (인증 완료) 상태가 아니면 거부
        if (emailStep !== 3) return alert("이메일 인증을 먼저 진행해주세요.");

        try {
            const res = await fetch("/api/web/mypage/modify/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: newEmail })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message);

                // 상태 초기화 및 유저 정보 업데이트
                setNewEmail("");
                setEmailAuthCode("");
                setEmailStep(1);

                // 유저 정보 갱신 (변경된 이메일 반영)
                setUser(prev => ({ ...prev, email: newEmail }));
            } else {
                const data = await res.json();
                alert(data.detail);
            }
        } catch (err) { console.log(err); }
    };

    // --- 기타 변경 핸들러 (비밀번호, 핀코드 등) 기존 유지 ---
    const handlePasswordSubmit = async (e) => {
        // ... (기존 코드 유지) ...
        e.preventDefault();
        if (!newPassword) return alert("변경하실 비밀번호를 입력하세요.");
        if (newPassword !== confirmPassword) return alert("비밀번호가 일치하지 않습니다.");
        try {
            const res = await fetch("/api/web/mypage/modify/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); setNewPassword(""); setConfirmPassword(""); }
            else { alert(data.detail); }
        } catch (err) { console.log(err); }
    };

    const handlePinSubmit = async (e) => {
        // ... (기존 코드 유지) ...
        e.preventDefault();
        if (!newPin) return alert("변경하실 핀코드를 입력하세요.");
        if (newPin !== confirmPin) return alert("핀코드가 일치하지 않습니다.");
        try {
            const res = await fetch("/api/web/mypage/modify/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: newPin })
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); setNewPin(""); setConfirmPin(""); }
            else { alert(data.detail); }
        } catch (err) { console.log(err); }
    };

    const handleSocialConnect = (provider) => {
        window.location.href = `/api/web/auth/${provider}/login?next=mypage/edit`;
    };

    return (
        <div className="p-4 space-y-8 bg-[#f0f4f8] dark:bg-slate-900/50 dark:text-gray-200 transition-colors min-h-screen">

            {!canModify && user.hasPassword && (
                <MyPageCheckPw setCanModify={setCanModify} userName={user.name} />
            )}

            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">내 정보 수정</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">본인의 정보를 확인하고 수정하세요</p>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-md p-6 transition-colors border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">이름</p>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.name}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">보유 시간</p>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.time}분</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-md p-6 space-y-10 border border-gray-200 dark:border-gray-700">

                {/* 1. 이메일 변경 (단계별 UI 적용) */}
                <section>
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                        이메일 변경
                    </h1>

                    <div className="space-y-4">

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">현재 이메일</p>
                            <div className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium select-none">
                                {user.email}
                            </div>
                        </div>

                        {/* Step 1: 이메일 입력 */}
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">변경할 이메일</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    className={`w-full p-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all
                                        ${emailStep > 1 ? 'border-gray-200 dark:border-gray-600 text-gray-500 bg-gray-100' : 'border-gray-300 dark:border-gray-600'}
                                    `}
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="이메일을 입력하세요."
                                    disabled={emailStep > 1} // 인증 시작하면 수정 불가
                                />
                                {emailStep === 1 && (
                                    <button
                                        onClick={handleSendVerification}
                                        className="whitespace-nowrap px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
                                    >
                                        인증번호 받기
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Step 2: 인증번호 입력 (Step 2 이상일 때 표시) */}
                        {emailStep === 2 && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">인증번호</p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none tracking-widest font-bold text-center"
                                        value={emailAuthCode}
                                        onChange={(e) => setEmailAuthCode(e.target.value)}
                                        placeholder="6자리 코드 입력"
                                    />
                                    {/* 타이머 */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                                        {formatTime(emailTimer)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEmailStep(1); setIsEmailTimerActive(false); setNewEmail(""); }}
                                        className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition"
                                    >
                                        취소/재입력
                                    </button>
                                    <button
                                        onClick={handleVerifyEmailCode}
                                        className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
                                    >
                                        인증번호 확인
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: 인증 완료 & 최종 저장 버튼 */}
                        {emailStep === 3 && (
                            <div className="animate-in fade-in zoom-in-95 space-y-4">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-400 font-medium justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    이메일 인증이 완료되었습니다.
                                </div>
                                <button
                                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition shadow-md active:scale-[0.99]"
                                    onClick={handleEmailChangeSubmit}
                                >
                                    이메일 변경 저장하기
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. 비밀번호 변경 */}
                {user.hasPassword && (
                    <section className="pt-8 border-t border-gray-100 dark:border-gray-700">
                        {/* ... 기존 코드 ... */}
                        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                            비밀번호 변경
                        </h1>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">변경할 비밀번호</p>
                                <input
                                    type="password"
                                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">비밀번호 확인</p>
                                <input
                                    type="password"
                                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            className="w-full mt-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition active:scale-[0.99]"
                            onClick={handlePasswordSubmit}
                        >
                            비밀번호 변경
                        </button>
                    </section>
                )}

                {/* 3. 핀코드 변경 */}
                <section className="pt-8 border-t border-gray-100 dark:border-gray-700">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                        핀코드 변경
                    </h1>
                    {/* ... (기존 핀코드 input들은 그대로 두기) ... */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">변경할 핀코드 (4자리)</p>
                            <input
                                type="text"
                                maxLength={4}
                                inputMode="numeric"
                                pattern="\d*"
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">핀코드 확인</p>
                            <input
                                type="text"
                                maxLength={4}
                                inputMode="numeric"
                                pattern="\d*"
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        className="w-full mt-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition active:scale-[0.99]"
                        onClick={handlePinSubmit}
                    >
                        핀코드 변경
                    </button>
                </section>

                {/* 4. 소셜 계정 연동 (기존 코드 유지) */}
                <section className="pt-8 border-t border-gray-100 dark:border-gray-700">
                    {/* ... (이전 답변의 소셜 연동 섹션 코드와 동일) ... */}
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
                        소셜 계정 연동
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        자주 사용하는 소셜 아이디와 연동하여 간편하게 로그인하세요.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#03C75A] rounded-full text-white">
                                    <NaverIcon />
                                </div>
                                <span className="font-medium text-gray-700 dark:text-gray-200">네이버</span>
                            </div>
                            <button
                                onClick={() => !user.social.naver && handleSocialConnect("naver")}
                                disabled={user.social.naver}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm
                                    ${user.social.naver
                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-default dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                                    : "bg-[#03C75A] text-white hover:bg-[#02b351] active:scale-95 border border-[#03C75A]"
                                }`}
                            >
                                {user.social.naver ? "연동됨" : "연동하기"}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#FEE500] rounded-full text-[#3C1E1E]">
                                    <KakaoIcon />
                                </div>
                                <span className="font-medium text-gray-700 dark:text-gray-200">카카오</span>
                            </div>
                            <button
                                onClick={() => !user.social.kakao && handleSocialConnect("kakao")}
                                disabled={user.social.kakao}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm
                                    ${user.social.kakao
                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-default dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                                    : "bg-[#FEE500] text-[#3C1E1E] hover:bg-[#fdd835] active:scale-95 border border-[#FEE500]"
                                }`}
                            >
                                {user.social.kakao ? "연동됨" : "연동하기"}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full border border-gray-200 dark:border-gray-600">
                                    <GoogleIcon />
                                </div>
                                <span className="font-medium text-gray-700 dark:text-gray-200">Google</span>
                            </div>
                            <button
                                onClick={() => !user.social.google && handleSocialConnect("google")}
                                disabled={user.social.google}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition shadow-sm
                                    ${user.social.google
                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-default dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:scale-95 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                                }`}
                            >
                                {user.social.google ? "연동됨" : "연동하기"}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}