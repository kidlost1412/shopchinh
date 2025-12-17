import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import * as XLSX from 'xlsx';
import OrderModal from './OrderModal';
import { Order } from '../types';

interface ProductData {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  latestDeliveryDate: string;
}

interface ProductOrder {
  id: string;
  waybillCode: string;
  status: string;
  quantity: number;
  revenue: number;
  deliveryDate: string;
  createDate: string;
  productName: string;
  notes?: string;
}

interface ProductOrdersModalProps {
  product: ProductData;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
  countOnlyShippedOrders?: boolean;
}

const ProductOrdersModal: React.FC<ProductOrdersModalProps> = ({ 
  product, 
  onClose, 
  startDate, 
  endDate,
  countOnlyShippedOrders = false
}) => {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState<boolean>(false);
  const [orderDetailError, setOrderDetailError] = useState<string>('');

  // Handle order ID click to show detail
  const handleOrderClick = async (orderId: string) => {
    try {
      setSelectedOrderId(orderId);
      setOrderDetailLoading(true);
      setOrderDetailError('');
      const detail = await apiService.getOrderDetails(orderId);
      setOrderDetail(detail);
    } catch (err) {
      console.error('[ProductOrdersModal] Error loading order details:', err);
      setOrderDetailError('Không thể tải chi tiết đơn hàng');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setOrderDetailError('');
  };

  // Fetch product orders
  const fetchProductOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProductOrders(product.productName, { 
        startDate, 
        endDate,
        countOnlyShippedOrders 
      });
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error('Error fetching product orders:', error);
      setError('Không thể tải dữ liệu đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Load orders when modal opens or filter changes
  useEffect(() => {
    fetchProductOrders();
  }, [product.productName, startDate, endDate, countOnlyShippedOrders]);
  
  // Filter orders based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const term = searchTerm.trim().toLowerCase();
    const filtered = orders.filter(order => {
      // Null safety: ensure order ID exists
      if (!order.id) return false;
      
      // Search by last 4 digits or full order ID
      const orderId = order.id.toLowerCase();
      const waybillCode = (order.waybillCode || '').toLowerCase();
      
      // Check if search term matches last 4 digits
      if (term.length === 4 && orderId.length >= 4 && orderId.endsWith(term)) {
        return true;
      }
      
      // Check if search term is contained in order ID or waybill
      return orderId.includes(term) || waybillCode.includes(term);
    });
    
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Close modal on outside click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Export orders to Excel
  const handleExport = () => {
    if (filteredOrders.length === 0) {
      alert('Không có đơn hàng nào để xuất!');
      return;
    }
    
    const exportData = filteredOrders.map(order => ({
      'Mã đơn hàng': order.id || '',
      'Sản phẩm': order.productName || '',
      'Mã vận đơn': order.waybillCode || '',
      'Trạng thái': order.status || '',
      'Số lượng': order.quantity || 0,
      'Doanh thu': order.revenue || 0,
      'Ngày giao hàng': formatDate(order.deliveryDate),
      'Ngày tạo': formatDate(order.createDate),
      'Ghi chú': order.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    
    // Giới hạn tên sheet tối đa 31 ký tự và loại bỏ ký tự không hợp lệ
    const invalidChars = /[\[\]\*\/\\\?:]/g;
    let sheetName = `Đơn hàng - ${product.productName.substring(0, 15)}`;
    sheetName = sheetName.replace(invalidChars, '-').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Tạo tên file an toàn
    const shortProductName = product.productName.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `don-hang-${shortProductName}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'Đã nhận': 'bg-green-100 text-green-800',
      'Đã gửi hàng': 'bg-blue-100 text-blue-800',
      'Đã hoàn': 'bg-red-100 text-red-800',
      'Đang hoàn': 'bg-orange-100 text-orange-800',
      'Đã huỷ': 'bg-gray-100 text-gray-800',
      'Đã xác nhận': 'bg-purple-100 text-purple-800',
      'Đang đóng hàng': 'bg-yellow-100 text-yellow-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📦</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Chi tiết đơn hàng
              </h2>
              <p className="text-sm text-gray-500">
                {product.productName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={orders.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>📊</span>
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Stats & Search */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {filteredOrders.length}
              </div>
              <div className="text-xs text-gray-600">Hiển thị / {orders.length} đơn</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {product.totalQuantity.toLocaleString('vi-VN')}
              </div>
              <div className="text-xs text-gray-600">Tổng số lượng</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(product.totalRevenue)}
              </div>
              <div className="text-xs text-gray-600">Tổng doanh thu</div>
            </div>
            <div className="text-center bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.revenue, 0))}
              </div>
              <div className="text-xs text-gray-600">Doanh thu lọc</div>
            </div>
          </div>
          
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mã đơn (nhập 4 số cuối hoặc toàn bộ)..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <p className="text-red-600 text-lg">{error}</p>
              <button
                onClick={fetchProductOrders}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Thử lại
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">{searchTerm ? '🔍' : '📋'}</div>
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'Không tìm thấy đơn hàng' : 'Không có đơn hàng nào'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? `Không có kết quả cho "${searchTerm}"` : 'Hãy kiểm tra bộ lọc ngày tháng'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Mã đơn hàng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Sản phẩm</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Mã vận đơn</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Trạng thái</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Số lượng</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Doanh thu</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Ngày giao hàng</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOrderClick(order.id)}
                          className="font-mono text-sm font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          {order.id}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-700 font-medium max-w-xs truncate block" title={order.productName}>
                          {order.productName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-gray-600">
                          {order.waybillCode || '-'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {order.quantity.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-green-700 font-bold text-sm">
                          {formatCurrency(order.revenue)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-gray-600 text-xs">
                          {formatDate(order.deliveryDate)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {order.notes ? (
                          <span className="text-gray-600 text-xs font-medium max-w-xs truncate block bg-yellow-50 px-2 py-1 rounded" title={order.notes}>
                            {order.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {searchTerm ? (
                <span className="text-blue-700">
                  Hiển thị {filteredOrders.length} / {orders.length} đơn hàng
                </span>
              ) : (
                <span className="text-gray-600">Hiển thị {orders.length} đơn hàng</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId && orderDetail && (
        <OrderModal
          isOpen={true}
          onClose={closeOrderDetail}
          order={orderDetail}
        />
      )}
    </div>
  );
};

export default ProductOrdersModal;
