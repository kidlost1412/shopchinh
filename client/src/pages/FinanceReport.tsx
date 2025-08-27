import React, { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign, BarChart3, Search, FileDown, ChevronLeft, Eye, Wallet, CreditCard, CheckCircle, Clock, Megaphone, ArrowDownToLine, PieChart, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import OrderModal from '../components/OrderModal';
import { Order } from '../types';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';

// Custom styles for DatePicker to ensure it's always on top
const datePickerStyles = `
  .react-datepicker-popper {
    z-index: 9999 !important;
  }
  .react-datepicker {
    z-index: 9999 !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    border: 2px solid #e5e7eb !important;
    border-radius: 0.5rem !important;
    background-color: white !important;
  }
  .react-datepicker__header {
    background-color: #f3f4f6 !important;
    border-bottom: 1px solid #e5e7eb !important;
  }
  .react-datepicker__day--selected {
    background-color: #059669 !important;
  }
  .react-datepicker__day--in-selecting-range {
    background-color: #a7f3d0 !important;
  }
  .react-datepicker__day--in-range {
    background-color: #d1fae5 !important;
  }
`;

// Register Vietnamese locale
registerLocale('vi', vi);

// Finance-specific interfaces - Hoàn toàn độc lập
interface FinanceData {
  totalReceivedRevenue: number;
  totalReceivedOrders: number;
  totalPlatformCosts: number;
  reconciledOrdersCount: number;
  reconciledRevenue: number;
  unreconciledOrdersCount: number;
  unreconciledRevenue: number;
  currentTikTokBalance: number;
  totalWithdrawnAllTime: number;
  totalActualReceivedAllTime: number;
  advertisingData: {
    totalDeposit: number;
    totalTax: number;
    actualReceived: number;
    recordCount?: number;
    totalGvmFee?: number;
    gvmRecordCount?: number;
  };
  withdrawnInPeriod: number;
  costBreakdown: {
    affFee: number;
    shippingFee: number;
    shopShippingFee: number;
    platformFee: number;
    xtraFee: number;
    flashSaleFee: number;
    tax: number;
    tiktokSubsidy: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalOrdersProcessed: number;
  ordersInPeriod: number;
}

// Finance Date Presets - Độc lập với Dashboard
const FINANCE_DATE_PRESETS = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày qua', days: 7 },
  { label: 'Tháng này', days: -1, isThisMonth: true },
  { label: 'Tháng trước', days: -1, isLastMonth: true },
  { label: 'Quý này', days: -1, isThisQuarter: true },
  { label: 'Tùy chỉnh', days: -1, isCustom: true }
];

// Custom Date Input for Finance
const FinanceDateInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(({ value, onClick }, ref) => (
  <button 
    onClick={onClick} 
    ref={ref} 
    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center space-x-2 transition-all duration-200 shadow-md"
  >
    <span>📅</span>
    <span>{value || 'Chọn khoảng thời gian'}</span>
  </button>
));
FinanceDateInput.displayName = 'FinanceDateInput';

// Modal interfaces
interface FeeModalData {
  orders: any[];
  total: number;
  totalFee: number;
  feeType: string;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

const FinanceReport: React.FC = () => {
  // Finance State - Hoàn toàn độc lập
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Order list state - Replace modal with inline display
  const [selectedFeeType, setSelectedFeeType] = useState<string | null>(null);
  const [orderListData, setOrderListData] = useState<FeeModalData | null>(null);
  const [orderListLoading, setOrderListLoading] = useState<boolean>(false);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderPage, setOrderPage] = useState<number>(1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Order detail modal state - Only for order details
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Finance Date Range - Độc lập với Dashboard
  const [financeDateRange, setFinanceDateRange] = useState<{ startDate: string; endDate: string }>({ 
    startDate: '', 
    endDate: '' 
  });
  const [selectedFinancePreset, setSelectedFinancePreset] = useState<string>('Tháng này');
  const [showFinanceCustomDate, setShowFinanceCustomDate] = useState<boolean>(false);

  // Finance API base - Độc lập
  const FINANCE_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

  // Calculate Finance Date Range - Logic riêng biệt
  const calculateFinanceDateRange = useCallback((preset: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    // Helper function cho Finance
    const formatFinanceDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'Hôm nay':
        startDate = endDate = formatFinanceDate(now);
        break;
      case '7 ngày qua':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        startDate = formatFinanceDate(sevenDaysAgo);
        endDate = formatFinanceDate(now);
        break;
      case 'Tháng này':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatFinanceDate(thisMonthStart);
        endDate = formatFinanceDate(thisMonthEnd);
        break;
      case 'Tháng trước':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatFinanceDate(lastMonthStart);
        endDate = formatFinanceDate(lastMonthEnd);
        break;
      case 'Quý này':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        startDate = formatFinanceDate(quarterStart);
        endDate = formatFinanceDate(quarterEnd);
        break;
      default:
        return financeDateRange;
    }

    return { startDate, endDate };
  }, [financeDateRange]);

  // Load Finance Data  // Load Finance data
  const loadFinanceData = useCallback(async () => {
    if (!financeDateRange.startDate || !financeDateRange.endDate) return;
    
    try {
      setLoading(true);
      console.log('Loading finance data with range:', financeDateRange);
      
      const data = await apiService.getFinanceReport({
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate
      });
      
      console.log('Finance data loaded:', data);
      setFinanceData(data);
    } catch (error) {
      console.error('Error loading finance data:', error);
      setFinanceData(null);
    } finally {
      setLoading(false);
    }
  }, [financeDateRange]);

  // Handle Finance Preset Selection
  const handleFinancePresetSelect = (preset: string) => {
    setSelectedFinancePreset(preset);
    if (preset === 'Tùy chỉnh') {
      setShowFinanceCustomDate(true);
    } else {
      setShowFinanceCustomDate(false);
      const newRange = calculateFinanceDateRange(preset);
      setFinanceDateRange(newRange);
    }
  };

  // Handle Finance Date Change
  const handleFinanceDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    const newRange = {
      startDate: start ? start.toISOString().split('T')[0] : '',
      endDate: end ? end.toISOString().split('T')[0] : '',
    };
    setFinanceDateRange(newRange);
    if (start && end) {
      setSelectedFinancePreset('Tùy chỉnh');
      setShowFinanceCustomDate(true);
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0.0%';
    return ((value / total) * 100).toFixed(1) + '%';
  };

  // Hàm xuất Excel
  const exportToExcel = useCallback(async () => {
    if (!financeData) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    try {
      console.log('Starting Excel export...');
      // Lấy danh sách đơn hàng theo ngày tháng giống UI
      const ordersResponse = await apiService.getOrders({
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate,
        limit: 10000 // xuất toàn bộ, không phân trang
      });
      const orders = ordersResponse.data.orders || [];
      if (!Array.isArray(orders) || orders.length === 0) {
        throw new Error('Không có dữ liệu đơn hàng trong khoảng thời gian này');
      }

      // Lọc chỉ các đơn có trạng thái Đã nhận
      const filteredOrders = orders.filter((order: any) => {
        const status = (order.status || '').trim();
        return status === 'Đã nhận';
      });
      if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
        throw new Error('Không có đơn hàng "Đã nhận" trong khoảng thời gian này');
      }

      const dateRangeText = financeDateRange.startDate && financeDateRange.endDate
        ? `${new Date(financeDateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(financeDateRange.endDate).toLocaleDateString('vi-VN')}`
        : 'Tất cả thời gian';

      // Create comprehensive Excel with all order details
      const excelData = [
        ['BÁO CÁO CHI TIẾT ĐƠN HÀNG TIKTOK SHOP'],
        [`Thời gian: ${dateRangeText}`],
        [`Tổng số đơn: ${filteredOrders.length}`],
        [`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
        [],
        [
          'Mã đơn hàng',
          'Mã vận đơn',
          'Sản phẩm',
          'Số lượng',
          'Ngày đặt hàng',
          'Ngày đẩy ĐVVC',
          'Trạng thái',
          'Tỉnh/TP',
          'Doanh thu (chưa trừ phí)',
          'Phí Affiliate',
          'Phí Vận chuyển',
          'Phí VC Shop chịu',
          'Phí Sàn (9%)',
          'Phí Xtra',
          'Phí Flash Sale',
          'Thuế',
          'Phí TikTok Bù',
          'Lợi nhuận thực'
        ]
      ];

      filteredOrders.forEach((order: any, index: number) => {
        const productNames = order.products?.map((p: any) => p.name).join(', ') || order.productName || order.itemName || 'N/A';
        const totalQuantity = order.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || order.quantity || 1;
        const revenue = order.totalAmount || order.revenue || order.amount || order.orderValue || 0;
        const shippingDate = order.shippingDate ? new Date(order.shippingDate).toLocaleDateString('vi-VN') :
          order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('vi-VN') :
          order.shipDate ? new Date(order.shipDate).toLocaleDateString('vi-VN') :
          'N/A';
        const totalFees = (order.affFee || 0) + (order.shippingFee || 0) + (order.shopShippingFee || 0) +
          (order.actualFee9 || order.platformFee || 0) + (order.xtraFee || 0) +
          (order.flashSaleFee || 0) + (order.tax || 0);
        const profit = revenue - totalFees + (order.tiktokSubsidy || 0);
        excelData.push([
          order.id || order.orderId || order.orderNumber || '',
          order.trackingNumber || order.shippingCode || order.trackingId || '',
          productNames,
          totalQuantity,
          order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') :
            order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '',
          shippingDate,
          order.status || order.orderStatus || '',
          order.province || order.city || order.location || '',
          revenue,
          order.affFee || 0,
          order.shippingFee || 0,
          order.shopShippingFee || 0,
          order.actualFee9 || order.platformFee || 0,
          order.xtraFee || 0,
          order.flashSaleFee || 0,
          order.tax || 0,
          order.tiktokSubsidy || 0,
          profit
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const colWidths = [
        { wch: 20 }, // Mã đơn hàng
        { wch: 15 }, // Mã vận đơn
        { wch: 30 }, // Sản phẩm
        { wch: 10 }, // Số lượng
        { wch: 12 }, // Ngày đặt hàng
        { wch: 15 }, // Ngày đẩy ĐVVC
        { wch: 12 }, // Trạng thái
        { wch: 15 }, // Tỉnh/TP
        { wch: 15 }, // Doanh thu
        { wch: 12 }, // Phí Affiliate
        { wch: 12 }, // Phí Vận chuyển
        { wch: 12 }, // Phí VC Shop
        { wch: 12 }, // Phí Sàn
        { wch: 12 }, // Phí Xtra
        { wch: 12 }, // Phí Flash Sale
        { wch: 10 }, // Thuế
        { wch: 12 }, // Phí TikTok Bù
        { wch: 15 }  // Lợi nhuận thực
      ];
      ws['!cols'] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết đơn hàng');
      const fileName = `ChiTietDonHang_${dateRangeText.replace(/\//g, '-').replace(' - ', '_den_')}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert(`Đã xuất thành công ${filteredOrders.length} đơn hàng ra file Excel!`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Lỗi khi xuất Excel: ' + (error as Error).message);
    }
  }, [financeData, financeDateRange]);

  // Format number
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  // Fee type mapping for display
  const getFeeTypeName = (feeType: string): string => {
    const feeNames: { [key: string]: string } = {
      'affFee': 'Phí Affiliate',
      'shippingFee': 'Phí Vận Chuyển',
      'shopShippingFee': 'Phí VC Shop Chịu',
      'platformFee': 'Phí Sàn (9%)',
      'xtraFee': 'Phí Xtra',
      'flashSaleFee': 'Phí Flash Sale',
      'tax': 'Thuế',
      'tiktokSubsidy': 'Phí TikTok Bù'
    };
    return feeNames[feeType] || feeType;
  };

  // Handle fee card click - Show order list inline
  const handleFeeCardClick = async (feeType: string) => {
    try {
      setOrderListLoading(true);
      setSelectedFeeType(feeType);
      setOrderSearch('');
      setOrderPage(1);
      
      const data = await apiService.getOrdersByFeeType(feeType, {
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate,
        page: 1,
        limit: 10
      });
      
      setOrderListData(data);
    } catch (error) {
      console.error('Error loading fee details:', error);
    } finally {
      setOrderListLoading(false);
    }
  };

  // Handle order selection - Reuse logic from Dashboard
  const handleOrderSelect = async (orderId: string) => {
    try {
      const order = await apiService.getOrderDetails(orderId);
      setSelectedOrder(order);
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  // Close order list
  const handleCloseOrderList = () => {
    setSelectedFeeType(null);
    setOrderListData(null);
    setOrderSearch('');
    setOrderPage(1);
  };

  // Get fee value from order based on fee type
  const getFeeValueFromOrder = (order: any, feeType: string): number => {
    switch (feeType) {
      case 'platformFee':
        return order.actualFee9 || 0;
      case 'shippingFee':
        return order.shippingFee || 0;
      case 'shopShippingFee':
        return order.shopShippingFee || 0;
      case 'affFee':
        return order.affFee || 0;
      case 'xtraFee':
        return order.xtraFee || 0;
      case 'flashSaleFee':
        return order.flashSaleFee || 0;
      case 'tax':
        return order.tax || 0;
      case 'tiktokSubsidy':
        return order.tiktokSubsidy || 0;
      default:
        return order[feeType] || 0;
    }
  };

  // Get shipping date from order - smart column detection
  const getShippingDateFromOrder = (order: any): string => {
    // Try different possible column names for shipping date (column K)
    const shippingDateFields = [
      'shippingDate', 'deliveryDate', 'shipDate', 'ngayDayDVVC', 
      'ngayGuiHang', 'dateShipped', 'shippedDate'
    ];
    
    for (const field of shippingDateFields) {
      if (order[field]) {
        return new Date(order[field]).toLocaleString('vi-VN');
      }
    }
    
    // If no specific shipping date field, try to find from raw data
    if (order.rawData && Array.isArray(order.rawData)) {
      // Column K is index 10 (0-based)
      const columnK = order.rawData[10];
      if (columnK && columnK !== 'N/A' && columnK.trim() !== '') {
        try {
          return new Date(columnK).toLocaleString('vi-VN');
        } catch {
          return columnK; // Return as-is if not a valid date
        }
      }
    }
    
    return 'N/A';
  };

  // Get revenue from order - before fees deduction
  const getRevenueFromOrder = (order: any): number => {
    // Try different revenue field names
    const revenueFields = [
      'totalAmount', 'revenue', 'doanhThu', 'grossRevenue', 
      'totalRevenue', 'orderAmount', 'amount'
    ];
    
    for (const field of revenueFields) {
      if (order[field] && order[field] > 0) {
        return order[field];
      }
    }
    
    return 0;
  };

  // Export order list to Excel
  const exportOrderListToExcel = async () => {
    if (!orderListData || !selectedFeeType) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    try {
      alert('Đang chuẩn bị dữ liệu để xuất Excel... Vui lòng chờ.');

      // Fetch ALL orders for the selected fee type
      const allOrdersResponse = await apiService.getOrdersByFeeType(selectedFeeType, {
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate,
        page: 1,
        limit: 10000, // Fetch all records
        search: orderSearch // Preserve current search filter
      });

      const allOrders = allOrdersResponse.orders;

      if (!allOrders || allOrders.length === 0) {
        alert('Không tìm thấy đơn hàng nào phù hợp để xuất.');
        return;
      }

      const feeTypeName = getFeeTypeName(selectedFeeType);
      const dateRangeText = financeDateRange.startDate && financeDateRange.endDate
        ? `${new Date(financeDateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(financeDateRange.endDate).toLocaleDateString('vi-VN')}`
        : 'Tất cả thời gian';

      const excelData = [
        [`CHI TIẾT ĐƠN HÀNG - ${feeTypeName.toUpperCase()}`],
        [`Thời gian: ${dateRangeText}`],
        [`Tổng số đơn: ${allOrdersResponse.total}`],
        [`Tổng ${feeTypeName}: ${formatCurrency(allOrdersResponse.totalFee || 0)}`],
        [`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
        [],
        ['Mã đơn hàng', 'Sản phẩm', 'Ngày đẩy ĐVVC', 'Tỉnh/TP', `Chi phí (${feeTypeName})`, 'Trạng thái', 'Doanh thu']
      ];

      allOrders.forEach(order => {
        excelData.push([
          order.id || '',
          order.products?.[0]?.name || '',
          order.shippingDate ? new Date(order.shippingDate).toLocaleString('vi-VN') : '',
          order.province || '',
          getFeeValueFromOrder(order, selectedFeeType),
          order.status || '',
          getRevenueFromOrder(order)
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, feeTypeName);

      const fileName = `ChiTiet_${feeTypeName.replace(/\s/g, '')}_${dateRangeText.replace(/\//g, '-').replace(' - ', '_den_')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(`Xuất thành công ${allOrders.length} đơn hàng.`);

    } catch (error) {
      console.error('Lỗi khi xuất danh sách đơn hàng:', error);
      alert('Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại.');
    }
  };

  // Initialize Finance with default date range
  useEffect(() => {
    const defaultRange = calculateFinanceDateRange('Tháng này');
    setFinanceDateRange(defaultRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when date range changes
  useEffect(() => {
    if (financeDateRange.startDate && financeDateRange.endDate) {
      loadFinanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financeDateRange]);

  // Handle page change for order list pagination
  const handlePageChange = async (newPage: number) => {
    if (!orderListData) return;
    
    try {
      setOrderListLoading(true);
      setOrderPage(newPage);
      
      const data = await apiService.getOrdersByFeeType(orderListData.feeType, {
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate,
        search: orderSearch,
        page: newPage,
        limit: 10
      });
      
      setOrderListData(data);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setOrderListLoading(false);
    }
  };

  // Handle search in order list
  const handleSearchChange = async (searchTerm: string) => {
    if (!selectedFeeType) return;
    
    setOrderListLoading(true);
    setOrderPage(1); // Reset to first page on search
    
    try {
      const data = await apiService.getOrdersByFeeType(selectedFeeType, {
        startDate: financeDateRange.startDate,
        endDate: financeDateRange.endDate,
        search: searchTerm,
        page: 1,
        limit: 10
      });
      
      setOrderListData(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setOrderListLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchChange(searchTerm);
      }, 500);
    },
    [orderListData]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 md:p-6 lg:p-8">
      {/* Inject custom DatePicker styles */}
      <style dangerouslySetInnerHTML={{ __html: datePickerStyles }} />
      {/* Finance Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-green-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg md:text-2xl">💰</span>
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-800">
                  TikTok Finance Report
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Báo cáo tài chính chi tiết và phân tích doanh thu
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              {/* Display selected date range */}
              {(financeDateRange.startDate || financeDateRange.endDate) && (
                <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 md:px-4 py-2">
                  <span className="text-green-600 font-medium text-xs md:text-sm">📊</span>
                  <span className="text-green-800 text-xs md:text-sm font-medium">
                    {financeDateRange.startDate && financeDateRange.endDate
                      ? `${new Date(financeDateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(financeDateRange.endDate).toLocaleDateString('vi-VN')}`
                      : financeDateRange.startDate
                      ? `Từ ${new Date(financeDateRange.startDate).toLocaleDateString('vi-VN')}`
                      : `Đến ${new Date(financeDateRange.endDate!).toLocaleDateString('vi-VN')}`
                    }
                  </span>
                </div>
              )}
              
              {/* Export Excel Button */}
              <button
                onClick={exportToExcel}
                disabled={!financeData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 shadow-md"
              >
                <span>📊</span>
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Finance Date Filter Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-green-200/50 shadow-lg">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
            <span className="mr-2">⏰</span>
            Chọn khoảng thời gian báo cáo
          </h2>
          
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3">
            {FINANCE_DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleFinancePresetSelect(preset.label)}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  selectedFinancePreset === preset.label
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-green-50 border border-green-300'
                }`}>
                {preset.label}
              </button>
            ))}
            
          </div>
          
          {/* Custom Date Picker - Positioned below buttons to avoid overlap */}
          {showFinanceCustomDate && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-3">Chọn khoảng thời gian tùy chỉnh:</p>
              <DatePicker
                selected={financeDateRange.startDate ? new Date(financeDateRange.startDate) : null}
                onChange={handleFinanceDateChange}
                startDate={financeDateRange.startDate ? new Date(financeDateRange.startDate) : null}
                endDate={financeDateRange.endDate ? new Date(financeDateRange.endDate) : null}
                selectsRange
                monthsShown={window.innerWidth > 768 ? 2 : 1}
                locale="vi"
                dateFormat="dd/MM/yyyy"
                inline
                calendarClassName="shadow-lg border border-gray-300 rounded-lg bg-white"
              />
              <div className="flex items-center space-x-3 mt-3">
                <button
                  onClick={() => setShowFinanceCustomDate(false)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Đóng
                </button>
                {financeDateRange.startDate && financeDateRange.endDate && (
                  <span className="text-sm text-green-600 font-medium">
                    Đã chọn: {new Date(financeDateRange.startDate).toLocaleDateString('vi-VN')} - {new Date(financeDateRange.endDate).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <span className="ml-3 text-lg text-gray-600">Đang tải dữ liệu tài chính...</span>
          </div>
        ) : financeData ? (
          <div className="space-y-8">
            {/* Finance Summary Cards - Mobile Optimized Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {/* Row 1 - Primary Metrics */}
              {/* Tổng Doanh Thu Đã Nhận */}
              <div className="group relative bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full -translate-y-8 translate-x-8 md:-translate-y-16 md:translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {formatNumber(financeData.totalReceivedOrders)} đơn
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">Tổng Doanh Thu Đã Nhận</h3>
                  <p className="text-lg md:text-2xl font-bold text-blue-600 mb-1 md:mb-2">{formatCurrency(financeData.totalReceivedRevenue)}</p>
                  <div className="w-full bg-blue-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>

              {/* Tổng Chi Phí Sàn */}
              <div className="group relative bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-red-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-gradient-to-br from-red-50 to-red-100 rounded-full -translate-y-8 translate-x-8 md:-translate-y-16 md:translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <TrendingDown className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        {formatPercentage(financeData.totalPlatformCosts, financeData.totalReceivedRevenue)}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tổng Chi Phí Sàn</h3>
                  <p className="text-2xl font-bold text-red-600 mb-2">{formatCurrency(financeData.totalPlatformCosts)}</p>
                  <div className="w-full bg-red-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 h-1.5 rounded-full" style={{width: `${Math.min((financeData.totalPlatformCosts / financeData.totalReceivedRevenue) * 100, 100)}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Đã Đối Soát */}
              <div className="group relative bg-white rounded-2xl p-6 border border-green-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-50 to-green-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {formatNumber(financeData.reconciledOrdersCount)} đơn
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Đã Đối Soát</h3>
                  <p className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(financeData.reconciledRevenue)}</p>
                  <div className="w-full bg-green-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full" style={{width: `${Math.min((financeData.reconciledRevenue / financeData.totalReceivedRevenue) * 100, 100)}%`}}></div>
                  </div>
                </div>
              </div>

              {/* Chưa Đối Soát */}
              <div className="group relative bg-white rounded-2xl p-6 border border-orange-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                        {formatNumber(financeData.unreconciledOrdersCount)} đơn
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Chưa Đối Soát</h3>
                  <p className="text-2xl font-bold text-orange-600 mb-2">{formatCurrency(financeData.unreconciledRevenue || 0)}</p>
                  <div className="w-full bg-orange-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full" style={{width: `${Math.min((financeData.unreconciledRevenue / financeData.totalReceivedRevenue) * 100, 100)}%`}}></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Row 2 - Secondary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Tiền Quảng Cáo & GVM */}
              <div className="group relative bg-white rounded-2xl p-6 border border-indigo-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Megaphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                        GVM & ADS
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tiền Quảng Cáo & GVM</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 flex items-center">
                        <ArrowDownToLine className="w-3 h-3 mr-1" />Nộp:
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(financeData.advertisingData.totalDeposit)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 flex items-center">
                        <PieChart className="w-3 h-3 mr-1" />Thuế:
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(financeData.advertisingData.totalTax)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />Phí GVM:
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{formatCurrency(financeData.advertisingData.totalGvmFee || 0)}</span>
                    </div>
                    <div className="border-t border-indigo-100 pt-2 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Thực nhận:</span>
                        <span className="text-lg font-bold text-indigo-600">{formatCurrency(financeData.advertisingData.actualReceived)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rút Trong Kỳ */}
              <div className="group relative bg-white rounded-2xl p-6 border border-teal-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-teal-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <ArrowDownToLine className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                        Trong kỳ
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Rút Trong Kỳ</h3>
                  <p className="text-2xl font-bold text-teal-600 mb-2">{formatCurrency(financeData.withdrawnInPeriod)}</p>
                  <div className="w-full bg-teal-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-1.5 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
              </div>

              {/* Tổng Tiền Đã Rút */}
              <div className="group relative bg-white rounded-2xl p-6 border border-emerald-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <ArrowDownToLine className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tổng Tiền Đã Rút</h3>
                  <p className="text-2xl font-bold text-emerald-600 mb-2">{formatCurrency(financeData.totalWithdrawnAllTime)}</p>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>

              {/* Số Dư TikTok */}
              <div className="group relative bg-white rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        Hiện tại
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Số Dư TikTok Hiện Tại</h3>
                  <p className="text-2xl font-bold text-purple-600 mb-2">{formatCurrency(financeData.currentTikTokBalance)}</p>
                  <div className="w-full bg-purple-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full animate-pulse" style={{width: '85%'}}></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Cost Breakdown */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">📋</span>
                Chi Tiết Chi Phí
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div 
                  className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleFeeCardClick('affFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí Aff</h4>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(financeData.costBreakdown.affFee)}</p>
                  <p className="text-xs text-blue-500 mt-1">{formatPercentage(financeData.costBreakdown.affFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-green-50 p-4 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleFeeCardClick('shippingFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí Vận Chuyển</h4>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(financeData.costBreakdown.shippingFee)}</p>
                  <p className="text-xs text-green-500 mt-1">{formatPercentage(financeData.costBreakdown.shippingFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleFeeCardClick('shopShippingFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí VC Shop Chịu</h4>
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(financeData.costBreakdown.shopShippingFee)}</p>
                  <p className="text-xs text-yellow-500 mt-1">{formatPercentage(financeData.costBreakdown.shopShippingFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-red-50 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleFeeCardClick('platformFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí Sàn (9%)</h4>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(financeData.costBreakdown.platformFee)}</p>
                  <p className="text-xs text-red-500 mt-1">{formatPercentage(financeData.costBreakdown.platformFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleFeeCardClick('xtraFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí Xtra</h4>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(financeData.costBreakdown.xtraFee)}</p>
                  <p className="text-xs text-purple-500 mt-1">{formatPercentage(financeData.costBreakdown.xtraFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-indigo-50 p-4 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => handleFeeCardClick('flashSaleFee')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí Flash Sale</h4>
                  <p className="text-lg font-bold text-indigo-600">{formatCurrency(financeData.costBreakdown.flashSaleFee)}</p>
                  <p className="text-xs text-indigo-500 mt-1">{formatPercentage(financeData.costBreakdown.flashSaleFee, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleFeeCardClick('tax')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Thuế</h4>
                  <p className="text-lg font-bold text-gray-600">{formatCurrency(financeData.costBreakdown.tax)}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatPercentage(financeData.costBreakdown.tax, financeData.totalReceivedRevenue)}</p>
                </div>
                <div 
                  className="bg-emerald-50 p-4 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={() => handleFeeCardClick('tiktokSubsidy')}
                >
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Phí TikTok Bù</h4>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(financeData.costBreakdown.tiktokSubsidy)}</p>
                  <p className="text-xs text-emerald-500 mt-1">{formatPercentage(financeData.costBreakdown.tiktokSubsidy, financeData.totalReceivedRevenue)}</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">Chọn khoảng thời gian để xem báo cáo tài chính</p>
          </div>
        )}
      </div>

            {/* Order List Display when fee type is selected */}
            {selectedFeeType ? (
              /* Order List Display */
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200/50 shadow-lg">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleCloseOrderList}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                          Danh sách đơn hàng - {getFeeTypeName(selectedFeeType)}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {orderListData?.total || 0} đơn hàng
                        </p>
                      </div>
                    </div>
                    
                    {/* Search and Export */}
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm đơn hàng..."
                          value={orderSearch}
                          onChange={(e) => {
                            setOrderSearch(e.target.value);
                            debouncedSearch(e.target.value);
                          }}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                        />
                      </div>
                      <button
                        onClick={exportOrderListToExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-md"
                      >
                        <FileDown size={16} />
                        <span>Xuất Excel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order List */}
                <div className="p-6">
                  {orderListLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                  ) : orderListData?.orders.length ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Mã đơn hàng
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sản phẩm
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ngày đẩy ĐVVC
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Chi phí ({getFeeTypeName(selectedFeeType)})
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng thái
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Doanh thu
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {orderListData.orders.map((order, index) => (
                              <tr key={order.id || index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <button
                                    onClick={() => handleOrderSelect(order.id)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                                    title="Click để xem chi tiết đơn hàng"
                                  >
                                    {order.id || 'N/A'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                  <div className="truncate" title={order.products?.[0]?.name || 'N/A'}>
                                    {order.products?.[0]?.name || 'N/A'}
                                  </div>
                                  {order.products && order.products.length > 1 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      +{order.products.length - 1} sản phẩm khác
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {getShippingDateFromOrder(order)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                                  {formatCurrency(getFeeValueFromOrder(order, selectedFeeType))}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    order.status === 'Đã giao hàng' ? 'bg-green-100 text-green-800' :
                                    order.status === 'Đang giao hàng' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'Đã hủy' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {order.status || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                  {formatCurrency(getRevenueFromOrder(order))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {orderListData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-700">
                            Hiển thị {((orderPage - 1) * 10) + 1} - {Math.min(orderPage * 10, orderListData.total)} 
                            trong tổng số {orderListData.total} đơn hàng
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePageChange(orderPage - 1)}
                              disabled={orderPage === 1}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Trước
                            </button>
                            
                            {Array.from({ length: Math.min(5, orderListData.pagination.totalPages) }, (_, i) => {
                              const page = i + 1;
                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                                    page === orderPage
                                      ? 'bg-green-600 text-white'
                                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                            
                            <button
                              onClick={() => handlePageChange(orderPage + 1)}
                              disabled={orderPage === orderListData.pagination.totalPages}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-500 text-lg mb-2">Không có đơn hàng nào</div>
                      <div className="text-gray-400 text-sm">
                        {orderSearch ? 'Không tìm thấy đơn hàng phù hợp với từ khóa tìm kiếm' : 'Không có dữ liệu để hiển thị'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

      {/* Order Detail Modal - Reuse from Dashboard */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default FinanceReport;
