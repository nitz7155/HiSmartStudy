import React, { useEffect, useState } from 'react';

const AdminTodoManage = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // 폼 데이터 상태
    const [formData, setFormData] = useState({
        todo_id: null,
        todo_type: 'attendance',
        todo_title: '',
        todo_content: '',
        todo_value: 0,
        betting_mileage: 0,
        payback_mileage_percent: 0,
        is_exposed: true
    });

    // 목록 불러오기
    const fetchTodos = async () => {
        try {
            const response = await fetch('/api/admin/todos', { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                setTodos(data);
            }
        } catch (error) {
            console.error("TODO 로딩 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    // 모달 열기
    const openModal = (todo = null) => {
        if (todo) {
            setIsEditMode(true);
            setFormData({ ...todo });
        } else {
            setIsEditMode(false);
            setFormData({
                todo_id: null,
                todo_type: 'attendance',
                todo_title: '',
                todo_content: '',
                todo_value: 1,
                betting_mileage: 100,
                payback_mileage_percent: 110,
                is_exposed: true
            });
        }
        setIsModalOpen(true);
    };

    // 저장 핸들러
    const handleSave = async () => {
        const url = isEditMode ? `/api/admin/todos/${formData.todo_id}` : '/api/admin/todos';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: "include"
            });

            if (response.ok) {
                alert(isEditMode ? "수정되었습니다." : "생성되었습니다.");
                setIsModalOpen(false);
                fetchTodos(); 
            } else {
                alert("저장에 실패했습니다.");
            }
        } catch (error) {
            console.error("저장 오류:", error);
        }
    };

    // 삭제 핸들러
    const handleDelete = async (todoId) => {
        if (!window.confirm("정말로 이 Todo를 삭제하시겠습니까?\n참여 중인 사용자가 있을 경우 데이터가 함께 삭제될 수 있습니다.")) return;

        try {
            const response = await fetch(`/api/admin/todos/${todoId}`, {
                method: 'DELETE',
                credentials: "include"
            });

            if (response.ok) {
                alert("삭제되었습니다.");
                fetchTodos(); 
            } else {
                const errorData = await response.json();
                alert(`삭제 실패: ${errorData.detail || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error("삭제 오류:", error);
            alert("서버 통신 중 오류가 발생했습니다.");
        }
    };

    // 입력 핸들러
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-200">Todo 관리</h2>
                <button 
                    onClick={() => openModal()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    새 Todo 만들기
                </button>
            </div>

            {/* TODO 목록 테이블 */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                            <th className="p-4 font-medium w-28">타입</th>
                            <th className="p-4 font-medium">제목</th>
                            <th className="p-4 font-medium w-32">목표값</th>
                            <th className="p-4 font-medium w-24">참가자</th>
                            <th className="p-4 font-medium w-24">달성자</th>
                            <th className="p-4 font-medium w-32">참가비용</th>
                            <th className="p-4 font-medium w-28">페이백(%)</th>
                            <th className="p-4 font-medium w-24 text-center">노출</th>
                            <th className="p-4 font-medium w-40 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-slate-300 text-sm">
                        {todos.map(todo => (
                            <tr key={todo.todo_id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="p-4">
                                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap ${
                                        todo.todo_type === 'attendance' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                        {todo.todo_type === 'attendance' ? '출석' : '이용시간'}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-white">
                                    {todo.todo_title}
                                    <div className="text-xs text-slate-500 font-normal mt-0.5 truncate max-w-xs">{todo.todo_content}</div>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <span className="font-semibold text-slate-200">{todo.todo_value}</span>
                                    <span className="text-slate-500 ml-1 whitespace-nowrap">{todo.todo_type === 'attendance' ? '일' : '시간'}</span>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <span className="font-bold text-slate-200">{todo.participant_count}</span>
                                    <span className="text-slate-500 ml-1">명</span>
                                </td>
                                
                                {/* 달성자 수 표시 */}
                                <td className="p-4 whitespace-nowrap">
                                    <span className="font-bold text-emerald-400">{todo.achievement_count || 0}</span>
                                    <span className="text-slate-500 ml-1">명</span>
                                </td>

                                <td className="p-4 text-slate-400 whitespace-nowrap">{todo.betting_mileage.toLocaleString()} P</td>
                                <td className="p-4 text-indigo-400 font-semibold">{todo.payback_mileage_percent}%</td>
                                <td className="p-4 text-center">
                                    <div className={`w-2.5 h-2.5 rounded-full mx-auto ${todo.is_exposed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                        <button 
                                            onClick={() => openModal(todo)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-xs font-medium"
                                        >
                                            수정
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(todo.todo_id)}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs font-medium border border-red-500/20"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {todos.length === 0 && !loading && (
                            <tr>
                                <td colSpan="9" className="p-12 text-center text-slate-500">등록된 Todo가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-xl font-bold text-white">
                                {isEditMode ? 'Todo 수정' : '새 Todo 만들기'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">유형</label>
                                    <select 
                                        name="todo_type"
                                        value={formData.todo_type}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    >
                                        <option value="attendance">📅 출석형</option>
                                        <option value="time">⏰ 시간형</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                                        목표값 <span className="text-slate-500 font-normal">({formData.todo_type === 'attendance' ? '일수' : '시간'})</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        name="todo_value"
                                        value={formData.todo_value}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="숫자 입력"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">제목</label>
                                <input 
                                    type="text" 
                                    name="todo_title"
                                    value={formData.todo_title}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="예: 일주일 개근 도전!"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">상세 내용</label>
                                <textarea 
                                    name="todo_content"
                                    value={formData.todo_content}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                                    placeholder="사용자에게 보여질 설명"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">참가 비용 (P)</label>
                                    <input 
                                        type="number" 
                                        name="betting_mileage"
                                        value={formData.betting_mileage}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">페이백 비율 (%)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            name="payback_mileage_percent"
                                            value={formData.payback_mileage_percent}
                                            onChange={handleChange}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pr-8"
                                        />
                                        <span className="absolute right-3 top-3 text-slate-500">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3 flex justify-between items-center text-sm">
                                <span className="text-indigo-200">성공 시 예상 보상</span>
                                <span className="font-bold text-indigo-400">
                                    {Math.floor(formData.betting_mileage * (formData.payback_mileage_percent / 100)).toLocaleString()} P
                                </span>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <label className="text-slate-300 text-sm font-medium flex-1">사용자 페이지 노출</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="is_exposed"
                                        checked={formData.is_exposed}
                                        onChange={handleChange}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors font-medium"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-indigo-900/30"
                            >
                                {isEditMode ? '수정 저장' : '생성하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTodoManage;