import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Order } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Search, ChevronLeft, Eye, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FinanceSummaryOrderListProps {
    summaryType: string;
    dateRange: { startDate: string; endDate: string };
    onClose: () => void;
    onOrderSelect: (orderId: string) => void;
    initialData: any;
}

const FinanceSummaryOrderList: React.FC<FinanceSummaryOrderListProps> = ({
    summaryType,
    dateRange,
    onClose,
    onOrderSelect,
    initialData,
}) => {
    const [orderData, setOrderData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const typeNameMapping: { [key: string]: string } = {
        totalReceived: 'Tổng Doanh Thu Đã Nhận',
        totalCosts: 'Tổng Chi Phí Sàn',
        reconciled: 'Đã Đối Soát',
        unreconciled: 'Chưa Đối Soát',
    };

    const fetchOrders = useCallback(async (page = 1, search = '', limit = itemsPerPage) => {
        setLoading(true);
        try {
            const data = await apiService.getOrdersBySummaryType(summaryType, {
                ...dateRange,
                page,
                search,
                limit,
            });
            setOrderData(data);
        } catch (error) {
            console.error(`Error fetching orders for ${summaryType}:`, error);
        } finally {
            setLoading(false);
        }
    }, [summaryType, dateRange, itemsPerPage]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchOrders(1, searchTerm);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, fetchOrders]);

    useEffect(() => {
        // Fetch orders again if itemsPerPage changes
        fetchOrders(1, searchTerm);
    }, [itemsPerPage]);
    
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= orderData.pagination.totalPages) {
            fetchOrders(newPage, searchTerm);
        }
    };

    const handleExport = async () => {
        alert("Đang chuẩn bị dữ liệu để xuất Excel... Vui lòng chờ.");
        try {
            const allOrdersData = await apiService.getOrdersBySummaryType(summaryType, {
                ...dateRange,
                page: 1,
                limit: 10000, // Fetch all data
                search: searchTerm,
            });

            const exportData = allOrdersData.orders.map((order: Order) => {
                const totalCost = (order.affFee || 0) + (order.shippingFee || 0) + (order.shopShippingFee || 0) + (order.actualFee9 || 0) + (order.xtraFee || 0) + (order.flashSaleFee || 0) + (order.tax || 0) - (order.tiktokSubsidy || 0);
                return {
                    'Mã đơn hàng': order.id,
                    'Sản phẩm': order.products.map(p => p.name).join(', '),
                    'Ngày đẩy ĐVVC': formatDate(order.deliveryDate),
                    'Trạng thái': order.status,
                    'Doanh thu': order.revenueBeforeFees,
                    'Phí Aff': order.affFee,
                    'Phí Ship': order.shippingFee,
                    'Phí Ship Shop chịu': order.shopShippingFee,
                    'Phí Sàn 9%': order.actualFee9,
                    'Phí Xtra': order.xtraFee,
                    'Phí Flash Sale': order.flashSaleFee,
                    'Thuế': order.tax,
                    'TikTok Bù': order.tiktokSubsidy,
                    'Tổng Chi Phí': totalCost,
                }
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `DonHang_${summaryType}`);
            XLSX.writeFile(wb, `BaoCao_${summaryType}_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error("Error exporting to excel:", error);
            alert("Đã có lỗi xảy ra khi xuất file Excel.");
        }
    }

    const getStatusBadge = (status: string) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('đã nhận')) return 'bg-green-100 text-green-800';
        if (lowerStatus.includes('đã gửi')) return 'bg-blue-100 text-blue-800';
        if (lowerStatus.includes('đã huỷ')) return 'bg-red-100 text-red-800';
        if (lowerStatus.includes('hoàn')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-800';
    };

    const renderCostColumns = (order: Order) => {
        const costs = [
            { label: "Aff", value: order.affFee || 0 },
            { label: "Ship", value: order.shippingFee || 0 },
            { label: "Shop Ship", value: order.shopShippingFee || 0 },
            { label: "Sàn 9%", value: order.actualFee9 || 0 },
            { label: "Xtra", value: order.xtraFee || 0 },
            { label: "Flash Sale", value: order.flashSaleFee || 0 },
            { label: "Thuế", value: order.tax || 0 },
            { label: "TikTok Bù", value: order.tiktokSubsidy || 0, isSubsidy: true },
        ];
        
        // Sửa lại công thức tính tổng chi phí theo yêu cầu: cộng giá trị tuyệt đối
        const totalCost = costs.filter(c => !c.isSubsidy).reduce((acc, cost) => acc + Math.abs(cost.value), 0);

        return (
            <div className='flex flex-col space-y-1 text-xs'>
                {costs.map(cost => (
                    <div key={cost.label} className="flex justify-between">
                        <span className="text-gray-500">{cost.label}:</span>
                        <span className={cost.isSubsidy ? 'text-green-600 font-medium' : (cost.value >= 0 ? 'text-gray-800' : 'text-red-600 font-medium')}>
                           {cost.isSubsidy ? '+' : ''}{formatCurrency(cost.value)}
                        </span>
                    </div>
                ))}
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span className="font-bold text-gray-700">Tổng CP:</span>
                    <span className="font-bold text-red-700">{formatCurrency(totalCost)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200/50 shadow-lg mt-8">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {typeNameMapping[summaryType]}
                            </h2>
                            <p className="text-sm text-gray-600">
                                {orderData?.total || 0} đơn hàng
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm đơn hàng..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                            />
                        </div>
                         <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-sm">
                            <FileDown size={16} />
                            <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="text-center py-10">Đang tải...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày & Trạng thái</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi phí (8 loại)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {orderData.orders.map((order: Order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-3 whitespace-nowrap w-[150px] truncate">
                                                <button onClick={() => onOrderSelect(order.id)} className="text-blue-600 hover:underline font-medium">
                                                    {order.id}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 max-w-[180px] truncate" title={order.products.map(p => p.name).join(', ')}>
                                                {order.products.map(p => p.name).join(', ')}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{formatDate(order.deliveryDate)}</div>
                                                <div className={`mt-1 text-xs inline-flex font-semibold px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}>
                                                    {order.status}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-green-600 font-medium">{formatCurrency(order.revenueBeforeFees)}</td>
                                            <td className="px-3 py-3">{renderCostColumns(order)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {orderData.pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <div>
                                    <span className="text-sm text-gray-600 mr-2">Hiển thị:</span>
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={1000}>1000</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => handlePageChange(orderData.pagination.page - 1)} disabled={orderData.pagination.page === 1} className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50">
                                        Trước
                                    </button>
                                     <span className="text-sm text-gray-600">
                                        Trang {orderData.pagination.page} / {orderData.pagination.totalPages}
                                    </span>
                                    <button onClick={() => handlePageChange(orderData.pagination.page + 1)} disabled={orderData.pagination.page === orderData.pagination.totalPages} className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50">
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FinanceSummaryOrderList;
