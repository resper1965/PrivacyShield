import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const sections = [
  { key: 'general', label: 'Geral' },
  { key: 'upload', label: 'Upload & Processamento' },
  { key: 'detection', label: 'Detecção de PII' },
  { key: 'queue', label: 'Fila & Workers' },
  { key: 'patterns', label: 'Padrões Regex' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'notifications', label: 'Notificações' },
  { key: 'security', label: 'Segurança' },
  { key: 'users', label: 'Usuários & Permissões' },
];

const fetchConfig = async () => {
  const response = await fetch('/api/v1/config');
  if (!response.ok) throw new Error('Erro ao carregar configurações');
  return response.json();
};

const updateConfig = async (updates: any) => {
  const response = await fetch('/api/v1/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Erro ao salvar configurações');
  return response.json();
};

export const TelaConfiguracoes: React.FC = () => {
  const [active, setActive] = useState('upload');
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig
  });

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      showToastMessage('success', 'Configurações salvas com sucesso!');
    },
    onError: () => {
      showToastMessage('error', 'Erro ao salvar configurações');
    }
  });

  const { control, handleSubmit, reset } = useForm({ 
    defaultValues: {
      MAX_UPLOAD_MB: 100,
      ALLOWED_EXTS: '.zip,.pdf,.docx,.txt,.csv,.xlsx',
      ZIP_MAX_DEPTH: 5,
      ZIP_BOMB_RATIO: 100,
      CLAMAV_HOST: 'localhost',
      CLAMAV_PORT: 3310,
      ENABLE_PII_DETECTION: true,
      CPF_VALIDATION: true,
      CNPJ_VALIDATION: true,
      EMAIL_VALIDATION: true,
      PHONE_VALIDATION: true,
      ENABLE_QUEUE: true,
      WORKER_CONCURRENCY: 5,
      QUEUE_RETRY_ATTEMPTS: 3,
      ENABLE_REPORTS: true,
      EXPORT_CSV: true,
      EXPORT_PDF: true,
      EMAIL_NOTIFICATIONS: false,
      WEBHOOK_NOTIFICATIONS: false,
      SESSION_TIMEOUT: 3600,
      PASSWORD_MIN_LENGTH: 8,
      ENABLE_2FA: false
    }
  });

  useEffect(() => {
    if (config) reset(config);
  }, [config, reset]);

  const showToastMessage = (type: 'success' | 'error', message: string) => {
    setShowToast({ type, message });
    setTimeout(() => setShowToast(null), 3000);
  };

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: '24px', 
        color: '#E0E1E6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #1B263B',
            borderTop: '4px solid #00ade0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ margin: 0 }}>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      color: '#E0E1E6', 
      backgroundColor: '#0D1B2A',
      padding: '24px',
      gap: '0'
    }}>
      {/* Toast Notifications */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: showToast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          {showToast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside style={{ 
        width: '240px', 
        backgroundColor: '#112240', 
        padding: '16px',
        borderRight: '1px solid #1B263B',
        borderRadius: '8px 0 0 8px'
      }}>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {sections.map(s => (
            <li key={s.key} style={{ marginBottom: '8px' }}>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: active === s.key ? '#1B263B' : 'transparent',
                  border: 'none',
                  color: active === s.key ? '#E0E1E6' : '#A5A8B1',
                  fontWeight: active === s.key ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onClick={() => setActive(s.key)}
                onMouseEnter={(e) => {
                  if (active !== s.key) {
                    e.target.style.color = '#00ade0';
                    e.target.style.backgroundColor = 'rgba(0, 173, 224, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (active !== s.key) {
                    e.target.style.color = '#A5A8B1';
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {s.label}
                {active === s.key && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '16px',
                    right: '16px',
                    height: '2px',
                    backgroundColor: '#00ade0',
                    borderRadius: '1px'
                  }} />
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        padding: '24px', 
        overflow: 'auto',
        backgroundColor: '#112240',
        borderRadius: '0 8px 8px 0'
      }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{
            backgroundColor: '#0D1B2A',
            border: '1px solid #1B263B',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '24px'
          }}>

            {active === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Tamanho máximo de upload (MB)
                  </label>
                  <Controller
                    name="MAX_UPLOAD_MB"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        style={{
                          width: '128px',
                          padding: '12px',
                          backgroundColor: '#0D1B2A',
                          border: '1px solid #1B263B',
                          borderRadius: '6px',
                          color: '#E0E1E6',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                        onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                      />
                    )}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Tipos permitidos (extensões)
                  </label>
                  <Controller
                    name="ALLOWED_EXTS"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder=".zip,.pdf,.docx"
                        style={{
                          width: '100%',
                          maxWidth: '400px',
                          padding: '12px',
                          backgroundColor: '#0D1B2A',
                          border: '1px solid #1B263B',
                          borderRadius: '6px',
                          color: '#E0E1E6',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                        onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                      />
                    )}
                  />
                  <small style={{ color: '#A5A8B1', fontSize: '12px' }}>
                    Separe por vírgula
                  </small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Profundidade máxima de extração ZIP
                    </label>
                    <Controller
                      name="ZIP_MAX_DEPTH"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          style={{
                            width: '96px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Razão ZIP-Bomb
                    </label>
                    <Controller
                      name="ZIP_BOMB_RATIO"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          style={{
                            width: '96px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      ClamAV Host
                    </label>
                    <Controller
                      name="CLAMAV_HOST"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      ClamAV Port
                    </label>
                    <Controller
                      name="CLAMAV_PORT"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          style={{
                            width: '128px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {active === 'detection' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <Controller
                      name="ENABLE_PII_DETECTION"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: '#00ade0'
                          }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
                      Habilitar Detecção de PII
                    </span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Controller
                      name="CPF_VALIDATION"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{ width: '16px', height: '16px', accentColor: '#00ade0' }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px' }}>Validação CPF</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Controller
                      name="CNPJ_VALIDATION"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{ width: '16px', height: '16px', accentColor: '#00ade0' }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px' }}>Validação CNPJ</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Controller
                      name="EMAIL_VALIDATION"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{ width: '16px', height: '16px', accentColor: '#00ade0' }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px' }}>Validação Email</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <Controller
                      name="PHONE_VALIDATION"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{ width: '16px', height: '16px', accentColor: '#00ade0' }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px' }}>Validação Telefone</span>
                  </label>
                </div>
              </div>
            )}

            {active === 'queue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <Controller
                      name="ENABLE_QUEUE"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: '#00ade0'
                          }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
                      Habilitar Sistema de Fila
                    </span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Concorrência de Workers
                    </label>
                    <Controller
                      name="WORKER_CONCURRENCY"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="1"
                          max="20"
                          style={{
                            width: '96px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Tentativas de Retry
                    </label>
                    <Controller
                      name="QUEUE_RETRY_ATTEMPTS"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="1"
                          max="10"
                          style={{
                            width: '96px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {active === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Timeout de Sessão (segundos)
                    </label>
                    <Controller
                      name="SESSION_TIMEOUT"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="300"
                          style={{
                            width: '128px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Comprimento Mínimo da Senha
                    </label>
                    <Controller
                      name="PASSWORD_MIN_LENGTH"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="6"
                          max="32"
                          style={{
                            width: '96px',
                            padding: '12px',
                            backgroundColor: '#0D1B2A',
                            border: '1px solid #1B263B',
                            borderRadius: '6px',
                            color: '#E0E1E6',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                          onBlur={(e) => e.target.style.borderColor = '#1B263B'}
                        />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <Controller
                      name="ENABLE_2FA"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          style={{
                            width: '16px',
                            height: '16px',
                            accentColor: '#00ade0'
                          }}
                        />
                      )}
                    />
                    <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
                      Habilitar Autenticação de Dois Fatores (2FA)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Placeholder para outras seções */}
            {!['upload', 'detection', 'queue', 'security'].includes(active) && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#A5A8B1'
              }}>
                <p style={{ margin: 0, fontSize: '16px' }}>
                  Configurações para "{sections.find(s => s.key === active)?.label}" em desenvolvimento
                </p>
              </div>
            )}
          </div>

          {/* Footer com botões */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '24px',
            borderTop: '1px solid #1B263B'
          }}>
            <button
              type="button"
              onClick={() => reset(config)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: '1px solid #00ade0',
                borderRadius: '6px',
                color: '#00ade0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1B263B'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                padding: '12px 24px',
                backgroundColor: mutation.isPending ? '#374151' : '#00ade0',
                border: 'none',
                borderRadius: '6px',
                color: mutation.isPending ? '#A5A8B1' : '#0D1B2A',
                fontSize: '14px',
                fontWeight: '600',
                cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </main>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TelaConfiguracoes;