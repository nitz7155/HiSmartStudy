import { useEffect, useState } from "react";

export default function TodoProgress({ todo }) {

    const [isAchieved, setIsAchieved] = useState(todo.achieved);

    const safeGoal = Math.max(1, todo.target_value);

    let percent = Math.floor((todo.current_value / safeGoal) * 100);
    if (!isFinite(percent) || percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    useEffect(() => {
        if (percent > 100 && !isAchieved) setIsAchieved(true);
    }, [percent, isAchieved])

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}시간 ${m}분`;
        if (m > 0) return `${m}분`;
        return "0분";
    };

    const formatDay = (day) => {
        return day + "일"
    }

    return (
        <div
            className={`
            bg-white dark:bg-slate-900/50 rounded-2xl shadow-md mb-4 p-6
            transition-colors
            ${percent >= 100 ? "ring-2 ring-green-400/60" : ""}
        `}
        >
            <div className="space-y-2">

                {/* 제목 영역 */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {todo?.name ? "현재 도전중인 도전과제" : "도전과제를 선택하세요"}
                        </p>

                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {todo?.name ?? "현재 도전중인 도전과제가 없습니다"}
                            </h3>

                            {isAchieved || percent >= 100 && (
                                <span className="
                                px-2 py-0.5 text-xs font-semibold
                                bg-green-100 text-green-700
                                dark:bg-green-900/30 dark:text-green-300
                                rounded-full
                            ">
                                    완료
                                </span>
                            )}
                        </div>
                    </div>

                    {todo?.name ?
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">달성률</p>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {percent}%
                            </div>
                        </div>
                        : ""}
                </div>

                {/* 프로그레스 바 */}
                {todo?.name ?
                    <div className="mt-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-3 rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${percent}%`,
                                    background: percent >= 100
                                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                                        : "linear-gradient(90deg, rgba(59,130,246,1), rgba(96,165,250,1))",
                                }}
                            />
                        </div>

                        {/* 상세 텍스트 */}
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <div>
                                누적:
                                <span className="text-gray-700 dark:text-gray-200 font-medium ml-1">
                                    {todo?.type === "time"
                                        ? formatTime(todo?.current_value)
                                        : formatDay(todo?.current_value)}
                                </span>
                            </div>

                            <div>
                                목표:
                                <span className="text-gray-700 dark:text-gray-200 font-medium ml-1">
                                    {todo?.type === "time"
                                        ? formatTime(todo?.target_value)
                                        : formatDay(todo?.target_value)}
                                </span>
                            </div>
                        </div>
                    </div>
                    :
                    ""
                }
            </div>
        </div>
    );
}