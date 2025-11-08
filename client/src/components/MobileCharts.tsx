import React from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils';

interface MobileChartsProps {
  revenueData: any[];
  statusData: any[];
  loading?: boolean;
}

const MobileCharts: React.FC<MobileChartsProps> = ({ revenueData, statusData, loading = false }) => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316'  // orange
  ];

  if (loading) {
    return (
      <div className="md:hidden space-y-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-md">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-md">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-4">
      {/* Mobile Revenue Chart */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-md">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">📈</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Doanh thu</h3>
            <p className="text-xs text-gray-500">Xu hướng theo thời gian</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="mobileRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={10}
                tick={{ fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={10}
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  color: '#374151',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                labelFormatter={(label) => `${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#mobileRevenueGradient)"
                dot={false}
                activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mobile Status Distribution */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-md">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">🎯</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Trạng thái</h3>
            <p className="text-xs text-gray-500">Phân bố đơn hàng</p>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {statusData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  color: '#374151',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value, 'Số đơn']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                wrapperStyle={{ 
                  fontSize: '10px',
                  paddingTop: '8px'
                }}
                iconType="circle"
                layout="horizontal"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MobileCharts;
