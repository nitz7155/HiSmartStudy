// src/web/pages/AdminDashboard.jsx
import { useEffect, useState } from "react"
import DailySalesChart from "../components/DailySalesChart";
import MemberStatusChart from "../components/MemberStatusChart";
import SeatUsageChart from "../components/SeatUsageChart"; 
import DashboardTodoList from "../components/DashboardTodoList";
// [추가] 이용권 통계 컴포넌트 import
import TicketSalesChart from "../components/TicketSalesChart";

function AdminDashboard() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [statsData, setStatsData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchStats = async (year, month) => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/admin/stats/daily?year=${year}&month=${month}`,
                { credentials: "include" }
            );
            const data = await response.json();
            setStatsData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        fetchStats(year, month);
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    return (
        <div className="w-full space-y-6">
            
            {/* 상단 매출 통계 (Full Width) */}
            <div className={`w-full transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <DailySalesChart 
                    data={statsData} 
                    currentDate={currentDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                />
            </div>

            {/* 하단 그리드 (2x2 Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
                {/* 1. 회원 현황 */}
                <MemberStatusChart />

                {/* 2. 좌석 현황 */}
                <SeatUsageChart />

                {/* [추가] 3. 이용권 통계 (상품 판매 순위) */}
                <TicketSalesChart currentDate={currentDate} />

                {/* 4. 투두 리스트 */}
                <DashboardTodoList />

            </div>
        </div>
    )
}

export default AdminDashboard