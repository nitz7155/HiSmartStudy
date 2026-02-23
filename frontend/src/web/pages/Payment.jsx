import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Payments() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);

    const { Ticket, SelectSeat } = location.state;
    const [selectedFixedSeat] = useState(!!SelectSeat);
    const [point, setPoint] = useState(0);

    const ticket = { ...Ticket };
    const totalPrice = ticket.price - point;

    const [user, setUser] = useState({
        name: "",
        email: "",
        phone: "",
        mileage: 0
    });

    const getUserData = async () => {
        const response = await fetch(`/api/web/me`, { credentials: "include" });
        const data = await response.json();
        setUser({
            name: data.name,
            email: data.email,
            phone: data.phone,
            mileage: data.total_mileage
        });
    };

    useEffect(() => {
        getUserData();
    }, []);

    // 이름/이메일 변경
    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser((prev) => ({ ...prev, [name]: value }));
    };

    // 전화번호 변경
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, "");

        let formattedPhone = "";
        if (value.length <= 3) formattedPhone = value;
        else if (value.length <= 7) formattedPhone = `${value.slice(0, 3)}-${value.slice(3)}`;
        else formattedPhone = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;

        setUser((prev) => ({ ...prev, phone: formattedPhone }));
    };

    // 마일리지 입력
    const handlePointChange = (e) => {
        const val = Number(e.target.value);
        if (val < 0) return;
        if (val <= user.mileage) setPoint(val);
        else alert("사용 가능한 마일리지보다 큰 값은 입력할 수 없습니다.");
    };

    // 전액 사용
    const handleUseAllPoint = () => {
        if (ticket.price > user.mileage) setPoint(user.mileage);
        else setPoint(ticket.price);
    };

    // 결제 처리
    const handleSubmit = async (e) => {
        e.preventDefault();

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const nameRegex = /^[가-힣A-Za-z]{2,20}$/;
        const phoneRegex = /^01[016789]-\d{3,4}-\d{4}$/;

        if (!nameRegex.test(user.name)) return alert("유효한 이름을 입력하세요.");
        if (!phoneRegex.test(user.phone)) return alert("전화번호 형식이 올바르지 않습니다.");
        if (!emailRegex.test(user.email)) return alert("유효한 이메일 주소를 입력하세요.");

        const ticketData = { ...ticket, total_amount: totalPrice };
        const resData = { user, ticketData, ...(SelectSeat && { SelectSeat }) };

        setIsLoading(true);

        setTimeout(async () => {
            try {
                const res = await fetch("/api/web/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(resData)
                });

                if (res.ok) {
                    const result = await res.json();
                    navigate("/web/payment/success", {
                        state: { ticket, seat: SelectSeat, order: result }
                    });
                } else {
                    const errorData = await res.json();
                    alert(errorData.detail);
                    navigate("/web/ticket");
                }
            } catch (err) {
                console.error(err);
                alert("결제 요청 중 오류가 발생했습니다.");
                navigate("/web/ticket");
            }
        }, 3000);



    };

    return (
        <div className="
            max-w-4xl mx-auto p-6 rounded-3xl shadow-2xl space-y-6
            bg-white text-gray-900 
            dark:bg-slate-900 dark:text-white
            transition-colors
        ">
            {/* 상품 정보 */}
            <div className="
                p-6 rounded-2xl border shadow-inner
                bg-gray-100 border-gray-300
                dark:bg-slate-800 dark:border-slate-700
            ">
                <h2 className="text-2xl font-bold mb-2">상품 정보</h2>
                <p className="text-lg">[{ticket.type}] {ticket.name}</p>
            </div>

            {/* 좌석 정보 */}
            {selectedFixedSeat && (
                <div className="
                    p-6 rounded-2xl border shadow-inner
                    bg-gray-100 border-gray-300
                    dark:bg-slate-800 dark:border-slate-700
                ">
                    <h2 className="text-2xl font-bold mb-2">좌석 정보</h2>
                    <p className="text-lg">선택한 좌석 : {SelectSeat.seat_id}번</p>
                </div>
            )}

            {/* 주문자 정보 */}
            <div className="
                p-6 rounded-2xl border shadow-inner
                bg-gray-100 border-gray-300
                dark:bg-slate-800 dark:border-slate-700
            ">
                <h2 className="text-2xl font-bold mb-4">주문자 정보</h2>

                <form className="flex flex-col gap-4">
                    <input
                        type="text"
                        name="name"
                        placeholder="이름 입력"
                        value={user.name}
                        onChange={handleChange}
                        className="
                            p-3 rounded-xl border 
                            bg-white text-gray-900 border-gray-300
                            focus:ring-2 focus:ring-blue-500
                            dark:bg-slate-700 dark:text-white dark:border-slate-600
                        "
                    />
                    <input
                        type="tel"
                        name="phone"
                        placeholder="전화번호 (010-1234-5678)"
                        value={user.phone}
                        maxLength={13}
                        onChange={handlePhoneChange}
                        className="
                            p-3 rounded-xl border 
                            bg-white text-gray-900 border-gray-300
                            focus:ring-2 focus:ring-blue-500
                            dark:bg-slate-700 dark:text-white dark:border-slate-600
                        "
                    />
                    <input
                        type="text"
                        name="email"
                        placeholder="이메일"
                        value={user.email}
                        onChange={handleChange}
                        className="
                            p-3 rounded-xl border 
                            bg-white text-gray-900 border-gray-300
                            focus:ring-2 focus:ring-blue-500
                            dark:bg-slate-700 dark:text-white dark:border-slate-600
                        "
                    />
                </form>
            </div>

            {/* 포인트 사용 */}
            <div className="
                p-6 rounded-2xl border shadow-inner
                bg-gray-100 border-gray-300
                dark:bg-slate-800 dark:border-slate-700
            ">
                <h2 className="text-2xl font-bold mb-2">포인트 사용</h2>

                <p className="text-lg mb-2">
                    사용 가능 포인트:{" "}
                    <span className="font-semibold">
                        {Number(user.mileage).toLocaleString()}점
                    </span>
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUseAllPoint}
                        className="
                            px-4 py-2 rounded-xl font-semibold text-white
                            bg-blue-600 hover:bg-blue-500
                        "
                    >
                        전액사용
                    </button>

                    <input
                        type="number"
                        className="
                            p-2 rounded-xl w-24 text-right border
                            bg-white text-gray-900 border-gray-300
                            dark:bg-slate-700 dark:text-white dark:border-slate-600
                        "
                        value={point}
                        onChange={handlePointChange}
                    />
                    <span>원</span>
                </div>
            </div>

            {/* 결제 요약 */}
            <div className="
                p-6 rounded-2xl border shadow-inner text-lg space-y-1
                bg-gray-100 border-gray-300
                dark:bg-slate-800 dark:border-slate-700
            ">
                <p>상품 금액: <span className="font-semibold">{ticket.price.toLocaleString()}원</span></p>
                <p>사용 마일리지: <span className="font-semibold">{point.toLocaleString()}원</span></p>
                <p>총 결제 금액: <span className="font-semibold">{totalPrice.toLocaleString()}원</span></p>
            </div>

            {/* 결제 버튼 */}
            <button
                onClick={handleSubmit}
                className="
                    w-full py-4 rounded-2xl font-bold text-xl shadow-lg
                    bg-blue-600 text-white hover:bg-blue-500 
                    active:scale-95 transition
                "
            >
                {isLoading ? "결제 처리 중..." : "결제하기"}
            </button>
        </div>
    );
}

export default Payments;
