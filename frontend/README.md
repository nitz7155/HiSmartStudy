## 초기 프로젝트 설정법
### 빌드 명령어
1. npm run build
2. npx serve -s dist
### 설치 명령어
1. npm create vite@latest
2. cd frontend
3. npm install react-router-dom zustand axios tailwindcss @tailwindcss/vite
### vite.config.js (Tailwind CSS 설정)
```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' 

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), 
  ],
})
```
### index.css (Tailwind CSS 설정)
```
@import "tailwindcss";
```
### main.jsx
```
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import router from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);
```
### App.jsx
```
import { createBrowserRouter } from "react-router-dom";
import './App.css';
import WebLayout from "./components/WebLayout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/Test.jsx";

const router = createBrowserRouter([
    {
        path: '/',
        element: <WebLayout />,       
        children: [
            {
                index: true,
                element: <Home />, 
            },
            {
                path: 'about',
                element: <About />, 
            },
        ]
    }
]);

export default router;
```
### components/WebLayout.jsx
```
import { Outlet, Link } from 'react-router-dom';

const WebLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            {/* 헤더 (네비게이션) */}
            <header className="bg-blue-600 text-white p-4 shadow-md">
                <nav className="flex gap-4 container mx-auto">
                    <Link to="/" className="font-bold hover:text-blue-200">Home</Link>
                    <Link to="/about" className="font-bold hover:text-blue-200">About</Link>
                </nav>
            </header>

            {/* 실제 페이지 콘텐츠가 렌더링 되는 곳 */}
            <main className="flex-1 container mx-auto p-4">
                <Outlet />
            </main>

            {/* 푸터 */}
            <footer className="bg-gray-800 text-white p-4 text-center">
                © 2025 My Project
            </footer>
        </div>
    );
};

export default WebLayout;
```