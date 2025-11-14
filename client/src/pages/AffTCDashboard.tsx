import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, CheckCircle, Clock, XCircle, BarChart3, FileDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiService } from '../services/api';
import AffOrderModal from '../components/AffOrderModal';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('vi', vi);

interface AffMetrics {
  totalOrders: {
    count: number;
    revenue: number;
    breakdown: {
      livestream: { count: number; revenue: number };
      video: { count: number; revenue: number };
      display: { count: number; revenue: number };
      external_traffic: { count: number; revenue: number };
    };
  };
  completedOrders: {
    count: number;
    revenue: number;
    breakdown: {
      livestream: { count: number; revenue: number };
      video: { count: number; revenue: number };
      display: { count: number; revenue: number };
      external_traffic: { count: number; revenue: number };
    };
  };
  processingOrders: {
    count: number;
    revenue: number;
    breakdown: {
      livestream: { count: number; revenue: number };
      video: { count: number; revenue: number };
      display: { count: number; revenue: number };
      external_traffic: { count: number; revenue: number };
    };
  };
  cancelledOrders: {
    count: number;
    revenue: number;
    breakdown: {
      livestream: { count: number; revenue: number };
      video: { count: number; revenue: number };
      display: { count: number; revenue: number };
      external_traffic: { count: number; revenue: number };
    };
  };
}

interface Top3Performer {
  name: string;
  revenue: number;
  standardCommission: number;
  adCommission: number;
  totalCommission: number;
  orderCount: number;
}

interface AffDetail {
  name: string;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  standardCommission: number;
  adCommission: number;
  totalCommission: number;
  revenue: number;
}

interface ContentAnalysis {
  type: string;
  typeMapped: string;
  orderCount: number;
  revenue: number;
  commission: number;
}

const AFF_DATE_PRESETS = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày qua', days: 7 },
  { label: 'Tháng này', days: -1, isThisMonth: true },
  { label: 'Tháng trước', days: -1, isLastMonth: true },
  { label: 'Quý này', days: -1, isThisQuarter: true },
  { label: 'Tùy chỉnh', days: -1, isCustom: true }
];

const INITIAL_AFF_TC: string[] = [
  'hoaithuongkhonhattoancau',
  'hoa.mc.lan7338',
  'trongcaykhongkho2025',
  'cogaiphanbon',
  'phuongdamca38',
  'linhhai_92',
  'taphoaphanbon',
  'nydamca140824',
  'trinhdamca86',
  'nongduoctoancau_',
  'trongcaykhongkho25',
  'toancau70',
  'nongduoctoancau76',
  'nongduoctoancauhatinh',
  'hangnongduoc',
  'huongtoancau',
  'thienannongduoctoancau',
  'nongduoctoancauofficial'
];

const AffTCDashboard: React.FC = () => {
  const [affMetrics, setAffMetrics] = useState<AffMetrics | null>(null);
  const [top3Performers, setTop3Performers] = useState<Top3Performer[]>([]);
  const [affDetails, setAffDetails] = useState<AffDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [affDateRange, setAffDateRange] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
  const [selectedAffPreset, setSelectedAffPreset] = useState<string>('Tháng này');
  const [showAffCustomDate, setShowAffCustomDate] = useState<boolean>(false);

  const [affTablePage, setAffTablePage] = useState<number>(1);
  const [affTableLimit, setAffTableLimit] = useState<number>(20);
  const [totalAffRecords, setTotalAffRecords] = useState<number>(0);
  const [selectedAffForModal, setSelectedAffForModal] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Inline analysis state (y chang AFF)
  const [expandedAff, setExpandedAff] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis[]>([]);
  const [top3Products, setTop3Products] = useState<any[]>([]);

  const [selectedAffNames, setSelectedAffNames] = useState<string[]>(INITIAL_AFF_TC);
  const [newAffName, setNewAffName] = useState<string>('');
  const [affListLoading, setAffListLoading] = useState<boolean>(true);
  const [affListUpdating, setAffListUpdating] = useState<boolean>(false);
  const [affListError, setAffListError] = useState<string | null>(null);

  const loadAffList = useCallback(async () => {
    try {
      setAffListLoading(true);
      setAffListError(null);
      const data = await apiService.getAffTcList();
      const list = Array.isArray(data.affNames) && data.affNames.length > 0 ? data.affNames : INITIAL_AFF_TC;
      setSelectedAffNames(list);
    } catch (error: any) {
      console.error('[AFF TC] Failed to load AFF list from server:', error);
      setAffListError(error?.message || 'Không thể tải danh sách AFF. Đang dùng danh sách mặc định.');
      setSelectedAffNames(INITIAL_AFF_TC);
    } finally {
      setAffListLoading(false);
    }
  }, []);

  const calculateAffDateRange = useCallback((preset: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    const formatAffDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'Hôm nay':
        startDate = endDate = formatAffDate(now);
        break;
      case '7 ngày qua':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        startDate = formatAffDate(sevenDaysAgo);
        endDate = formatAffDate(now);
        break;
      case 'Tháng này':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startDate = formatAffDate(thisMonthStart);
        endDate = formatAffDate(thisMonthEnd);
        break;
      case 'Tháng trước':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatAffDate(lastMonthStart);
        endDate = formatAffDate(lastMonthEnd);
        break;
      case 'Quý này':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        startDate = formatAffDate(quarterStart);
        endDate = formatAffDate(quarterEnd);
        break;
      default:
        break;
    }

    return { startDate, endDate };
  }, []);

  const loadAffData = useCallback(async () => {
    if (!affDateRange.startDate || !affDateRange.endDate) return;
    try {
      setLoading(true);

      const metricsData = await apiService.getAffMetrics({
        startDate: affDateRange.startDate,
        endDate: affDateRange.endDate,
        affNames: selectedAffNames
      });
      setAffMetrics(metricsData.metrics);
      setTop3Performers(metricsData.top3Performers || []);

      const detailsData = await apiService.getAffDetails({
        startDate: affDateRange.startDate,
        endDate: affDateRange.endDate,
        page: affTablePage,
        limit: affTableLimit,
        affNames: selectedAffNames
      });
      setAffDetails(detailsData.affDetails || []);
      setTotalAffRecords(detailsData.totalCount || 0);
    } catch (error) {
      console.error('[AFF TC] Error loading data:', error);
      setAffMetrics(null);
      setTop3Performers([]);
      setAffDetails([]);
    } finally {
      setLoading(false);
    }
  }, [affDateRange, affTablePage, affTableLimit, selectedAffNames]);

  const handleAffPresetSelect = (preset: string) => {
    setSelectedAffPreset(preset);
    if (preset === 'Tùy chỉnh') {
      setShowAffCustomDate(true);
    } else {
      setShowAffCustomDate(false);
      const newRange = calculateAffDateRange(preset);
      setAffDateRange(newRange);
    }
  };

  const handleAffDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    const newRange = {
      startDate: start ? start.toISOString().split('T')[0] : '',
      endDate: end ? end.toISOString().split('T')[0] : '',
    };
    setAffDateRange(newRange);
    if (start && end) {
      setSelectedAffPreset('Tùy chỉnh');
      setShowAffCustomDate(true);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  const formatNumber = (num: number): string => new Intl.NumberFormat('vi-VN').format(num);

  const handleAffNumberClick = (affName: string, status: string) => {
    setSelectedAffForModal(affName);
    setSelectedStatus(status);
  };

  // Inline analysis
  const handleAnalysisClick = async (affName: string) => {
    if (expandedAff === affName) {
      setExpandedAff(null);
      setContentAnalysis([]);
      setTop3Products([]);
      return;
    }
    try {
      setAnalysisLoading(true);
      setExpandedAff(affName);
      const response = await apiService.getAffContentAnalysis(affName, {
        startDate: affDateRange.startDate,
        endDate: affDateRange.endDate
      });
      setContentAnalysis(response.contentAnalysis || []);
      setTop3Products(response.top3Products || []);
    } catch (error) {
      console.error('[AFF TC] Error loading analysis:', error);
      setContentAnalysis([]);
      setTop3Products([]);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!affMetrics || !affDetails.length) return;
    try {
      setLoading(true);
      const wb = XLSX.utils.book_new();
      const summaryData = [
        ['BÁO CÁO AFF TC'],
        [`Thời gian: ${new Date(affDateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(affDateRange.endDate).toLocaleDateString('vi-VN')}`],
        [''],
        ['TỔNG QUAN'],
        ['Tổng đơn AFF', affMetrics.totalOrders.count, formatCurrency(affMetrics.totalOrders.revenue)],
        ['Đơn hoàn thành', affMetrics.completedOrders.count, formatCurrency(affMetrics.completedOrders.revenue)],
        ['Đơn đang xử lý', affMetrics.processingOrders.count, formatCurrency(affMetrics.processingOrders.revenue)],
        ['Đơn đã huỷ', affMetrics.cancelledOrders.count, formatCurrency(affMetrics.cancelledOrders.revenue)],
        [''],
        ['TOP 3 PERFORMERS'],
        ['STT', 'Tên AFF', 'Số đơn', 'Doanh thu', 'HH Tự nhiên', 'HH Quảng cáo', 'Tổng HH'],
        ...top3Performers.map((p, i) => [i + 1, p.name, p.orderCount, p.revenue, p.standardCommission, p.adCommission, p.totalCommission])
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');

      const detailsData = [
        ['CHI TIẾT AFF TC'],
        ['Tên AFF', 'Tổng đơn', 'Hoàn thành', 'Đang xử lý', 'Đã huỷ', 'Doanh thu', 'HH Tự nhiên', 'HH Quảng cáo', 'Tổng HH'],
        ...affDetails.map(aff => [
          aff.name,
          aff.totalOrders,
          aff.completedOrders,
          aff.processingOrders,
          aff.cancelledOrders,
          aff.revenue,
          aff.standardCommission,
          aff.adCommission,
          aff.totalCommission
        ])
      ];
      const detailsWs = XLSX.utils.aoa_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(wb, detailsWs, 'Chi tiết AFF TC');

      const fileName = `AFF_TC_Report_${affDateRange.startDate}_${affDateRange.endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('[AFF TC] Error exporting Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewAff = async () => {
    const input = newAffName.trim();
    if (!input) return;
    const lowerInput = input.toLowerCase();
    // Prevent duplicate
    if (selectedAffNames.some(n => n.toLowerCase() === lowerInput)) {
      setNewAffName('');
      return;
    }

    try {
      setAffListUpdating(true);

      // Fetch all AFF names for current date range to resolve canonical name
      const detailsData = await apiService.getAffDetails({
        startDate: affDateRange.startDate,
        endDate: affDateRange.endDate,
        page: 1,
        limit: 5000
      });
      const allNames: string[] = Array.from(new Set((detailsData.affDetails || []).map((d: any) => d.name).filter(Boolean)));

      // Try exact (case-insensitive)
      let resolved = allNames.find(n => n.toLowerCase() === lowerInput);
      // Try substring unique match
      if (!resolved) {
        const matches = allNames.filter(n => n.toLowerCase().includes(lowerInput));
        if (matches.length === 1) resolved = matches[0];
      }

      const nameToAdd = resolved || input;
      const response = await apiService.addAffTcName(nameToAdd);
      setSelectedAffNames(response.affNames || []);
      setAffTablePage(1);
    } catch (e) {
      console.warn('[AFF TC] Could not add AFF name via server, falling back to local list', e);
      // Fallback: add locally to avoid user confusion
      setSelectedAffNames(prev => [...prev, input]);
      setAffListError('Không thể lưu AFF lên server. Danh sách hiện tại chỉ hiển thị tạm thời.');
    } finally {
      setNewAffName('');
      setAffListUpdating(false);
    }
  };

  const handleRemoveAff = (name: string) => {
    const performRemoval = async () => {
      try {
        setAffListUpdating(true);
        const response = await apiService.removeAffTcName(name);
        setSelectedAffNames(response.affNames || []);
        setAffTablePage(1);
      } catch (error) {
        console.error('[AFF TC] Failed to remove AFF from server:', error);
        setAffListError('Không thể xóa AFF trên server. Vui lòng thử lại.');
      } finally {
        setAffListUpdating(false);
      }
    };

    performRemoval();
  };

  const handleClearAffs = () => {
    const performClear = async () => {
      try {
        setAffListUpdating(true);
        const response = await apiService.setAffTcNames([]);
        setSelectedAffNames(response.affNames || []);
        setAffTablePage(1);
      } catch (error) {
        console.error('[AFF TC] Failed to clear AFF list on server:', error);
        setAffListError('Không thể xóa danh sách AFF trên server. Vui lòng thử lại.');
      } finally {
        setAffListUpdating(false);
      }
    };

    performClear();
  };

  useEffect(() => {
    const defaultRange = calculateAffDateRange('Tháng này');
    setAffDateRange(defaultRange);
  }, []);

  useEffect(() => {
    loadAffList();
  }, [loadAffList]);

  useEffect(() => {
    if (affListLoading) return;

    if (!affDateRange.startDate || !affDateRange.endDate) return;

    if (selectedAffNames.length === 0) {
      setAffMetrics(null);
      setTop3Performers([]);
      setAffDetails([]);
      setTotalAffRecords(0);
      return;
    }
    loadAffData();
  }, [affDateRange.startDate, affDateRange.endDate, affTablePage, affTableLimit, selectedAffNames, affListLoading, loadAffData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-fuchsia-50 to-pink-100 p-2 md:p-6 lg:p-8">
      <div className="bg-white/80 backdrop-blur-lg border-b border-pink-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-fuchsia-600 to-pink-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg md:text-2xl">🎯</span>
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-800">TikTok AFF TC Dashboard</h1>
                <p className="text-xs md:text-sm text-gray-600">Doanh số của các AFF TC đã chọn</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              {(affDateRange.startDate || affDateRange.endDate) && (
                <div className="flex items-center space-x-2 bg-pink-50 border border-pink-200 rounded-lg px-3 md:px-4 py-2">
                  <span className="text-pink-600 font-medium text-xs md:text-sm">📊</span>
                  <span className="text-pink-800 text-xs md:text-sm font-medium">
                    {affDateRange.startDate && affDateRange.endDate
                      ? `${new Date(affDateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(affDateRange.endDate).toLocaleDateString('vi-VN')}`
                      : affDateRange.startDate
                      ? `Từ ${new Date(affDateRange.startDate).toLocaleDateString('vi-VN')}`
                      : `Đến ${new Date(affDateRange.endDate!).toLocaleDateString('vi-VN')}`}
                  </span>
                </div>
              )}

              <button
                onClick={exportToExcel}
                disabled={!affMetrics || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 shadow-md"
              >
                <FileDown className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-pink-200/50 shadow-lg">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
            <span className="mr-2">⏰</span>
            Chọn khoảng thời gian báo cáo AFF TC
          </h2>

          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3">
            {AFF_DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleAffPresetSelect(preset.label)}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                  selectedAffPreset === preset.label
                    ? 'bg-fuchsia-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-pink-50 border border-pink-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {showAffCustomDate && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-3">Chọn khoảng thời gian tùy chỉnh:</p>
              <DatePicker
                selected={affDateRange.startDate ? new Date(affDateRange.startDate) : null}
                onChange={handleAffDateChange}
                startDate={affDateRange.startDate ? new Date(affDateRange.startDate) : null}
                endDate={affDateRange.endDate ? new Date(affDateRange.endDate) : null}
                selectsRange
                monthsShown={window.innerWidth > 768 ? 2 : 1}
                locale="vi"
                dateFormat="dd/MM/yyyy"
                inline
                calendarClassName="shadow-lg border border-gray-300 rounded-lg bg-white"
              />
              <div className="flex items-center space-x-3 mt-3">
                <button
                  onClick={() => setShowAffCustomDate(false)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Đóng
                </button>
                {affDateRange.startDate && affDateRange.endDate && (
                  <span className="text-sm text-pink-600 font-medium">
                    Đã chọn: {new Date(affDateRange.startDate).toLocaleDateString('vi-VN')} - {new Date(affDateRange.endDate).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newAffName}
                onChange={(e) => setNewAffName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNewAff(); }}
                placeholder="Nhập tên AFF mới để thêm"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
              />
              <button
                onClick={addNewAff}
                disabled={affListLoading || affListUpdating}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {affListUpdating ? 'Đang lưu...' : 'Thêm AFF'}
              </button>
            </div>
            {affListError && (
              <div className="text-xs text-red-500">{affListError}</div>
            )}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Đang lọc theo {selectedAffNames.length} AFF:</span>
              {selectedAffNames.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAffs}
                  disabled={affListLoading || affListUpdating}
                  className="text-pink-500 hover:text-pink-700 focus:outline-none disabled:text-gray-400"
                >
                  Xóa hết
                </button>
              )}
            </div>
            {selectedAffNames.length === 0 ? (
              <div className="text-xs text-gray-400 italic">Chưa chọn AFF nào. Hãy thêm AFF để hiển thị dữ liệu.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedAffNames.map((name) => (
                  <div
                    key={name}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-pink-50 border border-pink-200 text-pink-700 rounded"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAff(name)}
                      className="text-pink-500 hover:text-pink-700 focus:outline-none disabled:text-gray-400"
                      title={`Xóa ${name}`}
                      disabled={affListLoading || affListUpdating}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
            <span className="ml-3 text-lg text-gray-600">Đang tải dữ liệu AFF TC...</span>
          </div>
        ) : affMetrics ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-8">
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                <div className="bg-white rounded-xl p-4 md:p-5 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-500 text-white">
                      {formatNumber(affMetrics.totalOrders.count)} đơn
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tổng Số Đơn</h3>
                  <div className="text-xl font-bold text-blue-600 mb-4">{formatCurrency(affMetrics.totalOrders.revenue)}</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🔴 Phát trực tiếp:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.totalOrders.breakdown.livestream.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">📹 Video:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.totalOrders.breakdown.video.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🏪 Trang trưng bày:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.totalOrders.breakdown.display.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🌐 Lưu lượng ngoài:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.totalOrders.breakdown.external_traffic.revenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                      {formatNumber(affMetrics.completedOrders.count)} đơn
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Đơn Hoàn Thành</h3>
                  <div className="text-xl font-bold text-green-600 mb-4">{formatCurrency(affMetrics.completedOrders.revenue)}</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🔴 Phát trực tiếp:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.completedOrders.breakdown.livestream.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">📹 Video:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.completedOrders.breakdown.video.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🏪 Trang trưng bày:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.completedOrders.breakdown.display.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🌐 Lưu lượng ngoài:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.completedOrders.breakdown.external_traffic.revenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-500 text-white">
                      {formatNumber(affMetrics.processingOrders.count)} đơn
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Đơn Đang Xử Lý</h3>
                  <div className="text-xl font-bold text-orange-600 mb-4">{formatCurrency(affMetrics.processingOrders.revenue)}</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🔴 Phát trực tiếp:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.processingOrders.breakdown.livestream.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">📹 Video:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.processingOrders.breakdown.video.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🏪 Trang trưng bày:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.processingOrders.breakdown.display.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🌐 Lưu lượng ngoài:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.processingOrders.breakdown.external_traffic.revenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-500 text-white">
                      {formatNumber(affMetrics.cancelledOrders.count)} đơn
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Đơn Đã Huỷ</h3>
                  <div className="text-xl font-bold text-red-600 mb-4">{formatCurrency(affMetrics.cancelledOrders.revenue)}</div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🔴 Phát trực tiếp:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.cancelledOrders.breakdown.livestream.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">📹 Video:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.cancelledOrders.breakdown.video.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🏪 Trang trưng bày:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.cancelledOrders.breakdown.display.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🌐 Lưu lượng ngoài:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(affMetrics.cancelledOrders.breakdown.external_traffic.revenue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">🏆 TOP 3 DOANH THU</span>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Top 3 Người Thực Hiện</h3>
                <div className="space-y-4">
                  {top3Performers.map((performer, index) => (
                    <div key={performer.name} className={`bg-gradient-to-r ${index === 0 ? 'from-yellow-50 to-orange-50 border-yellow-200' : index === 1 ? 'from-gray-50 to-blue-50 border-gray-200' : 'from-orange-50 to-red-50 border-orange-200'} rounded-lg p-4 border shadow-sm`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-500' : 'bg-orange-500'}`}>{index + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate" title={performer.name}>{performer.name}</div>
                            <div className="text-xs text-gray-500">{formatNumber(performer.orderCount)} đơn</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">💰 Doanh thu</div>
                          <div className="text-sm font-bold text-blue-600 truncate" title={formatCurrency(performer.revenue)}>{formatCurrency(performer.revenue)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">🎯 Tổng HH</div>
                          <div className="text-sm font-bold text-green-600 truncate" title={formatCurrency(performer.totalCommission)}>{formatCurrency(performer.totalCommission)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-200/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <span className="mr-2">📋</span>
                  Chi Tiết AFF TC
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Tổng số AFF: <span className="font-bold text-pink-600">{totalAffRecords}</span> người
                  </div>
                  <select
                    value={affTableLimit}
                    onChange={(e) => { setAffTableLimit(Number(e.target.value)); setAffTablePage(1); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value={5}>5 / trang</option>
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={100}>100 / trang</option>
                  </select>
                </div>
              </div>

              {affDetails.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200 table-auto">
                      <thead className="bg-gradient-to-r from-pink-50 to-fuchsia-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/6">AFF</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">Tổng</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">Hoàn thành</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">Đang xử lý</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">Đã huỷ</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">HH Tự nhiên</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">HH Quảng cáo</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/8">Tổng HH</th>
                          <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/12">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {affDetails.map((aff) => (
                          <React.Fragment key={aff.name}>
                            <tr className="hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-fuchsia-50/50 transition-all duration-200">
                              <td className="px-3 py-4">
                                <div className="font-bold text-gray-900 text-sm truncate" title={aff.name}>{aff.name}</div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="cursor-pointer hover:bg-blue-100 rounded-lg p-1 transition-colors" onClick={() => handleAffNumberClick(aff.name, 'total')}>
                                  <div className="text-xs font-bold text-blue-600">{formatNumber(aff.totalOrders)}</div>
                                  <div className="text-xs text-gray-500 truncate" title={formatCurrency(aff.revenue)}>{formatCurrency(aff.revenue)}</div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="cursor-pointer hover:bg-green-100 rounded-lg p-1 transition-colors" onClick={() => handleAffNumberClick(aff.name, 'completed')}>
                                  <div className="text-xs font-bold text-green-600">{formatNumber(aff.completedOrders)}</div>
                                  <div className="text-xs text-gray-500">{formatCurrency((aff as any).completedRevenue || 0)}</div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="cursor-pointer hover:bg-orange-100 rounded-lg p-1 transition-colors" onClick={() => handleAffNumberClick(aff.name, 'processing')}>
                                  <div className="text-xs font-bold text-orange-600">{formatNumber(aff.processingOrders)}</div>
                                  <div className="text-xs text-gray-500">{formatCurrency((aff as any).processingRevenue || 0)}</div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="cursor-pointer hover:bg-red-100 rounded-lg p-1 transition-colors" onClick={() => handleAffNumberClick(aff.name, 'cancelled')}>
                                  <div className="text-xs font-bold text-red-600">{formatNumber(aff.cancelledOrders)}</div>
                                  <div className="text-xs text-gray-500">{formatCurrency((aff as any).cancelledRevenue || 0)}</div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="text-xs font-bold text-green-700">{formatCurrency(aff.standardCommission)}</div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="text-xs font-bold text-blue-700">{formatCurrency(aff.adCommission)}</div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="text-xs font-bold text-pink-600">{formatCurrency(aff.totalCommission)}</div>
                              </td>
                              <td className="px-3 py-4">
                                <button
                                  onClick={() => handleAnalysisClick(aff.name)}
                                  className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
                                >
                                  {expandedAff === aff.name ? <ChevronUp className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {expandedAff === aff.name && (
                              <tr>
                                <td colSpan={9} className="px-0 py-0">
                                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-t-2 border-pink-200">
                                    {analysisLoading ? (
                                      <div className="flex items-center justify-center py-6">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-pink-600 border-t-transparent"></div>
                                        <span className="ml-3 text-sm font-medium text-pink-700">Đang phân tích dữ liệu...</span>
                                      </div>
                                    ) : (
                                      <div className="p-6">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                                          <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
                                              <span className="text-white font-bold text-sm">📊</span>
                                            </div>
                                            <div>
                                              <h4 className="text-lg font-bold text-gray-900">Phân tích theo nội dung</h4>
                                              <p className="text-sm text-gray-600">{aff.name}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-6 text-sm">
                                            <div className="text-center">
                                              <div className="font-bold text-indigo-600">
                                                {new Intl.NumberFormat('vi-VN').format(contentAnalysis.reduce((sum, c) => sum + c.orderCount, 0))}
                                              </div>
                                              <div className="text-gray-500">Tổng đơn</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-bold text-green-600">
                                                {formatCurrency(contentAnalysis.reduce((sum, c) => sum + c.revenue, 0))}
                                              </div>
                                              <div className="text-gray-500">Doanh thu</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="font-bold text-pink-600">
                                                {formatCurrency(contentAnalysis.reduce((sum, c) => sum + c.commission, 0))}
                                              </div>
                                              <div className="text-gray-500">Hoa hồng</div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="overflow-x-auto mb-6">
                                          <table className="w-full">
                                            <thead>
                                              <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Loại nội dung</th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Số đơn</th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Doanh thu</th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Hoa hồng</th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Tỷ lệ (%)</th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Hiệu suất</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {contentAnalysis.map((content, idx) => {
                                                const totalRevenue = contentAnalysis.reduce((sum, c) => sum + c.revenue, 0);
                                                const percentage = totalRevenue > 0 ? (content.revenue / totalRevenue * 100) : 0;
                                                const avgRevenuePerOrder = content.orderCount > 0 ? content.revenue / content.orderCount : 0;
                                                const icons: Record<string, string> = { livestream: '🔴', video: '📹', display: '🏪', external_traffic: '🌐' };
                                                const names: Record<string, string> = { livestream: 'Phát trực tiếp', video: 'Video', display: 'Trang trưng bày', external_traffic: 'Lưu lượng ngoài' };
                                                return (
                                                  <tr key={idx} className="border-b border-gray-100 hover:bg-white/60 transition-colors">
                                                    <td className="py-4 px-4">
                                                      <div className="flex items-center space-x-3">
                                                        <span className="text-lg">{icons[content.typeMapped]}</span>
                                                        <span className="font-medium text-gray-900">{names[content.typeMapped]}</span>
                                                      </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right"><span className="font-bold text-indigo-600">{new Intl.NumberFormat('vi-VN').format(content.orderCount)}</span></td>
                                                    <td className="py-4 px-4 text-right"><span className="font-bold text-green-600">{formatCurrency(content.revenue)}</span></td>
                                                    <td className="py-4 px-4 text-right"><span className="font-bold text-pink-600">{formatCurrency(content.commission)}</span></td>
                                                    <td className="py-4 px-4 text-right">
                                                      <div className="flex items-center justify-end space-x-2">
                                                        <div className="w-12 bg-gray-200 rounded-full h-2">
                                                          <div className="bg-pink-500 h-2 rounded-full transition-all duration-500" style={{width: `${Math.min(percentage, 100)}%`}}></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 w-10">{percentage.toFixed(1)}%</span>
                                                      </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right"><span className="text-sm font-medium text-gray-600">{formatCurrency(avgRevenuePerOrder)}/đơn</span></td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>

                                        {top3Products && top3Products.length > 0 && (
                                          <div className="border-t border-gray-200 pt-6">
                                            <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                              <span className="mr-2">🏆</span>
                                              Top 3 Sản Phẩm Bán Nhiều Nhất
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              {top3Products.map((product: any, idx: number) => (
                                                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-500' : 'bg-orange-500'}`}>{idx + 1}</div>
                                                    <span className="text-xs text-gray-500">{product.orderCount} đơn</span>
                                                  </div>
                                                  <h6 className="font-bold text-gray-800 mb-2 text-sm" title={product.name}>{product.shortName}</h6>
                                                  <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between"><span className="text-gray-600">Số lượng:</span><span className="font-bold">{new Intl.NumberFormat('vi-VN').format(product.totalQuantity)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-600">Doanh thu:</span><span className="font-bold text-green-600">{formatCurrency(product.totalRevenue)}</span></div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalAffRecords > affTableLimit && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Hiển thị {((affTablePage - 1) * affTableLimit) + 1} - {Math.min(affTablePage * affTableLimit, totalAffRecords)} trong {totalAffRecords} AFF
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setAffTablePage(p => Math.max(1, p - 1))} disabled={affTablePage === 1} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Trước</button>
                        <span className="px-4 py-2 text-sm font-medium text-gray-700">Trang {affTablePage} / {Math.ceil(totalAffRecords / affTableLimit)}</span>
                        <button onClick={() => setAffTablePage(p => Math.min(Math.ceil(totalAffRecords / affTableLimit), p + 1))} disabled={affTablePage >= Math.ceil(totalAffRecords / affTableLimit)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Sau</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">Không có dữ liệu AFF TC</p>
                  <p className="text-sm">Vui lòng chọn khoảng thời gian khác hoặc thêm AFF</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">Chọn khoảng thời gian để xem báo cáo AFF TC</p>
          </div>
        )}
      </div>

      <AffOrderModal
        isOpen={!!selectedAffForModal}
        onClose={() => setSelectedAffForModal(null)}
        affName={selectedAffForModal || ''}
        status={selectedStatus || ''}
        dateRange={affDateRange}
      />
    </div>
  );
};

export default AffTCDashboard;
