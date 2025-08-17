import React from 'react';
import Card, { CardContent, CardHeader } from './ui/Card';
import Pagination from './ui/Pagination';
import { Order } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { FiCheckCircle, FiTruck, FiXCircle, FiPackage, FiRefreshCw, FiAlertCircle, FiClock } from 'react-icons/fi';

// Helper function to truncate product name to 5-7 words
const truncateProductName = (name: string, maxWords: number = 6): string => {
  if (!name) return 'N/A';
  const words = name.split(' ');
  if (words.length <= maxWords) return name;
  return words.slice(0, maxWords).join(' ') + '...';
};

// New StatusBadge component for a professional look
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusStyles: { [key: string]: { icon: React.ReactNode; color: string; label: string } } = {
    'Đã nhận': { icon: <FiCheckCircle />, color: 'bg-green-100 text-green-800', label: 'Đã nhận' },
    'Đã gửi hàng': { icon: <FiTruck />, color: 'bg-blue-100 text-blue-800', label: 'Đã gửi' },
    'Đã huỷ': { icon: <FiXCircle />, color: 'bg-red-100 text-red-800', label: 'Đã huỷ' },
    'Đang đóng hàng': { icon: <FiPackage />, color: 'bg-yellow-100 text-yellow-800', label: 'Đang đóng' },
    'Đã hoàn': { icon: <FiRefreshCw />, color: 'bg-purple-100 text-purple-800', label: 'Đã hoàn' },
    'Đang hoàn': { icon: <FiRefreshCw className="animate-spin"/>, color: 'bg-purple-100 text-purple-800', label: 'Đang hoàn' },
    'Đã xác nhận': { icon: <FiClock />, color: 'bg-indigo-100 text-indigo-800', label: 'Đã xác nhận' },
    default: { icon: <FiAlertCircle />, color: 'bg-gray-100 text-gray-800', label: status },
  };

  const style = statusStyles[status] || statusStyles.default;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>
      <span className="mr-1">{style.icon}</span>
      {style.label}
    </span>
  );
};

interface OrderListProps {
  orders: Order[];
  loading: boolean;
  onOrderSelect: (order: Order) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalOrders: number;
}

const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  loading, 
  onOrderSelect,
  currentPage,
  onPageChange,
  totalOrders,
  totalPages
}) => {

  if (loading && orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600">Không có đơn hàng nào khớp với bộ lọc</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách đơn hàng</h3>
          <span className="text-sm text-gray-500">
            Hiển thị {orders.length} trên {totalOrders} đơn hàng
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Đơn hàng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Tỉnh/TP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ghi chú</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Doanh thu</th>
                <th className="px-4 py-3 w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <div className="text-sm font-bold text-gray-900">{order.id}</div>
                    <div className="text-xs text-gray-500">{order.waybillCode || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(order.deliveryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.province}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {order.products.length} SP
                    </div>
                    <div className="text-xs text-gray-500">
                      {truncateProductName(order.products[0]?.name || 'N/A', 5)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600 truncate max-w-32">
                      {order.notes || 'Không có'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(order.revenueBeforeFees || order.revenue)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => onOrderSelect(order)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden space-y-3 p-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-900 mb-1">{order.id}</div>
                  <div className="text-sm text-gray-500">{order.waybillCode || 'N/A'}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Ngày:</span>
                  <div className="font-medium">{formatDate(order.deliveryDate)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Tỉnh/TP:</span>
                  <div className="font-medium">{order.province}</div>
                </div>
                <div>
                  <span className="text-gray-500">Sản phẩm:</span>
                  <div className="font-medium">{order.products.length} SP</div>
                  <div className="text-xs text-gray-500">{truncateProductName(order.products[0]?.name || 'N/A', 4)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Ghi chú:</span>
                  <div className="font-medium text-xs">{order.notes || 'Không có'}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(order.revenueBeforeFees || order.revenue)}
                </div>
                <button 
                  onClick={() => onOrderSelect(order)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </Card>
  );
};

export default OrderList;
