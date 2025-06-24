import React from 'react';
import { 
  Shield, 
  Upload, 
  FileText, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle 
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const stats = [
    {
      title: 'Total de Detecções',
      value: '1,247',
      icon: Shield,
      change: '+12%',
      color: '#00ade0'
    },
    {
      title: 'Arquivos Processados',
      value: '89',
      icon: FileText,
      change: '+8%',
      color: '#10b981'
    },
    {
      title: 'Titulares Únicos',
      value: '423',
      icon: Users,
      change: '+5%',
      color: '#f59e0b'
    },
    {
      title: 'Casos Ativos',
      value: '7',
      icon: AlertTriangle,
      change: '-2%',
      color: '#ef4444'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'upload',
      title: 'Novo arquivo processado',
      description: 'arquivo_dados_pessoais.zip',
      time: '2 min atrás',
      icon: Upload,
      color: '#00ade0'
    },
    {
      id: 2,
      type: 'detection',
      title: '15 novos CPFs detectados',
      description: 'em arquivo_clientes.csv',
      time: '5 min atrás',
      icon: Shield,
      color: '#f59e0b'
    },
    {
      id: 3,
      type: 'case',
      title: 'Caso #INC-2024-003 criado',
      description: 'Vazamento de dados detectado',
      time: '1 hora atrás',
      icon: AlertTriangle,
      color: '#ef4444'
    },
    {
      id: 4,
      type: 'report',
      title: 'Relatório mensal gerado',
      description: 'Conformidade LGPD - Janeiro 2024',
      time: '2 horas atrás',
      icon: CheckCircle,
      color: '#10b981'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ color: '#E0E1E6' }}
        >
          Bem-vindo ao n.crisis
        </h1>
        <p 
          className="text-lg"
          style={{ color: '#94a3b8' }}
        >
          Sistema de Detecção de PII e Conformidade LGPD
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-6 rounded-xl border transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: '#162332',
              borderColor: '#1e293b'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="p-3 rounded-xl"
                style={{ 
                  backgroundColor: `${stat.color}20`,
                  border: `1px solid ${stat.color}40`
                }}
              >
                <stat.icon 
                  className="w-6 h-6" 
                  style={{ color: stat.color }} 
                />
              </div>
              <span 
                className="text-sm font-medium px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: stat.change.startsWith('+') ? '#10b98120' : '#ef444420',
                  color: stat.change.startsWith('+') ? '#10b981' : '#ef4444'
                }}
              >
                {stat.change}
              </span>
            </div>
            <div>
              <div 
                className="text-2xl font-bold mb-1"
                style={{ color: '#E0E1E6' }}
              >
                {stat.value}
              </div>
              <div 
                className="text-sm"
                style={{ color: '#94a3b8' }}
              >
                {stat.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div 
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: '#162332',
          borderColor: '#1e293b'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 
            className="text-xl font-bold"
            style={{ color: '#E0E1E6' }}
          >
            Atividade Recente
          </h2>
          <button 
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ 
              color: '#00ade0',
              backgroundColor: 'rgba(0, 173, 224, 0.1)',
              border: '1px solid rgba(0, 173, 224, 0.2)'
            }}
          >
            Ver Todas
          </button>
        </div>

        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start gap-4 p-4 rounded-lg transition-colors hover:bg-gray-800/30"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div 
                className="p-2 rounded-lg flex-shrink-0"
                style={{ 
                  backgroundColor: `${activity.color}20`,
                  border: `1px solid ${activity.color}40`
                }}
              >
                <activity.icon 
                  className="w-4 h-4" 
                  style={{ color: activity.color }} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="font-medium mb-1"
                  style={{ color: '#E0E1E6' }}
                >
                  {activity.title}
                </div>
                <div 
                  className="text-sm mb-1"
                  style={{ color: '#94a3b8' }}
                >
                  {activity.description}
                </div>
                <div 
                  className="text-xs flex items-center gap-1"
                  style={{ color: '#64748b' }}
                >
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div 
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: '#162332',
          borderColor: '#1e293b'
        }}
      >
        <h2 
          className="text-xl font-bold mb-6"
          style={{ color: '#E0E1E6' }}
        >
          Ações Rápidas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            className="p-4 rounded-lg border transition-all duration-200 hover:scale-105 text-left"
            style={{ 
              backgroundColor: '#1e293b',
              borderColor: '#334155'
            }}
          >
            <Upload 
              className="w-8 h-8 mb-3" 
              style={{ color: '#00ade0' }} 
            />
            <div 
              className="font-medium mb-1"
              style={{ color: '#E0E1E6' }}
            >
              Novo Upload
            </div>
            <div 
              className="text-sm"
              style={{ color: '#94a3b8' }}
            >
              Carregar arquivos para análise
            </div>
          </button>

          <button 
            className="p-4 rounded-lg border transition-all duration-200 hover:scale-105 text-left"
            style={{ 
              backgroundColor: '#1e293b',
              borderColor: '#334155'
            }}
          >
            <AlertTriangle 
              className="w-8 h-8 mb-3" 
              style={{ color: '#f59e0b' }} 
            />
            <div 
              className="font-medium mb-1"
              style={{ color: '#E0E1E6' }}
            >
              Cadastrar Caso
            </div>
            <div 
              className="text-sm"
              style={{ color: '#94a3b8' }}
            >
              Registrar novo incidente
            </div>
          </button>

          <button 
            className="p-4 rounded-lg border transition-all duration-200 hover:scale-105 text-left"
            style={{ 
              backgroundColor: '#1e293b',
              borderColor: '#334155'
            }}
          >
            <TrendingUp 
              className="w-8 h-8 mb-3" 
              style={{ color: '#10b981' }} 
            />
            <div 
              className="font-medium mb-1"
              style={{ color: '#E0E1E6' }}
            >
              Ver Relatórios
            </div>
            <div 
              className="text-sm"
              style={{ color: '#94a3b8' }}
            >
              Análises e estatísticas
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;