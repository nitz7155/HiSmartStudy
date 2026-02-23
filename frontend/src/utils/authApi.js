import authClient from './authClient.js';

export const authApi = {
    // 로그인
    login: async (member_data) => {
        return await authClient.post('/web/auth/login', member_data);
    },
    // 핀코드 입력 모달
    updatePinCode: async (member_data) => {
        return await authClient.post('/web/auth/login/update-pincode', member_data)
    },
    // 로그아웃
    logout: async () => {
        return await authClient.post('/web/auth/logout');
    },
    // 회원 가입
    signup: async (member_data) => {
        return await authClient.post('/web/auth/signup', member_data);
    },
    // 값만 받아서 내부에서 객체로 포장 ({ login_id: "..." })
    checkId: async (loginId) => {
        return await authClient.post('/web/auth/signup/check-id', { login_id: loginId });
    },
    // 값만 받아서 내부에서 객체로 포장 ({ phone: "..." })
    checkPhone: async (phone) => {
        return await authClient.post('/web/auth/signup/check-phone', { phone: phone });
    },
    // 값만 받아서 내부에서 객체로 포장 ({ input_code: "..." })
    checkVerifyPhone: async (inputCode) => {
        return await authClient.post('/web/auth/signup/check-verify-phone', { input_code: inputCode });
    },
    // 값만 받아서 내부에서 객체로 포장 ({ email: "..." })
    checkEmail: async (email) => {
        return await authClient.post('/web/auth/signup/check-email', { email: email });
    },
    // 값만 받아서 내부에서 객체로 포장 ({ input_code: "..." })
    checkVerifyEmail: async (inputCode) => {
        return await authClient.post('/web/auth/signup/check-verify-email', { input_code: inputCode });
    },
    // 추가 정보 기재 페이지
    onBoarding: async (member_data) => {
        return await authClient.post('/web/auth/google/onboarding', member_data);
    },
    // 추가 정보 기재 페이지, 비정상적인 접근 차단
    onBoardingInvalidAccess: async () => {
        return await authClient.post('/web/auth/google/onboarding/invalid-access');
    },
    // 값만 받아서 내부에서 객체로 포장 ({ phone: "..." })
    onBoardCheckPhone: async (phone) => {
        return await authClient.post('/web/auth/google/onboarding/check-phone', { phone: phone });
    },
    // 값만 받아서 내부에서 객체로 포장 ({ input_code: "..." })
    onBoardCheckVerifyPhone: async (inputCode) => {
        return await authClient.post('/web/auth/google/onboarding/check-verify-phone', { input_code: inputCode });
    },
    // 아이디 찾기
    accountRecoveryId: async (id_recovery_data) => {
        return await authClient.post('/web/auth/account-recovery/id', id_recovery_data);
    },
    // 비밀번호 찾기
    accountRecoveryPw: async (pw_recovery_data) => {
        return await authClient.post('/web/auth/account-recovery/pw', pw_recovery_data);
    },
    // 아이디 / 비밀번호 입력코드 검증
    accountRecoveryCode: async (input_code) => {
        return await authClient.post('/web/auth/account-recovery/code', input_code);
    },
    // 관리자 로그인
    adminLogin: async (member_data) => {
        return await authClient.post('/admin/login', member_data)
    },
    adminLogout: async () => {
        return await authClient.post('/admin/logout');
    },
};