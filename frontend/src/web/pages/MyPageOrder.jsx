import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function MyPageOrder() {
    const navigate = useNavigate();

    const [orderList, setOrderList] = useState([]);
    const [showAllOrder, setShowAllOrder] = useState(false);
    const visibleOrders = showAllOrder ? orderList : orderList.slice(0, 5);

    const loginCheck = async () => {
        const res = await fetch(`/api/web/me`, { credentials: 'include' });
        if (!res.ok) {
            navigate("/web/login");
            return;
        }
    };

    const getOrderList = async () => {
        const res = await fetch(`/api/web/mypage/orders`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setOrderList(data);
        }
    };


    const formatPrice = (input) =>
        Number(input).toLocaleString("ko-KR") + "원";

    const formattedDate = (input) =>
        new Date(input).toLocaleDateString("ko-KR").replace(/\.$/, "");

    const formattedDateTime = (input) => {
        const data = new Date(input);
        const year = data.getFullYear();
        const month = String(data.getMonth() + 1).padStart(2, "0");
        const date = String(data.getDate()).padStart(2, "0");
        const time = data.toLocaleTimeString("ko-KR", { hour12: false });
        return `${year}년 ${month}월 ${date}일 ${time}`;
    };

    // const formattedSavetime = (input) => {
    //     const h = Math.floor(input / 60);
    //     const m = input % 60;
    //     return `${h}시간 ${m}분`;
    // };

    useEffect(() => {
        loginCheck();
        getOrderList();
    }, []);


    return (
        <div className="p-4 space-y-8 bg-[#f0f4f8] dark:bg-slate-900 text-blue-1000 dark:text-blue-300 transition-colors">
            {/* Order List */}
            <div className="space-y-4">
                <h1 className="text-3xl font-bold">주문목록</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    이전에 이용했던 상품과 좌석 정보를 한눈에 확인해보세요.
                </p>

                {orderList.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                        주문 목록이 없습니다.
                    </p>
                ) : (
                    <>
                        <ul className="space-y-4">
                            {visibleOrders.map((order) => {
                                const isActive = order.is_check_in === false && new Date(order.expiry_date) > new Date();
                                const isUsing = order.is_check_in === true && new Date(order.expiry_date) > new Date();
                                const isExpired = !order.expiry_date || new Date(order.expiry_date) <= new Date();

                                return (
                                    <li
                                        key={order.order_id}
                                        className="relative bg-white dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 rounded-xl p-5 shadow-sm transition-colors"
                                    >
                                        {/* Status Badge */}
                                        <div className="absolute top-4 left-0 right-0 px-5 flex justify-between items-center">
                                            {isActive ? (
                                                <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded-md">사용가능</span>
                                            ) : isUsing ? (
                                                <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded-md">사용중</span>
                                            ) : (
                                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md">사용완료</span>
                                            )}

                                            {(isActive || isUsing) ? (
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {formattedDate(order.expiry_date)}까지 이용가능
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {order.check_in_time ? formattedDateTime(order.check_in_time) : ""}
                                                </span>
                                            )}
                                        </div>

                                        {/* 주문 정보 */}
                                        <div className="flex justify-between items-center pt-10">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">주문번호</p>
                                            <p className="font-medium">{order.order_id}</p>
                                        </div>

                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">구매일자</p>
                                            <p className="font-medium">{formattedDate(order.order_date)}</p>
                                        </div>

                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">구매 이용권</p>
                                            <p className="font-medium">{`[${order.ticket_type}] ${order.ticket_name}`}</p>
                                        </div>

                                        {order.ticket_type === "기간제" && (
                                            <div className="flex justify-between items-center mt-3">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">선택 좌석</p>
                                                <p className="font-medium">{order.seat_id}번</p>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">사용 마일리지</p>
                                            <p className="font-medium">
                                                {formatPrice(order.ticket_price - order.payment_amount)}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-center mt-4">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">총 결제금액</p>
                                            <p className="text-xl font-bold text-blue-500 dark:text-blue-300">
                                                {formatPrice(order.payment_amount)}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                {orderList.length > 5 && (
                    <button
                        className="w-full py-2 mt-2 text-center text-blue-600 dark:text-blue-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => setShowAllOrder((prev) => !prev)}
                    >
                        {showAllOrder ? "접기 ▲" : "더보기 ▼"}
                    </button>
                )}

            </div>
        </div >
    )
}