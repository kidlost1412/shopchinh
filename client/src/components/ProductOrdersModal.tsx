import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import * as XLSX from 'xlsx';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const exportData = orders.map(order => ({
      'Mã đơn hàng': order.id,
      'Mã vận đơn': order.waybillCode,
      'Trạng thái': order.status,
      'Số lượng': order.quantity,
      'Doanh thu': order.revenue,
             'Ngày giao hàng': formatDate(order.deliveryDate),
       'Ngày tạo': formatDate(order.createDate),
       'Sản phẩm': order.productName,
       'Ghi chú': order.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    
    // Giới hạn tên sheet tối đa 31 ký tự (Excel requirement)
    const sheetName = `Đơn hàng - ${product.productName.substring(0, 20)}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Tạo tên file ngắn gọn hơn
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

        {/* Summary Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {orders.length}
              </div>
              <div className="text-sm text-gray-600">Tổng đơn hàng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {product.totalQuantity.toLocaleString('vi-VN')}
              </div>
              <div className="text-sm text-gray-600">Tổng số lượng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(product.totalRevenue)}
              </div>
              <div className="text-sm text-gray-600">Tổng doanh thu</div>
            </div>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">Không có đơn hàng nào</p>
              <p className="text-gray-400 text-sm">Hãy kiểm tra bộ lọc ngày tháng</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Mã đơn hàng</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Mã vận đơn</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Số lượng</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Doanh thu</th>
                                                              <th className="text-center py-3 px-4 font-semibold text-gray-700">Ngày giao hàng</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Sản phẩm</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-800">
                          {order.id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-600">
                          {order.waybillCode || 'N/A'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                          {order.quantity.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(order.revenue)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-gray-600 text-sm">
                          {formatDate(order.deliveryDate)}
                        </span>
                      </td>
                                                                      <td className="text-center py-3 px-4">
                          <span className="text-gray-600 text-sm font-medium">
                            {product.productName}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {order.notes ? (
                            <span className="text-gray-600 text-sm font-medium max-w-xs truncate block bg-yellow-50 px-2 py-1 rounded" title={order.notes}>
                              {order.notes}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
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
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Hiển thị {orders.length} đơn hàng
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
    </div>
  );
};

export default ProductOrdersModal;
