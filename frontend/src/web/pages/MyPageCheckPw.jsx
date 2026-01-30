import { useState } from "react";

export default function MyPageCheckPw({ setCanModify, userName }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState(""); // 에러 메시지 상태 추가 (UX 개선)

    const handlePassword = (e) => {
        setPassword(e.target.value);
        if (error) setError(""); // 입력 시작하면 에러 메시지 초기화
    };

    const validPassword = async (e) => {
        if (e) e.preventDefault(); // form submit 방지

        if (!password) {
            setError("비밀번호를 입력해주세요.");
            return;
        }

        try {
            // 기존 백엔드 API 경로 유지
            const res = await fetch("/api/web/mypage/check/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                const result = await res.json();
                // 백엔드에서 true/false를 리턴한다고 가정 (또는 {status: 'ok'} 등)
                if (result === true) {
                    setCanModify(true); // 검증 성공 -> 수정 페이지 오픈
                } else {
                    setError("비밀번호가 일치하지 않습니다.");
                }
            } else {
                setError("서버 통신 중 오류가 발생했습니다.");
            }
        }
        catch (err) {
            console.error(err);
            setError("알 수 없는 오류가 발생했습니다.");
        }
    };

    return (
        // z-index를 높여서(z-50) 다른 요소 위에 확실히 뜨게 함
        // fixed inset-0 으로 화면 전체를 덮음
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity h-full">

            <div className="
                w-full max-w-md mx-4
                bg-white dark:bg-slate-800
                p-8 rounded-2xl shadow-2xl
                border border-gray-100 dark:border-gray-700
                transform transition-all scale-100
            ">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        비밀번호 확인
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{userName}</span>님의 개인정보 보호를 위해<br/>
                        비밀번호를 다시 한 번 입력해주세요.
                    </p>
                </div>

                {/* 비밀번호 입력 폼 */}
                <form onSubmit={validPassword} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            autoFocus
                            className={`
                                w-full px-5 py-3.5 rounded-xl 
                                bg-gray-50 dark:bg-slate-900
                                border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                                text-gray-900 dark:text-white placeholder-gray-400
                                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                                transition-all duration-200
                            `}
                            placeholder="비밀번호 입력"
                            value={password}
                            onChange={handlePassword}
                        />
                        {/* 에러 메시지 표시 영역 */}
                        {error && (
                            <p className="mt-2 text-sm text-red-500 flex items-center gap-1 animate-pulse">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                {error}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="
                            w-full py-3.5 rounded-xl
                            bg-blue-600 hover:bg-blue-700
                            text-white font-semibold text-base
                            shadow-lg shadow-blue-500/30
                            transition-all duration-200 active:scale-[0.98]
                        "
                    >
                        확인
                    </button>
                </form>
            </div>
        </div>
    );
}