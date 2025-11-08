import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('vi', vi);

interface MobileHeaderProps {
  activeTab: 'dashboard' | 'finance' | 'aff';
  // Dashboard specific props
  dateRange?: { startDate: string; endDate: string };
  selectedPreset?: string;
  onPresetSelect?: (preset: string) => void;
  onDateChange?: (dates: [Date | null, Date | null]) => void;
  showCustomDate?: boolean;
  setShowCustomDate?: (show: boolean) => void;
}

const DATE_PRESETS = [
  { label: 'Hôm nay', days: 0 },
  { label: '7 ngày', days: 7 },
  { label: 'Tháng này', days: -1, isThisMonth: true },
  { label: 'Tháng trước', days: -1, isLastMonth: true },
  { label: 'Tùy chỉnh', days: -1, isCustom: true }
];

const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  dateRange,
  selectedPreset,
  onPresetSelect,
  onDateChange,
  showCustomDate,
  setShowCustomDate
}) => {
  const [showDateFilter, setShowDateFilter] = useState(false);

  const getTabConfig = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'TikTok Shop',
          subtitle: 'Dashboard',
          icon: '📊',
          gradient: 'from-blue-600 to-indigo-700',
          bgColor: 'bg-blue-50'
        };
      case 'finance':
        return {
          title: 'TikTok Finance',
          subtitle: 'Báo cáo tài chính',
          icon: '💰',
          gradient: 'from-green-600 to-emerald-700',
          bgColor: 'bg-green-50'
        };
      case 'aff':
        return {
          title: 'TikTok AFF',
          subtitle: 'Phân tích Affiliate',
          icon: '🎯',
          gradient: 'from-purple-600 to-indigo-700',
          bgColor: 'bg-purple-50'
        };
      default:
        return {
          title: 'TikTok Shop',
          subtitle: 'Dashboard',
          icon: '📊',
          gradient: 'from-blue-600 to-indigo-700',
          bgColor: 'bg-blue-50'
        };
    }
  };

  const config = getTabConfig();

  return (
    <>
      {/* Mobile Header */}
      <header className={`md:hidden sticky top-0 z-40 bg-gradient-to-r ${config.gradient} text-white shadow-lg`}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Title Section */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">{config.icon}</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">{config.title}</h1>
                <p className="text-xs text-white/80">{config.subtitle}</p>
              </div>
            </div>

            {/* Date Filter Toggle - Only for Dashboard */}
            {activeTab === 'dashboard' && onPresetSelect && (
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-sm">📅</span>
                <span className="text-sm font-medium">Lọc ngày</span>
                <span className={`text-xs transition-transform ${showDateFilter ? 'rotate-180' : ''}`}>▼</span>
              </button>
            )}
          </div>

          {/* Selected Date Range Display */}
          {activeTab === 'dashboard' && dateRange?.startDate && dateRange?.endDate && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2">
              <div className="text-xs text-white/80 mb-1">Khoảng thời gian:</div>
              <div className="text-sm font-medium">
                {new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - {new Date(dateRange.endDate).toLocaleDateString('vi-VN')}
              </div>
            </div>
          )}
        </div>

        {/* Expandable Date Filter Section */}
        {activeTab === 'dashboard' && showDateFilter && onPresetSelect && (
          <div className="border-t border-white/20 px-4 py-4 bg-black/10">
            <div className="space-y-3">
              {/* Date Presets */}
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      onPresetSelect(preset.label);
                      if (preset.label !== 'Tùy chỉnh') {
                        setShowDateFilter(false);
                      }
                    }}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      selectedPreset === preset.label
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker */}
              {showCustomDate && onDateChange && setShowCustomDate && (
                <div className="bg-white/20 rounded-lg p-3 mt-3">
                  <div className="text-sm text-white/90 mb-2">Chọn khoảng thời gian:</div>
                  <DatePicker
                    selected={dateRange?.startDate ? new Date(dateRange.startDate) : null}
                    onChange={onDateChange}
                    startDate={dateRange?.startDate ? new Date(dateRange.startDate) : null}
                    endDate={dateRange?.endDate ? new Date(dateRange.endDate) : null}
                    selectsRange
                    monthsShown={1}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    inline
                    calendarClassName="mobile-datepicker"
                  />
                  <div className="flex justify-between mt-3">
                    <button
                      onClick={() => {
                        setShowCustomDate(false);
                        setShowDateFilter(false);
                      }}
                      className="px-3 py-1 text-sm bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
                    >
                      Đóng
                    </button>
                    {dateRange?.startDate && dateRange?.endDate && (
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium"
                      >
                        Áp dụng
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile DatePicker Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .mobile-datepicker {
            background: white;
            border-radius: 8px;
            box-shadow: none;
            border: none;
            font-size: 14px;
          }
          .mobile-datepicker .react-datepicker__header {
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px;
          }
          .mobile-datepicker .react-datepicker__day--selected {
            background-color: #3b82f6;
            color: white;
          }
          .mobile-datepicker .react-datepicker__day--in-selecting-range {
            background-color: #93c5fd;
            color: white;
          }
          .mobile-datepicker .react-datepicker__day--in-range {
            background-color: #dbeafe;
            color: #1e40af;
          }
        `
      }} />
    </>
  );
};

export default MobileHeader;
