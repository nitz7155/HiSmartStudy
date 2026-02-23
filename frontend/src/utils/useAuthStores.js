import { create } from 'zustand';
import axios from 'axios';

// 쿠키 가져오는 zustand 함수
export const useAuthCookieStore = create((set) => ({
    member: null,
    isLoading: false,
    error: null,
    fetchMember: async () => {
        set({ isLoading: true });
        try {
            const response = await axios.post('/api/web/auth/cookies');
            set({ member: response.data });
        } catch (error) {
            set({ error: error });
        } finally {
            set({ isLoading: false });
        }
    },
    clearMember: () => set({ member: null })
}));