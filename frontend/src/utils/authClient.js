import axios from 'axios';

// 오류 반환시 다른 페이지로 이동 시켜주는 인터셉터
// axios 인스턴스 생성
const authClient = axios.create({
    baseURL: '/api',
    withCredentials: true, // HttpOnly 쿠키를 헤더에 보내는게 가능, 실제 배포 환경을 위해 활성화
    headers: {
        'Content-Type': 'application/json'
    }
});

// 요청(request) 인터셉터
authClient.interceptors.request.use(
    // 요청전 config 설정
    (config) => {
        return config;
    },
    // 에러 발생시
    (error) => {
        return Promise.reject(error);
    }
);

// 응답(response) 인터셉터
authClient.interceptors.response.use(
    // 성공했을 때
    (response) => {
        return response;
    },
    // 실패했을 때
    async (error) => {
        // 네트워크 오류는 response가 없기에 response 객체가 있는지 확인
        if (error.response) {
            const status = error.response.status;

            if (status === 401) {
                console.log('login session expired, return to main page');
                window.location.href = '/web/login';
            }

            if (status === 403) {
                console.log('unauthorized');
                window.location.href = '/web';
            }
        }
        // 그 외 오류 전달
        return Promise.reject(error);
    }
);

export default authClient;