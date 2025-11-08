import React from 'react';
import { formatCurrency } from '../utils';

interface StatusCardProps {
  title: string;
  count: number;
  revenue: number;
  isSelected?: boolean;
  onClick?: () => void;
  monthlyTarget?: number;
  totalOrdersData?: { count: number; revenue: number }; // For percentage calculation
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  count,
  revenue,
  isSelected = false,
  onClick,
  monthlyTarget = 0,
  totalOrdersData
}) => {
  // Status-specific styling and icons
  const getStatusConfig = (title: string) => {
    const configs = {
      'Tổng số đơn': {
        gradient: 'from-blue-500 to-indigo-600',
        bgColor: 'bg-blue-50',
        icon: '📊',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      },
      'Đã nhận hàng': {
        gradient: 'from-green-500 to-emerald-600',
        bgColor: 'bg-green-50',
        icon: '✅',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      },
      'Đã gửi hàng': {
        gradient: 'from-orange-500 to-amber-600',
        bgColor: 'bg-orange-50',
        icon: '🚚',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200'
      },
      'Đã hoàn': {
        gradient: 'from-purple-500 to-violet-600',
        bgColor: 'bg-purple-50',
        icon: '↩️',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      },
      'Đang hoàn': {
        gradient: 'from-yellow-500 to-orange-500',
        bgColor: 'bg-yellow-50',
        icon: '⏳',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      },
      'Đã huỷ': {
        gradient: 'from-red-500 to-rose-600',
        bgColor: 'bg-red-50',
        icon: '❌',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      },
      'Đã xác nhận': {
        gradient: 'from-teal-500 to-cyan-600',
        bgColor: 'bg-teal-50',
        icon: '✓',
        textColor: 'text-teal-700',
        borderColor: 'border-teal-200'
      },
      'Đang đóng hàng': {
        gradient: 'from-indigo-500 to-purple-600',
        bgColor: 'bg-indigo-50',
        icon: '📦',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200'
      }
    };
    
    return configs[title as keyof typeof configs] || configs['Tổng số đơn'];
  };

  const config = getStatusConfig(title);
  
  // Calculate percentage based on card type
  const getTargetPercentage = () => {
    if (title === 'Tổng số đơn') {
      // Tổng số đơn: % so với mục tiêu doanh thu
      return monthlyTarget > 0 ? ((revenue / monthlyTarget) * 100).toFixed(1) : '0';
    } else if (['Đã hoàn', 'Đang hoàn'].includes(title)) {
      // Đã hoàn, Đang hoàn: % so với tổng số đơn
      return totalOrdersData && totalOrdersData.revenue > 0 ? 
        ((revenue / totalOrdersData.revenue) * 100).toFixed(1) : '0';
    } else if (title === 'Đã huỷ') {
      // Đã huỷ: % thất thoát so với mục tiêu
      return monthlyTarget > 0 ? ((revenue / monthlyTarget) * 100).toFixed(1) : '0';
    } else {
      // Các trạng thái khác: % so với tổng số đơn
      return totalOrdersData && totalOrdersData.revenue > 0 ? 
        ((revenue / totalOrdersData.revenue) * 100).toFixed(1) : '0';
    }
  };
  
  const targetPercentage = getTargetPercentage();

  return (
    <>
      {/* Desktop Version */}
      <div
        className={`hidden lg:block group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-xl ${
          isSelected 
            ? `${config.borderColor} shadow-lg ${config.bgColor}` 
            : `border-slate-200 hover:border-slate-300 bg-white/80 backdrop-blur-sm hover:${config.bgColor}`
        }`}
        onClick={onClick}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`}></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${config.gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
                {config.icon}
              </div>
              <div>
                <h3 className={`font-semibold ${config.textColor} text-sm`}>{title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Trạng thái đơn hàng</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`}></div>
                <span className="text-xs text-slate-500">Hoạt động</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900">
                  {count.toLocaleString()}
                </span>
                <span className="text-sm text-slate-500 font-medium">đơn hàng</span>
              </div>
              
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                  style={{ width: `${Math.min((count / 200) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Doanh thu</p>
                  <p className={`text-xl font-bold ${config.textColor} mt-1`}>
                    {formatCurrency(revenue)}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${config.gradient} text-white`}>
                    {targetPercentage}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">của mục tiêu</p>
                </div>
              </div>
              
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                  style={{ width: `${Math.min(parseFloat(targetPercentage), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Trung bình: {count > 0 ? formatCurrency(revenue / count) : '0 ₫'}/đơn</span>
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Cập nhật</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version - Touch Optimized */}
      <div
        className={`block lg:hidden relative rounded-xl border cursor-pointer transition-all duration-200 active:scale-95 touch-manipulation ${
          isSelected 
            ? `${config.borderColor} shadow-lg ${config.bgColor} ring-2 ring-blue-200` 
            : `border-slate-200 bg-white hover:shadow-md hover:${config.bgColor} active:shadow-xl`
        }`}
        onClick={onClick}
        style={{ minHeight: '120px' }}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} rounded-t-xl`}></div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${config.gradient} flex items-center justify-center text-white text-sm`}>
                {config.icon}
              </div>
              <div>
                <h3 className={`font-semibold ${config.textColor} text-sm`}>{title}</h3>
              </div>
            </div>
            
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`}></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">đơn hàng</div>
              
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full bg-gradient-to-r ${config.gradient}`}
                  style={{ width: `${Math.min((count / 200) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-600 mb-1">Doanh thu</div>
              <div className={`text-lg font-bold ${config.textColor}`}>
                {formatCurrency(revenue)}
              </div>
              
              <div className="mt-2 flex justify-end">
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${config.gradient} text-white`}>
                  {targetPercentage}%
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              Trung bình: {count > 0 ? formatCurrency(revenue / count) : '0 ₫'}/đơn
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusCard;
