import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = {
  time: '#6366f1',
  period: '#10b981',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { totalSales, details } = data;

    return (
      <div className="bg-[#1e293b] p-3 border border-slate-700 shadow-xl rounded-lg text-sm z-50 min-w-[150px]">
        <p className="font-bold text-slate-200 mb-2">{label}</p>
        <div className="mb-3 pb-2 border-b border-slate-700">
          <span className="text-slate-400 text-xs">총 매출</span>
          <p className="text-lg font-bold text-white">
            {totalSales.toLocaleString()}원
          </p>
        </div>
        <div className="space-y-2">
          {Object.entries(details).length > 0 ? (
            Object.entries(details).map(([type, value]) => {
               let typeName = type;
               let colorCode = '#94a3b8'; 

               if (type === '시간제') { 
                 typeName = '시간권'; 
                 colorCode = COLORS.time; 
               } else if (type === '기간제') { 
                 typeName = '기간권'; 
                 colorCode = COLORS.period; 
               } else {
                 return null;
               }
               
               return (
                <div key={type} className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorCode }} />
                    <span className="text-slate-300 font-medium">{typeName}</span>
                  </div>
                  <span className="font-bold text-slate-200">{value.toLocaleString()}원</span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 text-xs">매출 없음</div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const DailySalesChart = ({ data, currentDate, onPrevMonth, onNextMonth }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const summary = useMemo(() => {
    const total = data.reduce((acc, curr) => acc + curr.total_sales, 0);

    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === (today.getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const divisor = isCurrentMonth ? today.getDate() : daysInMonth;

    const dailyAvg = divisor > 0 ? total / divisor : 0;
    const weeklyAvg = dailyAvg * 7;

    return { total, dailyAvg, weeklyAvg };
  }, [data, year, month]);

  const chartData = useMemo(() => {
    const dataMap = {};
    data.forEach(item => {
      const { date, product_type, total_sales } = item;
      if (!dataMap[date]) {
        dataMap[date] = { totalSales: 0, time_sales: 0, period_sales: 0, details: {} };
      }
      if (product_type === '시간제') {
          dataMap[date].time_sales += total_sales;
          dataMap[date].totalSales += total_sales; 
          dataMap[date].details[product_type] = total_sales;
      } else if (product_type === '기간제') {
          dataMap[date].period_sales += total_sales;
          dataMap[date].totalSales += total_sales;
          dataMap[date].details[product_type] = total_sales;
      }
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const fullData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dataMap[dateStr]) {
        fullData.push({ date: dateStr, day: day, ...dataMap[dateStr] });
      } else {
        fullData.push({ date: dateStr, day: day, totalSales: 0, time_sales: 0, period_sales: 0, details: {} });
      }
    }
    return fullData;
  }, [data, year, month]);

  return (
    <div className="w-full h-96 bg-[#1e293b] rounded-xl shadow-lg border border-slate-700/50 flex flex-row overflow-hidden">
      <style>{`
        .recharts-wrapper:focus,
        .recharts-wrapper *:focus { outline: none !important; }
      `}</style>

      <div className="w-64 bg-[#0f172a]/50 border-r border-slate-700/50 p-6 flex flex-col justify-center gap-4 shrink-0">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            매출 요약
        </h3>

        <div className="px-4 py-3 rounded-lg bg-[#1e293b] border border-slate-700 shadow-sm flex justify-between items-center transition-colors hover:border-indigo-500/30">
            <div>
                <p className="text-xs text-slate-400">이번 달 총 매출</p>
                <p className="text-lg font-bold text-white">{summary.total.toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span></p>
            </div>
        </div>

        <div className="px-4 py-3 rounded-lg bg-[#1e293b] border border-slate-700 shadow-sm flex justify-between items-center transition-colors hover:border-indigo-500/30">
             <div>
                <p className="text-xs text-slate-400">일 평균 매출</p>
                <p className="text-lg font-bold text-indigo-400">{Math.round(summary.dailyAvg).toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span></p>
            </div>
        </div>

        <div className="px-4 py-3 rounded-lg bg-[#1e293b] border border-slate-700 shadow-sm flex justify-between items-center transition-colors hover:border-indigo-500/30">
             <div>
                <p className="text-xs text-slate-400">주 평균 매출</p>
                <p className="text-lg font-bold text-emerald-400">{Math.round(summary.weeklyAvg).toLocaleString()}<span className="text-xs font-normal ml-0.5">원</span></p>
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 min-w-0">
        <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium text-slate-400">
                {year}년 {month}월 상세 추이
            </div>
            
            <div className="flex items-center bg-[#0f172a] rounded-lg p-0.5 border border-slate-700">
                <button onClick={onPrevMonth} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <span className="text-sm font-bold text-slate-200 px-3 min-w-[80px] text-center select-none">{year}년 {month}월</span>
                <button onClick={onNextMonth} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>

        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => parseInt(value.split('-')[2])} 
                    interval={0}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    minTickGap={5}
                    dy={10}
                />
                <YAxis 
                    tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', color: '#cbd5e1' }} />
                <Bar dataKey="time_sales" stackId="a" fill={COLORS.time} name="시간권" barSize={24} isAnimationActive={false} />
                <Bar dataKey="period_sales" stackId="a" fill={COLORS.period} name="기간권" barSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DailySalesChart;