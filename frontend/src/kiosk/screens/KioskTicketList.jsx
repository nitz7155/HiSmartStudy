// src/kiosk/screens/KioskTicketList.jsx

import { useState, useEffect, useCallback } from "react";
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaRedo, FaCoins } from "react-icons/fa"; // FaCoins 아이콘 추가
import { FaUser } from "react-icons/fa6"; 
import KioskHeader from "../components/KioskHeader";
import KioskPaymentModal from "../components/KioskPaymentModal";

function KioskTicketList({ onBack, userType, onPaymentRequest, memberInfo }) {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/kiosk/products");
            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }
            const data = await response.json();
            
            // [수정] 시간(value) 기준 오름차순 정렬
            const sortedData = data.sort((a, b) => a.value - b.value);
            setTickets(sortedData);
            
        } catch (err) {
            console.error("상품 목록을 가져오는데 오류가 발생했습니다.", err);
            setError("상품 정보를 불러올 수 없습니다.\n네트워크 상태를 확인하거나 관리자에게 문의해 주세요.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts, userType]);

    const handleTicketSelect = (ticket) => {
        if (selectedTicket?.product_id === ticket.product_id) {
            setSelectedTicket(null);
        } else {
            setSelectedTicket(ticket);
        }
    };

    // 결제 버튼 클릭 핸들러
    const handlePaymentClick = () => {
        if (!selectedTicket) return;

        if (userType === 'member') {
            // 회원이면: 바로 결제 모달 띄우기
            setIsPaymentModalOpen(true);
        } else {
            // 비회원이면: 상위 컴포넌트로 요청 보내서 전화번호 입력 화면으로 이동
            onPaymentRequest(selectedTicket);
        }
    };

    // [회원 전용] 모달에서 결제 완료 시 호출
    const handleMemberPaymentComplete = (resultData) => {
        setIsPaymentModalOpen(false);
        // 결제 완료되었다는 신호와 함께 티켓 정보 전달
        onPaymentRequest(selectedTicket, resultData); 
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white select-none relative overflow-hidden">
            <KioskHeader backButton={true} onBack={onBack} />

            <main className="flex-1 w-full overflow-y-auto">
                <div className="min-h-full flex flex-col justify-center p-8 pb-48 container mx-auto max-w-6xl">
                    
                    {/* 상단 타이틀 및 정보 영역 */}
                    <div className="mb-10 pl-4 border-l-4 border-blue-500">
                        <h2 className="text-3xl font-bold text-white mb-4">이용권 선택</h2>
                        
                        {userType === "member" && memberInfo ? (
                            // [수정] 회원 정보 카드 너비 확장 (max-w-4xl) 및 내부 레이아웃 조정
                            <div className="mt-4 bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-lg flex items-center gap-6 max-w-4xl backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                <div className="relative w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center border border-slate-600 group-hover:border-blue-500/50 transition-colors">
                                    <FaUser className="text-3xl text-blue-400" />
                                </div>

                                <div className="flex-1">
                                    <p className="text-blue-200 text-sm font-medium mb-1 tracking-wide">Welcome Back</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-extrabold text-white">{memberInfo.name}</span>
                                        <span className="text-lg text-slate-400 font-medium">회원님</span>
                                    </div>
                                </div>

                                {/* 정보 표시 영역 (시간 + 마일리지) */}
                                <div className="flex gap-8">
                                    {/* 1. 잔여 시간 */}
                                    <div className="text-right pl-6 border-l border-slate-700">
                                        <p className="text-slate-400 text-sm font-medium mb-1">현재 잔여 시간</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <FaClock className="text-blue-500 text-lg" />
                                            <span className="text-3xl font-extrabold text-white tracking-tight">
                                                {memberInfo.saved_time_minute}
                                            </span>
                                            <span className="text-lg text-slate-400 font-medium">분</span>
                                        </div>
                                    </div>

                                    {/* 2. [추가] 보유 마일리지 */}
                                    <div className="text-right pl-6 border-l border-slate-700">
                                        <p className="text-slate-400 text-sm font-medium mb-1">보유 마일리지</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <FaCoins className="text-yellow-500 text-lg" />
                                            <span className="text-3xl font-extrabold text-white tracking-tight">
                                                {memberInfo.total_mileage ? memberInfo.total_mileage.toLocaleString() : 0}
                                            </span>
                                            <span className="text-lg text-slate-400 font-medium">P</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-lg">
                                비회원님, 원하시는 시간을 선택해 주세요.
                            </p>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4 text-slate-500 py-10">
                            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                            <p>상품 목록을 불러오는 중...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center gap-6 animate-fadeIn py-10">
                            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg">
                                <FaExclamationTriangle className="text-4xl text-red-500" />
                            </div>
                            
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-2">오류가 발생했습니다</h3>
                                <p className="text-slate-400 whitespace-pre-line leading-relaxed">{error}</p>
                            </div>

                            <button 
                                onClick={fetchProducts}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 active:bg-slate-700 active:border-slate-600 active:scale-95 transition-all duration-100 shadow-lg text-blue-400 font-bold"
                            >
                                <FaRedo className={loading ? "animate-spin" : ""} />
                                다시 시도
                            </button>
                        </div>
                    ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tickets.map(ticket => {
                                const isSelected = selectedTicket?.product_id === ticket.product_id;
                                
                                return (
                                    <li key={ticket.product_id}>
                                        <button
                                            onClick={() => handleTicketSelect(ticket)}
                                            className={`
                                                w-full h-full group relative flex flex-col justify-between p-8 rounded-3xl shadow-xl transition-all duration-200 text-left border
                                                active:scale-95 
                                                ${isSelected 
                                                    ? "bg-slate-800 border-blue-500 ring-2 ring-blue-500 shadow-blue-900/30" 
                                                    : "bg-slate-800 border-slate-700 active:border-blue-500/30"
                                                }
                                            `}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent transition-opacity rounded-3xl ${isSelected ? "opacity-100" : "opacity-0"}`}></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`
                                                        inline-flex items-center justify-center w-12 h-12 rounded-2xl transition-colors duration-200
                                                        ${isSelected ? "bg-blue-500 text-white" : "bg-slate-700/50 text-blue-300"}
                                                    `}>
                                                        <FaClock className="text-xl" />
                                                    </span>
                                                    
                                                    <FaCheckCircle className={`text-2xl transition-colors duration-200 ${isSelected ? "text-blue-500" : "text-slate-700"}`} />
                                                </div>

                                                <h3 className={`text-2xl font-bold mb-2 transition-colors duration-200 ${isSelected ? "text-white" : "text-slate-100"}`}>
                                                    {ticket.name}
                                                </h3>
                                                
                                                <div className="flex items-baseline gap-1 mt-4">
                                                    <span className={`text-3xl font-extrabold transition-colors duration-200 ${isSelected ? "text-blue-200" : "text-blue-300"}`}>
                                                        {ticket.price.toLocaleString()}
                                                    </span>
                                                    <span className="text-lg text-slate-400 font-medium">원</span>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </main>

            {/* 하단 플로팅 버튼 */}
            <div className={`
                fixed bottom-10 left-0 right-0 flex justify-center items-center z-50 pointer-events-none
                transition-all duration-500 ease-in-out
                ${selectedTicket ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
            `}>
                <button 
                    onClick={handlePaymentClick}
                    className="
                        pointer-events-auto
                        group relative overflow-hidden
                        flex items-center justify-between gap-6 
                        w-[90%] max-w-2xl px-8 py-5 
                        bg-blue-600 hover:bg-blue-500 
                        rounded-full shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)]
                        border border-white/10
                        active:scale-95 active:shadow-none transition-all duration-200
                    "
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                    <div className="flex flex-col items-start">
                        <span className="text-blue-100 text-sm font-medium">선택된 이용권</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-white">{selectedTicket?.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-3xl font-extrabold text-white tracking-tight">
                            {selectedTicket?.price.toLocaleString()}<span className="text-xl font-medium text-blue-200 ml-1">원</span>
                        </span>
                        
                        <div className="px-5 py-2 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-active:bg-white/30 transition-colors">
                            <span className="text-white font-bold text-lg leading-none pt-0.5">
                                {userType === 'member' ? "결제" : "다음"}
                            </span>
                        </div>
                    </div>
                </button>
            </div>

            {/* 회원 전용 결제 모달 */}
            <KioskPaymentModal 
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                ticket={selectedTicket}
                memberInfo={memberInfo} // 회원 정보 전달
                onPaymentComplete={handleMemberPaymentComplete}
            />
        </div>
    );
}

export default KioskTicketList;