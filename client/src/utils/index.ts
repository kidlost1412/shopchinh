import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import * as XLSX from 'xlsx';
import { Order, StatusKey } from '../types';

// Format currency in Vietnamese Dong
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format number with thousand separators
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

// Format date for display
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    // Handle Vietnamese date format: "16:23 11/06/2025"
    const cleanDate = dateStr.includes(' ') ? dateStr.split(' ')[1] : dateStr;
    const [day, month, year] = cleanDate.split('/');
    
    if (day && month && year) {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'dd/MM/yyyy');
    }
    
    return dateStr;
  } catch (error) {
    return dateStr;
  }
};

// Get date range presets - Updated with fixed timezone handling
export const getDateRangePresets = () => {
  const today = new Date();
  
  // Helper function to format date correctly for Vietnamese timezone
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    today: {
      label: 'Hôm nay',
      startDate: formatDate(today),
      endDate: formatDate(today),
    },
    last7Days: {
      label: '7 ngày qua',
      startDate: formatDate(subDays(today, 7)),
      endDate: formatDate(today),
    },
    thisMonth: {
      label: 'Tháng này',
      startDate: formatDate(startOfMonth(today)),
      endDate: formatDate(endOfMonth(today)),
    },
    lastMonth: {
      label: 'Tháng trước',
      startDate: formatDate(startOfMonth(subMonths(today, 1))),
      endDate: formatDate(endOfMonth(subMonths(today, 1))),
    },
    thisYear: {
      label: 'Năm nay',
      startDate: formatDate(startOfYear(today)),
      endDate: formatDate(today),
    },
  };
};

// Get status color for UI
export const getStatusColor = (status: StatusKey): string => {
  const colorMap: Record<StatusKey, string> = {
    'Tổng số đơn': 'bg-blue-500',
    'Đã nhận hàng': 'bg-green-500',
    'Đã gửi hàng': 'bg-yellow-500',
    'Đã hoàn': 'bg-purple-500',
    'Đang hoàn': 'bg-orange-500',
    'Đã huỷ': 'bg-red-500',
    'Đã xác nhận': 'bg-teal-500',
    'Đang đóng hàng': 'bg-indigo-500',
  };
  
  return colorMap[status] || 'bg-gray-500';
};

// Get status icon
export const getStatusIcon = (status: StatusKey): string => {
  const iconMap: Record<StatusKey, string> = {
    'Tổng số đơn': '📊',
    'Đã nhận hàng': '✅',
    'Đã gửi hàng': '🚚',
    'Đã hoàn': '↩️',
    'Đang hoàn': '🔄',
    'Đã huỷ': '❌',
    'Đã xác nhận': '✔️',
    'Đang đóng hàng': '📦',
  };
  
  return iconMap[status] || '📋';
};

// Export orders to Excel
export const exportToExcel = (orders: Order[], filename: string = 'orders') => {
  // Prepare data for export
  const exportData = orders.map(order => ({
    'Mã đơn hàng': order.id,
    'Mã vận đơn': order.waybillCode,
    'Trạng thái': order.status,
    'Tỉnh/Thành phố': order.province,
    'Ngày tạo': formatDate(order.createDate),
    'Ngày giao hàng': formatDate(order.deliveryDate),
    'Doanh thu': order.revenue,
    'Thanh toán thực tế': order.actualPayment,
    'Số sản phẩm': order.products.length,
    'Sản phẩm chính': order.products[0]?.name || '',
    'Ghi chú': order.notes,
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Mã đơn hàng
    { wch: 15 }, // Mã vận đơn
    { wch: 15 }, // Trạng thái
    { wch: 15 }, // Tỉnh/Thành phố
    { wch: 12 }, // Ngày tạo
    { wch: 12 }, // Ngày giao hàng
    { wch: 15 }, // Doanh thu
    { wch: 15 }, // Thanh toán thực tế
    { wch: 10 }, // Số sản phẩm
    { wch: 30 }, // Sản phẩm chính
    { wch: 20 }, // Ghi chú
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  // Generate filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Generate random color for charts
export const generateChartColors = (count: number): string[] => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

// Validate date range
export const isValidDateRange = (startDate?: string, endDate?: string): boolean => {
  if (!startDate || !endDate) return true;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  } catch {
    return false;
  }
};
