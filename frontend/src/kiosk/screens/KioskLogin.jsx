import { useState } from "react";
import { FaDeleteLeft, FaCheck } from "react-icons/fa6";
import KioskHeader from "../components/KioskHeader";
import KioskAlertModal from "../components/KioskAlertModal";

// mode: "checkin" (입실 시) 또는 "purchase" (구매 시)
function KioskLogin({ onBack, onLoginSuccess, mode = "purchase" }) {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pin, setPin] = useState("");
    const [focusTarget, setFocusTarget] = useState("phone");
    const [isLoading, setIsLoading] = useState(false);

    // 고정석 선택 모달 상태 및 로그인 데이터
    const [showFixSeatModal, setShowFixSeatModal] = useState(false);
    const [loginData, setLoginData] = useState(null);

    // 알림 모달 상태 관리
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "warning",
        onConfirm: null 
    });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (modal.onConfirm) {
            modal.onConfirm();
            setModal(prev => ({ ...prev, onConfirm: null }));
        }
    };

    // 키패드 입력 처리
    const handleNumClick = (num) => {
        if (focusTarget === "phone") {
            if (phoneNumber.length < 8) {
                const newPhone = phoneNumber + num;
                setPhoneNumber(newPhone);
                if (newPhone.length === 8) {
                    setFocusTarget("pin");
                }
            }
        } else {
            if (pin.length < 4) setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (focusTarget === "phone") {
            setPhoneNumber(prev => prev.slice(0, -1));
        } else {
            if (pin.length === 0) {
                setFocusTarget("phone");
                setPhoneNumber(prev => prev.slice(0, -1));
            } else {
                setPin(prev => prev.slice(0, -1));
            }
        }
    };

    // 로그인 요청
    const handleLogin = async () => {
        if (phoneNumber.length < 8 || pin.length < 4) {
            setModal({
                isOpen: true,
                title: "입력 정보 확인",
                message: "전화번호와 PIN 번호를\n모두 입력해 주세요.",
                type: "warning"
            });
            return;
        }

        const formattedPhone = `010-${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;

        try {
            const response = await fetch("/api/kiosk/auth/member-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone: formattedPhone,
                    pin: parseInt(pin, 10),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "로그인에 실패했습니다.");
            }
            
            // [수정] 입실(checkin) 모드일 때만 고정석 바로 입실 여부를 묻는 모달 표시
            if (mode === "checkin" && data.has_period_pass && data.my_fixed_seat_id) {
                setLoginData(data);
                setShowFixSeatModal(true); 
            } else {
                // 구매 모드이거나 고정석이 없으면 바로 티켓 선택으로 진행
                onLoginSuccess(data); 
            }

        } catch (error) {
            console.error("Login Error:", error);
            setModal({
                isOpen: true,
                title: "로그인 실패",
                message: error.message,
                type: "error"
            });
        }
    };

    // [선택 1] 고정석 바로 입실 처리
    const handleDirectCheckIn = async () => {
        if (!loginData || !loginData.my_fixed_seat_id) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/kiosk/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    phone: loginData.phone, 
                    seat_id: loginData.my_fixed_seat_id 
                })
            });

            if (res.ok) {
                setModal({
                    isOpen: true,
                    title: "입실 완료",
                    message: `${loginData.my_fixed_seat_id}번 고정석으로 입실되었습니다.\n오늘도 화이팅하세요!`,
                    type: "success",
                    onConfirm: onBack 
                });
                setShowFixSeatModal(false);
            } else {
                const err = await res.json();
                setModal({
                    isOpen: true,
                    title: "입실 실패",
                    message: err.detail || "입실 처리에 실패했습니다.",
                    type: "error"
                });
            }
        } catch (e) {
            console.error(e);
            setModal({
                isOpen: true,
                title: "오류 발생",
                message: "서버 통신 중 오류가 발생했습니다.",
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    // [선택 2] 자유석 선택
    const handleSelectFreeSeat = () => {
        setShowFixSeatModal(false);
        onLoginSuccess(loginData);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white select-none relative">
            <KioskHeader backButton={true} onBack={onBack} />

            <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-bold text-white">회원 로그인</h2>
                    <p className="text-slate-400">휴대폰 번호와 PIN 번호를 입력해 주세요.</p>
                </div>
                
                {/* 입력 필드 영역 */}
                <div className="flex flex-col gap-6 w-full max-w-lg">
                    {/* 전화번호 입력 */}
                    <div 
                        onClick={() => setFocusTarget("phone")}
                        className={`
                            flex items-center justify-center bg-slate-800 h-20 rounded-2xl border-2 transition-all cursor-pointer shadow-inner
                            ${focusTarget === "phone" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-700"}
                        `}
                    >
                        <span className="text-3xl text-slate-400 font-medium">010</span>
                        <span className="text-2xl text-slate-600 mx-4 font-light">-</span>
                        
                        <div className="w-24 text-center">
                            <span className={`text-3xl font-bold tracking-widest ${phoneNumber.length > 0 ? "text-white" : "text-slate-700"}`}>
                                {phoneNumber.slice(0, 4).padEnd(4, ' ')}
                            </span>
                        </div>

                        <span className="text-2xl text-slate-600 mx-4 font-light">-</span>
                        
                        <div className="w-24 text-center">
                            <span className={`text-3xl font-bold tracking-widest ${phoneNumber.length > 4 ? "text-white" : "text-slate-700"}`}>
                                {phoneNumber.slice(4, 8).padEnd(4, ' ')}
                            </span>
                        </div>
                    </div>

                    {/* PIN 번호 입력 */}
                    <div 
                        onClick={() => setFocusTarget("pin")}
                        className={`
                            flex items-center justify-between bg-slate-800 h-20 px-8 rounded-2xl border-2 transition-all cursor-pointer shadow-inner
                            ${focusTarget === "pin" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-700"}
                        `}
                    >
                        <span className="text-xl text-slate-400 font-medium">PIN 번호 (4자리)</span>
                        <span className="text-5xl font-bold tracking-[1.5rem] text-white h-10 mt-[-10px]">
                            {"•".repeat(pin.length)}
                        </span>
                    </div>
                </div>

                {/* 키패드 */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <KeypadButton key={num} onClick={() => handleNumClick(num)}>{num}</KeypadButton>
                    ))}
                    <KeypadButton onClick={handleDelete} color="bg-rose-900/50 border-rose-800 text-rose-200 active:bg-rose-800">
                        <FaDeleteLeft />
                    </KeypadButton>
                    <KeypadButton onClick={() => handleNumClick(0)}>0</KeypadButton>
                    <KeypadButton onClick={handleLogin} color="bg-blue-600 border-blue-500 text-white active:bg-blue-500">
                        <FaCheck />
                    </KeypadButton>
                </div>
            </main>

            {/* 기본 알림 모달 */}
            <KioskAlertModal 
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />

            {/* 고정석/자유석 선택 모달 */}
            {showFixSeatModal && loginData && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl border border-slate-600 shadow-2xl overflow-hidden p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                        </div>
                        
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">환영합니다, {loginData.name}님!</h3>
                            <p className="text-slate-300">
                                보유하신 <strong>고정석({loginData.my_fixed_seat_id}번)</strong>이 있습니다.<br/>
                                어떻게 입실하시겠습니까?
                            </p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button 
                                onClick={handleDirectCheckIn}
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30 transition-all active:scale-95 active:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? "입실 처리 중..." : <span>💺 고정석 바로 입실</span>}
                            </button>
                            
                            <button 
                                onClick={handleSelectFreeSeat}
                                disabled={isLoading}
                                className="w-full py-4 bg-slate-700 text-slate-200 rounded-xl font-bold text-lg border border-slate-600 transition-all active:scale-95 active:bg-slate-600 flex flex-col items-center justify-center leading-tight"
                            >
                                <span className="flex items-center gap-2">🛋️ 자유석 선택</span>
                                <span className="text-xs text-slate-400 font-normal mt-1">(시간제 시간 차감)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KeypadButton({ children, onClick, color = "bg-slate-800 border-slate-700 text-white active:bg-slate-700" }) {
    return (
        <button 
            onClick={onClick}
            className={`
                h-20 text-3xl font-bold rounded-2xl border shadow-lg
                flex items-center justify-center transition-all duration-100 active:scale-95
                ${color}
            `}
        >
            {children}
        </button>
    );
}

export default KioskLogin;