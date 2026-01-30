import { useEffect, useState } from "react";
import { FaCreditCard, FaSpinner, FaCheckCircle, FaHome, FaExclamationCircle, FaChair, FaCoins } from "react-icons/fa";

function KioskPaymentModal({ isOpen, onClose, ticket, memberInfo, phoneNumber, onPaymentComplete }) {
    const [paymentState, setPaymentState] = useState("ready");
    const [countdown, setCountdown] = useState(5);
    const [errorMessage, setErrorMessage] = useState("");
    const [resultData, setResultData] = useState(null);
    
    // [추가] 마일리지 관련 상태
    const [useMileage, setUseMileage] = useState(0);

    // 모달 초기화
    useEffect(() => {
        if (isOpen) {
            setPaymentState("ready");
            setCountdown(5);
            setErrorMessage("");
            setResultData(null);
            setUseMileage(0); // 마일리지 초기화
        }
    }, [isOpen]);

    // 카운트다운 (비회원만)
    useEffect(() => {
        let timer;
        if (paymentState === "done" && !memberInfo) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleGoMain(); 
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [paymentState, memberInfo]);

    // [추가] 마일리지 입력 핸들러
    const handleMileageChange = (e) => {
        let val = parseInt(e.target.value || 0, 10);
        if (val < 0) val = 0;
        
        // 보유 마일리지나 티켓 가격을 넘지 못하게 제한
        const maxUse = Math.min(memberInfo.total_mileage, ticket.price);
        if (val > maxUse) val = maxUse;

        setUseMileage(val);
    };

    // [추가] 전액 사용 핸들러
    const handleUseAllMileage = () => {
        const maxUse = Math.min(memberInfo.total_mileage, ticket.price);
        setUseMileage(maxUse);
    };

    // 결제 진행
    const handleInsertCard = async () => {
        setPaymentState("processing");

        try {
            const payload = {
                product_id: ticket.product_id,
                member_id: memberInfo ? memberInfo.member_id : 2, 
                phone: phoneNumber || null,
                use_mileage: useMileage // [추가] 사용 마일리지 전송
            };

            const response = await fetch("/api/kiosk/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `결제 실패 (오류코드: ${response.status})`);
            }

            setTimeout(() => {
                setResultData(data);
                setPaymentState("done");
            }, 1000);

        } catch (error) {
            console.error("Payment Error:", error);
            setErrorMessage(error.message || "서버와 연결할 수 없습니다.");
            setPaymentState("error");
        }
    };

    const handleGoMain = () => {
        if (onPaymentComplete && resultData) {
            onPaymentComplete(resultData);
        } else if (onPaymentComplete) {
            onPaymentComplete();
        }
    };

    const handleGoHome = () => {
        window.location.reload();
    };

    const handleRetry = () => {
        setPaymentState("ready");
        setErrorMessage("");
    };

    if (!isOpen || !ticket) return null;

    // 최종 결제 금액 계산
    const finalPrice = ticket.price - useMileage;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md bg-slate-800 rounded-[2.5rem] border border-slate-600 p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                
                {(paymentState === "ready" || paymentState === "error") && (
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
                    >
                        취소
                    </button>
                )}

                {/* 상품명 */}
                <h3 className="text-xl text-slate-400 font-medium mb-1">{ticket.name}</h3>

                {/* 최종 금액 표시 */}
                <div className="flex items-baseline justify-center mb-6">
                    {useMileage > 0 && (
                        <span className="text-2xl text-slate-500 line-through mr-3 decoration-rose-500/50">
                            {ticket.price.toLocaleString()}
                        </span>
                    )}
                    <span className="text-5xl font-extrabold text-white tracking-tight">
                        {finalPrice.toLocaleString()}
                    </span>
                    <span className="text-2xl text-blue-400 ml-1">원</span>
                </div>

                {/* 마일리지 입력 영역 (회원이고 준비 상태일 때만) */}
                {memberInfo && paymentState === "ready" && (
                    <div className="w-full bg-slate-700/30 rounded-2xl p-4 mb-6 border border-slate-600">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-1.5 text-yellow-500">
                                <FaCoins />
                                <span className="text-sm font-bold text-slate-300">보유 마일리지</span>
                            </div>
                            <span className="text-yellow-400 font-bold">{memberInfo.total_mileage.toLocaleString()} P</span>
                        </div>
                        
                        <div className="flex gap-2 h-11">
                            <input 
                                type="number" 
                                value={useMileage === 0 ? "" : useMileage} 
                                onChange={handleMileageChange}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 text-right text-white font-bold placeholder:text-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="0"
                            />
                            <button 
                                onClick={handleUseAllMileage}
                                className="px-3 bg-slate-600 hover:bg-slate-500 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                                전액 사용
                            </button>
                        </div>
                        
                        {useMileage > 0 && (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-600/50 text-sm">
                                <span className="text-slate-400">사용할 포인트</span>
                                <span className="text-rose-400 font-bold">-{useMileage.toLocaleString()} P</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 메인 상태 박스 */}
                <div className="w-full bg-slate-700/50 rounded-3xl p-6 border border-slate-600/50 flex flex-col items-center justify-center transition-all duration-300 min-h-[16rem]">
                    
                    {/* 1. 결제 준비 */}
                    {paymentState === "ready" && (
                        <div className="animate-bounceIn flex flex-col items-center w-full">
                            <FaCreditCard className="text-6xl text-blue-400 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                            <p className="text-lg font-bold text-white mb-6">신용카드를 투입해 주세요</p>
                            
                            <button 
                                onClick={handleInsertCard}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-lg"
                            >
                                {finalPrice === 0 ? "전액 포인트 결제" : "결제하기 (카드 투입)"}
                            </button>
                        </div>
                    )}

                    {/* 2. 결제 진행 중 */}
                    {paymentState === "processing" && (
                        <div className="flex flex-col items-center">
                            <FaSpinner className="text-6xl text-blue-500 animate-spin mb-6" />
                            <p className="text-xl font-bold text-white">결제 승인 중입니다...</p>
                        </div>
                    )}

                    {/* 3. 결제 완료 */}
                    {paymentState === "done" && (
                        <div className="flex flex-col items-center animate-scaleUp w-full">
                            <FaCheckCircle className="text-7xl text-emerald-500 mb-4" />
                            <p className="text-3xl font-bold text-white mb-1">결제 완료</p>
                            <p className="text-slate-400 text-sm mb-6">이용권이 발급되었습니다.</p>
                            
                            {/* 비회원용 */}
                            {!memberInfo && (
                                <>
                                    <p className="text-slate-400 mb-4">{countdown}초 후 이동합니다.</p>
                                    <button 
                                        onClick={handleGoMain}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold w-full justify-center"
                                    >
                                        <FaHome /> 처음으로
                                    </button>
                                </>
                            )}

                            {/* 회원용 */}
                            {memberInfo && (
                                <div className="flex gap-3 w-full">
                                    <button 
                                        onClick={handleGoHome}
                                        className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
                                    >
                                        종료
                                    </button>
                                    <button 
                                        onClick={handleGoMain}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                                    >
                                        좌석 선택
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. 에러 */}
                    {paymentState === "error" && (
                        <div className="flex flex-col items-center animate-bounceIn">
                            <FaExclamationCircle className="text-6xl text-rose-500 mb-4" />
                            <p className="text-lg font-bold text-white mb-2">결제 실패</p>
                            <p className="text-rose-300 text-sm mb-6 whitespace-pre-wrap">{errorMessage}</p>
                            <button 
                                onClick={handleRetry}
                                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
                            >
                                다시 시도
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default KioskPaymentModal;