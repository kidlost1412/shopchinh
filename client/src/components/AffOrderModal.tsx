import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';

interface AffOrder {
  id: string;
  productName: string;
  price: number;
  paymentAmount: number;
  quantity: number;
  status: string;
  statusMapped: string;
  contentType: string;
  contentTypeMapped: string;
  revenue: number;
  standardCommissionEstimated: number;
  standardCommissionActual: number;
  adCommissionEstimated: number;
  adCommissionActual: number;
  totalCommissionEstimated: number;
  totalCommissionActual: number;
  createDate: string;
  createDateParsed: Date | null;
  affName: string;
}

interface AffOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  affName: string;
  status: string;
  dateRange: { startDate: string; endDate: string };
}

const AffOrderModal: React.FC<AffOrderModalProps> = ({ isOpen, onClose, affName, status, dateRange }) => {
  const [orders, setOrders] = useState<AffOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<any>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Load orders
  const loadOrders = async () => {
    if (!isOpen || !affName || !status) return;
    
    try {
      setLoading(true);
      const data = await apiService.getAffOrders(affName, status, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        search: searchTerm,
        page: currentPage,
        limit: pageSize
      });
      
      setOrders(data.orders || []);
      setPagination(data.pagination);
      
    } catch (error) {
      console.error('[AffOrderModal] Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load orders when dependencies change
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, affName, status, dateRange, currentPage, pageSize, searchTerm]);
  
  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
    }
  }, [isOpen]);
  
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);
  
  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };
  
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };
  
  // Get status display name
  const getStatusName = (status: string): string => {
    const statusNames: { [key: string]: string } = {
      'total': 'Tất cả',
      'completed': 'Hoàn thành',
      'processing': 'Đang xử lý',
      'cancelled': 'Đã huỷ'
    };
    return statusNames[status] || status;
  };
  
  // Get content type display name
  const getContentTypeName = (type: string): string => {
    const typeNames: { [key: string]: string } = {
      'livestream': 'Phát trực tiếp',
      'video': 'Video',
      'display': 'Trang trưng bày',
      'external_traffic': 'Lưu lượng ngoài'
    };
    return typeNames[type] || type;
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Chi tiết đơn hàng</h3>
              <p className="text-purple-100 text-sm">
                {affName} - {getStatusName(status)} ({pagination?.totalCount || 0} đơn)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white p-2 hover:bg-purple-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo mã đơn, sản phẩm..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {/* Page size selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">đơn</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại nội dung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HH Tự nhiên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HH Quảng cáo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng HH</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order, index) => {
                    // Logic: Ưu tiên thực tế, fallback ước tính
                    const standardCommission = order.standardCommissionActual > 0 ? order.standardCommissionActual : order.standardCommissionEstimated;
                    const adCommission = order.adCommissionActual > 0 ? order.adCommissionActual : order.adCommissionEstimated;
                    const totalCommission = standardCommission + adCommission;
                    
                    return (
                      <tr key={`${order.id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={order.productName}>
                            {order.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.statusMapped === 'completed' ? 'bg-green-100 text-green-800' :
                            order.statusMapped === 'processing' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getContentTypeName(order.contentTypeMapped)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatCurrency(standardCommission)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{formatCurrency(adCommission)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">{formatCurrency(totalCommission)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.createDate?.split(' ')[0]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">Không có đơn hàng</div>
              <div className="text-gray-500 text-sm">
                {searchTerm ? 'Không tìm thấy đơn hàng phù hợp với từ khóa tìm kiếm' : 'Không có dữ liệu trong khoảng thời gian này'}
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.totalCount)} 
                trong tổng số {formatNumber(pagination.totalCount)} đơn
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                    const pageNum = Math.max(1, Math.min(
                      pagination.totalPages - 4,
                      Math.max(1, currentPage - 2)
                    )) + index;
                    
                    if (pageNum > pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === currentPage
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage >= pagination.totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffOrderModal;
