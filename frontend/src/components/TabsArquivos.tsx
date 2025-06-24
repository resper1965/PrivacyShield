import React, { useState } from 'react';

interface Tab {
  key: string;
  label: string;
}

interface TabsArquivosProps {
  tabs: Tab[];
  children: (activeTab: string) => React.ReactNode;
}

export const TabsArquivos: React.FC<TabsArquivosProps> = ({ tabs, children }) => {
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
                fontWeight: '500',
                cursor: 'pointer',
                position: 'relative',
                borderBottom: activeTab === tab.key ? '2px solid #00ade0' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.borderBottom = '2px solid rgba(0, 173, 224, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.borderBottom = '2px solid transparent';
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
        {children(activeTab)}
      </div>
    </div>
  );
};

export default TabsArquivos;