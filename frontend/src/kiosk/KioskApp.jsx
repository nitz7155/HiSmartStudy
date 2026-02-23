import { useState } from "react";
import { FaTicketAlt, FaSignInAlt, FaSignOutAlt, FaChevronRight } from "react-icons/fa";
import { PiChairBold } from "react-icons/pi";
import KioskHeader from "./components/KioskHeader";
import KioskSelectUser from "./screens/KioskUserSelect";
import KioskLogin from "./screens/KioskLogin";
import KioskTicketList from "./screens/KioskTicketList";
import KioskPhoneInput from "./screens/KioskPhoneInput";
import KioskSeatStatus from "./screens/KioskSeatStatus";

import KioskCheckIn from "./components/KioskCheckIn";
import KioskCheckOut from "./components/KioskCheckOut";
import KioskAlertModal from "./components/KioskAlertModal"; 

function KioskApp() {
    const [currentPage, setCurrentPage] = useState("home");
    
    // 구매 프로세스용 상태들
    const [userType, setUserType] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [memberInfo, setMemberInfo] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);

    // 모달 상태 관리
    const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "warning", onOk: null });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.onOk) {
            modal.onOk();
            setModal(prev => ({ ...prev, onOk: null }));
        }
    };

    // --- 초기화 및 네비게이션 ---
    const goToHome = () => {
        setCurrentPage("home");
        setUserType(null);
        setSelectedTicket(null);
        setSelectedSeat(null);
        setMemberInfo(null);
        setPaymentResult(null);
    };

    // 1. 구매 프로세스 시작
    const startPurchaseProcess = () => {
        setUserType(null);
        setMemberInfo(null);
        setPaymentResult(null);
        setCurrentPage("select-user");
    };

    const startCheckInProcess = () => setCurrentPage("checkin-process");
    const startCheckOutProcess = () => setCurrentPage("checkout-process");
    const goToSeatStatusView = () => setCurrentPage("seat-status-view");

    // --- [구매 프로세스] 관련 핸들러들 ---
    const handleUserSelect = (type) => {
        setUserType(type);
        if (type === "member") setCurrentPage("member-login");
        else setCurrentPage("seat-status");
    };

    const handleLoginSuccess = (memberData) => {
        setMemberInfo(memberData);
        setCurrentPage("ticket-list");
    };

    const handleSeatSelect = async (seat) => {
        setSelectedSeat(seat);
        if (userType === "member" && paymentResult) {
            await handlePurchaseCheckIn(paymentResult.order_id, memberInfo.phone, seat);
        } else {
            setCurrentPage("ticket-list");
        }
    };

    const handlePaymentRequest = (ticket, resultData) => {
        setSelectedTicket(ticket);
        if (userType === "member") {
            if (resultData) {
                setPaymentResult(resultData);
                setCurrentPage("seat-status");
            } else {
                setModal({
                    isOpen: true,
                    title: "오류",
                    message: "결제 정보에 오류가 발생했습니다.",
                    type: "error"
                });
            }
        } else {
            setCurrentPage("phone-input");
        }
    };

    const handleNonMemberInfoComplete = async (resultData, phoneNumber) => {
        if (selectedSeat && resultData) {
            await handlePurchaseCheckIn(resultData.order_id, phoneNumber, selectedSeat);
        } else {
            setModal({
                isOpen: true,
                title: "오류",
                message: "좌석 정보가 없습니다.\n처음부터 다시 시도해 주세요.",
                type: "error",
                onOk: goToHome
            });
        }
    };

    // 구매 완료 후 입실 처리
    const handlePurchaseCheckIn = async (orderId, phoneNumber, targetSeat) => {
        try {
            const res = await fetch("/api/kiosk/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: phoneNumber,
                    seat_id: targetSeat.seat_id,
                    order_id: orderId
                })
            });
            if (!res.ok) throw new Error("입실 실패");
            
            const data = await res.json();
            
            setModal({
                isOpen: true,
                title: "구매 및 입실 완료",
                message: `이용권 구매와 입실이 완료되었습니다!\n좌석번호: ${data.seat_id}번`,
                type: "success",
                onOk: goToHome
            });
        } catch (e) {
            setModal({
                isOpen: true,
                title: "입실 처리 실패",
                message: e.message || "알 수 없는 오류가 발생했습니다.",
                type: "error",
                onOk: goToHome
            });
        }
    };

    // --- 화면 렌더링 ---
    let content = null;
    if (currentPage === "checkin-process") content = <KioskCheckIn onHome={goToHome} />;
    else if (currentPage === "checkout-process") content = <KioskCheckOut onHome={goToHome} />;
    else if (currentPage === "select-user") content = <KioskSelectUser onBack={goToHome} onSelectMember={() => handleUserSelect("member")} onSelectNonMember={() => handleUserSelect("non-member")} />;
    
    // [수정] 구매 프로세스에서의 로그인은 mode="purchase"를 전달
    else if (currentPage === "member-login") content = (
        <KioskLogin 
            mode="purchase"
            onBack={() => { startPurchaseProcess(); }} 
            onLoginSuccess={handleLoginSuccess} 
        />
    );
    
    // [수정] 좌석 선택 화면에 memberInfo를 전달하여 이용권 체크가 가능하도록 함
    else if (currentPage === "seat-status") content = (
        <KioskSeatStatus 
            onBack={() => {
                if (userType === 'member' && paymentResult) goToHome();
                else startPurchaseProcess();
            }} 
            onSeatSelect={handleSeatSelect} 
            excludePeriodType={true} 
            memberInfo={memberInfo}
        />
    );
    else if (currentPage === "ticket-list") content = (
        <KioskTicketList 
            onBack={() => {
                if (userType === "member") setCurrentPage("member-login");
                else setCurrentPage("seat-status");
            }}
            userType={userType}
            onPaymentRequest={handlePaymentRequest}
            memberInfo={memberInfo}
        />
    );
    else if (currentPage === "phone-input") content = (
        <KioskPhoneInput 
            onBack={() => setCurrentPage("ticket-list")} 
            onComplete={handleNonMemberInfoComplete} 
            ticket={selectedTicket}
            mode="purchase"
        />
    );
    else if (currentPage === "seat-status-view") content = (
        <KioskSeatStatus 
            onBack={goToHome} 
            excludePeriodType={false} 
            isViewOnly={true} 
        />
    );
    else content = (
        <div className="min-h-screen bg-slate-900 flex flex-col select-none overflow-hidden font-sans text-white">
            <KioskHeader backButton={false} />

            <main className="flex-1 flex flex-col p-8 gap-10 container mx-auto max-w-6xl justify-center">
                <div className="flex justify-between items-center px-4">
                    <div className="text-left">
                        <h2 className="text-5xl font-extrabold mb-2 py-2 pr-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-blue-200 tracking-tight">
                            Welcome to High Study
                        </h2>
                        <p className="text-xl text-slate-400 font-light">
                            <span className="text-blue-300 font-medium">원하시는 서비스를 선택해 주십시오.</span>
                        </p>
                    </div>

                    <button 
                        className="group relative w-80 h-24 rounded-2xl overflow-hidden shadow-xl transition-all duration-200 active:scale-95 border border-white/10 bg-slate-800/50 backdrop-blur-md"
                        onClick={goToSeatStatusView} 
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent group-active:from-violet-600/30 transition-all"></div>
                        <div className="relative h-full flex items-center justify-between px-6 z-10">
                            <div className="flex flex-col items-start gap-1">
                                <h3 className="text-2xl font-bold text-white tracking-tight group-active:text-violet-200 transition-colors">
                                    좌석 현황 확인
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30 shadow-inner group-active:bg-violet-500 group-active:text-white transition-all">
                                    <PiChairBold className="text-xl text-violet-300 group-active:text-white" />
                                </div>
                                <FaChevronRight className="text-slate-500 text-sm group-active:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-8 h-96">
                    <MainActionButton 
                        title="이용권 구매" 
                        sub="Ticket"
                        icon={<FaTicketAlt />} 
                        gradient="from-blue-600 to-blue-800"
                        accentColor="bg-blue-500"
                        onClick={startPurchaseProcess} 
                    />
                    <MainActionButton 
                        title="입실" 
                        sub="Check In"
                        icon={<FaSignInAlt />} 
                        gradient="from-emerald-600 to-emerald-800"
                        accentColor="bg-emerald-500"
                        onClick={startCheckInProcess} 
                    />
                    <MainActionButton 
                        title="퇴실" 
                        sub="Check Out"
                        icon={<FaSignOutAlt />} 
                        gradient="from-rose-600 to-rose-800"
                        accentColor="bg-rose-500"
                        onClick={startCheckOutProcess} 
                    />
                </div>
            </main>

            <footer className="p-6 text-center text-slate-500 text-sm font-light">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                    High Study Cafe System ⓒ Team CUBE
                </span>
            </footer>
        </div>
    );

    return (
        <>
            {content}
            <KioskAlertModal 
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </>
    );
}

function MainActionButton({ title, sub, icon, gradient, accentColor, onClick  }) {
    return (
        <button 
            onClick={onClick}
            className={`
                group relative rounded-3xl overflow-hidden shadow-2xl 
                flex flex-col items-center justify-center gap-6
                bg-gradient-to-br ${gradient} border border-white/10
                transition-all duration-200 ease-out
                active:scale-95 active:brightness-110
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-40 pointer-events-none"></div>
            <div className={`
                relative p-8 rounded-full text-5xl text-white shadow-lg
                ${accentColor} bg-opacity-30 backdrop-blur-sm border border-white/20
                group-active:scale-110 transition-transform duration-200
            `}>
                {icon}
            </div>
            <div className="relative z-10 text-center">
                <h3 className="text-4xl font-bold text-white tracking-wide drop-shadow-md">{title}</h3>
                <p className="text-blue-100/80 text-xl font-medium mt-2 uppercase tracking-wider">{sub}</p>
            </div>
        </button>
    );
}

export default KioskApp;