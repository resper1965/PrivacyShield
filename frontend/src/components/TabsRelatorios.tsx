import React, { useState } from 'react';

interface Tab {
  key: string;
  label: string;
}

interface TabsRelatoriosProps {
  tabs: Tab[];
  renderTab: (key: string) => React.ReactNode;
}

export const TabsRelatorios: React.FC<TabsRelatoriosProps> = ({ tabs, renderTab }) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '');

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{
        borderBottom: '1px solid #1B263B',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '0'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#E0E1E6',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? '600' : '500',
                cursor: 'pointer',
                position: 'relative',
                borderBottom: activeTab === tab.key ? '2px solid #00ade0' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.color = '#00ade0';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.color = '#E0E1E6';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {renderTab(activeTab)}
      </div>
    </div>
  );
};

export default TabsRelatorios;