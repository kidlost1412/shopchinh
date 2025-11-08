import React, { useState } from 'react';
import { DateRange } from '../types';

interface FiltersProps {
  onSearch: (term: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  dateRange: DateRange;
}

const Filters: React.FC<FiltersProps> = ({ 
  onSearch, 
  onDateRangeChange, 
  dateRange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const datePresets = [
    { label: 'Hôm nay', days: 0 },
    { label: '7 ngày qua', days: 7 },
    { label: '30 ngày qua', days: 30 },
    { label: '90 ngày qua', days: 90 }
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleDatePresetClick = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    onDateRangeChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onDateRangeChange({
      ...dateRange,
      [field]: value
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onSearch('');
    onDateRangeChange({});
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Bộ lọc thông minh</h3>
              <p className="text-sm text-slate-500">Tìm kiếm và lọc dữ liệu</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Search Bar - Always Visible */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm theo mã đơn hàng, mã vận đơn..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-slate-500 text-slate-900"
            style={{ color: '#0f172a' }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                onSearch('');
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Expandable Filters */}
        <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-6 pt-2">
            {/* Date Range Presets */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                📅 Khoảng thời gian nhanh
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleDatePresetClick(preset.days)}
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                📆 Chọn ngày tùy chỉnh
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate || ''}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Nhập từ khóa để tìm kiếm nhanh</span>
              </div>
              
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || dateRange.startDate || dateRange.endDate) && (
          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-slate-600 font-medium">Bộ lọc hiện tại:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Tìm kiếm: "{searchTerm}"
                </span>
              )}
              {dateRange.startDate && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Từ: {dateRange.startDate}
                </span>
              )}
              {dateRange.endDate && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Đến: {dateRange.endDate}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Filters;
