import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaHome } from "react-icons/fa";

function PaymentSuccess() {
    const location = useLocation();
    const navigate = useNavigate();
    const { ticket, seat, order } = location.state;

    return (
        <div className="w-full min-h-screen flex flex-col justify-center items-center 
                        bg-gray-100 dark:bg-slate-900 
                        p-6 
                        text-gray-900 dark:text-white 
                        transition-colors duration-300">

            {/* 완료 아이콘 & 메시지 */}
            <div className="flex flex-col items-center mb-8">
                <FaCheckCircle className="
                    text-9xl 
                    text-violet-600 dark:text-violet-500 
                    mb-4 
                    drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]
                " />
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-gray-900 dark:text-white">
                    결제가 완료되었습니다!
                </h1>
                <p className="text-gray-600 dark:text-slate-400 text-lg">
                    이용권이 정상적으로 발급되었습니다.
                </p>
            </div>

            {/* 주문 정보 */}
            <div className="
                w-full max-w-md 
                bg-white dark:bg-slate-800 
                rounded-xl 
                shadow-xl 
                p-6 
                mb-8 
                border border-gray-300 dark:border-slate-700 
                flex flex-col space-y-4
                transition-colors
            ">
                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>티켓정보</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        [{ticket.type}] {ticket.name}
                    </span>
                </div>

                {seat && (
                    <div className="flex justify-between text-gray-700 dark:text-slate-300">
                        <span>좌석</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {seat.seat_id}
                        </span>
                    </div>
                )}

                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>티켓가격</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {Number(ticket.price).toLocaleString()}원
                    </span>
                </div>

                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>사용 마일리지</span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400">
                        {Number(ticket.price - order.payment_amount).toLocaleString()}원
                    </span>
                </div>

                <div className="
                    border-t border-gray-300 dark:border-slate-700 
                    pt-4 
                    flex justify-between 
                    font-extrabold text-xl
                ">
                    <span className="text-gray-900 dark:text-white">총 결제금액</span>
                    <span className="text-violet-700 dark:text-violet-400">
                        {Number(order.payment_amount).toLocaleString()}원
                    </span>
                </div>
            </div>

            {/* 메인으로 이동 버튼 */}
            <button
                onClick={() => navigate("/web")}
                className="
                    flex items-center gap-2 
                    px-8 py-3 
                    rounded-xl 
                    font-bold 
                    transition-all duration-200 
                    active:scale-[0.98]
                    
                    bg-violet-600 hover:bg-violet-500 
                    dark:bg-violet-700 dark:hover:bg-violet-600

                    text-white 
                    shadow-lg shadow-violet-300/50 
                    dark:shadow-violet-900/40
                "
            >
                <FaHome />
                메인으로 돌아가기
            </button>
        </div>
    );
}

export default PaymentSuccess;
