//
import { FaExclamationCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

/**
 * @param {function} onConfirm - 확인/강제진행 버튼 클릭 시 실행될 함수
 * @param {string} confirmText - 확인 버튼 텍스트 (기본: "확인")
 * @param {boolean} showCancel - 취소(다시 확인) 버튼 표시 여부 (기본: true)
 */
function KioskAlertModal({ 
    isOpen, onClose, title, message, type = "warning", 
    imageUrl, onConfirm, confirmText, showCancel = true 
}) {
    if (!isOpen) return null;

    const config = {
        warning: {
            icon: <FaExclamationCircle className="text-6xl text-amber-500" />,
            btnColor: "bg-amber-600 hover:bg-amber-500 border-amber-500",
        },
        error: {
            icon: <FaTimesCircle className="text-6xl text-rose-500" />,
            btnColor: "bg-rose-600 hover:bg-rose-500 border-rose-500",
        },
        success: {
            icon: <FaCheckCircle className="text-6xl text-emerald-500" />,
            btnColor: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500",
        },
    };

    const currentConfig = config[type] || config.warning;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-[500px] bg-slate-800 border-2 border-slate-600 rounded-[2rem] p-8 flex flex-col items-center shadow-2xl animate-scaleUp">
                
                <div className="mb-6 drop-shadow-lg">
                    {currentConfig.icon}
                </div>

                <h3 className="text-2xl font-bold text-white mb-3 text-center">
                    {title}
                </h3>

                {imageUrl && (
                    <div className="w-full mb-6 rounded-xl overflow-hidden border-2 border-slate-500 shadow-inner bg-black">
                        <img 
                            src={`http://localhost:8000${imageUrl}`} 
                            alt="확인된 이미지" 
                            className="w-full h-48 object-contain" 
                        />
                    </div>
                )}
                <p className="text-slate-300 text-lg text-center mb-8 whitespace-pre-wrap leading-relaxed">
                    {message}
                </p>

                <div className="flex w-full gap-4">
                    {/* [수정] onConfirm이 있고 showCancel이 true일 때만 취소 버튼 표시 */}
                    {onConfirm && showCancel && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-xl text-xl font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 transition-transform active:scale-95"
                        >
                            다시 확인
                        </button>
                    )}
                    
                    {/* [수정] 메인 버튼: onConfirm 유무에 따라 동작 결정 */}
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-4 rounded-xl text-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${currentConfig.btnColor}`}
                    >
                        {onConfirm ? (confirmText || "확인했습니다") : "확인"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default KioskAlertModal;