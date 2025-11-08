export interface Product {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  image: string;
  revenue: number;
}

export interface Order {
  id: string;
  waybillCode: string;
  status: string;
  province: string;
  deliveryDate: string;
  revenue: number;
  actualPayment: number;
  createDate: string;
  updateDate: string;
  products: Product[];
  notes: string;
  // Additional financial fields - Updated for new CSV structure
  reconciliationFee?: number;
  platformSubsidy?: number;
  otherFee?: number;
  affFee?: number;
  affName?: string;
  shippingFee?: number;
  actualReceived?: number;
  shopShippingFee?: number;
  transactionFee?: number;
  tiktokCommission?: number;
  actualFee9?: number;
  xtraFee?: number;
  flashSaleFee?: number;
  tax?: number;
  tiktokSubsidy?: number;
  revenueBeforeFees?: number;
  // Parsed dates for better handling
  deliveryDateParsed?: Date;
  createDateParsed?: Date;
  updateDateParsed?: Date;
  // Thêm cho chi tiết đơn hàng lấy động theo tên cột
  rawData?: any[];
  headers?: string[];
}

export interface StatusMetric {
  count: number;
  revenue: number;
  relativeToSelected?: number;
}

export interface DashboardMetrics {
  'Tổng số đơn': StatusMetric;
  'Đã nhận hàng': StatusMetric;
  'Đã gửi hàng': StatusMetric;
  'Đã hoàn': StatusMetric;
  'Đang hoàn': StatusMetric;
  'Đã huỷ': StatusMetric;
  'Đã xác nhận': StatusMetric;
  'Đang đóng hàng': StatusMetric;
}

export interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusDistributionData {
  name: string;
  value: number;
  revenue: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  totalOrders?: number;
  lastUpdated?: number;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  status?: string | null;
  search?: string;
  page?: number;
  limit?: number;
}

export type StatusKey = keyof DashboardMetrics;
