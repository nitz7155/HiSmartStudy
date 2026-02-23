import { useState } from "react";
import { FaDeleteLeft, FaCheck } from "react-icons/fa6";
import KioskHeader from "../components/KioskHeader";
import KioskAlertModal from "../components/KioskAlertModal";

function KioskPinInput({ onBack, onComplete }) {
    const [pin, setPin] = useState("");
    const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "warning" });

    const handleNumClick = (num) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleConfirm = () => {
        if (pin.length < 4) {
            setModal({
                isOpen: true,
                title: "입력 확인",
                message: "PIN 번호 4자리를\n모두 입력해 주세요.",
                type: "warning"
            });
            return;
        }
        onComplete(parseInt(pin, 10)); // 숫자형으로 변환하여 전달
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white select-none">
            <KioskHeader backButton={true} onBack={onBack} />

            <main className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-bold text-white">퇴실 확인</h2>
                    <p className="text-slate-400">본인 확인을 위해 PIN 번호를 입력해 주세요.</p>
                </div>

                {/* PIN 입력창 */}
                <div className="w-full max-w-lg">
                    <div className="flex items-center justify-between bg-slate-800 h-24 px-10 rounded-2xl border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-inner">
                        <span className="text-xl text-slate-400 font-medium">PIN 번호</span>
                        <div className="flex gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className={`
                                    w-6 h-6 rounded-full transition-all duration-200
                                    ${i < pin.length ? "bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "bg-slate-700"}
                                `}></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 키패드 */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <KeypadButton key={num} onClick={() => handleNumClick(num)}>{num}</KeypadButton>
                    ))}
                    <KeypadButton onClick={handleDelete} color="bg-rose-900/50 border-rose-800 text-rose-200 active:bg-rose-800">
                        <FaDeleteLeft />
                    </KeypadButton>
                    <KeypadButton onClick={() => handleNumClick(0)}>0</KeypadButton>
                    
                    <KeypadButton 
                        onClick={handleConfirm} 
                        color="bg-blue-600 border-blue-500 text-white active:bg-blue-500 hover:bg-blue-500"
                    >
                        <FaCheck />
                    </KeypadButton>
                </div>
            </main>

            <KioskAlertModal 
                isOpen={modal.isOpen}
                onClose={() => setModal(prev => ({...prev, isOpen: false}))}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
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

export default KioskPinInput;