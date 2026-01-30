import { useEffect } from "react";
import { FaChair } from "react-icons/fa";
import { MdLocationOn, MdTrendingUp } from "react-icons/md";

export default function SeatAnalysis({ topSeats = [], message, preferences }) {

    const colorMapping = (type) => {
        switch (type) {
            case "창가석": return "bg-blue-500 dark:bg-blue-400"
            case "코너석": return "bg-purple-500 dark:bg-purple-400";
            case "고립석": return "bg-pink-500 dark:bg-pink-400";
            case "통로석": return "bg-orange-500 dark:bg-orange-400";
            case "중앙석": return "bg-green-500 dark:bg-green-400";
            case "음료바근처": return "bg-cyan-500 dark:bg-cyan-400";
            default: return "bg-gray-500 dark:bg-gray-400";
        }
    }

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = (mins % 60).toFixed(0);
        if (h > 0) return `${h}시간 ${m}분`;
        if (m > 0) return `${m}분`;
        return "0분";
    };

    const formatRatio = (ratio) => {
        return (ratio * 100).toFixed(0);
    };


    return (
        <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 transition-colors">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <FaChair className="text-purple-500 dark:text-purple-300" />
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    좌석 취향 분석
                </h1>
            </div>

            {topSeats.length > 0 ? (
                <>
                    {/* Sub title */}
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
                        <MdLocationOn className="text-gray-400 dark:text-gray-500" />
                        <span className="text-sm">자주 쓴 좌석</span>
                    </div>

                    {/* Top Seats */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        {topSeats.map((item, idx) => (
                            <div key={idx + 1} className="relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 
                        bg-gray-50 dark:bg-gray-800/40 transition-colors" >
                                {/* Rank Badge */}
                                <div className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center 
                            bg-indigo-600 dark:bg-indigo-500 text-white rounded-full text-sm font-semibold shadow">
                                    {idx + 1}
                                </div>

                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-100">
                                    {item.seat_id}번 좌석
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatTime(item.seat_use_time)}</p>

                                <span className="inline-block mt-2 px-3 py-1 text-xs rounded-md bg-indigo-100 dark:bg-indigo-700/40 text-indigo-600 dark:text-indigo-300 font-medium transition-colors">
                                    {item.seat_type}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Preference Bars */}
                    <div className="mb-8">
                        <h2 className="font-semibold text-gray-700 dark:text-gray-100 mb-4">좌석 성향</h2>

                        {preferences.map((p) => (
                            <div key={p.seat_type} className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-300">{p.seat_type}</span>
                                    <span className="text-gray-600 dark:text-gray-300">{formatRatio(p.ratio)}%</span>
                                </div>

                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
                                    <div
                                        className={`${colorMapping(p.seat_type)} h-2 rounded-full transition-all`}
                                        style={{ width: `${formatRatio(p.ratio)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Notice */}
                    <div className="rounded-xl bg-pink-50 dark:bg-pink-900/30 
                p-4 border border-pink-200 dark:border-pink-700 
                flex items-start gap-3 transition-colors">
                        <MdTrendingUp className="text-pink-500 dark:text-pink-300 text-xl mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-pink-600 dark:text-pink-300 mb-1">
                                최근 변화
                            </p>
                            <p className="text-sm text-pink-600 dark:text-pink-300">
                                <p>{message.analysis}</p>
                                <p>{message.coaching}</p>
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-full rounded-2xl p-8 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 
                    flex flex-col items-center justify-center text-center shadow-sm">

                        {/* 아이콘 (심플한 분석 실패 느낌) */}
                        <div className="w-20 h-20 rounded-full flex items-center justify-center 
                        bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M12 6v6m0 4h.01M4.93 4.93a10 10 0 1114.14 14.14A10 10 0 014.93 4.93z" />
                            </svg>
                        </div>

                        {/* 메시지 영역 */}
                        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-100 mb-2">
                            이용기록이 부족해요
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                            {message?.analysis ?? "아직 사용량이 적어 좌석을 제시해드릴 수 없어요"}
                        </p>

                        {/* 가이드 문구 */}
                        <div className="mt-6 text-sm text-indigo-600 dark:text-indigo-300 font-medium">
                            {message?.coaching ?? "더 많은 사용을 통해 취향에 맞는 좌석을 추천해드릴께요"}
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
}