import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthCookieStore } from '../../utils/useAuthStores.js';
import { useState, useEffect } from 'react';
import { authApi } from '../../utils/authApi.js';

const WebLayout = () => {
    const navigate = useNavigate();
    const { member, fetchMember, clearMember, isLoading } = useAuthCookieStore();
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [isPinSubmitting, setIsPinSubmitting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // 페이지 로드시 내 정보 쿠키 가져오기
    useEffect(() => {
        void fetchMember();
    }, [fetchMember]);

    // 핀코드가 없으면 입력하는 모달창 띄우기
    useEffect(() => {
        if (member && !isLoading) {
            if (member.pin_code === null) {
                setShowPinModal(true);
            }
        } else {
            setShowPinModal(false);
        }
    }, [member, isLoading]);

    // 핀번호 제출
    const handlePinSubmit = async (e) => {
        e.preventDefault();
        if (pinInput.length !== 4) return;

        setIsPinSubmitting(true);

        const data = {
            "pin_code": pinInput
        }

        try {
            await authApi.updatePinCode(data);

            await fetchMember();
            alert("핀번호 입력 완료.");
        } catch (error) {
            alert(`잘못된 형식입니다. 핀번호를 다시 입력하세요.${error}`);
        } finally {
            setIsPinSubmitting(false);
        }
    };

    // 로그아웃 요청
    const handleLogoutSubmit = async () => {
        try {
            const result = await authApi.logout();

            if (result.status === 200) {
                clearMember();
                navigate('/web');
            }
        } catch (error) {
            alert(`에러발생, 에러코드: ${error.response.status}`);
        }
    };

    const loadMyPage = () => {
        navigate('/web/mypage');
    }

    // 마이페이지로 이동
    const LoadMyPage = () => {
        navigate('/web/mypage');
    }

    // 내 정보수정 페이지로 이동
    const LoadModify = () => {
        navigate("/web/mypage/edit");
    };

    // 주문목록 페이지로 이동
    const LoadOrderList = () => {
        navigate("/web/mypage/order");
    }

    return (
        // [전체 컨테이너] 배경색 및 폰트 설정
        <div className="min-h-screen w-full flex flex-col relative bg-[#f0f4f8] dark:bg-slate-900 text-blue-1000 dark:text-blue-300">
            {/* 핀번호 설정 모달 */}
            {showPinModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
                    {/* 모달 카드 (Glassmorphism) */}
                    <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* 유리 패널 배경 */}
                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10"></div>

                        {/* 모달 컨텐츠 */}
                        <div className="relative z-10 p-8 text-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                                핀번호 설정
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                서비스 이용을 위해<br />숫자 4자리를 설정해주세요.
                            </p>

                            <form onSubmit={handlePinSubmit} className="space-y-5">
                                <input
                                    type="password"
                                    pattern="\d{4}"
                                    maxLength="4"
                                    inputMode="numeric"
                                    required
                                    placeholder="••••"
                                    title="숫자 핀코드 (4글자)"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full h-14 text-center text-2xl font-bold tracking-[0.5em]
                                             bg-white/50 dark:bg-slate-950/50
                                             border border-slate-200 dark:border-slate-700
                                             rounded-xl outline-none
                                             text-slate-800 dark:text-white
                                             placeholder:text-slate-300 dark:placeholder:text-slate-700
                                             focus:bg-white dark:focus:bg-slate-900
                                             focus:border-blue-500/50 dark:focus:border-blue-400/50
                                             focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                             transition-all duration-200"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={pinInput.length !== 4 || isPinSubmitting}
                                    className="w-full h-12
                                             bg-slate-900 hover:bg-slate-800
                                             dark:bg-blue-600 dark:hover:bg-blue-500
                                             disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed
                                             text-white font-bold rounded-xl
                                             shadow-lg shadow-slate-900/10 dark:shadow-blue-900/20
                                             transition-all duration-200 active:scale-[0.98] cursor-pointer"
                                >
                                    {isPinSubmitting ? '저장 중...' : '확인'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* 헤더 */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-300/50 dark:border-white/10 bg-[#f0f4f8] dark:bg-slate-900 transition-colors duration-300">
                <nav className="flex items-center justify-between container mx-auto px-4 h-16">
                    {/* 로고 */}
                    <div className="flex items-center">
                        <Link to="/web" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                            HOME
                        </Link>
                    </div>

                    {/* [PC 버전 메뉴] md(768px) 이상에서만 보임 (hidden md:flex) */}
                    <div className="hidden md:flex items-center gap-3 text-sm font-medium">
                        {isLoading ? (
                            <div className="text-slate-400 animate-pulse">확인 중...</div>
                        ) : member ? (
                            <>
                                <div className="relative profile-menu-wrapper">
                                    {/* 이름 버튼 */}
                                    <button
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                        className="px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-1000 dark:text-blue-300 border border-blue-100 dark:border-slate-700 hover:text-blue-600 transition-colors"
                                    >
                                        <span className="font-bold">{member.name}</span>님
                                    </button>

                                    {/* 드롭다운 메뉴 */}
                                    {isProfileMenuOpen && (
                                        <ul
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 text-sm animate-in fade-in slide-in-from-top-2"
                                        >
                                            <li
                                                onClick={() => {
                                                    LoadMyPage();
                                                    setIsProfileMenuOpen(false);
                                                }}
                                                className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                            >
                                                학습데이터 확인
                                            </li>
                                            <li
                                                onClick={() => {
                                                    LoadModify();
                                                    setIsProfileMenuOpen(false);
                                                }}
                                                className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                            >
                                                정보 수정
                                            </li>
                                            <li
                                                onClick={() => {
                                                    LoadOrderList();
                                                    setIsProfileMenuOpen(false);
                                                }}
                                                className="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                                            >
                                                주문 목록 보기
                                            </li>
                                        </ul>
                                    )}
                                </div>
                                {/* ▼ [추가된 코드] AI 학습 도우미 (이용권 구매 왼쪽) ▼ */}
                                <Link to="/web/plan" className="px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-1000 dark:text-blue-300 border border-blue-100 dark:border-slate-700 hover:text-blue-600 transition-colors">
                                    <span>🤖</span> AI 학습 도우미
                                </Link>
                                {/* ▲ [추가된 코드] 끝 ▲ */}

                                <Link to="/web/ticket" className="px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-1000 dark:text-blue-300 border border-blue-100 dark:border-slate-700 hover:text-blue-600 transition-colors">
                                    이용권 구매
                                </Link>
                                <button onClick={handleLogoutSubmit} className="px-3 py-1 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-1000 dark:text-blue-300 border border-blue-100 dark:border-slate-700 cursor-pointer hover:text-blue-600 transition-colors">
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            // ... (로그인 버튼 기존 유지)
                            <Link to="/web/login" className="...">로그인</Link>
                        )}
                    </div>

                    {/* [모바일 햄버거 버튼] md(768px) 미만에서만 보임 (md:hidden) */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                        >
                            {/* 아이콘: 메뉴 열림/닫힘 상태에 따라 변경 (SVG 사용) */}
                            {isMenuOpen ? (
                                // X 아이콘
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                // 햄버거 아이콘
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            )}
                        </button>
                    </div>
                </nav>

                {/* [모바일 메뉴 드롭다운 영역] */}
                {/* isMenuOpen이 true일 때만 렌더링 */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-[#f0f4f8] dark:bg-slate-900 border-b border-white/20 dark:border-slate-800 shadow-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col p-4 space-y-3">
                            {isLoading ? (
                                <div className="text-center text-slate-400 py-2">로딩 중...</div>
                            ) : member ? (
                                <>
                                    {/* 모바일: 사용자 정보 (기존 유지) */}
                                    <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl text-center mb-2">
                                        <span className="text-slate-800 dark:text-white font-bold">{member.name}</span>
                                        <span className="text-slate-500 dark:text-slate-400 text-sm">님 환영합니다</span>
                                    </div>

                                    {/* ▼ [추가된 코드] 모바일: AI 학습 도우미 ▼ */}
                                    <Link
                                        to="/web/plan"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block w-full p-3 text-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold rounded-xl hover:bg-blue-200 transition-colors"
                                    >
                                        🤖 AI 학습 도우미
                                    </Link>
                                    {/* ▲ [추가된 코드] 끝 ▲ */}

                                    {/* 모바일: 이용권 구매 (기존 유지) */}
                                    <Link
                                        to="/web/ticket"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block w-full p-3 text-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold rounded-xl hover:bg-blue-200 transition-colors"
                                    >
                                        이용권 구매
                                    </Link>

                                    {/* 모바일: 로그아웃 (기존 유지) */}
                                    <button onClick={handleLogoutSubmit} className="...">
                                        로그아웃
                                    </button>
                                </>
                            ) : (
                                /* 모바일: 로그인 버튼 */
                                <Link
                                    to="/web/login"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block w-full p-3 text-center bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    로그인 하러가기
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* ▼ 메인(Outlet): 여기는 배경색 관련 클래스가 없으므로 투명(컨텐츠 본연의 색) 유지됨 */}
            <main className="flex-1 container mx-auto p-4 relative z-10 w-full max-w-5xl">
                <Outlet />
            </main>

            {/*  풋터  */}
            <footer className="relative z-10 w-full border-t border-gray-300/50 dark:border-white/10
            bg-[#f0f4f8] dark:bg-slate-900
            transition-colors duration-300">
                <div className="container mx-auto p-6 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                        © 2025 For Education Only
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default WebLayout;