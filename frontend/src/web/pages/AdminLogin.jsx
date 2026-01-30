import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../utils/authApi.js';

function AdminLogin() {
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        
        if (!loginId || !password) {
            alert('관리자 계정 정보를 입력해주세요.');
            return;
        }

        setIsLoading(true);

        const data = {
            "login_id": loginId,
            "password": password
        };

        try {
            const result = await authApi.adminLogin(data);
            if (result.status === 200) {
                navigate('/admin'); 
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 403) {
                    alert('관리자 권한이 없는 계정입니다.');
                } else if (error.response.status === 400) {
                    alert('아이디 또는 비밀번호를 확인해주세요.');
                } else {
                    alert(`로그인 오류: ${error.response.status}`);
                }
            } else {
                alert('서버 연결 실패');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-950 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 md:p-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 mb-4 shadow-lg shadow-blue-900/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
                        <p className="text-slate-400 mt-2 text-sm font-medium">관리자 전용 보안 시스템</p>
                    </div>

                    {/* 로그인 폼 */}
                    <form onSubmit={handleAdminLogin} className="flex flex-col gap-5">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-slate-900/50 border border-slate-600 rounded-xl 
                                           text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                                           focus:outline-none transition-all duration-200"
                                placeholder="Admin ID"
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14l-1 1-1 1H6v-2l2-2v-2h2l2.172-2.172a6 6 0 017.414 0z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-slate-900/50 border border-slate-600 rounded-xl 
                                           text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                                           focus:outline-none transition-all duration-200"
                                placeholder="Password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`mt-2 w-full h-12 rounded-xl font-bold text-white transition-all duration-300 transform active:scale-[0.98]
                                ${isLoading 
                                    ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/30 hover:shadow-blue-700/40'
                                }`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    접속 중...
                                </span>
                            ) : '로그인'}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
                        <button 
                            onClick={() => navigate('/')}
                            className="text-slate-500 text-sm hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto group"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> 메인 화면으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;