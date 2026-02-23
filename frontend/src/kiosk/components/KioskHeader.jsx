import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaClock } from "react-icons/fa";

function KioskHeader({ backButton = true, onBack }) {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <header className="flex justify-between items-center h-24 px-6 bg-slate-900 text-white shadow-lg sticky top-0 z-50 select-none">
            <div className="w-32 flex justify-start">
                {backButton && (
                    <button 
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 transition-transform duration-100 active:scale-95 active:text-white active:bg-slate-800"
                    >
                        <FaArrowLeft className="text-xl" />
                    </button>
                )}
            </div>

            <div className="flex-1 text-center">
                <h1 className="text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                    HIGH STUDY KIOSK
                </h1>
            </div>

            <div className="w-32 flex justify-end">
                <div className="flex items-center gap-3 bg-slate-800 px-5 py-3 rounded-full border border-slate-700 shadow-inner">
                    <FaClock className="text-2xl text-blue-400" />
                    <span className="text-2xl font-mono font-bold text-slate-100 tracking-wide">
                        {formattedTime}
                    </span>
                </div>
            </div>
        </header>
    );
}

export default KioskHeader;