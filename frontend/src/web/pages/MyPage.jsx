import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import StudyTimeSummary from "../components/StudyTimeSummary";
import SeatAnalysis from "../components/SeatAnalysis";
import FocusAnalysis from "../components/FocusAnalysis";
import TodoProgress from "../components/TodoProgress";
import TodoModal from "../components/TodoModal";

function MyPage() {
    const navigate = useNavigate();

    const [todo, setTodo] = useState({});
    const [todoList, setTodoList] = useState([]);
    const [showTodoModal, setShowTodoModal] = useState(false);
    const [seatData, setSeatData] = useState("");
    const [studyData, setStudyData] = useState("");
    const [focusData, setFocusData] = useState("");
    const [focusPattern, setFocusPattern] = useState("");

    const loginCheck = async () => {
        const res = await fetch(`/api/web/mypage`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            
            getSeatList(data.user.member_id);
            getStudySummary(data.user.member_id);
            getFocusAnlisis(data.user.member_id);
            getFocusPattern(data.user.member_id);

            if (data.todo) {
                setTodo({
                    "name": data.todo.todo_name,
                    "target_value": data.todo.target_value,
                    "current_value": data.todo.current_value,
                    "type": data.todo.todo_type,
                    "achieved": data.todo.is_achieved
                });
            } else {
                const res = await fetch(`/api/web/mypage/todo/selected`, { credentials: 'include' });
                const data = await res.json();
                setTodoList(data);
                setShowTodoModal(true);
            }


        } else {
            navigate('/web');
        }
    };

    useEffect(() => {
        loginCheck();
    }, []);

    const getSeatList = async (user_id) => {
        const res = await fetch(`/api/statics/seats?member_id=${user_id}`, { credentials: 'include' });

        if (res.ok) {
            const data = await res.json();
            setSeatData(data);
            // console.log(data);
        }
    }

    const getStudySummary = async (user_id) => {
        const res = await fetch(`/api/statics/times?member_id=${user_id}`, { credentials: 'include' });

        if (res.ok) {
            const data = await res.json();
            setStudyData(data);
            // console.log(data);
        }
    }

    const getFocusAnlisis = async (user_id) => {
        const res = await fetch(`/api/statics/seat/analysis?member_id=${user_id}`, { credentials: 'include' });

        if (res.ok) {
            const data = await res.json();
            setFocusData(data);
            // console.log(data);
        }
    }
    const getFocusPattern = async (user_id) => {
        const res = await fetch(`/api/statics/seat/pattern?member_id=${user_id}`, { credentials: 'include' });

        if (res.ok) {
            const data = await res.json();
            setFocusPattern(data);
            // console.log(data);
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0);
        if (showTodoModal && todoList.length > 0) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showTodoModal]);

    return (
        <div className="p-4 space-y-8 bg-[#f0f4f8] dark:bg-slate-900 text-blue-1000 dark:text-blue-300 transition-colors">

            {showTodoModal && todoList.length > 0 && (
                <TodoModal
                    isOpen={showTodoModal}
                    onClose={() => setShowTodoModal(false)}
                    todoList={todoList}
                />
            )}

            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold">마이페이지</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    학습 패턴과 좌석 취향을 분석해보세요
                </p>
            </div>

            {!showTodoModal && (
                <TodoProgress todo={todo} />
            )}

            {/* Background Section */}
            <div className="transition-colors min-h-screen rounded-xl">
                <div className="grid grid-cols-3 gap-6">

                    {/* LEFT 2 columns */}
                    <div className="col-span-2 flex flex-col gap-6">
                        <StudyTimeSummary studyData={studyData} changeData={focusData.weekly_change} />
                        <SeatAnalysis
                            topSeats={seatData?.frequently_seat_use ?? []}
                            message={seatData?.message}
                            preferences={seatData?.seat_attr}
                        />

                    </div>

                    {/* RIGHT 1 column */}
                    <div className="col-span-1 flex flex-col gap-6">
                        <FocusAnalysis focusData={focusData} focusPattern={focusPattern} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MyPage;
