import React from 'react';
import Modal from './ui/Modal';
import { Order, Product } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { FiFileText, FiDollarSign, FiBox, FiMapPin, FiCalendar, FiTag, FiTruck, FiCheckCircle } from 'react-icons/fi';

interface OrderModalProps {
  order: Order;
  isOpen?: boolean;
  onClose: () => void;
}

// Helper component for displaying data in a clean, two-column grid
const InfoItem: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500 flex items-center">
      {icon && <span className="mr-2 text-gray-400">{icon}</span>}
      {label}
    </dt>
    <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
  </div>
);

// Main Modal Component
const OrderModal: React.FC<OrderModalProps> = ({ order, isOpen = true, onClose }) => {
  // Calculate totals based on products
  const totalUnitPrice = order.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
  const totalDiscount = order.products.reduce((sum, product) => sum + (product.discount || 0), 0);
  
  // Get revenue from correct fields
  const revenueBeforeFees = order.revenueBeforeFees || 0; // From REVENUE column
  const totalReceived = order.actualReceived || 0; // From ACTUAL_RECEIVED column

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết đơn hàng: ${order.id}`} size="xl">
      <div className="space-y-3 lg:space-y-6 p-1 max-h-[85vh] overflow-y-auto bg-gray-50/50 rounded-lg">
        
        {/* Section: Order & Customer Info */}
        <section className="bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl p-4 lg:p-6 shadow-sm">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center"><FiFileText className="mr-2 lg:mr-3 text-blue-500"/>Thông tin chung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-8 gap-y-3 lg:gap-y-6">
            <InfoItem label="Mã vận đơn" value={order.waybillCode || 'N/A'} icon={<FiTruck />} />
            <InfoItem label="Trạng thái" value={<span className={`font-bold ${order.status === 'Đã nhận' ? 'text-green-600' : 'text-gray-800'}`}>{order.status}</span>} icon={<FiCheckCircle />} />
            <InfoItem label="Tỉnh/Thành phố" value={order.province || 'N/A'} icon={<FiMapPin />} />
            <InfoItem label="Ngày tạo đơn" value={formatDate(order.createDate)} icon={<FiCalendar />} />
            <InfoItem label="Ngày giao hàng" value={formatDate(order.deliveryDate)} icon={<FiCalendar />} />
            <InfoItem label="Ghi chú" value={order.notes || 'Không có'} icon={<FiTag />} />
          </div>
        </section>

        {/* Section: Financial Breakdown - Enhanced */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiDollarSign className="mr-2 text-green-500"/>
            Phân tích tài chính chi tiết
          </h3>
          
          {/* Revenue Summary - Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Doanh thu chưa trừ phí</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(revenueBeforeFees)}</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <div className="text-sm text-red-700 mb-1">Sàn trợ giá</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(order.platformSubsidy || 0)}</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-700 mb-1">Shop giảm giá</div>
              <div className="text-xl font-bold text-orange-600">{formatCurrency(totalDiscount)}</div>
            </div>
          </div>

          {/* Payment Summary - Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-700 mb-1">Khách thanh toán</div>
              <div className="text-xl font-bold text-purple-600">{formatCurrency(order.actualPayment || 0)}</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-sm text-green-700 mb-1">Thực nhận</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
            </div>
          </div>

          {/* Detailed Fee Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <span className="mr-2">💰</span>
              Chi tiết các khoản phí
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Affiliate Fee */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí Affiliate</div>
                <div className="text-sm font-bold text-purple-600">{formatCurrency(order.affFee || 0)}</div>
                {order.affName && (
                  <div className="text-xs text-gray-500 mt-1 truncate">{order.affName}</div>
                )}
              </div>
              
              {/* Shipping Fee */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí vận chuyển</div>
                {order.shippingFee !== undefined && order.shippingFee !== null
                  ? <div className="text-sm font-bold text-blue-600">{formatCurrency(order.shippingFee)}</div>
                  : <div className="text-sm font-bold text-red-600">Không có dữ liệu phí vận chuyển</div>
                }
              </div>
              
              {/* Shop Shipping Fee */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí VC shop chịu</div>
                {order.shopShippingFee !== undefined && order.shopShippingFee !== null
                  ? <div className="text-sm font-bold text-indigo-600">{formatCurrency(order.shopShippingFee)}</div>
                  : <div className="text-sm font-bold text-red-600">Không có dữ liệu phí VC shop chịu</div>
                }
              </div>
              
              {/* Platform Fee 9% */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí sàn 9%</div>
                <div className="text-sm font-bold text-red-600">{formatCurrency(order.actualFee9 || 0)}</div>
              </div>
              
              {/* Extra Fee */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí Xtra</div>
                <div className="text-sm font-bold text-yellow-600">{formatCurrency(order.xtraFee || 0)}</div>
              </div>
              
              {/* Flash Sale Fee */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí Flash Sale</div>
                <div className="text-sm font-bold text-pink-600">{formatCurrency(order.flashSaleFee || 0)}</div>
              </div>
              
              {/* Tax */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Thuế</div>
                <div className="text-sm font-bold text-gray-600">{formatCurrency(order.tax || 0)}</div>
              </div>
              
              {/* TikTok Subsidy */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Phí TikTok bù</div>
                <div className="text-sm font-bold text-green-600">{formatCurrency(order.tiktokSubsidy || 0)}</div>
              </div>
            </div>
          </div>

        </section>

        {/* Section: Product List */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
          <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center">
            <FiBox className="mr-2 text-purple-500"/>
            Danh sách sản phẩm ({order.products.length})
          </h3>
          
          {/* Desktop Table */}
          <div className="hidden lg:block -mx-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">SL</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">Đơn giá</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">Giảm giá</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.products.map((p: Product, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover mr-4 shadow-sm border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          <span className="text-base font-medium text-gray-900 line-clamp-2">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-semibold text-gray-800">{formatNumber(p.quantity)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-semibold text-blue-600">{formatCurrency(p.price)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-semibold text-red-600">{formatCurrency(p.discount || 0)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-green-600">{formatCurrency((p.price * p.quantity) - (p.discount || 0))}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block lg:hidden space-y-4">
            {order.products.map((p: Product, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start space-x-3 mb-3">
                  <img src={p.image} alt={p.name} className="w-16 h-16 rounded-lg object-cover shadow-sm border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{p.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">SL:</span>
                        <span className="ml-1 font-semibold">{formatNumber(p.quantity)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Đơn giá:</span>
                        <span className="ml-1 font-semibold text-blue-600">{formatCurrency(p.price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Giảm giá:</span>
                        <span className="ml-1 font-semibold text-red-600">{formatCurrency(p.discount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Thành tiền:</span>
                        <span className="ml-1 font-bold text-green-600">{formatCurrency((p.price * p.quantity) - (p.discount || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center text-xs text-gray-400 pt-4">
          Cập nhật lần cuối: {formatDate(order.updateDate)}
        </div>
      </div>
    </Modal>
  );
};

export default OrderModal;
