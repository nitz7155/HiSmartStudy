import { useState } from "react";
import { FaBell, FaSearch, FaCalendarAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom"; // [추가] 라우터 이동 훅

function AdminHeader() {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState(""); // [추가] 검색어 상태

    const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            navigate(`/admin/members?search=${encodeURIComponent(keyword)}`);
        }
    };

    return (
        <header className="h-24 bg-[#0f172a] border-b border-slate-700/50 flex items-center justify-between px-8 z-20 flex-shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">매장 운영 대시보드</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                    <FaCalendarAlt className="text-slate-500" />
                    <span>{today}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-5">
                <div className="relative hidden md:block group">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={handleSearch}
                        placeholder="회원 이름, 전화번호 검색 (Enter)" 
                        className="pl-11 pr-5 py-2.5 w-80 bg-slate-800 border-none rounded-full text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-slate-700 transition-all duration-300 placeholder:text-slate-500"
                    />
                </div>

                <button className="relative p-3 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                    <FaBell className="text-xl" />
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0f172a]"></span>
                </button>

                <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 shadow-sm overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-xs font-bold">AD</div>
                </div>
            </div>
        </header>
    );
}

export default AdminHeader;