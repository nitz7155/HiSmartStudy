// src/web/components/MemberStatusChart.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// [수정] 기타 색상 제거 (2가지 색상만 사용)
const COLORS = ['#10b981', '#f59e0b']; // 기간제(초록), 시간제(주황)

const MemberStatusChart = () => {
    const [stats, setStats] = useState({
        total_members: 0,
        new_members: 0,
        period_members: 0,
        time_members: 0,
        current_users: 0,
        non_members: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMemberStats = async () => {
            try {
                const response = await fetch('/api/admin/stats/members', { credentials: "include" });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("회원 통계 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMemberStats();
    }, []);

    // [수정] 차트 데이터에서 '기타' 제거
    const chartData = [
        { name: '기간권', value: stats.period_members || 0 },
        { name: '시간권', value: stats.time_members || 0 },
    ];

    // 데이터가 모두 0일 경우 차트가 안 보일 수 있으므로 빈 데이터 처리 (선택 사항)
    const isChartEmpty = chartData.every(d => d.value === 0);

    if (loading) {
        return (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex flex-col relative overflow-hidden">
            
            {/* 상단 헤더 */}
            <div className="flex justify-between items-start mb-2 z-10 shrink-0">
                <Link to="/admin/members" className="group flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-1">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span className="group-hover:text-indigo-300 transition-colors">회원 현황</span>
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-300 transition-colors pt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </h3>
                </Link>
                <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">누적 회원</p>
                    {/* [수정] 값 안전 처리 */}
                    <p className="text-2xl font-bold text-slate-200 leading-none">
                        {(stats.total_members || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="flex flex-1 items-center min-h-0">
                
                {/* 좌측: 원형 그래프 */}
                <div className="w-1/2 h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={75}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => `${value.toLocaleString()}명`} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-slate-400 text-xs font-medium mb-1">실시간 이용</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            {/* [수정] 실시간 회원수 안전 처리 (옵셔널 체이닝 및 기본값 0) */}
                            <span className="text-2xl font-bold text-white">
                                {stats.current_users?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 우측: 상세 통계 목록 */}
                <div className="w-1/2 flex flex-col justify-center gap-3 pl-4 z-10 border-l border-slate-700/30 min-w-0">
                    
                    {/* 기간권 회원 */}
                    <div className="group flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-sm text-slate-400 group-hover:text-emerald-400 transition-colors truncate">기간권</span>
                        </div>
                        <span className="text-base font-bold text-slate-200">
                            {(stats.period_members || 0).toLocaleString()}
                        </span>
                    </div>

                    {/* 시간권 회원 */}
                    <div className="group flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                            <span className="text-sm text-slate-400 group-hover:text-amber-400 transition-colors truncate">시간권</span>
                        </div>
                        <span className="text-base font-bold text-slate-200">
                            {(stats.time_members || 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="h-px bg-slate-700/50 my-1"></div>

                    {/* 신규 가입 */}
                    <div className="group flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                            <span className="text-sm text-slate-400 group-hover:text-blue-400 transition-colors truncate">신규(월)</span>
                        </div>
                        <span className="text-base font-bold text-blue-400">
                            +{(stats.new_members || 0).toLocaleString()}
                        </span>
                    </div>

                    {/* 비회원 이용자 */}
                    <div className="group flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                            <span className="text-sm text-slate-400 group-hover:text-purple-400 transition-colors truncate">비회원(월)</span>
                        </div>
                        <span className="text-base font-bold text-purple-400">
                            {(stats.non_members || 0).toLocaleString()}
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MemberStatusChart;