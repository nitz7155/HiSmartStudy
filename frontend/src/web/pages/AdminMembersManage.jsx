import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const AdminMembersManage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [editPhone, setEditPhone] = useState("");

    const [sortBy, setSortBy] = useState("created_at");

    // 시간 포맷팅 유틸
    const formatTime = (minutes) => {
        if (!minutes) return "0분";
        const h = Math.floor(minutes / 60);
        const m = Math.floor(minutes % 60);
        return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
    };

    const fetchMembers = async (search = "") => {
        setLoading(true);
        try {
            const url = search 
                ? `/api/admin/members?search=${encodeURIComponent(search)}` 
                : '/api/admin/members';
            
            const response = await fetch(url, { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                setMembers(data);
            }
        } catch (error) {
            console.error("회원 로딩 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const query = searchParams.get("search") || "";
        setSearchTerm(query);
        fetchMembers(query);
    }, [searchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams({ search: searchTerm });
    };

    // 정렬 로직 함수
    const getSortedMembers = () => {
        const sorted = [...members];
        switch (sortBy) {
            case "name": // 이름순 (가나다)
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case "saved_time": // 남은 시간 많은 순 (내림차순)
                return sorted.sort((a, b) => b.saved_time_minute - a.saved_time_minute);
            case "usage_time": // 총 이용 시간 많은 순 (내림차순)
                return sorted.sort((a, b) => b.total_usage_minutes - a.total_usage_minutes);
            case "created_at": // 가입일 최근 순 (내림차순)
            default:
                return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    };

    // 렌더링 시 정렬된 리스트 사용
    const sortedMembers = getSortedMembers();

    // 상세 모달 열기
    const openEditModal = (member) => {
        setSelectedMember(member);
        setEditPhone(member.phone || "");
        setIsModalOpen(true);
    };

    const handleSavePhone = async () => {
        if (!selectedMember) return;
        if (!editPhone.trim()) { alert("전화번호를 입력해주세요."); return; }
        try {
            const response = await fetch(`/api/admin/members/${selectedMember.member_id}/phone`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: editPhone }),
                credentials: "include"
            });
            if (response.ok) {
                alert("수정되었습니다.");
                setIsModalOpen(false);
                fetchMembers(searchParams.get("search") || ""); 
            } else {
                const err = await response.json();
                alert(err.detail || "수정 실패");
            }
        } catch (error) { console.error("수정 오류:", error); alert("서버 통신 오류"); }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* 상단: 제목 및 검색 */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-200">회원 관리</h2>
                
                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="이름 또는 전화번호 검색"
                        className="bg-slate-800 border border-slate-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 w-full md:w-64"
                    />
                    <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        검색
                    </button>
                </form>
            </div>

            {/* 정렬 필터 버튼 영역 */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: "created_at", label: "가입일 최근 순" },
                    { key: "name", label: "이름순" },
                    { key: "saved_time", label: "남은 시간 많은 순" },
                    { key: "usage_time", label: "총 이용 시간 많은 순" },
                ].map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            sortBy === opt.key
                                ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                                : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* 회원 목록 테이블 */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                                <th className="p-4 font-medium w-20">ID</th>
                                <th className="p-4 font-medium w-32">이름</th>
                                <th className="p-4 font-medium w-40">전화번호</th>
                                <th className="p-4 font-medium w-32">남은 시간</th>
                                <th className="p-4 font-medium w-32">마일리지</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-slate-300 text-sm">
                            {sortedMembers.map(member => (
                                <tr 
                                    key={member.member_id} 
                                    onClick={() => openEditModal(member)} 
                                    className="hover:bg-slate-700/40 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 text-slate-500 group-hover:text-slate-400">#{member.member_id}</td>
                                    <td className="p-4 font-bold text-white group-hover:text-indigo-300 transition-colors">{member.name}</td>
                                    <td className="p-4 font-mono text-slate-400">{member.phone}</td>
                                    <td className="p-4 text-emerald-400 font-medium">
                                        {formatTime(member.saved_time_minute)}
                                    </td>
                                    <td className="p-4">{member.total_mileage.toLocaleString()} P</td>
                                </tr>
                            ))}
                            {sortedMembers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-500">
                                        검색된 회원이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 회원 상세 정보 및 수정 모달 */}
            {isModalOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">회원 상세 정보</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">회원 ID</label>
                                    <div className="text-slate-300">#{selectedMember.member_id}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">이름</label>
                                    <div className="text-white font-bold">{selectedMember.name}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">로그인 ID</label>
                                    <div className="text-slate-300">{selectedMember.login_id || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">가입일</label>
                                    <div className="text-slate-300">
                                        {new Date(selectedMember.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">이메일</label>
                                    <div className="text-slate-300 truncate">{selectedMember.email || '-'}</div>
                                </div>
                            </div>

                            <hr className="border-slate-700/50" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">남은 시간</label>
                                    <div className="text-emerald-400 font-bold text-lg">
                                        {formatTime(selectedMember.saved_time_minute)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">마일리지</label>
                                    <div className="text-indigo-400 font-bold text-lg">
                                        {selectedMember.total_mileage.toLocaleString()} P
                                    </div>
                                </div>
                                
                                <div className="col-span-2">
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">진행 중인 목표(Todo)</label>
                                    <div className="text-orange-400 font-bold text-lg">
                                        {selectedMember.active_todo_count} 개
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-slate-500 text-xs font-semibold mb-1 uppercase">총 이용 시간</label>
                                    <div className="text-slate-200 font-medium">
                                        {formatTime(selectedMember.total_usage_minutes)}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-700/50" />

                            <div>
                                <label className="block text-indigo-400 text-xs font-semibold mb-1.5 uppercase">전화번호</label>
                                <input 
                                    type="text" 
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="010-0000-0000"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-700 bg-slate-800/50 flex gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors font-medium"
                            >
                                닫기
                            </button>
                            <button 
                                onClick={handleSavePhone}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-indigo-900/30"
                            >
                                정보 수정 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMembersManage;