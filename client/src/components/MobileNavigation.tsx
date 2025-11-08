import React from 'react';

interface MobileNavigationProps {
  activeTab: 'dashboard' | 'finance' | 'aff';
  onTabChange: (tab: 'dashboard' | 'finance' | 'aff') => void;
  affDataLoading?: boolean;
  affDataPreloaded?: boolean;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onTabChange,
  affDataLoading = false,
  affDataPreloaded = false
}) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: '📊',
      color: 'blue'
    },
    {
      id: 'finance' as const,
      label: 'Finance',
      icon: '💰',
      color: 'green'
    },
    {
      id: 'aff' as const,
      label: 'AFF',
      icon: '🎯',
      color: 'purple'
    }
  ];

  const getTabStyles = (tabId: string) => {
    const isActive = activeTab === tabId;
    const baseStyles = "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all duration-200 relative";
    
    if (isActive) {
      return `${baseStyles} text-white`;
    }
    return `${baseStyles} text-gray-400 hover:text-gray-300`;
  };

  const getBackgroundColor = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'bg-gradient-to-r from-blue-600 to-indigo-700';
      case 'finance':
        return 'bg-gradient-to-r from-green-600 to-emerald-700';
      case 'aff':
        return 'bg-gradient-to-r from-purple-600 to-indigo-700';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 ${getBackgroundColor()} shadow-lg border-t border-white/20`}>
      <div className="flex h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabStyles(tab.id)}
          >
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
            )}
            
            {/* Icon with status indicator for AFF */}
            <div className="relative">
              <span className="text-xl mb-1">{tab.icon}</span>
              
              {/* AFF Data Status Indicator */}
              {tab.id === 'aff' && (
                <>
                  {affDataLoading && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  )}
                  {affDataPreloaded && !affDataLoading && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></span>
                  )}
                </>
              )}
            </div>
            
            {/* Label */}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNavigation;
