// src/kiosk/components/KioskCheckOut.jsx

import { useState } from "react";
import KioskSeatStatus from "../screens/KioskSeatStatus";
import KioskPhoneInput from "../screens/KioskPhoneInput";
import KioskPinInput from "../screens/KioskPinInput";
import KioskAlertModal from "./KioskAlertModal";

// 시간 포맷팅 헬퍼 함수
const formatTime = (minutes) => {
    if (minutes === undefined || minutes === null) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
};

function KioskCheckOut({ onHome }) {
    const [step, setStep] = useState("seat"); 
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // 모달 상태
    const [modal, setModal] = useState({ 
        isOpen: false, 
        title: "", 
        message: "", 
        type: "warning", 
        imageUrl: null, 
        onOk: null,
        confirmText: null, 
        onConfirm: null    
    });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.onOk) modal.onOk();
    };

    const handleSeatSelect = (seat) => {
        setSelectedSeat(seat);
        setStep("auth");
    };

    const handleCheckOutComplete = async (authData, forceCheckOut = false) => {
        if (!selectedSeat) {
            setModal({
                isOpen: true,
                title: "오류",
                message: "선택된 좌석 정보가 없습니다.",
                type: "error",
                onOk: onHome
            });
            return;
        }

        setIsLoading(true);

        const payload = {
            seat_id: selectedSeat.seat_id,
            phone: typeof authData === 'string' ? authData : null, 
            pin: typeof authData === 'number' ? authData : null,
            force: forceCheckOut 
        };

        try {
            const res = await fetch("/api/kiosk/check-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                
                if (errData.detail && typeof errData.detail === "object" && errData.detail.code === "DETECTED") {
                     setModal({
                        isOpen: true,
                        title: "잠깐!!!!!!!!!!!!",
                        message: errData.detail.message + "\n\n소지품을 확인 후 퇴실해 주세요.",
                        imageUrl: errData.detail.image_url, 
                        type: "warning",
                        confirmText: "퇴실하기", // 버튼 텍스트 변경
                        showCancel: false,      // [추가] 취소 버튼 숨기기
                        onConfirm: () => {
                            handleCheckOutComplete(authData, true);
                        }
                    });
                    setIsLoading(false); 
                    return; 
                }

                throw new Error(errData.detail || "퇴실 처리에 실패했습니다.");
            }

            const data = await res.json();
            
            // ------------------------------------------------------------------
            // [수정] 결과 메시지 구성 (이용 시간, 출석, Todo 달성도)
            // ------------------------------------------------------------------
            let resultMessage = `이용 시간: ${formatTime(data.time_used_minutes)}\n잔여 시간: ${formatTime(data.remaining_time_minutes)}`;

            // 1. 출석 체크 결과
            if (data.is_attended) {
                const today = new Date().toLocaleDateString('ko-KR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                resultMessage += `\n\n📅 ${today} 출석 완료!`;
            } else if (data.already_attended) {
                resultMessage += `\n\n✅ 이미 출석되었습니다.`;
            }

            // 2. [추가] Todo(목표) 달성 및 진행 현황 표시
            if (data.todo_results && data.todo_results.length > 0) {
                resultMessage += `\n\n----------------------------\n🎯 목표 진행 상황`;
                
                data.todo_results.forEach(todo => {
                    const unit = todo.type === 'time' ? '분' : '일';
                    
                    if (todo.is_achieved_now) {
                        // 이번 퇴실로 목표 달성 시
                        resultMessage += `\n\n🎉 [달성] ${todo.title}\n   💰 보상: ${todo.reward_amount.toLocaleString()} P 지급 완료!`;
                    } else {
                        // 진행 중인 목표
                        const percent = Math.min(100, Math.round((todo.current_value / todo.goal_value) * 100));
                        resultMessage += `\n\n⏳ ${todo.title}\n   └ 진행률: ${todo.current_value} / ${todo.goal_value}${unit} (${percent}%)`;
                    }
                });
            }

            resultMessage += `\n\n안녕히 가세요!`;

            setModal({
                isOpen: true,
                title: "퇴실 완료",
                message: resultMessage,
                type: "success",
                onOk: onHome,
                onConfirm: null 
            });

        } catch (e) {
            console.error(e);
            setModal({
                isOpen: true,
                title: "퇴실 실패",
                message: e.message,
                type: "error",
                onConfirm: null
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {isLoading && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0,
                    width: "100%", height: "100%",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    backdropFilter: "blur(5px)"
                }}>
                    <div className="text-6xl mb-4 animate-bounce">📷</div>
                    <div className="text-2xl">좌석을 확인하고 있습니다...</div>
                    <div className="text-lg mt-4 font-normal text-gray-300">
                        (두고 가는 짐이 없는지 확인 중)
                    </div>
                </div>
            )}

            {step === "seat" && (
                <KioskSeatStatus 
                    onBack={onHome}
                    onSeatSelect={handleSeatSelect}
                    excludePeriodType={false}
                    isCheckOutMode={true} 
                />
            )}

            {step === "auth" && (
                selectedSeat?.role === 'guest' ? (
                    <KioskPhoneInput 
                        onBack={() => setStep("seat")}
                        onComplete={(res, phone) => handleCheckOutComplete(phone)}
                        mode="checkout"
                    />
                ) : (
                    <KioskPinInput 
                        onBack={() => setStep("seat")}
                        onComplete={(pin) => handleCheckOutComplete(pin)}
                    />
                )
            )}

            <KioskAlertModal 
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                imageUrl={modal.imageUrl}
                onConfirm={modal.onConfirm}     
                confirmText={modal.confirmText} 
                showCancel={modal.showCancel} // [추가] showCancel 프롭 전달
            />
        </>
    );
}

export default KioskCheckOut;