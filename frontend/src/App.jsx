import { createBrowserRouter, Link } from 'react-router-dom';
import './App.css';
import WebLayout from './web/components/WebLayout.jsx';
import KioskApp from './kiosk/KioskApp.jsx'
import TicketList from './web/pages/TicketList.jsx';
import Payments from './web/pages/Payment.jsx';
import WebIndex from './web/pages/WebIndex.jsx';
import SeatStatus from './web/components/SeatStatus.jsx';
import PaymentSuccess from './web/pages/PaymentSuccess.jsx';
import Signup from './web/pages/Signup.jsx';
import Login from './web/pages/Login.jsx';
import GoogleOnBoarding from './web/pages/GoogleOnBoarding.jsx';
import AccountRecovery from './web/pages/AccountRecovery.jsx';
import AdminLayout from './web/components/AdminLayout.jsx';
import AdminLogin from './web/pages/AdminLogin.jsx';
import AdminDashboard from './web/pages/AdminDashboard.jsx';
import MyPage from './web/pages/MyPage.jsx';
import MyPageEdit from './web/pages/MyPageEdit.jsx';
import MyPageOrder from './web/pages/MyPageOrder.jsx';
import Planner from './web/pages/Planner.jsx';
import AdminMembersManage from './web/pages/AdminMembersManage.jsx';
import AdminSeatsManage from './web/pages/AdminSeatsManage.jsx';
import AdminTodoManage from './web/pages/AdminTodoManage.jsx';
import AdminProductsManage from './web/pages/AdminProductsManage.jsx';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/kiosk',
        element: <KioskApp />,
    },
    {
        path: '/web',
        element: <WebLayout />,
        children: [
            {
                index: true,
                element: <WebIndex />,
            },
            {
                path: 'ticket',
                element: <TicketList />
            },
            {
                path: 'payment',
                element: <Payments />
            },
            {
                path: 'payment/success',
                element: <PaymentSuccess />
            },
            {
                path: 'seat',
                element: <SeatStatus />
            },
            {
                path: 'mypage',
                element: <MyPage />
            },
            {
                path: 'mypage/edit',
                element: <MyPageEdit />
            },
            {
                path: 'mypage/order',
                element: <MyPageOrder />
            },
            {
                path: 'plan',
                element: <Planner />
            }
        ]
    },
    {
        path: '/web/signup',
        element: <Signup />,
    },
    {
        path: '/web/login',
        element: <Login />,
    },
    {
        path: '/web/google/onboarding',
        element: <GoogleOnBoarding />,
    },
    {
        path: '/web/account-recovery',
        element: <AccountRecovery />,
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            {
                index: true,
                element: <AdminDashboard />
            },
            {
                path: 'members',
                element: <AdminMembersManage />
            },
            {
                path: 'seats',
                element: <AdminSeatsManage />
            },
            {
                path: 'todos',
                element: <AdminTodoManage />
            },
            {
                path: 'products',
                element: <AdminProductsManage />
            }
        ]
    },
    {
        path: '/admin/login',
        element: <AdminLogin />
    },
]);

// eslint-disable-next-line react-refresh/only-export-components
function Home() {
    return (
        // 1. 전체 배경 컨테이너 (화면 중앙 정렬)
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-6">
            {/* 타이틀 */}
            <h1 className="text-4xl font-bold text-gray-800 mb-10">
                스터디카페 시스템 🚪
            </h1>
            {/* 2. 그리드 레이아웃 (모바일: 1열, PC: 2열) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                {/* 카드 1: 키오스크 */}
                <Link to='/kiosk' className="group block p-10 bg-white rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-blue-600 mb-2 group-hover:text-blue-700">🖥️ 키오스크 모드</h2>
                    <p className="text-gray-500">매장 입구에 설치되는 무인 결제 시스템입니다.</p>
                </Link>
                {/* 카드 3: 웹 페이지 */}
                <Link to='/web' className="group block p-10 bg-white rounded-2xl shadow-md border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-purple-600 mb-2 group-hover:text-purple-700">🌐 사용자 웹</h2>
                    <p className="text-gray-500">고객이 집에서 예약할 때 쓰는 PC/모바일 웹입니다.</p>
                </Link>
                {/* 카드 4: 관리자 페이지 */}
                <Link to='/admin' className="group block p-10 bg-slate-800 rounded-2xl shadow-md border border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <h2 className="text-2xl font-bold text-white mb-2">⚙️ 관리자 페이지</h2>
                    <p className="text-slate-400">매장 현황 관리 및 매출 통계 시스템입니다.</p>
                </Link>
            </div>
        </div>
    );
}

export default router;