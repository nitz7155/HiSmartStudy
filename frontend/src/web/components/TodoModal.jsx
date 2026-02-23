import { useState } from "react";

export default function TodoSelectModal({ isOpen, onClose, todoList }) {
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedId) {
            alert("도전과제를 선택해주세요");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/web/mypage/todo/select`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ todo_id: selectedId }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert("요청 실패: " + data.message);
            } else {
                alert("도전과제가 선택되었습니다.");
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert("서버 오류 발생");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="h-screen fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <div
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-11/12 max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold mb-4">도전과제 선택</h2>

                {/* 카드 리스트 */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {todoList.map((todo) => (
                        <label
                            key={todo.todo_id}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition 
                                ${selectedId === todo.todo_id
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-gray-300 dark:border-gray-700"}`}
                        >
                            <input
                                type="radio"
                                name="todo"
                                value={todo.todo_id}
                                checked={selectedId === todo.todo_id}
                                onChange={() => setSelectedId(todo.todo_id)}
                                className="w-5 h-5 text-blue-500"
                            />

                            <div>
                                <p className="text-lg font-semibold">{todo.todo_title}</p>
                                <pre className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    {todo.todo_content}
                                </pre>
                            </div>
                        </label>
                    ))}
                </div>

                {/* 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                    {loading ? "전송 중..." : "선택 완료"}
                </button>

                <button
                    onClick={onClose}
                    className="mt-2 w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-xl cursor-pointer"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
