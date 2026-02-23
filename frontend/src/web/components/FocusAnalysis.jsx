import { BsLightningChargeFill } from "react-icons/bs";
import { FaMedal, FaCalendarAlt } from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";

export default function FocusAnalysis({ focusData, focusPattern }) {

    const formatTime = (mins = 0) => {
        const h = Math.floor(mins / 60);
        const m = (mins % 60).toFixed(0);
        if (h > 0) return `${h}시간 ${m}분`;
        if (m > 0) return `${m}분`;
        return "0분";
    };

    const formatDate = (date = "") => {
        if (!date) return "";
        const [, month, day] = date.split("-");
        return `${month}/${day}`;
    };

    const formatRatio = (ratio = 0) => {
        if (ratio == 0) return ""
        return `집중도 ${(ratio * 100).toFixed(0)}점`
    };

    const returnTimeLabel = (hour = 0) => {
        if (hour == null || hour < 0) return "";
        if (hour <= 4) return "새벽 골든타임";
        if (hour <= 8) return "이른 오전 골든타임";
        if (hour <= 11) return "오전 골든타임";
        if (hour <= 13) return "점심 시간대 골든타임";
        if (hour <= 17) return "오후 골든타임";
        if (hour <= 21) return "저녁 골든타임";
        return "늦은 밤 골든타임";
    }

    const trendStyle = (trend) => {
        switch (trend) {
            case "increase":
                return {
                    bg: "bg-green-50 dark:bg-green-900/20",
                    border: "border-green-200 dark:border-green-700",
                    text: "text-green-600 dark:text-green-400"
                };
            case "decrease":
                return {
                    bg: "bg-red-50 dark:bg-red-900/20",
                    border: "border-red-200 dark:border-red-700",
                    text: "text-red-600 dark:text-red-400"
                };
            default:
                return {
                    bg: "bg-gray-50 dark:bg-slate-800",
                    border: "border-gray-200 dark:border-slate-700",
                    text: "text-gray-600 dark:text-gray-300"
                };
        }
    };
    const style = trendStyle(focusData?.weekly_change?.trend);

    return (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-md p-6 transition-colors">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <BsLightningChargeFill className="text-purple-500 dark:text-purple-300 text-lg" />
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    집중 분석
                </h1>
            </div>

            {/* Main Stat Box */}
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6 flex flex-col items-center mb-6 transition-colors">
                <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                        {formatTime(focusData?.average_focus_minute)}
                    </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    평균 집중 시간
                </p>
            </div>

            {/* Best Record */}
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-xl  mb-4 border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center gap-2">
                    <FaMedal className="text-purple-500 dark:text-purple-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        최장 기록
                    </span>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                        {formatTime(focusData?.best_record?.minute ?? 0)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                        {formatDate(focusData?.best_record?.date)}
                    </p>
                </div>
            </div>

            {/* Trend */}

            <div className={`p-2 rounded-xl flex gap-3 transition-colors ${style.bg} ${style.border} border`}>
                <MdTrendingUp className={`${style.text} text-xl mt-0.5`} />

                <div>
                    <p className={`${style.text} text-sm`}>
                        {focusData?.message?.analysis}
                    </p>
                    <p className={`${style.text} text-xs mt-1`}>
                        {focusData?.message?.coaching}
                    </p>
                </div>
            </div>


            {/* Divider */}
            <div className="border-b border-gray-200 dark:border-gray-700 my-6" />

            {/* 집중 패턴 박스 */}
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <FaCalendarAlt className="text-indigo-500 dark:text-indigo-300 text-lg" />
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    집중 패턴
                </h1>
            </div>

            {/* Best Day */}
            <div className="p-3 rounded-2xl text-white mb-4 shadow-sm transition-all" style={{ background: "linear-gradient(135deg, #6A5BEA, #9F6BFF)", }}>
                <p className="text-sm opacity-90">베스트 요일</p>
                <p className="text-2xl font-bold mt-1">{focusPattern?.top_focus_day?.day ?? "정보없음"}</p>
                <p className="text-sm mt-1 opacity-90">{formatRatio(focusPattern?.top_focus_day?.focus_ratio)}</p>
            </div>

            {/* Best Time */}
            <div className="p-3 rounded-2xl text-white mb-6 shadow-sm transition-all" style={{ background: "linear-gradient(135deg, #FFA63B, #FF6A4E)", }}>
                <p className="text-sm opacity-90">베스트 시간</p>
                <p className="text-2xl font-bold mt-1">{focusPattern?.top_focus_hour?.hour ? `${focusPattern?.top_focus_hour?.hour}시` : "정보없음"}</p>
                <p className="text-sm mt-1 opacity-90">{returnTimeLabel(focusPattern?.top_focus_hour?.hour)}</p>
            </div>

            {/* Stats bottom */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-700 rounded-xl py-4 flex flex-col items-center shadow-sm transition-colors">
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-300">
                        {formatTime(focusPattern.avg_daily_focus_minute)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        일평균(h)
                    </span>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700 rounded-xl py-4 flex flex-col items-center shadow-sm transition-colors">
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">
                        {focusPattern.longest_streak_days ?? 0}일
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        연속 이용
                    </span>
                </div>
            </div>
        </div>
    );
}
