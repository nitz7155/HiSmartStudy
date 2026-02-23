import { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuthCookieStore } from '../../utils/useAuthStores.js'; // 경로 확인 필요
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Planner = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const scrollRef = useRef(null);
    const chatContainerRef = useRef(null); // 채팅 스크롤용 ref
    const [events, setEvents] = useState([]); // 초기값 빈 배열 (또는 API fetch 필요)
    const [attendanceData, setAttendanceData] = useState([]); // 가데이터
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '', date: '', startH: '09', startM: '00', endH: '10', endM: '00', color: 'blue', description: ''
    });
    const [messages, setMessages] = useState([{ id: 1, sender: 'ai', text: '학습 계획을 도와드릴까요?' }]);
    const [chatInput, setChatInput] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const navigate = useNavigate();
    const { member, fetchMember, isLoading: isAuthLoading } = useAuthCookieStore();
    const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);
    const ROW_HEIGHT = 64;

    // --- 아이콘 컴포넌트 ---
    const Icons = {
        Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
        Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
        X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
        Robot: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
        ChevronLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
        ChevronRight: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
        Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        Calendar: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        Loading: () => <svg className="animate-spin w-5 h-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    };

    const formatDateStr = (dateObj) => {
        const offset = dateObj.getTimezoneOffset() * 60000;
        return (new Date(dateObj - offset)).toISOString().slice(0, 10);
    };

    // --- 날짜 계산 헬퍼 ---
    const getWeekDays = (baseDate) => {
        if (isMobile) return [baseDate];
        const date = new Date(baseDate);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const start = new Date(date.setDate(diff));
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    };
    const weekDays = getWeekDays(currentDate);

    // [수정] 일정 가져오기
    const fetchEvents = async () => {
        if (!member?.member_id) return;
        try {
            const response = await axios.get('/api/web/plan/events', {
                params: { member_id: member.member_id }
            });
            // DB 데이터를 프론트 포맷으로 변환
            const mappedEvents = response.data.map(ev => ({
                id: ev.event_id,
                title: ev.title,
                date: ev.schedule_date,
                start: ev.start_time.slice(0, 5),
                end: ev.end_time.slice(0, 5),
                color: ev.color || 'blue',
                description: ev.description
            }));
            setEvents(mappedEvents);
        } catch (error) {
            console.error("Fetch Events Error:", error);
        }
    };

    // [수정] AI 채팅 핸들러 (동기화 로직 강화)
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isAiProcessing) return;

        const userMsg = { id: Date.now(), sender: 'user', text: chatInput };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = chatInput;
        setChatInput('');
        setIsAiProcessing(true);

        try {
            if (!member?.member_id) {
                setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: '로그인이 필요합니다.' }]);
                return;
            }

            const response = await axios.post('/api/web/plan/chat', {
                member_id: member.member_id,
                user_input: currentInput
            });

            const data = response.data;
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.message,
                searchResults: data.search_results // 백엔드에서 받은 객체 저장
            }]);

            // ★ 핵심: AI가 데이터를 건드렸다면(create/update/delete),
            // 프론트에서 복잡하게 계산하지 말고 DB에서 최신본을 다시 긁어옵니다.
            if (data.type !== 'chat') {
                await fetchEvents();
            }

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { id: Date.now() + 2, sender: 'ai', text: "오류가 발생했습니다." }]);
        } finally {
            setIsAiProcessing(false);
        }
    };

    // --- 기타 기존 핸들러들 ---
    const handlePrevDate = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - (isMobile ? 1 : 7));
        setCurrentDate(d);
    };
    const handleNextDate = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + (isMobile ? 1 : 7));
        setCurrentDate(d);
    };

    const parseTime = (timeStr) => { const [h, m] = timeStr.split(':'); return { h, m }; };
    const getPosition = (timeStr) => { const [h, m] = timeStr.split(':').map(Number); return (h * 60 + m) * (ROW_HEIGHT / 60); };
    const getHeight = (startStr, endStr) => {
        const [h1, m1] = startStr.split(':').map(Number);
        const [h2, m2] = endStr.split(':').map(Number);
        let endTotal = h2 * 60 + m2;
        if (h2 === 0 && h1 > 0) endTotal = 24 * 60;
        return (endTotal - (h1 * 60 + m1)) * (ROW_HEIGHT / 60);
    };

    const handleTimeInput = (type, field, value) => {
        const numVal = value.replace(/[^0-9]/g, '');
        let validVal = numVal;
        const intVal = parseInt(numVal, 10);
        if (field === 'H') { if (intVal > 24) validVal = '24'; else if (intVal < 0) validVal = '00'; }
        else if (field === 'M') { if (intVal > 59) validVal = '59'; }
        setFormData(prev => ({ ...prev, [`${type}${field}`]: validVal }));
    };

    const handleGridClick = (dateStr, hour) => {
        const startH = hour.toString().padStart(2, '0');
        const endH = (hour + 1).toString().padStart(2, '0');
        const finalEndH = hour === 23 ? '24' : endH;
        setSelectedEvent(null);
        setFormData({ title: '', date: dateStr, startH, startM: '00', endH: finalEndH, endM: '00', color: 'blue', description: '' });
        setIsEditModalOpen(true);
    };

    const handleEditClick = () => {
        const { h: sh, m: sm } = parseTime(selectedEvent.start);
        const { h: eh, m: em } = parseTime(selectedEvent.end);
        setFormData({
            title: selectedEvent.title, date: selectedEvent.date,
            startH: sh, startM: sm, endH: eh, endM: em,
            color: selectedEvent.color, description: selectedEvent.description
        });
        setIsDetailModalOpen(false);
        setIsEditModalOpen(true);
    };

    // [수정] 수동 저장 핸들러 (API 연동)
    const handleSave = async (e) => {
        e.preventDefault();

        if (!member?.member_id) return;

        // 시간 포맷팅 (HH:MM)
        const startStr = `${formData.startH.padStart(2,'0')}:${formData.startM.padStart(2,'0')}`;
        const endStr = `${formData.endH.padStart(2,'0')}:${formData.endM.padStart(2,'0')}`;

        const payload = {
            member_id: member.member_id,
            title: formData.title,
            date: formData.date,
            start: startStr,
            end: endStr,
            color: formData.color,
            description: formData.description
        };

        try {
            if (selectedEvent) {
                // 수정 (Update)
                await axios.put('/api/web/plan/manual/update', {
                    ...payload,
                    event_id: selectedEvent.id
                });
            } else {
                // 생성 (Create)
                await axios.post('/api/web/plan/manual/create', payload);
            }

            // 성공 시 모달 닫고 목록 갱신
            setIsEditModalOpen(false);
            fetchEvents();
        } catch (error) {
            console.error("Save Error:", error);
            alert("저장에 실패했습니다. (시간 형식을 확인해주세요)");
        }
    };

    // [수정] 삭제 핸들러 (API 연동)
    const handleDelete = async () => {
        if (!selectedEvent) return;

        try {
            await axios.delete(`/api/web/plan/manual/delete/${selectedEvent.id}`);
            setIsDetailModalOpen(false);
            fetchEvents();
        } catch (error) {
            console.error("Delete Error:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleDateChange = (date) => {
        setCurrentDate(date);
        setIsCalendarOpen(false);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = formatDateStr(date);
            const hasEvent = events.some(e => e.date === dateStr);
            const hasAttendance = attendanceData.includes(dateStr);
            return (
                <div className="flex justify-center items-end gap-1 h-2 absolute bottom-1 w-full left-0 pointer-events-none">
                    {hasAttendance && <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-sm"></div>}
                    {hasEvent && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm"></div>}
                </div>
            );
        }
    };

    const colors = {
        green: 'bg-[#00c07f] border border-[#00a06b] text-white shadow-[0_4px_12px_rgba(0,192,127,0.3)]',
        blue: 'bg-[#00aaff] border border-[#0088cc] text-white shadow-[0_4px_12px_rgba(0,170,255,0.3)]',
        yellow: 'bg-[#eab308] border border-[#ca8a04] text-white shadow-[0_4px_12px_rgba(234,179,8,0.3)]',
        red: 'bg-[#f43f5e] border border-[#e11d48] text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)]',
    };

    const todayStr = formatDateStr(new Date());

    // 출석 가져오기 함수 추가
    const fetchAttendance = async () => {
        try {
            // 백엔드 API 호출 (가정)
            const res = await axios.get('/api/web/plan/check-attended');
            console.log(res.data);
            setAttendanceData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // ▼ [추가] 로그인이 확인되면 일정 로딩 실행
    useEffect(() => {
        if (member?.member_id) {
            fetchEvents();
            fetchAttendance();
        }
    }, [member]); // member 정보가 바뀌거나 로드되면 실행

    // [반응형 감지]
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- 채팅 스크롤 자동 이동 ---
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isChatOpen]);

    useEffect(() => { void fetchMember(); }, [fetchMember]);
    useEffect(() => { if (!member) navigate('/web/login', { replace: true }); }, [member, navigate]);

    // 초기 스크롤 위치 (9시)
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 9 * ROW_HEIGHT;
    }, []);

    if (isAuthLoading) return <div>pending...</div>

    return (
        <div className="relative w-full h-[calc(100vh-100px)] flex flex-col font-sans select-none p-2 gap-2">
            <style>{`
                button { cursor: pointer; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
                .react-calendar__navigation { margin-bottom: 10px; }
                .react-calendar { border: none; width: 100%; background: transparent; font-family: inherit; }
                .react-calendar__navigation button { min-width: 44px; background: none; font-size: 16px; margin-top: 8px; border-radius: 12px; cursor: pointer !important; }
                .react-calendar__navigation button:enabled:hover { background-color: #f1f5f9; }
                .dark .react-calendar__navigation button:enabled:hover { background-color: #1e293b; }
                .dark .react-calendar__navigation button { color: white; }
                .react-calendar__month-view__weekdays__weekday { text-decoration: none !important; }
                .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { color: #ef4444 !important; text-decoration: none; }
                .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { color: #3b82f6 !important; text-decoration: none; }
                .react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth):nth-child(7n+1) { color: #ef4444 !important; }
                .react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth):nth-child(7n) { color: #3b82f6 !important; }
                .dark .react-calendar__month-view__days__day { color: #cbd5e1; }
                .react-calendar__tile { position: relative; height: 50px; display: flex; flex-col; align-items: center; justify-content: flex-start; padding-top: 8px; border-radius: 12px; transition: all 0.2s; cursor: pointer !important; }
                .react-calendar__tile--now { background: #eff6ff !important; color: #2563eb; }
                .react-calendar__tile--active { background: #2563eb !important; color: white !important; }
                .react-calendar__tile:enabled:hover { background-color: #f1f5f9; }
                .dark .react-calendar__tile:enabled:hover { background-color: #1e293b; }
                .dark .react-calendar__tile--now { background: #1e293b !important; color: #60a5fa; }
            `}</style>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center px-4 py-3 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 z-30 gap-3">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">MY STUDY PLAN</h1>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                        <button onClick={handlePrevDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition cursor-pointer"><Icons.ChevronLeft /></button>
                        <span className="px-2 md:px-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px] md:min-w-[180px] text-center text-sm">
                            {isMobile ? weekDays[0].toLocaleDateString() : `${weekDays[0].toLocaleDateString()} - ${weekDays[6].toLocaleDateString()}`}
                        </span>
                        <button onClick={handleNextDate} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-500 transition cursor-pointer"><Icons.ChevronRight /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative w-full md:w-auto justify-end">
                    <div className="relative">
                        <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className={`p-3 rounded-2xl border transition-all duration-200 flex items-center gap-2 font-bold cursor-pointer ${isCalendarOpen ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg ring-4 ring-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <Icons.Calendar />
                        </button>
                        {!isMobile && isCalendarOpen && (
                            <div className="absolute top-full right-0 mt-3 w-80 p-4 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 origin-top-right z-50">
                                <div className="mb-2 flex gap-2 justify-end text-[10px] font-bold text-slate-500">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>출석</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>일정</span>
                                </div>
                                <Calendar onChange={handleDateChange} value={currentDate} calendarType="gregory" formatDay={(l, d) => d.getDate()} formatShortWeekday={(l, d) => ['일','월','화','수','목','금','토'][d.getDay()]} tileContent={tileContent} className="custom-calendar" />
                            </div>
                        )}
                    </div>
                    <button onClick={() => handleGridClick(formatDateStr(new Date()), 9)} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-900/20 text-sm font-bold transition-all active:scale-95 cursor-pointer flex-1 md:flex-none">
                        <Icons.Plus /> <span className="hidden md:inline">일정 추가</span><span className="md:hidden">추가</span>
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0f172a] relative rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner z-10">
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] z-20 shadow-sm pr-2">
                    <div className="w-12 md:w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800"></div>
                    {weekDays.map((date, idx) => {
                        const dateStr = formatDateStr(date);
                        const isToday = dateStr === todayStr;
                        const dayNum = date.getDay();
                        let dayColor = "text-slate-500 dark:text-slate-400";
                        if (dayNum === 0) dayColor = "text-red-500";
                        if (dayNum === 6) dayColor = "text-blue-500";

                        return (
                            <div key={idx} className={`flex-1 min-w-0 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 relative ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                {isToday && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
                                <div className={`text-xs font-bold uppercase ${dayColor}`}>{['일','월','화','수','목','금','토'][dayNum]}</div>
                                <div className={`text-lg font-bold mt-1 ${isToday ? 'text-blue-600 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{date.getDate()}</div>
                            </div>
                        );
                    })}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto relative custom-scrollbar rounded-b-3xl">
                    <div className="flex relative min-h-full" style={{ height: TIME_SLOTS.length * ROW_HEIGHT }}>
                        <div className="w-12 md:w-16 flex-shrink-0 bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 z-10 sticky left-0 text-right">
                            {TIME_SLOTS.map((hour) => (
                                <div key={hour} className="relative w-full pr-2 pt-1" style={{ height: ROW_HEIGHT }}>
                                    <span className="text-[10px] md:text-xs font-medium text-slate-400 dark:text-slate-500 relative -top-2">{hour.toString().padStart(2, '0')}:00</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 flex relative bg-slate-50 dark:bg-[#0f172a]">
                            <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
                                {TIME_SLOTS.map((hour) => <div key={hour} className="w-full border-b border-dotted border-slate-300 dark:border-slate-700/50" style={{ height: ROW_HEIGHT }} />)}
                            </div>
                            {weekDays.map((date, dayIdx) => {
                                const dateStr = formatDateStr(date);
                                const dayEvents = events.filter(ev => ev.date === dateStr);
                                const isToday = dateStr === todayStr;
                                return (
                                    <div key={dayIdx} className={`flex-1 relative border-r border-dotted border-slate-300 dark:border-slate-700/50 last:border-r-0 min-w-0 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                        {TIME_SLOTS.map((hour) => <div key={hour} onClick={() => handleGridClick(dateStr, hour)} className="absolute w-full z-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg" style={{ top: hour * ROW_HEIGHT, height: ROW_HEIGHT }} />)}
                                        {dayEvents.map(ev => (
                                            <div key={ev.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setIsDetailModalOpen(true); }} className={`absolute w-[92%] left-[4%] px-2 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl cursor-pointer hover:brightness-110 hover:scale-[1.02] transition-all z-10 overflow-hidden flex flex-col justify-center ${colors[ev.color]}`} style={{ top: `${getPosition(ev.start)}px`, height: `${getHeight(ev.start, ev.end)}px` }}>
                                                <div className="font-bold text-xs md:text-sm leading-tight truncate drop-shadow-md">{ev.title}</div>
                                                <div className="text-[10px] opacity-90 mt-0.5 md:mt-1 font-medium drop-shadow-sm truncate">{ev.start} - {ev.end}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Bot Container */}
            <div className={`fixed bottom-17 right-1 z-50 flex flex-col items-end`}>
                {(!isChatOpen || !isMobile) && (
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95 border-4 border-slate-100 dark:border-slate-800 cursor-pointer relative z-50">
                        {isChatOpen ? <Icons.X /> : <Icons.Robot />}
                    </button>
                )}

                {isChatOpen && (
                    <div className={`flex flex-col bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5
                        ${isMobile
                        ? 'fixed inset-0 z-[9999] w-full h-full rounded-none border-none'
                        : 'absolute bottom-full mb-4 right-0 w-110 h-160 rounded-3xl border origin-bottom-right'
                    }`}>

                        <div className="p-4 bg-indigo-600 text-white font-bold flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2"><Icons.Robot /> AI Planner</div>
                            {isMobile && (
                                <button onClick={() => setIsChatOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-colors z-[10000]">
                                    <Icons.X />
                                </button>
                            )}
                        </div>

                        <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                            {messages.map(m => (
                                <div key={m.id} className={`mb-4 flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>

                                    {/* 1. 텍스트 말풍선 */}
                                    <div className={`px-4 py-3 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap shadow-sm 
                                    ${m.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded-tl-sm'
                                    }`}>
                                        {m.text}
                                    </div>

                                    {/* 2. 검색 결과 카드 리스트 (여러 개 렌더링 가능) */}
                                    {m.sender === 'ai' && m.searchResults && m.searchResults.length > 0 && (
                                        <div className="mt-2 w-[85%] flex flex-col gap-2">
                                            {m.searchResults.map((result, idx) => {
                                                // [색상 수정] 회원님의 colors 객체에서 배경색 코드만 추출
                                                // AI가 뱉은 color가 colors 객체에 없으면 기본값 'blue' 사용
                                                const colorKey = colors[result.color] ? result.color : 'blue';
                                                // "bg-[#00aaff] border ..." 문자열에서 첫 번째 클래스("bg-[#00aaff]")만 가져옴
                                                const bgColorClass = colors[colorKey].split(' ')[0];

                                                return (
                                                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-indigo-100 dark:border-slate-600 shadow-md animate-in slide-in-from-left-2">
                                                        <div className="flex items-start gap-3">
                                                            {/* 왼쪽 컬러 바 */}
                                                            <div className={`w-1.5 h-10 rounded-full ${bgColorClass}`}></div>

                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-800 dark:text-white text-base truncate">
                                                                    {result.title}
                                                                </h4>
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                    <Icons.Calendar />
                                                                    <span>{result.schedule_date}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2 py-1 rounded-md">
                                                                    <span>{result.start_time?.slice(0,5)} - {result.end_time?.slice(0,5)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isAiProcessing && (
                                <div className="flex justify-start mb-2">
                                    <span className="px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl rounded-tl-md flex items-center gap-2">
                                        <Icons.Loading />
                                        <span className="text-xs text-slate-500 dark:text-slate-400">생성 중...</span>
                                    </span>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-2 shrink-0">
                            <input className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none outline-none dark:text-white text-sm focus:ring-2 ring-indigo-500/50"
                                   placeholder="내일 9시 수학 공부 일정 잡아줘..." value={chatInput} onChange={e=>setChatInput(e.target.value)} disabled={isAiProcessing} />
                            <button
                                type="submit"
                                disabled={isAiProcessing}
                                className={`p-3 text-white rounded-2xl transition-colors ${
                                    isAiProcessing
                                        ? 'bg-slate-400 cursor-not-allowed'  // 대기 중: 회색 배경 + 금지 커서
                                        : 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer' // 평소: 파란 배경 + 포인터 커서 + 호버 효과
                                }`}
                            >
                                <Icons.Send />
                            </button>
                        </form>
                        {isMobile && (
                            <button onClick={() => setIsChatOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold border-t border-slate-200 dark:border-slate-700">
                                채팅 닫기
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* [모바일 전용] 캘린더 모달 */}
            {isMobile && isCalendarOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCalendarOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>출석</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>일정</span>
                            </div>
                            <button onClick={() => setIsCalendarOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"><Icons.X /></button>
                        </div>
                        <Calendar onChange={handleDateChange} value={currentDate} calendarType="gregory" formatDay={(l, d) => d.getDate()} formatShortWeekday={(l, d) => ['일','월','화','수','목','금','토'][d.getDay()]} tileContent={tileContent} className="custom-calendar w-full" />
                        <button onClick={() => setIsCalendarOpen(false)} className="w-full mt-6 py-3 bg-indigo-600 text-white font-bold rounded-xl active:scale-95 transition shadow-lg shadow-indigo-200 dark:shadow-none">확인</button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95">
                        <div className={`h-24 w-full ${colors[selectedEvent.color].split(' ')[0]}`}></div>
                        <div className="px-6 py-6 -mt-12 relative">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{selectedEvent.title}</h3>
                                <p className="text-slate-500 font-medium mt-2 text-sm">{selectedEvent.date} <span className="mx-1">|</span> {selectedEvent.start} - {selectedEvent.end}</p>
                                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-700 dark:text-slate-300 text-sm min-h-[80px] leading-relaxed custom-scrollbar max-h-32 overflow-y-auto">
                                    {selectedEvent.description || "내용 없음"}
                                </div>
                                <div className="flex gap-2 md:gap-3 mt-6">
                                    <button onClick={handleDelete} className="p-3 md:p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl hover:bg-red-100 transition cursor-pointer"><Icons.Trash /></button>
                                    <button onClick={handleEditClick} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-4 rounded-2xl font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer">수정하기</button>
                                    <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 md:py-4 rounded-2xl font-bold transition hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer">닫기</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
                    <div className="bg-white dark:bg-slate-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl p-6 md:p-8 border-t md:border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-10 md:zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{selectedEvent ? '일정 수정' : '새 일정 추가'}</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition cursor-pointer"><Icons.X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">제목</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none dark:text-white focus:ring-2 ring-blue-500 transition" placeholder="일정 이름" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">날짜</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none dark:text-white focus:ring-2 ring-blue-500 transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">색상</label>
                                    <div className="flex gap-3 h-[56px] items-center px-2">
                                        {Object.keys(colors).map(c => (
                                            <button type="button" key={c} onClick={() => setFormData({...formData, color: c})} className={`w-10 h-10 rounded-full border-[3px] transition-all duration-200 cursor-pointer ${colors[c].split(' ')[0]} ${formData.color === c ? 'border-slate-800 dark:border-white scale-110 ring-2 ring-offset-2 ring-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">시작</label>
                                    <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 transition focus-within:ring-2 ring-blue-500">
                                        <input type="text" maxLength="2" value={formData.startH} onChange={(e) => handleTimeInput('start', 'H', e.target.value)} className="w-full bg-transparent text-center outline-none dark:text-white font-mono text-lg" placeholder="09" />
                                        <span className="text-slate-400 font-bold">:</span>
                                        <input type="text" maxLength="2" value={formData.startM} onChange={(e) => handleTimeInput('start', 'M', e.target.value)} className="w-full bg-transparent text-center outline-none dark:text-white font-mono text-lg" placeholder="00" />
                                    </div>
                                </div>
                                <div><label className="block text-sm font-bold text-slate-500 mb-2 ml-1">종료</label>
                                    <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 transition focus-within:ring-2 ring-blue-500">
                                        <input type="text" maxLength="2" value={formData.endH} onChange={(e) => handleTimeInput('end', 'H', e.target.value)} className="w-full bg-transparent text-center outline-none dark:text-white font-mono text-lg" placeholder="10" />
                                        <span className="text-slate-400 font-bold">:</span>
                                        <input type="text" maxLength="2" value={formData.endM} onChange={(e) => handleTimeInput('end', 'M', e.target.value)} className="w-full bg-transparent text-center outline-none dark:text-white font-mono text-lg" placeholder="00" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">상세 내용</label>
                                <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none dark:text-white focus:ring-2 ring-blue-500 resize-none transition custom-scrollbar" placeholder="메모를 입력하세요..." />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] text-lg cursor-pointer mb-4 md:mb-0">저장하기</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planner;