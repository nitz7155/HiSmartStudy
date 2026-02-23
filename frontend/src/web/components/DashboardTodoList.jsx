import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DashboardTodoList = () => {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchTodos();
    }, []);

    if (loading) {
        return (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700/50 shadow-lg h-80 flex flex-col">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <Link to="/admin/todos" className="group flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-1">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <span className="group-hover:text-indigo-300 transition-colors">Todo 현황</span>
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-300 transition-colors pt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </h3>
                </Link>
                <span className="text-xs text-slate-400">총 {todos.length}개 진행 중</span>
            </div>

            {/* 리스트 영역 */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {todos.length > 0 ? (
                    todos.map(todo => (
                        <div key={todo.todo_id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center hover:bg-slate-700/50 transition-colors group">
                            <div className="flex flex-col gap-1 min-w-0 mr-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap border ${
                                        todo.todo_type === 'attendance' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                        {todo.todo_type === 'attendance' ? '출석' : '시간'}
                                    </span>
                                    <span className="text-slate-200 font-medium truncate text-sm group-hover:text-indigo-300 transition-colors">
                                        {todo.todo_title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>목표: {todo.todo_value}{todo.todo_type === 'attendance' ? '일' : '시간'}</span>
                                    <span className="w-0.5 h-0.5 bg-slate-600 rounded-full"></span>
                                    <span>{todo.betting_mileage.toLocaleString()}P</span>
                                </div>
                            </div>
                            
                            {/* 참가자 수 */}
                            <div className="text-right shrink-0 bg-slate-900/50 px-2.5 py-1.5 rounded-md border border-slate-700/30">
                                <span className="block text-[10px] text-slate-500 mb-0.5">참가자</span>
                                <div className="flex items-end justify-end gap-0.5">
                                    <span className="text-indigo-400 font-bold text-sm leading-none">{todo.participant_count}</span>
                                    <span className="text-slate-500 text-[10px] leading-none">명</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p>등록된 Todo가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardTodoList;