import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
    FaChartPie, 
    FaUsers, 
    FaChair, 
    FaTicketAlt, 
    FaSignOutAlt,
    FaStore 
} from "react-icons/fa";
import { RiCalendarTodoFill } from "react-icons/ri";
import { useAuthCookieStore } from "../../utils/useAuthStores";
import { authApi } from "../../utils/authApi";

function AdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;
    const { clearMember } = useAuthCookieStore();

    // 1. 대시보드 메뉴 (단일)
    const dashboardMenu = { name: "대시보드", path: "/admin", icon: <FaChartPie /> };

    // 2. 관리 메뉴들 (배열)
    const managementMenus = [
        { name: "회원 관리", path: "/admin/members", icon: <FaUsers /> },
        { name: "좌석 관리", path: "/admin/seats", icon: <FaChair /> },
        { name: "Todo 관리", path: "/admin/todos", icon: <RiCalendarTodoFill /> },
        { name: "이용권 관리", path: "/admin/products", icon: <FaTicketAlt /> },
    ];

    // 메뉴 아이템 렌더링 헬퍼 함수
    const renderMenuItem = (menu) => {
        const isActive = currentPath === menu.path;
        return (
            <Link
                key={menu.name}
                to={menu.path}
                className={`
                    group flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"
                    }
                `}
            >
                <span className={`text-xl transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400"}`}>
                    {menu.icon}
                </span>
                <span className="tracking-wide">{menu.name}</span>
                {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
            </Link>
        );
    };

    // 로그아웃 핸들러
    const handleLogout = async () => {
        if (window.confirm("관리자 모드를 종료하시겠습니까?")) {
            try {
                await authApi.logout();
            } catch (error) {
                console.error("로그아웃 요청 중 에러:", error);
            } finally {
                clearMember();
                navigate('/admin/login');
            }
        }
    };

    return (
        <aside className="w-72 bg-[#1e293b] text-white flex flex-col h-screen shadow-2xl z-50 transition-all duration-300">
            {/* 1. 로고 영역 */}
            <div className="h-24 flex items-center px-8 border-b border-slate-700/50 bg-[#0f172a]">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/30">
                    <FaStore className="text-xl" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white leading-none">High Study</h1>
                    <span className="text-xs text-blue-400 font-medium">Administrator</span>
                </div>
            </div>

            {/* 2. 네비게이션 메뉴 */}
            <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
                
                {/* 대시보드 메뉴 */}
                {renderMenuItem(dashboardMenu)}

                {/* [수정] Management 라벨 및 하단 구분선 추가 */}
                <div className="mt-8 mb-2 px-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Management</p>
                    <div className="h-px w-full bg-slate-700/50"></div> {/* 구분선 */}
                </div>

                {/* 나머지 관리 메뉴들 */}
                {managementMenus.map((menu) => renderMenuItem(menu))}

            </nav>

            {/* 3. 하단 프로필 & 로그아웃 */}
            <div className="p-5 border-t border-slate-700/50 bg-[#0f172a]">
                <div className="flex items-center gap-4 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-slate-300">
                        <span className="font-bold">AD</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">관리자</p>
                        <p className="text-xs text-slate-500">admin</p>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-700/50">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 group cursor-pointer"
                    >
                        <FaSignOutAlt className="text-lg group-hover:rotate-180 transition-transform duration-300" />
                        <span className="font-medium">로그아웃</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default AdminSidebar;