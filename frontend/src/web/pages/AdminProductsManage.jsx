import React, { useEffect, useState } from 'react';

const AdminProductsManage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // isEditMode는 이제 생성 시 false로만 사용됩니다.
    const [isEditMode, setIsEditMode] = useState(false);
    
    // 폼 데이터 초기값
    const initialFormState = {
        product_id: null,
        name: '',
        type: '시간제',
        price: 0,
        value: 0,
        is_exposured: true
    };
    const [formData, setFormData] = useState(initialFormState);

    // 상품 목록 불러오기
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/admin/products', { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("상품 로딩 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // 모달 열기 (생성 전용)
    const openModal = () => {
        setIsEditMode(false);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    // 저장 (생성)
    const handleSave = async () => {
        if (!formData.name || !formData.type) {
            alert("상품명과 타입을 입력해주세요.");
            return;
        }

        // 생성 모드만 존재하므로 POST 고정
        const url = '/api/admin/products';
        const method = 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: "include"
            });

            if (response.ok) {
                alert("생성되었습니다.");
                setIsModalOpen(false);
                fetchProducts();
            } else {
                alert("저장에 실패했습니다.");
            }
        } catch (error) {
            console.error("저장 오류:", error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    // 노출 상태 토글 (수정 버튼 대체 기능)
    const handleToggleExposure = async (product) => {
        // 현재 상태의 반대값으로 설정
        const newStatus = !product.is_exposured;
        
        // 기존 데이터 유지하면서 상태만 변경
        const updateData = {
            name: product.name,
            type: product.type,
            price: product.price,
            value: product.value,
            is_exposured: newStatus
        };

        try {
            const response = await fetch(`/api/admin/products/${product.product_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
                credentials: "include"
            });

            if (response.ok) {
                // 목록 갱신
                fetchProducts();
            } else {
                alert("상태 변경에 실패했습니다.");
            }
        } catch (error) {
            console.error("상태 변경 오류:", error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    // 삭제
    const handleDelete = async (productId) => {
        if (!window.confirm("정말로 이 이용권을 삭제하시겠습니까?")) return;

        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE',
                credentials: "include"
            });

            if (response.ok) {
                alert("삭제되었습니다.");
                fetchProducts();
            } else {
                alert("삭제 실패");
            }
        } catch (error) {
            console.error("삭제 오류:", error);
        }
    };

    // 입력 핸들러
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-200">이용권 관리</h2>
                <button 
                    onClick={openModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    새 이용권 만들기
                </button>
            </div>

            {/* 상품 목록 테이블 */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                            <th className="p-4 font-medium w-24">타입</th>
                            <th className="p-4 font-medium">상품명</th>
                            <th className="p-4 font-medium w-32">시간/기간</th>
                            <th className="p-4 font-medium w-32">가격</th>
                            <th className="p-4 font-medium w-24 text-center">노출 여부</th>
                            <th className="p-4 font-medium w-48 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-slate-300 text-sm">
                        {products.map(product => (
                            <tr key={product.product_id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="p-4">
                                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap ${
                                        product.type === '시간제' ? 'bg-blue-500/20 text-blue-400' : 
                                        product.type === '기간제' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'
                                    }`}>
                                        {product.type}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-white">{product.name}</td>
                                <td className="p-4">
                                    <span className="text-slate-200 font-semibold">{product.value}</span>
                                    <span className="text-slate-500 ml-1 text-xs">
                                        {product.type === '기간제' ? '일' : '시간'}
                                    </span>
                                </td>
                                <td className="p-4 text-emerald-400 font-bold">
                                    {product.price.toLocaleString()}원
                                </td>
                                <td className="p-4 text-center">
                                    <div className={`w-2.5 h-2.5 rounded-full mx-auto ${product.is_exposured ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* 수정 버튼 제거 및 노출 토글 버튼으로 대체 */}
                                        <button 
                                            onClick={() => handleToggleExposure(product)}
                                            className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium border ${
                                                product.is_exposured 
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20' 
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                            }`}
                                        >
                                            {product.is_exposured ? '노출 중지' : '노출 게시'}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(product.product_id)}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs font-medium border border-red-500/20"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="p-12 text-center text-slate-500">등록된 이용권이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 모달 (생성 전용) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] rounded-2xl border border-slate-600 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-xl font-bold text-white">
                                새 이용권 만들기
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">이용권 타입</label>
                                <select 
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="시간제">⏰ 시간제</option>
                                    <option value="기간제">📅 기간제</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">상품명</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="예: 4주 기간권, 100시간 이용권"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                                        {formData.type === '기간제' ? '기간 (일)' : '시간'}
                                    </label>
                                    <input 
                                        type="number" 
                                        name="value"
                                        value={formData.value}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">가격 (원)</label>
                                    <input 
                                        type="number" 
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <label className="text-slate-300 text-sm font-medium flex-1">키오스크 노출 여부</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="is_exposured"
                                        checked={formData.is_exposured}
                                        onChange={handleChange}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors font-medium"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold shadow-lg shadow-indigo-900/30"
                            >
                                생성하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProductsManage;