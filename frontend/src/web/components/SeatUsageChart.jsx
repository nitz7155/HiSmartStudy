import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SeatUsageChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeatStats = async () => {
            try {
                const response = await fetch('/api/admin/stats/seats', { credentials: "include" });
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error("좌석 현황 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSeatStats();
    }, []);

    if (loading) {
        return (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex flex-col">
            {/* 헤더 */}
            <div className="flex justify-between items-start mb-4 shrink-0">
                <Link to="/admin/seats" className="group flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-1">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <span className="group-hover:text-indigo-300 transition-colors">좌석 현황</span>
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-300 transition-colors pt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </h3>
                </Link>
                <div className="text-right flex items-end gap-2">
                    <span className="text-sm text-slate-400">잔여 {data.remain}석</span>
                    <span className="text-xl font-bold text-indigo-400">{data.used} <span className="text-sm text-slate-500 font-normal">/ {data.total}</span></span>
                </div>
            </div>

            {/* 구역별 리스트 (스크롤 제거됨) */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="space-y-3">
                    {data.zones.map((zone, index) => (
                        <div key={index} className="group">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300 font-medium">{zone.name}</span>
                                <span className="text-slate-400">
                                    <span className={zone.used > 0 ? "text-indigo-300 font-bold" : "text-slate-500"}>{zone.used}</span>
                                    <span className="text-slate-600"> / {zone.total}</span>
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        zone.rate >= 80 ? 'bg-red-500' : 
                                        zone.rate >= 50 ? 'bg-amber-500' : 
                                        'bg-indigo-500'
                                    }`}
                                    style={{ width: `${zone.rate}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SeatUsageChart;