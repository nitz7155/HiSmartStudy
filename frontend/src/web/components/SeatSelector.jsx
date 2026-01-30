import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PiChairBold } from "react-icons/pi";
import { FaDoorOpen } from "react-icons/fa";
import SeatBox from "./SeatBox";

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

export default function SeatSelector({ choiceTicket, seats = [], onBack }) {
    const navigate = useNavigate();
    const [selectedSeat, setSelectedSeat] = useState(null);

    const handleSeatClick = (seat) => {
        if (seat?.is_status && (seat.type === "fix" || seat.type === "기간제")) {
            setSelectedSeat(seat);
        }
    };

    const handleSubmit = () => {
        if (!selectedSeat) return alert("좌석을 선택하세요.");

        navigate("/web/payment", {
            state: {
                Ticket: choiceTicket,
                SelectSeat: selectedSeat
            }
        });
    };

    const getSeat = (id) => seats.find((s) => s.seat_id === id);

    const renderSeat = (seatId) => {
        if (seatId === -1)
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <FaDoorOpen className="w-7 h-7 text-slate-400 opacity-70" />
                </div>
            );

        if (seatId === 0) return <div />;

        const seat = getSeat(seatId);
        if (!seat) return <div className="rounded-md bg-[#1C2437]" />;

        return (
            <SeatBox
                key={seat.seat_id}
                seat={seat}
                onClick={handleSeatClick}
                isSelected={selectedSeat?.seat_id === seat.seat_id}
                disableSelection={!(seat.type === "fix" || seat.type === "기간제")}
            />
        );
    };

    return (
        <div className="flex-1 flex flex-col container mx-auto max-w-6xl h-full
                        bg-[#f0f4f8] dark:bg-slate-900 
                        text-gray-900 dark:text-white transition-colors px-4 pb-4">

            {/* Header */}
            <div className="flex justify-between items-end mb-4 px-2">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <PiChairBold className="text-[26px] text-violet-300" />
                        좌석 선택
                    </h2>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                        고정석을 선택해 주세요.
                    </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4
                                bg-white/70 dark:bg-[#1C2437]/80 
                                border border-gray-300 dark:border-[#2A3347]
                                rounded-full px-6 py-2 shadow-md">

                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-[#a8c7ff]" />
                        <span className="text-sm text-gray-700 dark:text-[#E9F0FF]">자유석</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-[#c0b6ff]" />
                        <span className="text-sm text-gray-700 dark:text-[#F0F6FF]">고정석</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-[#383e55]" />
                        <span className="text-sm text-gray-600 dark:text-[#8E97A8]">사용중</span>
                    </div>
                </div>
            </div>

            {/* Seat Grid Container */}
            <div className="flex-1 bg-gray-100 dark:bg-slate-800/40
                            rounded-3xl border border-gray-200 dark:border-slate-700
                            p-6 backdrop-blur-sm shadow-inner dark:shadow-none relative">

                {seats.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-500">
                        좌석 데이터가 없습니다.
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden">
                        <div
                            className="w-full h-full grid rounded-2xl border border-[#2A3347] 
                                       p-3 shadow-lg shadow-black/20"
                            style={{
                                gridTemplateColumns: `repeat(${FLOOR_PLAN[0].length}, 1fr)`,
                                gridTemplateRows: `repeat(${FLOOR_PLAN.length}, 1fr)`,
                                gap: "6px",
                            }}
                        >
                            {FLOOR_PLAN.map((row, r) =>
                                row.map((id, c) => <div key={`${r}-${c}`}>{renderSeat(id)}</div>)
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Bottom Floating Bar */}
            {selectedSeat && (
                <div className="absolute left-1/2 transform -translate-x-1/2 z-50 w-full px-4" style={{ bottom: 8 }}>
                    <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800 p-4
                                    rounded-3xl border border-gray-300 dark:border-slate-700
                                    shadow-xl dark:shadow-2xl flex justify-between items-center">

                        <div>
                            <p className="text-sm text-gray-600 dark:text-slate-300">선택된 좌석</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedSeat.seat_id}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => (onBack ? onBack() : navigate('/web/ticket'))}
                                className="px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700"
                            >
                                이전
                            </button>

                            <button
                                onClick={handleSubmit}
                                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
