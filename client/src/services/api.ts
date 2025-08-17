import axios from 'axios';
import { 
  ApiResponse, 
  DashboardMetrics, 
  Order, 
  OrderFilters, 
  RevenueTrendData, 
  StatusDistributionData 
} from '../types';

// API Configuration with environment-based switching
const getApiBaseUrl = () => {
  const envMode = import.meta.env.VITE_ENV_MODE || 'development';
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  
  // If explicitly configured, use that
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // Auto-detect based on environment
  if (envMode === 'local' || import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  
  // Default to relative path for production
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    } else {
      throw new Error(error.response?.data?.error || 'An unexpected error occurred');
    }
  }
);

export const apiService = {
  // Get dashboard metrics
  async getDashboardMetrics(filters?: { startDate?: string; endDate?: string }): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get<ApiResponse<DashboardMetrics>>(`/dashboard/metrics?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch dashboard metrics');
    }
    
    return response.data.data;
  },

  // Get orders with filters
  async getOrders(filters: OrderFilters = {}): Promise<ApiResponse<{ orders: Order[]; total: number; pagination: any }>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<ApiResponse<{ orders: Order[]; total: number; pagination: any }>>(`/orders?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch orders');
    }
    
    return response.data;
  },

  // Get single order details
  async getOrderDetails(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch order details');
    }
    
    return response.data.data;
  },

  // Get revenue trend data
  async getRevenueTrend(filters?: { startDate?: string; endDate?: string }): Promise<RevenueTrendData[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get<ApiResponse<RevenueTrendData[]>>(`/analytics/revenue-trend?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch revenue trend data');
    }
    
    return response.data.data;
  },

  // Get status distribution data
  async getStatusDistribution(filters?: { startDate?: string; endDate?: string }): Promise<StatusDistributionData[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get<ApiResponse<StatusDistributionData[]>>(`/analytics/status-distribution?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch status distribution data');
    }
    
    return response.data.data;
  },

  // Refresh data cache
  async refreshData(): Promise<{ totalOrders: number; lastUpdated: number }> {
    const response = await api.post<ApiResponse<{ totalOrders: number; lastUpdated: number }>>('/refresh');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to refresh data');
    }
    
    return response.data.data;
  },

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string; cacheStatus: string }> {
    const response = await api.get<ApiResponse<{ message: string; timestamp: string; cacheStatus: string }>>('/health');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Health check failed');
    }
    
    return response.data.data;
  },

  // Get finance report data
  async getFinanceReport(filters?: { startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get<ApiResponse<any>>(`/finance?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch finance report');
    }
    
    return response.data.data;
  },

  // Get orders by fee type for modal details
  async getOrdersByFeeType(feeType: string, filters?: { 
    startDate?: string; 
    endDate?: string; 
    search?: string; 
    page?: number; 
    limit?: number 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<ApiResponse<any>>(`/finance/orders/${feeType}?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch orders by fee type');
    }
    
    return response.data.data;
  },

  // Get single order by ID (alias for getOrderDetails)
  async getOrderById(orderId: string): Promise<Order> {
    return this.getOrderDetails(orderId);
  },

  // =============================================================================
  // AFF API ENDPOINTS - HOÀN TOÀN ĐỘC LẬP
  // =============================================================================

  // Get AFF dashboard metrics - Main endpoint for 5 cards + top 3
  async getAffMetrics(filters?: { startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get<ApiResponse<any>>(`/aff/metrics?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch AFF metrics');
    }
    
    return response.data.data;
  },

  // Get AFF details table - For the main table
  async getAffDetails(filters?: { 
    startDate?: string; 
    endDate?: string; 
    page?: number; 
    limit?: number 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<ApiResponse<any>>(`/aff/details?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch AFF details');
    }
    
    return response.data.data;
  },

  // Get orders by AFF and status - For popup modals
  async getAffOrders(affName: string, status: string, filters?: { 
    startDate?: string; 
    endDate?: string; 
    search?: string;
    page?: number; 
    limit?: number 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const encodedAffName = encodeURIComponent(affName);
    const response = await api.get<ApiResponse<any>>(`/aff/orders/${encodedAffName}/${status}?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch AFF orders');
    }
    
    return response.data.data;
  },

  // Get content analysis for specific AFF - For inline analysis
  async getAffContentAnalysis(affName: string, filters?: { 
    startDate?: string; 
    endDate?: string 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const encodedAffName = encodeURIComponent(affName);
    const response = await api.get<ApiResponse<any>>(`/aff/analysis/${encodedAffName}?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch AFF content analysis');
    }
    
    return response.data.data;
  },

  // Refresh AFF cache
  async refreshAffData(): Promise<{ totalAffOrders: number; lastUpdated: number }> {
    const response = await api.post<ApiResponse<{ totalAffOrders: number; lastUpdated: number }>>('/aff/refresh');
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to refresh AFF data');
    }
    
    return response.data.data;
  }
};

export default apiService;
