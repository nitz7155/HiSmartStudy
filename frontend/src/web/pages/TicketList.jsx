import { useEffect, useState } from "react";
import { FaClock, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";
import '../styles/TicketList.css';
import SeatSelector from "../components/SeatSelector";

function TicketList() {
    const navigate = useNavigate();

    const [tickets, setTickets] = useState([]);
    const [choiceTicket, setChoiceTicket] = useState({});
    const [activeType, setActiveType] = useState('time');
    const [selectedId, setSelectedId] = useState(null);
    const [seats, setSeats] = useState([]);
    const [showSeatSelector, setShowSeatSelector] = useState(false);

    const loginCheck = async () => {
        const res = await fetch(`/api/web/me`, { credentials: 'include' });
        if (!res.ok) {
            navigate("/web/login");
            return;
        }
    };

    const getTicketList = async () => {
        const res = await fetch(`/api/web/tickets`);
        const ticketData = await res.json();
        setTickets(ticketData);
    };

    const getSeats = async () => {
        const res = await fetch(`/api/web/seat`);
        const seatData = await res.json();
        setSeats(seatData);
    };

    useEffect(() => {
        loginCheck();
        getTicketList();
        getSeats();
    }, []);

    const timeTickets = tickets.filter(t => t.type === "시간제");
    const dayTickets = tickets.filter(t => t.type === "기간제");

    const handleTicketType = (e) => {
        setActiveType(e.currentTarget.dataset.value);
    };

    const handleClickTicket = (e) => {
        const id = e.currentTarget.dataset.id;
        setSelectedId(id);
        setChoiceTicket(tickets.find(t => String(t.product_id) === id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!choiceTicket.name) {
            alert("구매하실 이용권을 선택하세요");
            return;
        }
        if (!window.confirm(`선택하신 이용권은 ${choiceTicket.name}입니다.\n구매하시겠습니까?`)) return;

        if (choiceTicket.type === "기간제") setShowSeatSelector(true);
        else navigate("/web/payment", { state: { Ticket: choiceTicket } });
    };

    const handleCancel = () => navigate("/web");

    if (showSeatSelector) return (
        <SeatSelector
            choiceTicket={choiceTicket}
            seats={seats}
            onBack={() => setShowSeatSelector(false)}
        />
    );

    return (
        <div className="max-w-6xl mx-auto p-6 text-gray-900 dark:text-white">

            {/* 제목 */}
            <h2 className="text-4xl font-extrabold mb-6">
                이용권 선택
            </h2>

            {/* 타입 선택 */}
            <div className="flex gap-4 mb-8">
                <button
                    data-value="time"
                    onClick={handleTicketType}
                    className={`px-6 py-3 rounded-2xl font-semibold transition 
                        ${activeType === 'time'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                        }`}
                >
                    시간권
                </button>

                <button
                    data-value="day"
                    onClick={handleTicketType}
                    className={`px-6 py-3 rounded-2xl font-semibold transition 
                        ${activeType === 'day'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                        }`}
                >
                    기간권
                </button>
            </div>

            {/* 이용권 리스트 */}
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeType === "time" ? timeTickets : dayTickets).map((ticket) => {
                    const isSelected = selectedId === String(ticket.product_id);

                    return (
                        <li key={ticket.product_id}>
                            <button
                                data-id={ticket.product_id}
                                onClick={handleClickTicket}
                                className={`
                                    w-full h-full relative flex flex-col justify-between p-8 rounded-3xl 
                                    shadow-xl border transition-all duration-200 text-left cursor-pointer 
                                    active:scale-95 
                                    ${isSelected
                                        ? "bg-blue-50 dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500 shadow-blue-900/30"
                                        : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                                    }
                                `}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl"></div>

                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`
                                            inline-flex items-center justify-center w-12 h-12 rounded-2xl transition 
                                            ${isSelected
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-200 dark:bg-slate-700/50 text-blue-400"
                                            }
                                        `}>
                                            <FaClock className="text-xl" />
                                        </span>

                                        <FaCheckCircle
                                            className={`
                                                text-2xl transition 
                                                ${isSelected ? "text-blue-500" : "text-gray-300 dark:text-slate-700"}
                                            `}
                                        />
                                    </div>

                                    <h3 className={`text-2xl font-bold mb-2 ${isSelected ? "text-blue-600 dark:text-white" : ""}`}>
                                        {ticket.name}
                                    </h3>

                                    <div className="flex items-baseline gap-1 mt-4">
                                        <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-300">
                                            {ticket.price.toLocaleString()}
                                        </span>
                                        <span className="text-lg text-gray-500 dark:text-slate-400 font-medium">원</span>
                                    </div>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* 구매 요약 */}
            <div className="mt-8 flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-300 dark:border-slate-700 shadow-inner">
                <div>
                    <p className="text-lg text-gray-700 dark:text-slate-300">
                        이용 기간: <span className="font-semibold text-gray-900 dark:text-white">{choiceTicket.name || ''}</span>
                    </p>
                    <p className="text-lg text-gray-700 dark:text-slate-300">
                        총 금액: <span className="font-semibold text-gray-900 dark:text-white">
                            {choiceTicket.price ? Number(choiceTicket.price).toLocaleString() + "원" : ''}
                        </span>
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        className="px-6 py-3 rounded-2xl bg-red-600 text-white font-semibold"
                        onClick={handleCancel}
                    >
                        취소하기
                    </button>

                    <button
                        className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold"
                        onClick={handleSubmit}
                    >
                        구매하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TicketList;
