// 재사용 가능한 소셜 로그인 버튼 컴포넌트
export const AuthSocialButton = ({ background, textColor, border, icon, text, hoverEffect, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                relative flex items-center justify-center
                w-full h-12 rounded-xl
                text-[15px] font-semibold
                transition-all duration-200
                shadow-sm
                active:scale-[0.98]
                ${background} ${textColor} ${border || 'border-none'}
                ${hoverEffect || 'hover:opacity-90 cursor-pointer'}
            `}
        >
            <div className="absolute left-4 w-5 h-5 flex items-center justify-center">
                {icon}
            </div>
            <span>{text}</span>
        </button>
    );
};