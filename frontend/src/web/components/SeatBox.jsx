// src/web/components/SeatBox.jsx
import { FaTools } from "react-icons/fa";

function SeatBox({
    seat,
    onClick,
    isSelected = false,
    disableSelection = false,
    isViewOnly = false, // 사용자 웹페이지 모드
    simpleMode = false,  // 관리자/상태창 모드 (상세 정보 노출)
    isCheckOutMode = false
}) {
    function formatTime(minutes) {
        if (minutes === undefined || minutes === null) return "-";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
    }

    const isAvailable = seat.is_status;
    const isOccupied = seat.is_occupied; 
    // 물리적으로 사용불가(is_status=F)인데 논리적 점유(is_occupied=F)가 없으면 점검중
    const isMaintenance = !isAvailable && !isOccupied;
    const isFixed = seat.type === "기간제" || seat.type === "fix";

    let base = "w-full h-full rounded-md flex flex-col items-center justify-center transition-all duration-150 select-none";

    // 공통 배경색 로직
    if (isAvailable) {
        base += isFixed
            ? " bg-gradient-to-br from-[#c0b6ff] to-[#a89af3] text-white border border-[#c0b6ff]"
            : " bg-gradient-to-br from-[#a8c7ff] to-[#8bb3ff] text-[#1A2233] border border-[#a8c7ff]";
    } else {
        if (isMaintenance) {
            base += " bg-slate-800 border border-slate-700 text-slate-500";
        } else {
            base += " bg-gradient-to-br from-[#383e55] to-[#2f3446] border border-[#383e55] text-white";
        }
    }

    // 클릭 가능 스타일
    if (!isViewOnly && (isAvailable || (isCheckOutMode && isOccupied))) {
        base += " cursor-pointer active:scale-95";
    }

    // ---------------------------------------------------------
    // 1. [사용자 웹페이지 전용] - "사용중" / "점검중"만 표시
    // ---------------------------------------------------------
    if (isViewOnly) {
        return (
            <div className={base} onClick={() => onClick?.(seat)}>
                {isAvailable ? (
                    <span className="text-lg">{seat.seat_id}</span>
                ) : (
                    <div className="flex flex-col items-center text-center leading-tight">
                        <span className="text-[10px] opacity-70">{seat.seat_id}</span>
                        <span className="text-sm font-bold mt-0.5">
                            {isMaintenance ? "점검중" : "사용중"}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // ---------------------------------------------------------
    // 2. [관리자/키오스크 전용] - 사용자 이름, 시간, 점검중 상세 표시
    // ---------------------------------------------------------
    return (
        <div className={base} onClick={() => !disableSelection && onClick?.(seat)}>
            {isAvailable ? (
                <span className="text-lg">{seat.seat_id}</span>
            ) : (
                <div className="flex flex-col items-center text-center leading-tight">
                    <span className="text-[10px] opacity-70">{seat.seat_id}</span>
                    {isMaintenance ? (
                        <>
                            <FaTools className="text-lg mb-0.5 opacity-60" />
                            <span className="text-[11px] font-bold">점검중</span>
                        </>
                    ) : (
                        <>
                            {/* 관리자용: 이름 및 시간 표시 (XX* 마스킹은 서버나 프론트에서 처리) */}
                            <span className="text-xs font-bold mt-0.5 truncate max-w-full px-1">
                                {seat.user_name || "사용중"}
                            </span>
                            {/* 관리자 페이지용 상세 문구(예: 5일 남음) */}
                            {seat.remaining_info && (
                                <span className="text-[10px] opacity-80 mt-0.5">
                                    {seat.remaining_info}
                                </span>
                            )}
                            {/* 키오스크/일반용 잔여 시간(분) */}
                            {seat.remaining_time > 0 && !seat.remaining_info && (
                                <span className="text-[10px] opacity-80 mt-0.5">
                                    {formatTime(seat.remaining_time)}
                                </span>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default SeatBox;