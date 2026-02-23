import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSocialButton } from '../components/AuthButton.jsx';
import { authApi } from '../../utils/authApi.js';
import { useAuthCookieStore } from '../../utils/useAuthStores.js';

const Login = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
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

    // 비동기 통신 동안 보여줄 로딩 문구
    if (isAuthLoading) {
        return <div>pending...</div>
    }


    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const data = {
            "login_id": userId,
            "password": password
        };
        try {
            const result = await authApi.login(data);
            if (result.status === 200) {
                navigate('/web')
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 400) {
                    alert('올바른 아이디나 비밀번호를 입력해주세요');
                } else {
                    alert(`에러발생, 에러코드: ${error.response.status}`);
                }
            } else {
                alert('통신 불가');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 소셜 로그인 클릭 이벤트
    const handleSocialLogin = (type) => {
        window.location.href = `/api/web/auth/${type}/login`;
    };

    return (
        // [컨테이너]
        // light: 부드러운 화이트 블루 배경
        // dark: 깊은 밤하늘색 배경 (slate-950)
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#f0f4f8] dark:bg-slate-950 transition-colors duration-500">

            {/* [배경 데코레이션] Mica Effect & Aurora */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                {/* 상단 원: 다크모드 시 색상을 조금 더 진하게 조정 */}
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px]
                                bg-blue-400/20 dark:bg-blue-600/10
                                rounded-full blur-[100px] animate-pulse" />
                {/* 하단 원 */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px]
                                bg-purple-400/20 dark:bg-indigo-600/10
                                rounded-full blur-[80px]" />
            </div>

            {/* 2. 메인 로그인 카드 (Glassmorphism) */}
            <div className="relative z-10 w-full max-w-[400px] p-8 mx-4">
                {/* 유리 패널 레이어 */}
                {/* dark: 배경을 어두운 반투명으로 변경하고 테두리를 얇게 조정 */}
                <div className="absolute inset-0
                                bg-white/60 dark:bg-slate-900/50
                                backdrop-blur-2xl rounded-2xl
                                shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]
                                border border-white/60 dark:border-white/10"></div>

                <div className="relative z-20 flex flex-col gap-6">

                    {/* 1. 홈으로 돌아가기 버튼 */}
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

                    {/* 헤더 */}
                    <div className="text-center space-y-1">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight transition-colors">
                            로그인
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs transition-colors">
                            서비스 이용을 위해 로그인해주세요
                        </p>
                    </div>

                    {/* 일반 로그인 폼 */}
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="space-y-3">
                            {/* 아이디 입력 */}
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2
                                                text-slate-400 dark:text-slate-500
                                                group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400
                                                transition-colors duration-200">
                                </div>
                                <input
                                    type="text"
                                    name="userid"
                                    required
                                    placeholder="아이디"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4
                                               bg-white/50 dark:bg-slate-950/50
                                               border border-slate-200/80 dark:border-slate-700/80
                                               rounded-xl text-sm outline-none
                                               text-slate-800 dark:text-slate-200
                                               focus:bg-white dark:focus:bg-slate-900
                                               focus:border-blue-500/50 dark:focus:border-blue-400/50
                                               focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                               transition-all duration-200
                                               placeholder:text-slate-400 dark:placeholder:text-slate-600
                                               hover:bg-white/80 dark:hover:bg-slate-900/80"
                                />
                            </div>

                            {/* 비밀번호 입력 */}
                            <div className="group relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2
                                                text-slate-400 dark:text-slate-500
                                                group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400
                                                transition-colors duration-200">
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    placeholder="비밀번호"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 pl-11 pr-4
                                               bg-white/50 dark:bg-slate-950/50
                                               border border-slate-200/80 dark:border-slate-700/80
                                               rounded-xl text-sm outline-none
                                               text-slate-800 dark:text-slate-200
                                               focus:bg-white dark:focus:bg-slate-900
                                               focus:border-blue-500/50 dark:focus:border-blue-400/50
                                               focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                               transition-all duration-200
                                               placeholder:text-slate-400 dark:placeholder:text-slate-600
                                               hover:bg-white/80 dark:hover:bg-slate-900/80"
                                />
                            </div>
                        </div>

                        {/* 로그인 버튼 */}
                        {isLoading ? (
                            <div>로그인 중...</div>
                        ) : (
                            <button
                                type="submit"
                                className="w-full h-12
                                       bg-slate-900 hover:bg-slate-800
                                       dark:bg-blue-600 dark:hover:bg-blue-500
                                       text-white rounded-xl font-medium text-[15px]
                                       transition-all duration-200
                                       shadow-lg shadow-slate-900/10 dark:shadow-blue-900/20
                                       flex items-center justify-center gap-2
                                       active:scale-[0.98] cursor-pointer"
                            >
                                로그인
                            </button>
                        )}
                    </form>

                        {/* 3. 회원가입 및 아이디, 비밀번호 찾기 */}
                        <div className="flex items-center justify-center gap-4 pt-1">
                            <button type="button"
                                    onClick={() => navigate('/web/account-recovery')}
                                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline transition-colors cursor-pointer">
                                아이디 / 비밀번호 찾기
                            </button>
                            <span className="w-[1px] h-3 bg-slate-300 dark:bg-slate-600"></span>
                            <button
                                type="button"
                                onClick={() => navigate('/web/signup')}
                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:underline transition-colors cursor-pointer"
                            >
                                회원가입
                            </button>
                        </div>

                    {/* 구분선 */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-300/60 dark:border-slate-600/60"></div>
                        <span className="flex-shrink-0 mx-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium px-2 uppercase tracking-wider">
                            Social Login
                        </span>
                        <div className="flex-grow border-t border-slate-300/60 dark:border-slate-600/60"></div>
                    </div>

                    {/* 4. 소셜 로그인 버튼 */}
                    <div className="flex flex-col gap-3">
                        {/* 카카오 로그인 (브랜드 컬러 유지) */}
                        <AuthSocialButton
                            onClick={() => handleSocialLogin("kakao")}
                            background="bg-[#FEE500]"
                            textColor="text-black/90"
                            text="Kakao"
                            icon={
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                    <path d="M12 3C7.02944 3 3 6.18528 3 10.115C3 12.6714 4.70704 14.915 7.26978 16.0543C7.08182 16.7562 6.58788 18.5991 6.49006 18.9936C6.36782 19.4836 6.66782 19.4764 6.86558 19.3443C7.02052 19.2413 9.33142 17.6695 10.3294 16.9915C10.8704 17.0715 11.4294 17.1143 12 17.1143C16.9706 17.1143 21 13.9297 21 10.0007C21 6.07106 16.9706 3 12 3Z" />
                                </svg>
                            }
                        />

                        {/* 네이버 로그인 (브랜드 컬러 유지) */}
                        <AuthSocialButton
                            onClick={() => handleSocialLogin("naver")}
                            background="bg-[#03C75A]"
                            textColor="text-white"
                            text="Naver"
                            icon={
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                    <path d="M16.273 12.845L7.376 0H0V24H7.727V11.155L16.624 24H24V0H16.273V12.845Z" />
                                </svg>
                            }
                        />

                        {/* 구글 로그인 (다크모드 대응) */}
                        <AuthSocialButton
                            onClick={() => handleSocialLogin("google")}
                            background="bg-white dark:bg-slate-800"
                            textColor="text-gray-700 dark:text-gray-200"
                            border="border border-gray-300 dark:border-gray-600"
                            hoverEffect="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                            text="Google"
                            icon={
                                <svg viewBox="0 0 48 48" className="w-full h-full">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                    <path fill="none" d="M0 0h48v48H0z" />
                                </svg>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;