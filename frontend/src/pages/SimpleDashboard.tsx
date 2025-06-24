import React from 'react';

export const SimpleDashboard: React.FC = () => {
  return (
    <div>
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                color: '#E0E1E6', 
                fontSize: '14px', 
                fontWeight: '500',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Total de Detecções
              </h3>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#00ade0',
                borderRadius: '50%'
              }} />
            </div>
            <p style={{ 
              color: '#FFFFFF', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              1,247
            </p>
            <div style={{ 
              color: '#10b981', 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              +12% este mês
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '120px',
            height: '120px',
            backgroundColor: 'rgba(0, 173, 224, 0.05)',
            borderRadius: '50%'
          }} />
        </div>

        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                color: '#E0E1E6', 
                fontSize: '14px', 
                fontWeight: '500',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Arquivos Processados
              </h3>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#10b981',
                borderRadius: '50%'
              }} />
            </div>
            <p style={{ 
              color: '#FFFFFF', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              89
            </p>
            <div style={{ 
              color: '#10b981', 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              +8% este mês
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '120px',
            height: '120px',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderRadius: '50%'
          }} />
        </div>

        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                color: '#E0E1E6', 
                fontSize: '14px', 
                fontWeight: '500',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Titulares Únicos
              </h3>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#f59e0b',
                borderRadius: '50%'
              }} />
            </div>
            <p style={{ 
              color: '#FFFFFF', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              423
            </p>
            <div style={{ 
              color: '#10b981', 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              +5% este mês
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '120px',
            height: '120px',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            borderRadius: '50%'
          }} />
        </div>

        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                color: '#E0E1E6', 
                fontSize: '14px', 
                fontWeight: '500',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Casos Ativos
              </h3>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%'
              }} />
            </div>
            <p style={{ 
              color: '#FFFFFF', 
              fontSize: '32px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0',
              lineHeight: 1
            }}>
              7
            </p>
            <div style={{ 
              color: '#ef4444', 
              fontSize: '13px',
              fontWeight: '500'
            }}>
              -2% este mês
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '120px',
            height: '120px',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            borderRadius: '50%'
          }} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Activity Feed */}
        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px', 
              fontWeight: '600',
              margin: 0
            }}>
              Atividade Recente
            </h3>
            <button style={{
              backgroundColor: 'transparent',
              border: `1px solid #00ade0`,
              color: '#00ade0',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Ver Todos
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '📁', text: 'Novo arquivo processado', file: 'arquivo_dados_pessoais.zip', time: '2 min atrás', color: '#00ade0' },
              { icon: '🔍', text: '15 CPFs detectados em', file: 'clientes.csv', time: '5 min atrás', color: '#f59e0b' },
              { icon: '⚠️', text: 'Caso #2024-003 criado', file: 'Vazamento de dados', time: '12 min atrás', color: '#ef4444' },
              { icon: '📊', text: 'Relatório mensal gerado', file: 'LGPD_Dezembro_2024.pdf', time: '1h atrás', color: '#10b981' }
            ].map((activity, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#0F1824',
                borderRadius: '8px',
                border: '1px solid #1E2835'
              }}>
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  backgroundColor: `${activity.color}15`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#E0E1E6', fontSize: '14px', marginBottom: '2px' }}>
                    {activity.text} <span style={{ color: activity.color, fontWeight: '500' }}>{activity.file}</span>
                  </div>
                  <div style={{ color: '#A5A8B1', fontSize: '12px' }}>
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: '#1A2332',
          border: '1px solid #2A3441',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ 
            color: '#FFFFFF', 
            fontSize: '18px', 
            fontWeight: '600',
            margin: '0 0 20px 0'
          }}>
            Ações Rápidas
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Processar Arquivo', color: '#00ade0', icon: '📤' },
              { label: 'Criar Caso', color: '#ef4444', icon: '⚠️' },
              { label: 'Gerar Relatório', color: '#10b981', icon: '📊' },
              { label: 'Configurações', color: '#6b7280', icon: '⚙️' }
            ].map((action, index) => (
              <button key={index} style={{
                backgroundColor: `${action.color}15`,
                border: `1px solid ${action.color}30`,
                color: action.color,
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                textAlign: 'left'
              }}>
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
          
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#0F1824',
            borderRadius: '8px',
            border: '1px solid #1E2835'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
                Sistema Online
              </span>
            </div>
            <div style={{ color: '#A5A8B1', fontSize: '12px' }}>
              Todos os serviços operacionais
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};