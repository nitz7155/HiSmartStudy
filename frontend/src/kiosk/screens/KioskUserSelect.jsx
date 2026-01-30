import KioskHeader from "../components/KioskHeader";
import { FaUserCircle, FaUserSlash, FaChevronRight } from "react-icons/fa";

function KioskSelectUser({ onBack, onSelectMember, onSelectNonMember }) {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white select-none">
            <KioskHeader backButton={true} onBack={onBack} />

            <main className="flex-1 flex flex-col justify-center items-center p-8 container mx-auto max-w-6xl">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-5xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200">
                            구매 유형 선택
                        </span>
                    </h2>
                    <p className="text-xl text-slate-400 font-light">
                        이용하실 서비스를 선택해 주세요.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl px-4">
                    <SelectionCard 
                        title="회원으로 구매하기" 
                        subtitle="Member Purchase"
                        desc="마일리지 적립 및 사용 가능"
                        icon={<FaUserCircle />}
                        colorClass="text-blue-400"
                        activeBorder="active:border-blue-500"
                        activeBg="active:bg-slate-800"
                        activeText="group-active:text-blue-300"
                        onClick={onSelectMember}
                    />

                    {/* 비회원 구매 버튼 */}
                    <SelectionCard 
                        title="비회원으로 구매하기" 
                        subtitle="Guest Purchase"
                        desc="로그인 없이 바로 이용"
                        icon={<FaUserSlash />}
                        colorClass="text-emerald-400"
                        activeBorder="active:border-emerald-500"
                        activeBg="active:bg-slate-800"
                        activeText="group-active:text-emerald-300"
                        onClick={onSelectNonMember}
                    />
                </div>
            </main>
        </div>
    );
}

// 재사용을 위한 내부 컴포넌트
function SelectionCard({ title, subtitle, desc, icon, colorClass, activeBorder, activeBg, activeText, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`
                group relative flex flex-col items-center justify-center gap-6 p-12
                rounded-[2.5rem] bg-slate-800 border border-slate-700
                transition-all duration-100 ease-out
                active:scale-95 active:shadow-inner shadow-2xl
                ${activeBorder} ${activeBg}
            `}
        >
            {/* 배경 그라데이션 효과 (Active 시에만 은은하게 표시) */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-white/5 to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-100 pointer-events-none"></div>

            {/* 아이콘 */}
            <div className={`
                text-8xl mb-2 transition-transform duration-100 group-active:scale-90
                ${colorClass} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]
            `}>
                {icon}
            </div>

            {/* 텍스트 내용 */}
            <div className="relative z-10 text-center space-y-2">
                <h3 className="text-3xl font-bold text-white transition-colors">
                    {title}
                </h3>
                <p className="text-sm font-bold tracking-widest uppercase text-slate-500 transition-colors">
                    {subtitle}
                </p>
                <div className="pt-4">
                     <span className={`inline-flex items-center gap-2 text-slate-400 text-lg font-light transition-colors ${activeText}`}>
                        {desc} <FaChevronRight className="text-sm opacity-50 group-active:translate-x-1 transition-transform" />
                    </span>
                </div>
            </div>
        </button>
    );
}

export default KioskSelectUser;