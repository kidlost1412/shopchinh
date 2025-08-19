import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { formatCurrency, formatDate } from '../utils';
import ProductOrdersModal from './ProductOrdersModal';
import * as XLSX from 'xlsx';

interface ProductData {
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  latestDeliveryDate: string;
  notesSummary?: string; // Make it optional to match backend data
}

interface ProductAnalysisProps {
  startDate?: string;
  endDate?: string;
}

const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ startDate, endDate }) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [countOnlyShippedOrders, setCountOnlyShippedOrders] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Fetch product analysis data
  const fetchProductAnalysis = async () => {
    try {
      setLoading(true);
             const data = await apiService.getProductAnalysis({ 
         startDate, 
         endDate,
         countOnlyShippedOrders 
       });

       setProducts(data);
      setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching product analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch product orders for modal
  const handleProductClick = async (product: ProductData) => {
    try {
      setModalLoading(true);
      setSelectedProduct(product);
      setShowModal(true);
    } catch (error) {
      console.error('Error opening product modal:', error);
    } finally {
      setModalLoading(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  // Truncate product name for display
  const truncateProductName = (name: string, maxLength: number = 80) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return products.slice(startIndex, endIndex);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Export to Excel
  const handleExport = () => {
         const exportData = products.map(product => ({
       'Tên sản phẩm': product.productName,
       'Tổng số lượng': product.totalQuantity,
       'Tổng COD': product.totalRevenue,
       'Ghi chú': product.notesSummary || '-',
       'Ngày giao hàng gần nhất': formatDate(product.latestDeliveryDate)
     }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    
    // Giới hạn tên sheet tối đa 31 ký tự (Excel requirement)
    const sheetName = 'Phân tích sản phẩm';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const fileName = `phan-tich-san-pham-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Load data when date filters change or count option changes
  useEffect(() => {
    fetchProductAnalysis();
  }, [startDate, endDate, countOnlyShippedOrders]);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">📦</span>
            </div>
            <span>Phân tích sản phẩm</span>
          </h3>
                     <div className="flex items-center space-x-3">
             <span className="text-sm text-gray-500">
               Tổng: {products.length} sản phẩm
             </span>
             
                           {/* Tùy chọn đếm đơn theo trạng thái */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Lọc đơn hàng:</span>
                <button
                  onClick={() => setCountOnlyShippedOrders(!countOnlyShippedOrders)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    countOnlyShippedOrders 
                      ? 'bg-green-600' 
                      : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      countOnlyShippedOrders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${
                  countOnlyShippedOrders ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {countOnlyShippedOrders ? 'ON' : 'OFF'}
                </span>
                <span className="text-sm text-gray-600">
                  Chỉ đếm đơn "Đã gửi hàng" + "Đang đóng hàng"
                </span>
              </div>
             
             <button
               onClick={handleExport}
               disabled={products.length === 0}
               className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
             >
               <span>📊</span>
               <span>Xuất Excel</span>
             </button>
           </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
                         <thead>
               <tr className="border-b border-gray-200">
                 <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên sản phẩm</th>
                 <th className="text-center py-3 px-4 font-semibold text-gray-700">Tổng số lượng</th>
                 <th className="text-center py-3 px-4 font-semibold text-gray-700">Tổng COD</th>
                 <th className="text-center py-3 px-4 font-semibold text-gray-700">Ghi chú</th>
                 <th className="text-center py-3 px-4 font-semibold text-gray-700">Ngày giao hàng</th>
               </tr>
             </thead>
            <tbody>
              {getPaginatedProducts().map((product, index) => (
                <tr 
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleProductClick(product)}
                >
                  <td className="py-3 px-4">
                    <div className="group relative">
                      <span className="text-gray-800 font-medium">
                        {truncateProductName(product.productName)}
                      </span>
                      {/* Tooltip for full product name */}
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {product.productName}
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {product.totalQuantity.toLocaleString('vi-VN')}
                    </span>
                  </td>
                                     <td className="text-center py-3 px-4">
                     <span className="text-green-600 font-semibold">
                       {formatCurrency(product.totalRevenue)}
                     </span>
                   </td>
                   <td className="text-center py-3 px-4">
                     {product.notesSummary ? (
                       <div className="group relative">
                         <span className="text-gray-600 text-sm font-medium max-w-xs truncate block bg-yellow-50 px-2 py-1 rounded" title={product.notesSummary}>
                           {product.notesSummary}
                         </span>
                         {/* Tooltip for full notes */}
                         <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-md">
                           {product.notesSummary}
                           <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                         </div>
                       </div>
                     ) : (
                       <span className="text-gray-400 text-sm">-</span>
                     )}
                   </td>
                   <td className="text-center py-3 px-4">
                     <span className="text-gray-600 text-sm">
                       {formatDate(product.latestDeliveryDate)}
                     </span>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-6 space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}

        {/* Empty state */}
        {products.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">Không có dữ liệu sản phẩm</p>
            <p className="text-gray-400 text-sm">Hãy kiểm tra bộ lọc ngày tháng</p>
          </div>
        )}
      </div>

             {/* Product Orders Modal */}
       {showModal && selectedProduct && (
         <ProductOrdersModal
           product={selectedProduct}
           onClose={handleCloseModal}
           startDate={startDate}
           endDate={endDate}
           countOnlyShippedOrders={countOnlyShippedOrders}
         />
       )}
    </>
  );
};

export default ProductAnalysis;
