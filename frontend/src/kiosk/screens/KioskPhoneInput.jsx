import { useState } from "react";
import KioskHeader from "../components/KioskHeader";
import KioskAlertModal from "../components/KioskAlertModal";
import KioskPaymentModal from "../components/KioskPaymentModal";
import { FaDeleteLeft } from "react-icons/fa6";

// [수정] mode prop 추가 ('purchase' | 'checkout')
function KioskPhoneInput({ onBack, onComplete, ticket, mode = 'purchase' }) {
    const [phoneNumber, setPhoneNumber] = useState("");
    
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: "", message: "", type: "warning" });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const closeAlertModal = () => setAlertModal(prev => ({ ...prev, isOpen: false }));

    const handleNumClick = (num) => {
        if (phoneNumber.length < 8) setPhoneNumber(prev => prev + num);
    };

    const handleDelete = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const handleConfirm = () => {
        if (phoneNumber.length < 8) {
            setAlertModal({
                isOpen: true,
                title: "입력 확인",
                message: "전화번호 8자리를\n모두 입력해 주세요.",
                type: "warning"
            });
            return;
        }

        // [수정] 퇴실 모드일 경우 결제 모달 없이 바로 완료 처리
        if (mode === 'checkout') {
            onComplete(null, "010" + phoneNumber);
        } else {
            // 구매 모드일 경우 결제 모달 오픈
            setIsPaymentModalOpen(true);
        }
    };

    const handlePaymentComplete = (resultData) => {
        setIsPaymentModalOpen(false);
        onComplete(resultData, "010" + phoneNumber);
    };

    // 모드에 따른 텍스트 설정
    const titleText = mode === 'checkout' ? "퇴실 확인" : "비회원 정보 입력";
    const subText = mode === 'checkout' 
        ? "퇴실 처리를 위해 전화번호를 입력해 주세요." 
        : "분실물 발생 시 연락을 드릴 수 있도록 전화번호를 입력해 주시기 바랍니다.";
    const buttonText = mode === 'checkout' ? "퇴실하기" : "결제하기";

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white select-none">
            <KioskHeader backButton={true} onBack={onBack} />

            <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-bold text-white">{titleText}</h2>
                    <p className="text-slate-400">{subText}</p>
                </div>

                <div className="w-full max-w-lg">
                    <div className="flex items-center justify-center bg-slate-800 h-24 rounded-2xl border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-inner transition-all">
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
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <KeypadButton key={num} onClick={() => handleNumClick(num)}>{num}</KeypadButton>
                    ))}
                    <KeypadButton onClick={handleDelete} color="bg-rose-900/50 border-rose-800 text-rose-200 active:bg-rose-800">
                        <FaDeleteLeft />
                    </KeypadButton>
                    <KeypadButton onClick={() => handleNumClick(0)}>0</KeypadButton>
                </div>

                <button 
                    onClick={handleConfirm}
                    disabled={phoneNumber.length < 8}
                    className={`
                        w-full max-w-sm py-5 rounded-2xl text-2xl font-bold shadow-xl transition-all mt-4
                        ${phoneNumber.length === 8 
                            ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-95" 
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"}
                    `}
                >
                    {buttonText}
                </button>
            </main>

            <KioskAlertModal 
                isOpen={alertModal.isOpen}
                onClose={closeAlertModal}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />

            {/* 결제 모달은 구매 모드일 때만 렌더링 */}
            {mode === 'purchase' && (
                <KioskPaymentModal 
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    ticket={ticket} 
                    phoneNumber={`010${phoneNumber}`} 
                    onPaymentComplete={handlePaymentComplete}
                />
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

export default KioskPhoneInput;