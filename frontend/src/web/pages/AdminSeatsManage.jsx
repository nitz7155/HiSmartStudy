import { useEffect, useState, useMemo } from "react";
import { FaChair, FaUser, FaClock, FaCheckCircle, FaDoorOpen, FaSearch, FaRedo, FaToggleOn, FaToggleOff } from "react-icons/fa";
import SeatBox from "../components/SeatBox";

const FLOOR_PLAN = [
  [1, 0, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 0, 51, 52],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54],
  [3, 0, 31, 32, 33, 34, 35, 0, 41, 42, 43, 44, 45, 55, 56],
  [4, 0, 36, 37, 38, 39, 40, 0, 46, 47, 48, 49, 50, 57, 58],
  [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 59, 60],
  [6, 0, 61, 62, 63, 64, 65, 0, 71, 72, 73, 74, 75, 0, 0],
  [7, 0, 66, 67, 68, 69, 70, 0, 76, 77, 78, 79, 80, 0, 91],
  [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 92],
  [9, 0, 11, 12, 13, 14, 15, 0, 81, 82, 83, 84, 85, 0, 93],
  [10, 0, 16, 17, 18, 19, 20, 0, 86, 87, 88, 89, 90, 0, 94],
  [0, 0, 0, 0, 0, 0, 0, -1, 95, 96, 97, 98, 99, 100, 0],
];

export default function AdminSeatsManage() {
  const [data, setData] = useState({ summary: {}, type_stats: [], seats: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPhone, setEditPhone] = useState("");

  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/seats/detail");
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSeats(); }, []);

  const seatMap = useMemo(() => new Map(data.seats.map(s => [s.seat_id, s])), [data.seats]);

  const filteredSeats = useMemo(() => {
    return data.seats.filter((s) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (s.user_name || "").toLowerCase().includes(term) || (s.user_phone || "").includes(term);
    });
  }, [data.seats, searchTerm]);

  const formatTime = (minutes) => {
      if (!minutes && minutes !== 0) return "0분";
      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  };

  const handleSeatClick = (seat) => {
    if (seat.is_occupied) {
        setSelectedMember({
            member_id: seat.member_id,
            name: seat.user_name,
            phone: seat.user_phone,
            login_id: seat.login_id,
            email: seat.email,
            created_at: seat.created_at,
            saved_time_minute: seat.saved_time_minute,
            total_mileage: seat.total_mileage,
            active_todo_count: seat.active_todo_count,
            total_usage_minutes: seat.total_usage_minutes
        });
        setEditPhone(seat.user_phone || "");
        setIsModalOpen(true);
    } else {
        setSelectedSeat(seat);
        setIsControlModalOpen(true);
    }
  };

  // 강제 퇴실 핸들러
  const handleForceCheckout = async () => {
      if (!selectedMember) return;
      
      const confirmMsg = `${selectedMember.name} 님을 강제 퇴실 처리하시겠습니까?\n(진행 중인 사용이 즉시 종료됩니다.)`;
      if (!window.confirm(confirmMsg)) return;

      try {
          const response = await fetch(`/api/admin/members/${selectedMember.member_id}/checkout`, {
              method: 'POST',
              credentials: "include"
          });
          
          if (response.ok) {
              alert("퇴실 처리되었습니다.");
              setIsModalOpen(false); // 모달 닫기
              fetchSeats(); // 좌석 데이터 새로고침
          } else {
              const err = await response.json();
              alert(err.detail || "퇴실 처리 실패");
          }
      } catch (error) {
          console.error("Error:", error);
          alert("서버 통신 오류");
      }
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
              fetchSeats(); 
          } else {
              const err = await response.json();
              alert(err.detail || "수정 실패");
          }
      } catch (error) { console.error("수정 오류:", error); alert("서버 통신 오류"); }
  };

  const toggleSeatStatus = async () => {
      if (!selectedSeat) return;
      const newStatus = !selectedSeat.is_status;
      try {
          const res = await fetch(`/api/admin/seats/${selectedSeat.seat_id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_status: newStatus })
          });
          if (res.ok) {
              alert(newStatus ? "좌석이 활성화되었습니다." : "좌석이 점검 모드로 변경되었습니다.");
              setIsControlModalOpen(false);
              fetchSeats(); 
          } else {
              alert("상태 변경에 실패했습니다.");
          }
      } catch (err) {
          console.error(err);
          alert("서버 오류가 발생했습니다.");
      }
  };

  const renderCell = (cellId, r, c) => {
    const key = `${r}-${c}`;
    // [수정] 빈 공간(0)도 높이(60px)를 가지도록 스타일 추가
    if (cellId === 0) return <div key={key} className="w-full h-full" />;
    
    // [수정] 출입구(-1)도 셀 크기에 맞춰 중앙 정렬되도록 w-full h-full 추가
    if (cellId === -1) return (
      <div key={key} className="w-full h-full flex flex-col items-center justify-center text-slate-500/50">
        <FaDoorOpen size={32} />
        <span className="text-xs font-medium mt-1">EXIT</span>
      </div>
    );

    const seat = seatMap.get(cellId);
    if (!seat) return <div key={key} className="bg-slate-800/30 rounded-xl aspect-square" />;

    return (
      <SeatBox
        key={key}
        seat={seat} // 서버에서 준 user_name, remaining_info가 포함된 객체
        simpleMode={true} // 관리자 상세 모드 활성화
        onClick={handleSeatClick}
        hideSelectText
      />
    );
  };

  const getZoneColor = (type) => {
      switch (type) {
          case 'fix': return "bg-violet-500";
          case 'view': return "bg-blue-400";
          case 'island': return "bg-emerald-400"; 
          case 'corner': return "bg-orange-400";
          case 'easy': return "bg-teal-400";
          default: return "bg-slate-500";
      }
  };

  if (loading) return <div className="flex h-96 items-center justify-center text-slate-400">데이터를 불러오는 중...</div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">좌석 관리</h2>
          <p className="text-sm text-slate-400 mt-1">실시간 좌석 현황 모니터링 및 관리</p>
        </div>
        <button 
          onClick={fetchSeats} 
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          <FaRedo size={14} /> 새로고침
        </button>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="총 좌석" value={`${data.summary.total || 0}석`} icon={<FaChair className="text-slate-400" />} />
        <StatCard title="현재 이용중" value={`${data.summary.used || 0}명`} icon={<FaUser className="text-blue-400" />} />
        <StatCard title="잔여 좌석" value={`${data.summary.remain || 0}석`} icon={<FaCheckCircle className="text-emerald-400" />} />
        <StatCard title="가동률" value={`${data.summary.rate || 0}%`} icon={<FaClock className="text-purple-400" />} />
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* 좌석 배치도 */}
        <div className="xl:col-span-3 bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col min-h-[700px]">
          <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FaChair className="text-indigo-400" /> 실시간 배치도
            </h3>
            <div className="flex gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white border border-slate-400"></div>빈 좌석</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-600 border border-slate-500"></div>사용중</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-900 border border-slate-800"></div>점검</div>
            </div>
          </div>
          
          {/* [수정] 오버플로우 문제 해결을 위해 flex center 대신 margin auto 사용 */}
          <div className="flex-1 bg-slate-900/40 p-8 overflow-auto">
            <div 
               className="grid gap-3 transition-transform duration-300 ease-out origin-center mx-auto"
               style={{ 
                   gridTemplateColumns: `repeat(${FLOOR_PLAN[0].length}, 60px)`,
                   // [수정] 행 높이 강제 지정 (UI 깨짐 방지)
                   gridAutoRows: '60px',
                   width: 'fit-content'
               }}
            >
              {FLOOR_PLAN.map((row, r) => row.map((id, c) => renderCell(id, r, c)))}
            </div>
          </div>
        </div>

        {/* 우측 사이드바 */}
        <div className="space-y-6 xl:col-span-1">
          {/* 구역별 점유율 */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700/50 shadow-lg">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">구역별 점유율</h3>
            <div className="space-y-4">
               {data.type_stats.map((stat) => (
                  <div key={stat.type}>
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-300">{stat.name}</span>
                      <span className="text-slate-400">
                        <span className="text-white">{stat.used}</span> / {stat.total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${getZoneColor(stat.type)}`} 
                        style={{ width: `${stat.rate}%` }}
                      ></div>
                    </div>
                  </div>
               ))}
            </div>
          </div>

          {/* 상세 검색 (목록) */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col h-[500px]">
            <div className="mb-4">
              <h3 className="font-bold text-white text-sm mb-3">상세 검색</h3>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="이름 또는 전화번호 뒷자리"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {filteredSeats.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm">검색 결과가 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {filteredSeats.map((s) => (
                    <div 
                        key={s.seat_id} 
                        className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center hover:bg-slate-700/50 transition-colors cursor-pointer group"
                        onClick={() => handleSeatClick(s)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${s.is_status ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white'}`}>
                          {s.seat_id}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{s.is_occupied ? s.user_name : <span className="text-slate-500 text-xs font-normal">빈 좌석</span>}</p>
                          {s.is_occupied && <p className="text-xs text-slate-400">{s.user_phone}</p>}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-xs font-bold ${s.ticket_type === '기간권' ? 'text-violet-400' : 'text-emerald-400'}`}>
                            {s.ticket_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-center text-xs text-slate-500">
              총 {filteredSeats.length}개의 좌석이 검색되었습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 회원 상세 정보 모달 */}
      {isModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                  <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">회원 상세 정보</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
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
                                  {selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString() : '-'}
                              </div>
                          </div>
                          <div className="col-span-2">
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
                                  {selectedMember.total_mileage?.toLocaleString()} P
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
                          />
                      </div>
                  </div>
                  <div className="p-5 border-t border-slate-700 bg-slate-800/50 flex gap-3">
                      <button onClick={handleForceCheckout} className="px-4 py-2.5 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 rounded-lg transition-colors font-bold whitespace-nowrap">강제 퇴실</button>
                      <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors font-medium">닫기</button>
                      <button onClick={handleSavePhone} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold shadow-lg">저장</button>
                  </div>
              </div>
          </div>
      )}

      {/* 좌석 제어(점검 설정) 모달 */}
      {isControlModalOpen && selectedSeat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                  <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">좌석 설정</h3>
                      <button onClick={() => setIsControlModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>
                  
                  <div className="p-8 flex flex-col items-center text-center space-y-6">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-inner ${selectedSeat.is_status ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {selectedSeat.seat_id}
                      </div>
                      <div>
                          <p className="text-slate-400 text-sm mb-1">현재 상태</p>
                          <p className={`text-xl font-bold ${selectedSeat.is_status ? 'text-emerald-400' : 'text-red-400'}`}>
                              {selectedSeat.is_status ? "사용 가능 (Active)" : "점검중 (Disabled)"}
                          </p>
                      </div>
                      <div className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-slate-400 text-xs mb-3">
                              {selectedSeat.is_status 
                                  ? "이 좌석을 '점검중' 상태로 변경하여 예약을 막습니다." 
                                  : "이 좌석의 점검을 해제하고 다시 '사용 가능' 상태로 변경합니다."}
                          </p>
                          <button 
                              onClick={toggleSeatStatus}
                              className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                  selectedSeat.is_status 
                                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30" 
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30"
                              }`}
                          >
                              {selectedSeat.is_status ? <><FaToggleOff /> 점검 모드로 전환</> : <><FaToggleOn /> 활성화 (점검 해제)</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/50 shadow-lg flex items-center justify-between hover:translate-y-[-2px] transition-transform duration-300">
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-inner">
        {icon}
      </div>
    </div>
  );
}