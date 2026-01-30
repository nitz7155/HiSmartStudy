import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAuthCookieStore } from "../../utils/useAuthStores";

const AdminLayout = () => {
    const navigate = useNavigate();
    const { member, fetchMember } = useAuthCookieStore();
    const [isChecking, setIsChecking] = useState(true); 

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await fetchMember(); 
            } catch (error) {
                console.error("Auth check failed", error);
            } finally {
                setIsChecking(false);
            }
        };
        checkAuth();
    }, [fetchMember]);

    useEffect(() => {
        if (!isChecking && !member) {
            navigate('/admin/login', { replace: true });
        }
    }, [isChecking, member, navigate]);

    if (isChecking) {
        return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Loading...</div>;
    }

    if (!member) return null;

    return (
        <div className="flex h-screen bg-[#0f172a] font-sans overflow-hidden text-white">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-full relative">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;