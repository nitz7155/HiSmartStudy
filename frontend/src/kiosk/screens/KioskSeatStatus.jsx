import { useState, useEffect, useCallback } from "react";
import { PiChairBold } from "react-icons/pi";
import { FaDoorOpen, FaTools } from "react-icons/fa";
import axios from "axios";
import KioskHeader from "../components/KioskHeader";
import KioskAlertModal from "../components/KioskAlertModal";

// 좌석 배치도 (0: 빈공간, -1: 출입구, 숫자: 좌석번호)
const FLOOR_PLAN = [
  [1, 0, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 0, 51, 52],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54],
  [3, 0, 31, 32, 33, 34, 35, 0, 41, 42, 43, 44, 45, 55, 56],
  [4, 0, 36, 37, 38, 39, 40, 0, 46, 47, 48, 49, 50, 57, 58],
  [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 59, 60],
  [6, 0, 61, 62, 63, 64, 65, 0, 71, 72, 73, 74, 75, 0, 0],
  [7, 0, 66, 67, 68, 69, 70, 0, 76, 77, 78, 79, 80, 0, 91],
  [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 92],
  [9, 0, 11, 12, 13, 14, 15, 0, 81, 82, 83, 84, 85, 0, 93],
  [10, 0, 16, 17, 18, 19, 20, 0, 86, 87, 88, 89, 90, 0, 94],
  [0, 0, 0, 0, 0, 0, 0, -1, 95, 96, 97, 98, 99, 100, 0],
];

const KioskSeatStatus = ({
  onBack,
  onSeatSelect,
  isCheckOutMode = false,
  isViewOnly = false,
  memberInfo = null, // [추가] 로그인한 회원 정보 수신
}) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });

  // 초 단위 남은 시간 계산
  const calculateRemainingSeconds = (expiredTime) => {
    if (!expiredTime) return 0;
    const now = new Date();
    const end = new Date(expiredTime);
    const diff = Math.floor((end - now) / 1000);
    return diff > 0 ? diff : 0;
  };

  // D-Day 계산 (기간제 좌석용)
  const calculateDDay = (expiredTime) => {
    if (!expiredTime) return "";
    const now = new Date();
    const end = new Date(expiredTime);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "D-Day";
    if (diffDays > 0) return `D-${diffDays}`;
    return "만료됨";
  };

  // 시간 포맷팅 (00:00:00)
  const formatTime = (sec) => {
    if (sec <= 0) return "00:00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":");
  };

  // 서버에서 좌석 정보 가져오기
  const fetchSeats = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await axios.get("/api/kiosk/seats");
      const formatted = res.data.map((s) => ({
        ...s,
        remaining_seconds: calculateRemainingSeconds(s.ticket_expired_time),
      }));
      setSeats(formatted);
    } catch {
      if (!isBackground) setSeats([]);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeats(false);
    const interval = setInterval(() => { fetchSeats(true); }, 5000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  // 1초마다 남은 시간 감소 (타이머 효과)
  useEffect(() => {
    const timer = setInterval(() => {
      setSeats((prev) =>
        prev.map((s) => {
          if (!s.ticket_expired_time) return s;
          return {
            ...s,
            remaining_seconds: calculateRemainingSeconds(s.ticket_expired_time),
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSeat = (id) => seats.find((s) => s.seat_id === id);

  // 이름 포맷팅
  const formatName = (name) => {
    if (!name) return "사용중";
    if (name === "비회원" || name === "점검중") return name;
    return name.length <= 2
      ? `${name[0]}*`
      : `${name[0]}*${name[name.length - 1]}`;
  };

  // 좌석 클릭 핸들러
  const handleSeatClick = (seatId) => {
    const seat = getSeat(seatId);
    if (!seat) return;

    if (seat.user_name === "점검중") {
        setAlertModal({
            isOpen: true,
            message: "현재 점검 중인 좌석입니다.\n관리자에게 문의해주세요."
        });
        return;
    }

    if (isCheckOutMode) {
        if (!seat.is_real_checkin) return; 
    } 
    else if (!isViewOnly) {
        if (!seat.is_status) return; 
    }
    if (isViewOnly) return;

    // [핵심] 기간제 좌석 권한 체크 로직
    const isFixedSeat = seat.type === "fix" || seat.type === "기간제";
    if (isFixedSeat && !isCheckOutMode && !isViewOnly) {
      if (!memberInfo || memberInfo.role === "guest") {
        setAlertModal({
          isOpen: true,
          message: "기간제 좌석은 회원만 이용 가능합니다.\n로그인 후 이용해주세요.",
        });
        return;
      }

      // [추가 요구사항] 기간제 이용권이 없는 회원이 기간제 좌석 선택 시 알림
      if (!memberInfo.has_period_pass) {
          setAlertModal({
              isOpen: true,
              message: "유효한 이용권이 없습니다.",
          });
          return;
      }
    }

    setSelectedSeatId(seatId);
    onSeatSelect(seat);  
  };

  const pressEffect = "active:scale-95 active:brightness-110";

  // 개별 좌석 렌더링
  const renderSeat = (seatId) => {
    if (seatId === -1) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <FaDoorOpen className="w-7 h-7 text-slate-400 opacity-70" />
        </div>
      );
    }
    if (seatId === 0) return <div />;

    const seat = getSeat(seatId);
    if (!seat) return <div className="rounded-md bg-[#1C2437]" />;

    const isOccupied = isCheckOutMode ? seat.is_real_checkin : !seat.is_status;
    const isAvailable = !isOccupied; 
    const isMaintenance = seat.user_name === "점검중";
    const isFixed = seat.type === "기간제" || seat.type === "fix";
    const isSelected = selectedSeatId === seatId;

    let base = "w-full h-full rounded-md flex flex-col items-center justify-center transition-all duration-150 select-none ";

    if (isViewOnly) {
      const viewAvailable = seat.is_status;
      if (viewAvailable) {
        base += isFixed
          ? " bg-gradient-to-br from-[#c0b6ff] to-[#a89af3] border border-[#c0b6ff] text-white"
          : " bg-gradient-to-br from-[#a8c7ff] to-[#8bb3ff] border border-[#a8c7ff] text-[#1A2233]";
      } else {
        if (isMaintenance) base += " bg-slate-800 border border-slate-700 text-slate-500";
        else base += " bg-gradient-to-br from-[#383e55] to-[#2f3446] border border-[#383e55] text-[#8E97A8]";
      }

      return (
        <div className={base}>
          {viewAvailable ? (
            <span className="text-lg">{seatId}</span>
          ) : (
            <div className="flex flex-col items-center text-center leading-tight">
                {isMaintenance ? (
                    <>
                        <FaTools className="text-xl mb-1 opacity-50" />
                        <span className="text-xs font-bold text-slate-400">점검중</span>
                    </>
                ) : (
                    <>
                        <span className="text-xs text-slate-300">{seatId}</span>
                        <span className="text-sm font-bold text-white mt-0.5">{formatName(seat.user_name)}</span>
                        {seat.ticket_expired_time && (
                            <span className="text-[11px] text-slate-400 mt-0.5">
                                {isFixed ? calculateDDay(seat.ticket_expired_time) : formatTime(seat.remaining_seconds)}
                            </span>
                        )}
                    </>
                )}
            </div>
          )}
        </div>
      );
    }

    if (isMaintenance) {
        base += " bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed";
        return (
            <div className={base} onClick={() => handleSeatClick(seatId)}>
                <div className="flex flex-col items-center text-center leading-tight opacity-50">
                    <FaTools className="text-xl mb-1" />
                    <span className="text-xs font-bold">점검중</span>
                </div>
            </div>
        );
    }

    if (isCheckOutMode) {
      if (isOccupied) {
        base += isSelected
          ? " bg-gradient-to-br from-[#FF5C7A] to-[#FF3F62] text-white ring-2 ring-rose-300 scale-95 shadow-lg"
          : " bg-[#B94163]/40 text-[#FF8FA5] border border-[#B94163] cursor-pointer " + pressEffect;
      } else {
        base += " bg-gradient-to-br from-[#383e55] to-[#2f3446] opacity-40 border border-[#202A3E]";
      }
    } 
    else {
      if (isAvailable) {
        if (isSelected) {
          base += " bg-gradient-to-br from-[#4A6DFF] to-[#6A86FF] text-white shadow-lg ring-2 ring-blue-300 scale-95";
        } else {
          base += isFixed
            ? " bg-gradient-to-br from-[#c0b6ff] to-[#a89af3] text-white border border-[#c0b6ff] cursor-pointer " + pressEffect
            : " bg-gradient-to-br from-[#a8c7ff] to-[#8bb3ff] text-[#1A2233] border border-[#a8c7ff] cursor-pointer " + pressEffect;
        }
      } else {
        base += " bg-gradient-to-br from-[#383e55] to-[#2f3446] border border-[#383e55] text-[#8E97A8]";
      }
    }

    return (
      <div className={base} onClick={() => handleSeatClick(seatId)}>
        {isAvailable ? (
          <span className="text-lg">{seatId}</span>
        ) : (
          <div className="flex flex-col items-center text-center leading-tight">
            <span className="text-xs text-slate-300">{seatId}</span>
            <span className="text-sm font-bold text-white mt-0.5">{formatName(seat.user_name)}</span>
            {seat.ticket_expired_time && (
              <span className="text-[11px] text-slate-400 mt-0.5">
                {isFixed ? calculateDDay(seat.ticket_expired_time) : formatTime(seat.remaining_seconds)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  let titleText = "이용하실 좌석을 선택해주세요";
  if (isCheckOutMode) titleText = "퇴실하실 좌석을 선택해주세요";
  if (isViewOnly) titleText = "좌석 현황";

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-white select-none overflow-hidden">
      <KioskHeader backButton={true} onBack={onBack} />
      <div className="w-full relative flex items-center justify-start mt-6 mb-4 pl-4">
        <h2 className="text-2xl font-extrabold text-white drop-shadow-md flex items-center gap-2">
          <PiChairBold className="text-[26px] text-violet-300" />
          <span>{titleText}</span>
        </h2>
        
        <div className="absolute right-4 flex items-center gap-4 bg-[#1C2437]/80 border border-[#2A3347] rounded-full px-6 py-2 shadow-md shadow-black/20">
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ background: "#a8c7ff" }}></div><span className="text-sm text-[#E9F0FF]">자유석</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ background: "#c0b6ff" }}></div><span className="text-sm text-[#F0F6FF]">고정석</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ background: "#383e55" }}></div><span className="text-sm text-[#8E97A8]">사용중</span></div>
        </div>
      </div>

      <main className="flex-1 px-4 pb-6">
        <div
          className="w-full h-full grid rounded-2xl border border-[#2A3347] p-3 shadow-lg shadow-black/20"
          style={{
            gridTemplateColumns: `repeat(${FLOOR_PLAN[0].length}, 1fr)`,
            gridTemplateRows: `repeat(${FLOOR_PLAN.length}, 1fr)`,
            gap: "6px",
          }}
        >
          {loading ? (
            <div className="col-span-full flex justify-center items-center">
              <div className="animate-spin h-10 w-10 border-4 border-slate-700 border-t-blue-400 rounded-full" />
            </div>
          ) : (
            FLOOR_PLAN.map((row, r) =>
              row.map((id, c) => <div key={`${r}-${c}`}>{renderSeat(id)}</div>)
            )
          )}
        </div>
      </main>

      <KioskAlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title="알림"
        message={alertModal.message}
        type="warning"
      />
    </div>
  );
};

export default KioskSeatStatus;