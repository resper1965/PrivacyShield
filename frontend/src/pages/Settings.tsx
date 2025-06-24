import React, { useState } from 'react';
import { Save, TestTube, Mail, Webhook, Moon, Sun, Bell } from 'lucide-react';

interface Settings {
  theme: 'dark' | 'light';
  notifications: {
    email: boolean;
    webhook: boolean;
    desktop: boolean;
  };
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      username: string;
      password: string;
      secure: boolean;
    };
    from: string;
    recipients: string[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
    events: string[];
  };
  processing: {
    maxFileSize: number;
    maxConcurrentJobs: number;
    retentionDays: number;
  };
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    notifications: {
      email: true,
      webhook: false,
      desktop: true
    },
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        username: '',
        password: '',
        secure: true
      },
      from: '',
      recipients: []
    },
    webhook: {
      enabled: false,
      url: '',
      secret: '',
      events: ['incident_created', 'high_risk_detection']
    },
    processing: {
      maxFileSize: 100,
      maxConcurrentJobs: 5,
      retentionDays: 90
    }
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ email: false, webhook: false });

  const handleSave = async () => {
    try {
      setSaving(true);
      // In real implementation, save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTesting(prev => ({ ...prev, email: true }));
      // In real implementation, test email connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Email de teste enviado com sucesso!');
    } catch (error) {
      console.error('Error testing email:', error);
      alert('Erro ao testar email');
    } finally {
      setTesting(prev => ({ ...prev, email: false }));
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTesting(prev => ({ ...prev, webhook: true }));
      // In real implementation, test webhook connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Webhook testado com sucesso!');
    } catch (error) {
      console.error('Error testing webhook:', error);
      alert('Erro ao testar webhook');
    } finally {
      setTesting(prev => ({ ...prev, webhook: false }));
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
          Configurações
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Preferences */}
        <div className="card">
          <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Preferências do Usuário
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">
                {settings.theme === 'dark' ? <Moon size={16} className="inline mr-2" /> : <Sun size={16} className="inline mr-2" />}
                Tema
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'dark' | 'light' }))}
                className="form-select"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>

            <div>
              <label className="form-label">
                <Bell size={16} className="inline mr-2" />
                Notificações
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    Notificações por email
                  </span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.notifications.webhook}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, webhook: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    Notificações via webhook
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.notifications.desktop}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, desktop: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    Notificações desktop
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Settings */}
        <div className="card">
          <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Configurações de Processamento
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">Tamanho máximo de arquivo (MB)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.processing.maxFileSize}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  processing: { ...prev.processing, maxFileSize: parseInt(e.target.value) || 100 }
                }))}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Jobs simultâneos máximos</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.processing.maxConcurrentJobs}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  processing: { ...prev.processing, maxConcurrentJobs: parseInt(e.target.value) || 5 }
                }))}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Retenção de dados (dias)</label>
              <input
                type="number"
                min="30"
                max="365"
                value={settings.processing.retentionDays}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  processing: { ...prev.processing, retentionDays: parseInt(e.target.value) || 90 }
                }))}
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Configuration */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
            <Mail size={20} className="inline mr-2" />
            Configuração de Email
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestEmail}
              disabled={!settings.email.enabled || testing.email}
              className="btn btn-secondary"
            >
              <TestTube size={16} />
              {testing.email ? 'Testando...' : 'Testar Conexão'}
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.email.enabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                Habilitado
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Servidor SMTP</label>
            <input
              type="text"
              value={settings.email.smtp.host}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, smtp: { ...prev.email.smtp, host: e.target.value } }
              }))}
              placeholder="smtp.gmail.com"
              className="form-input"
              disabled={!settings.email.enabled}
            />
          </div>

          <div>
            <label className="form-label">Porta</label>
            <input
              type="number"
              value={settings.email.smtp.port}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, smtp: { ...prev.email.smtp, port: parseInt(e.target.value) || 587 } }
              }))}
              className="form-input"
              disabled={!settings.email.enabled}
            />
          </div>

          <div>
            <label className="form-label">Usuário</label>
            <input
              type="text"
              value={settings.email.smtp.username}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, smtp: { ...prev.email.smtp, username: e.target.value } }
              }))}
              placeholder="usuario@gmail.com"
              className="form-input"
              disabled={!settings.email.enabled}
            />
          </div>

          <div>
            <label className="form-label">Senha</label>
            <input
              type="password"
              value={settings.email.smtp.password}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, smtp: { ...prev.email.smtp, password: e.target.value } }
              }))}
              className="form-input"
              disabled={!settings.email.enabled}
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Email remetente</label>
            <input
              type="email"
              value={settings.email.from}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, from: e.target.value }
              }))}
              placeholder="noreply@empresa.com"
              className="form-input"
              disabled={!settings.email.enabled}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.email.smtp.secure}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                email: { ...prev.email, smtp: { ...prev.email.smtp, secure: e.target.checked } }
              }))}
              className="rounded"
              disabled={!settings.email.enabled}
            />
            <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
              Usar conexão segura (TLS/SSL)
            </span>
          </label>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
            <Webhook size={20} className="inline mr-2" />
            Configuração de Webhook
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestWebhook}
              disabled={!settings.webhook.enabled || testing.webhook}
              className="btn btn-secondary"
            >
              <TestTube size={16} />
              {testing.webhook ? 'Testando...' : 'Testar Webhook'}
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.webhook.enabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  webhook: { ...prev.webhook, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                Habilitado
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">URL do Webhook</label>
            <input
              type="url"
              value={settings.webhook.url}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                webhook: { ...prev.webhook, url: e.target.value }
              }))}
              placeholder="https://hooks.slack.com/services/..."
              className="form-input"
              disabled={!settings.webhook.enabled}
            />
          </div>

          <div>
            <label className="form-label">Secret (opcional)</label>
            <input
              type="password"
              value={settings.webhook.secret}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                webhook: { ...prev.webhook, secret: e.target.value }
              }))}
              placeholder="Chave secreta para validação"
              className="form-input"
              disabled={!settings.webhook.enabled}
            />
          </div>

          <div>
            <label className="form-label">Eventos</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { key: 'incident_created', label: 'Incidente criado' },
                { key: 'high_risk_detection', label: 'Detecção de alto risco' },
                { key: 'job_failed', label: 'Job falhou' },
                { key: 'virus_detected', label: 'Vírus detectado' }
              ].map(event => (
                <label key={event.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.webhook.events.includes(event.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, events: [...prev.webhook.events, event.key] }
                        }));
                      } else {
                        setSettings(prev => ({
                          ...prev,
                          webhook: { ...prev.webhook, events: prev.webhook.events.filter(e => e !== event.key) }
                        }));
                      }
                    }}
                    className="rounded"
                    disabled={!settings.webhook.enabled}
                  />
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    {event.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};