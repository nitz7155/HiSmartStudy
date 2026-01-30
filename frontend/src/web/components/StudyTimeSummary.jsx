import { FaClock } from 'react-icons/fa';
import { useState } from 'react';

export default function StudyTimeSummary({ studyData, changeData }) {
    const [hoverIdx, setHoverIdx] = useState(null);
    const [mode, setMode] = useState("week");

    const getHeight = (v) => `${v * 23}px`;

    const weeklyData = studyData.weekly;
    const monthlyData = studyData.monthly;
    const currentData = mode === "month" ? monthlyData : weeklyData;

    const formattingHour = (mins) => {
        const h = Math.floor(mins / 60);
        const m = (mins % 60).toFixed(0);
        if (h > 0) return `${h}시간 ${m}분`;
        if (m > 0) return `${m}분`;
        return "0분";
    };

    const formattingPercent = (focus = 0, total = 0) => {
        if (!total || total === 0) return 0;
        return `${Math.round((focus / total) * 100)}%`;
    }

    return (
        <div className="w-full bg-white dark:bg-slate-900/50 rounded-2xl shadow-md p-6 
                        text-gray-800 dark:text-gray-100 transition-colors duration-300">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <FaClock className="text-indigo-500 dark:text-indigo-300" />
                    <h1 className="text-lg font-semibold">학습 시간 요약</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setMode("week")} className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${mode === "week" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300"} `}>
                        주간
                    </button>

                    <button onClick={() => setMode("month")} className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${mode === "month" ? "bg-indigo-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300"}`}>
                        월간
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">
                        {formattingHour(currentData?.total_usage_minute) ?? 0}
                    </p>


                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">총 이용</p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-300">{formattingHour(currentData?.focus_time_minute) ?? 0}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">집중 시간</p>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{formattingPercent(currentData?.focus_time_minute, currentData?.total_usage_minute)}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">집중도</p>
                </div>
            </div>

            {/* Weekly Bar Chart */}
            <div className="flex justify-between items-end h-64 px-4 relative">

                {studyData?.days?.map((value, idx) => {
                    const totalHour = value.usage_minute / 60;
                    const focusHour = value.focus_minute / 60;

                    const formatDate = (date = "") => {
                        if (!date) return "-";
                        const [, month, day] = date.split("-");
                        return `${month}/${day}`;
                    };

                    const formatDay = (day) => {
                        if (!day) return "";
                        return day.split("요일")[0];
                    }

                    return (
                        <div key={idx}
                            className="flex flex-col items-center w-12 relative cursor-pointer"
                            onMouseEnter={() => setHoverIdx(idx)}
                            onMouseLeave={() => setHoverIdx(null)}
                        >
                            {/* Hover background */}
                            <div className={`absolute bottom-0 w-full rounded-xl transition-all pointer-events-none ${hoverIdx === idx ? "h-full bg-indigo-100/70 dark:bg-indigo-900/20" : "h-0"}`}
                            />

                            {/* Tooltip */}
                            {hoverIdx === idx && (
                                <div className="absolute -top-28 bg-white dark:bg-gray-800  border border-gray-200 dark:border-gray-700 p-3 rounded-xl shadow-lg z-20 w-40">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                        {value.weekday}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        이용 시간 :
                                        <b className="text-indigo-600 dark:text-indigo-300 ml-1">
                                            {formattingHour(value.usage_minute)}
                                        </b>
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                        집중 시간 :
                                        <b className="text-purple-600 dark:text-purple-300 ml-1">
                                            {formattingHour(value.focus_minute)}
                                        </b>
                                    </p>
                                </div>
                            )}

                            {/* Bars */}
                            <div className="flex gap-1 items-end z-10">
                                <div
                                    className="w-5 bg-indigo-500 rounded transition-all"
                                    style={{ height: getHeight(totalHour) }}
                                />
                                <div
                                    className="w-5 bg-purple-500 rounded transition-all"
                                    style={{ height: getHeight(focusHour) }}
                                />
                            </div>

                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-3 z-10">
                                {formatDate(value.date)}
                            </span>

                            {/* Label */}
                            <span className="text-sm text-gray-500 dark:text-gray-400 z-10">
                                {formatDay(value.weekday)}
                            </span>
                        </div>
                    );
                })}


            </div>
        </div>
    );
}
