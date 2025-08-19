import React, { useState, useCallback, useEffect, forwardRef } from 'react';
import StatusCard from './components/StatusCard';
import OrderList from './components/OrderList';
import OrderModal from './components/OrderModal';
import Charts from './components/Charts';
import Button from './components/ui/Button';
import FinanceReport from './pages/FinanceReport';
import AffDashboard from './pages/AffDashboard';
import ProductAnalysis from './components/ProductAnalysis';
import { DashboardMetrics, Order, StatusKey } from './types';
import { exportToExcel } from './utils';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';

// Register Vietnamese locale for date picker
registerLocale('vi', vi);

// Date preset configurations
const DATE_PRESETS = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày', days: 7 },
  { label: 'Tháng này', days: -1, isThisMonth: true },
  { label: 'Tháng trước', days: -1, isLastMonth: true },
  { label: 'Năm nay', days: -1, isThisYear: true },
  { label: 'Tùy chỉnh', days: -1, isCustom: true }
];

// Custom Date Input for DatePicker for a professional look
interface CustomDateInputProps {
  value?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const CustomDateInput = forwardRef<HTMLButtonElement, CustomDateInputProps>(({ value, onClick }, ref) => (
  <button 
    onClick={onClick} 
    ref={ref} 
    className="px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 transition-all duration-200"
  >
    <span>📅</span>
    <span>{value || 'Tùy chỉnh ngày'}</span>
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

function App() {
  // Navigation state - Thêm AFF tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'aff'>('dashboard');
  
  // Core state management
  const [filteredMetrics, setFilteredMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Date range state
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({ 
    startDate: '', 
    endDate: '' 
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('7 ngày');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  
  // UI state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showOrderList, setShowOrderList] = useState<boolean>(false);
  const [columnWarnings, setColumnWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState<boolean>(false);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [showTargetInput, setShowTargetInput] = useState<boolean>(false);

  // AFF Background Loading State - INDEPENDENT
  const [affDataPreloaded, setAffDataPreloaded] = useState<boolean>(false);
  const [affDataLoading, setAffDataLoading] = useState<boolean>(false);

  // API base URL
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

  // Calculate date range based on preset - Fixed timezone issues
  const calculateDateRange = useCallback((preset: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    // Helper function to format date correctly for Vietnamese timezone
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'Hôm nay':
        startDate = endDate = formatDate(now);
        break;
      case '7 ngày':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        startDate = formatDate(sevenDaysAgo);
        endDate = formatDate(now);
        break;
      case 'Tháng này':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatDate(thisMonthStart);
        endDate = formatDate(thisMonthEnd);
        break;
      case 'Tháng trước':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatDate(lastMonthStart);
        endDate = formatDate(lastMonthEnd);
        break;
      case 'Năm nay':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = formatDate(yearStart);
        endDate = formatDate(now);
        break;
      default:
        // Keep current custom range
        return dateRange;
    }

    return { startDate, endDate };
  }, [dateRange]);

  // Load dashboard metrics (initial load)
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await fetch(`${API_BASE}/dashboard/metrics?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setFilteredMetrics(result.data);
        
        // Handle column warnings
        if (result.columnWarnings && result.columnWarnings.length > 0) {
          setColumnWarnings(result.columnWarnings);
          setShowWarnings(true);
        } else {
          setColumnWarnings([]);
          setShowWarnings(false);
        }
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Load monthly target from API
  const loadTarget = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/target`);
      const result = await response.json();
      
      if (result.success) {
        setMonthlyTarget(result.data.monthlyTarget || 0);
      }
    } catch (error) {
      console.error('Error loading target:', error);
    }
  }, [API_BASE]);

  // Save monthly target to API
  const saveTarget = useCallback(async (newTarget: number) => {
    try {
      const response = await fetch(`${API_BASE}/target`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monthlyTarget: newTarget }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMonthlyTarget(newTarget);
        console.log('Target saved successfully:', result.message);
      } else {
        console.error('Failed to save target:', result.error);
      }
    } catch (error) {
      console.error('Error saving target:', error);
    }
  }, [API_BASE]);

  // Load orders with advanced filtering
  const loadOrders = useCallback(async (page = 1) => {
    try {
      setOrdersLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (selectedStatus && selectedStatus !== 'Tổng số đơn') params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await fetch(`${API_BASE}/orders?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data.orders);
        setTotalOrders(result.data.total);
        setTotalPages(result.data.pagination.totalPages);
        setCurrentPage(result.data.pagination.page);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedStatus, searchTerm, dateRange]);

  // Load charts data
  const loadCharts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await fetch(`${API_BASE}/dashboard/charts?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setRevenueData(result.data.revenueData || []);
        setStatusData(result.data.statusData || []);
      }
    } catch (error) {
      console.error('Error loading charts:', error);
    }
  }, [dateRange]);

  // Handle advanced status click with calculation algorithm
  const handleStatusClick = (status: StatusKey) => {
    // If the same status is clicked, toggle the list visibility
    if (selectedStatus === status) {
      setShowOrderList((prev: boolean) => !prev);
    } else {
      setSelectedStatus(status);
      setShowOrderList(true); // Always show when a new status is selected
    }
    setCurrentPage(1); // Reset to first page on any status click
  };

  // Handle date preset selection
  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === 'Tùy chỉnh') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      const newRange = calculateDateRange(preset);
      setDateRange(newRange);
    }
  };

  // Handle date change from DatePicker
  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    const newRange = {
      startDate: start ? start.toISOString().split('T')[0] : '',
      endDate: end ? end.toISOString().split('T')[0] : '',
    };
    setDateRange(newRange);
    if (start && end) {
        setSelectedPreset('Tùy chỉnh');
        setShowCustomDate(true);
    }
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    if (showOrderList) {
      loadOrders(1);
    }
  };

  // Handle order selection
  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    loadOrders(page);
  };

  // Handle export
  const handleExport = () => {
    if (orders.length > 0) {
      const timestamp = new Date().toISOString().split('T')[0];
      exportToExcel(orders, `orders_${timestamp}`);
    }
  };

  // Load initial data and monthly target
  useEffect(() => {
    // Set default date range to 7 days on initial load using the new format function
    const defaultRange = calculateDateRange('7 ngày');
    setDateRange(defaultRange);
    
    // Load monthly target from localStorage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const savedTarget = localStorage.getItem(`monthlyTarget_${currentMonth}`);
    if (savedTarget) {
      setMonthlyTarget(parseFloat(savedTarget));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save monthly target to localStorage
  const saveMonthlyTarget = (target: number) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    localStorage.setItem(`monthlyTarget_${currentMonth}`, target.toString());
    setMonthlyTarget(target);
  };

  // Calculate target achievement percentage
  const calculateTargetProgress = (): { percentage: number; achieved: number; remaining: number } => {
    if (!filteredMetrics || monthlyTarget === 0) {
      return { percentage: 0, achieved: 0, remaining: monthlyTarget };
    }
    
    const totalRevenue = filteredMetrics['Tổng số đơn'].revenue;
    const percentage = (totalRevenue / monthlyTarget) * 100;
    const remaining = Math.max(0, monthlyTarget - totalRevenue);
    
    return {
      percentage: Math.min(percentage, 100),
      achieved: totalRevenue,
      remaining
    };
  };

  // Background AFF Data Preloading - INDEPENDENT
  const preloadAffData = useCallback(async () => {
    try {
      setAffDataLoading(true);
      console.log('[App] Background preloading AFF data...');
      
      // Calculate current month date range for AFF
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const affDateRange = {
        startDate: formatDate(thisMonthStart),
        endDate: formatDate(thisMonthEnd)
      };
      
      // Preload AFF metrics (this will trigger cache population)
      await fetch(`${API_BASE}/aff/metrics?startDate=${affDateRange.startDate}&endDate=${affDateRange.endDate}`);
      
      console.log('[App] AFF data preloaded successfully');
      setAffDataPreloaded(true);
      
    } catch (error) {
      console.error('[App] Error preloading AFF data:', error);
      // Don't block the app if AFF preload fails
    } finally {
      setAffDataLoading(false);
    }
  }, [API_BASE]);

  // Load target on component mount
  useEffect(() => {
    loadTarget();
  }, [loadTarget]);

  // Background AFF preloading on app start - INDEPENDENT
  useEffect(() => {
    // Start AFF preloading after a short delay to not interfere with main dashboard
    const timer = setTimeout(() => {
      preloadAffData();
    }, 2000); // 2 second delay
    
    return () => clearTimeout(timer);
  }, [preloadAffData]);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      loadMetrics();
      loadCharts();
      // If a status is selected, reload orders when date changes
      if (selectedStatus) {
        loadOrders(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMetrics, loadCharts, dateRange]);

  // EFFECT: Load orders when status, page, or search term changes.
  // This is the key fix for the "double-click" bug.
  useEffect(() => {
    if (selectedStatus) {
      loadOrders(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, currentPage, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header with Advanced Date Picker */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/80">
        <div className="w-full mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  TikTok Shop {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'finance' ? 'Finance' : 'AFF'}
                </h1>
                <p className="text-sm text-gray-500">
                  {activeTab === 'dashboard' ? 'Quản lý đơn hàng thông minh' : 
                   activeTab === 'finance' ? 'Báo cáo tài chính chi tiết' : 
                   'Phân tích hiệu suất Affiliate'}
                </p>
              </div>
              
              {/* Navigation Tabs */}
              <div className="hidden md:flex ml-8 space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('finance')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'finance'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💰 Finance
                </button>
                <button
                  onClick={() => setActiveTab('aff')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative ${
                    activeTab === 'aff'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎯 AFF
                  {/* AFF Data Status Indicator */}
                  {affDataLoading && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                  )}
                  {affDataPreloaded && !affDataLoading && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Chỉ hiển thị date presets cho Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="flex items-center space-x-2">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset.label)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      selectedPreset === preset.label
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}>
                    {preset.label}
                  </button>
                ))}
                
                {showCustomDate && (
                  <div className="relative">
                    <DatePicker
                      selected={dateRange.startDate ? new Date(dateRange.startDate) : null}
                      onChange={handleDateChange}
                      startDate={dateRange.startDate ? new Date(dateRange.startDate) : null}
                      endDate={dateRange.endDate ? new Date(dateRange.endDate) : null}
                      selectsRange
                      isClearable
                      customInput={<CustomDateInput />}
                      popperPlacement="bottom-end"
                      monthsShown={2}
                      locale="vi"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                )}
                
                {/* Display selected date range */}
                {(dateRange.startDate || dateRange.endDate) && (
                  <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-green-600 font-medium text-sm">📅</span>
                    <span className="text-green-800 text-sm font-medium">
                      {dateRange.startDate && dateRange.endDate
                        ? `${new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(dateRange.endDate).toLocaleDateString('vi-VN')}`
                        : dateRange.startDate
                        ? `Từ ${new Date(dateRange.startDate).toLocaleDateString('vi-VN')}`
                        : `Đến ${new Date(dateRange.endDate!).toLocaleDateString('vi-VN')}`
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conditional Page Rendering */}
      {activeTab === 'finance' ? (
        <FinanceReport />
      ) : activeTab === 'aff' ? (
        <AffDashboard />
      ) : (
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Column Warnings Alert */}
          {showWarnings && columnWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600">⚠️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Cảnh báo cấu trúc dữ liệu
                    </h3>
                    <div className="space-y-1">
                      {columnWarnings.map((warning: string, index: number) => (
                        <p key={index} className="text-sm text-yellow-700">
                          • {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarnings(false)}
                  className="text-yellow-600 hover:text-yellow-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Monthly Target Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm lg:text-lg">🎯</span>
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                    Mục tiêu T{new Date().getMonth() + 1}/{new Date().getFullYear()}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-600 hidden lg:block">Theo dõi tiến độ hoàn thành mục tiêu</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowTargetInput(!showTargetInput)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {monthlyTarget > 0 ? 'Sửa' : 'Đặt'}
              </button>
            </div>

            {showTargetInput && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-purple-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nhập mục tiêu doanh thu (VNĐ):
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    placeholder="Ví dụ: 600000000 (600 triệu)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const target = parseFloat((e.target as HTMLInputElement).value);
                        if (target > 0) {
                          saveTarget(target);
                          setShowTargetInput(false);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                      const target = parseFloat(input.value);
                      if (target > 0) {
                        saveTarget(target);
                        setShowTargetInput(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            )}

            {monthlyTarget > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
                  {(() => {
                    const progress = calculateTargetProgress();
                    return (
                      <>
                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-gray-200">
                          <div className="text-xs lg:text-sm text-gray-600 mb-1">Mục tiêu</div>
                          <div className="text-lg lg:text-xl font-bold text-purple-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(monthlyTarget)}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-gray-200">
                          <div className="text-xs lg:text-sm text-gray-600 mb-1">Đã đạt được</div>
                          <div className="text-lg lg:text-xl font-bold text-green-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(progress.achieved)}
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 lg:p-4 border border-gray-200">
                          <div className="text-xs lg:text-sm text-gray-600 mb-1">Còn lại</div>
                          <div className="text-lg lg:text-xl font-bold text-orange-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(progress.remaining)}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Tiến độ hoàn thành</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {calculateTargetProgress().percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(calculateTargetProgress().percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Cards with Advanced Algorithm */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/60 backdrop-blur-sm rounded-2xl animate-pulse" />
              ))
            ) : (
              filteredMetrics ? Object.entries(filteredMetrics).map(([status, data]) => {
                const typedData = data as { count: number; revenue: number };
                return (
                  <StatusCard
                    key={status}
                    title={status}
                    count={typedData.count}
                    revenue={typedData.revenue}
                    isSelected={selectedStatus === status}
                    onClick={() => handleStatusClick(status as StatusKey)}
                    monthlyTarget={monthlyTarget}
                    totalOrdersData={filteredMetrics['Tổng số đơn']}
                  />
                );
              }) : []
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Charts 
              revenueData={revenueData}
              statusData={statusData}
              loading={loading}
            />
          </div>

          {/* Product Analysis Section - NEW FEATURE */}
          <div className="w-full">
            <ProductAnalysis startDate={dateRange.startDate} endDate={dateRange.endDate} />
          </div>

          {/* Advanced Orders List - Shows when status card is clicked */}
          {showOrderList && (
            <div className="space-y-4">
              {/* Search and Export Controls */}
              <div className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo mã đơn hàng, mã vận đơn..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-80 pl-10 pr-4 py-2 bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                      🔍
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedStatus ? `Đơn hàng: ${selectedStatus}` : 'Tất cả đơn hàng'} ({totalOrders})
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleExport}
                    disabled={orders.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Xuất Excel</span>
                  </Button>
                  <Button
                    onClick={() => setShowOrderList(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <span>Ẩn danh sách</span>
                  </Button>
                </div>
              </div>

              <OrderList 
                orders={orders}
                loading={ordersLoading}
                onOrderSelect={handleOrderSelect}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalOrders={totalOrders}
              />
            </div>
          )}

          {selectedOrder && (
            <OrderModal 
              order={selectedOrder} 
              onClose={() => setSelectedOrder(null)} 
            />
          )}
        </main>
      )}
    </div>
  );
}

export default App;