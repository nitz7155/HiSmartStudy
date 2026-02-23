import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
    '시간제': '#6366f1', // Indigo (DailySalesChart와 통일)
    '기간제': '#10b981', // Emerald
    'default': '#94a3b8' // Slate
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#1e293b] p-3 border border-slate-700 shadow-xl rounded-lg text-sm z-50">
                <p className="font-bold text-white mb-1">{data.name}</p>
                <div className="space-y-1">
                    <p className="text-slate-300">
                        판매량: <span className="font-bold text-white">{data.count}건</span>
                    </p>
                    <p className="text-slate-300">
                        매출액: <span className="font-bold text-white">{data.revenue.toLocaleString()}원</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const TicketSalesChart = ({ currentDate }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    useEffect(() => {
        const fetchProductStats = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `/api/admin/stats/products?year=${year}&month=${month}`, 
                    { credentials: "include" }
                );
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (error) {
                console.error("이용권 통계 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProductStats();
    }, [year, month]);

    if (loading) {
        return (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                    이용권 판매 순위
                </h3>
                <span className="text-xs text-slate-500 font-medium bg-slate-800 px-2 py-1 rounded">
                    {year}년 {month}월
                </span>
            </div>

            <div className="flex-1 min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100} 
                                tick={{ fill: '#cbd5e1', fontSize: 12 }} 
                                axisLine={false} 
                                tickLine={false}
                            />
                            {/* [수정] cursor={false} 및 isAnimationActive={false} 설정 추가 */}
                            <Tooltip 
                                content={<CustomTooltip />} 
                                cursor={false} 
                                isAnimationActive={false} 
                            />
                            <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.type] || COLORS.default} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                        <p className="text-sm">판매 데이터가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketSalesChart;