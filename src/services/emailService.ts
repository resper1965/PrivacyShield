/**
 * Email Service using SendGrid
 * Handles email notifications for N.Crisis system
 */

import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailTemplate {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface NotificationEmailData {
  recipientName: string;
  alertType: 'backup' | 'health' | 'security' | 'update';
  message: string;
  details?: Record<string, any>;
  actionUrl?: string;
}

export interface ReportEmailData {
  recipientName: string;
  reportType: string;
  generatedAt: string;
  summary: {
    totalDetections: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
  };
  downloadUrl?: string;
}

/**
 * Send a generic email using SendGrid
 */
export async function sendEmail(params: EmailTemplate): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from || process.env.FROM_EMAIL || 'noreply@e-ness.com.br',
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    });
    
    console.log(`Email sent successfully to: ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send system notification email
 */
export async function sendNotificationEmail(
  to: string | string[],
  data: NotificationEmailData
): Promise<boolean> {
  const alertIcons = {
    backup: '💾',
    health: '🔍',
    security: '🛡️',
    update: '🔄'
  };

  const alertColors = {
    backup: '#4CAF50',
    health: '#FF9800',
    security: '#F44336',
    update: '#2196F3'
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N.Crisis Alert</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #112240 0%, #1e3a5f 100%); color: white; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .dot { color: #00ade0; }
        .alert-icon { font-size: 48px; margin: 20px 0; }
        .content { padding: 30px; }
        .alert-type { color: ${alertColors[data.alertType]}; font-weight: bold; font-size: 18px; margin-bottom: 15px; text-transform: uppercase; }
        .message { font-size: 16px; line-height: 1.6; margin-bottom: 25px; color: #333; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .details h4 { margin-top: 0; color: #495057; }
        .action-button { display: inline-block; background-color: #00ade0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        .timestamp { font-size: 12px; color: #6c757d; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">n<span class="dot">.</span>crisis</div>
            <div class="alert-icon">${alertIcons[data.alertType]}</div>
            <h1>System Alert</h1>
        </div>
        
        <div class="content">
            <div class="alert-type">${data.alertType} Alert</div>
            
            <p>Olá ${data.recipientName},</p>
            
            <div class="message">${data.message}</div>
            
            ${data.details ? `
            <div class="details">
                <h4>Detalhes:</h4>
                ${Object.entries(data.details).map(([key, value]) => 
                  `<p><strong>${key}:</strong> ${value}</p>`
                ).join('')}
            </div>
            ` : ''}
            
            ${data.actionUrl ? `
            <a href="${data.actionUrl}" class="action-button">Ver Detalhes</a>
            ` : ''}
            
            <div class="timestamp">
                Enviado em: ${new Date().toLocaleString('pt-BR')}
            </div>
        </div>
        
        <div class="footer">
            <p>Este é um email automático do sistema N.Crisis.</p>
            <p>Domain: monster.e-ness.com.br</p>
        </div>
    </div>
</body>
</html>`;

  const text = `
N.Crisis System Alert

Tipo: ${data.alertType.toUpperCase()}
Para: ${data.recipientName}

${data.message}

${data.details ? Object.entries(data.details).map(([key, value]) => `${key}: ${value}`).join('\n') : ''}

${data.actionUrl ? `Ver detalhes: ${data.actionUrl}` : ''}

Enviado em: ${new Date().toLocaleString('pt-BR')}
`;

  return await sendEmail({
    to,
    subject: `N.Crisis Alert: ${data.alertType.toUpperCase()}`,
    html,
    text,
    from: 'alerts@e-ness.com.br'
  });
}

/**
 * Send PII detection report email
 */
export async function sendReportEmail(
  to: string | string[],
  data: ReportEmailData
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N.Crisis Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #112240 0%, #1e3a5f 100%); color: white; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .dot { color: #00ade0; }
        .content { padding: 30px; }
        .stats { display: flex; justify-content: space-around; margin: 30px 0; }
        .stat { text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; flex: 1; margin: 0 5px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #00ade0; }
        .stat-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
        .download-button { display: inline-block; background-color: #00ade0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">n<span class="dot">.</span>crisis</div>
            <h1>📊 Relatório de PII</h1>
        </div>
        
        <div class="content">
            <p>Olá ${data.recipientName},</p>
            
            <p>Seu relatório <strong>${data.reportType}</strong> foi gerado com sucesso em ${data.generatedAt}.</p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${data.summary.totalDetections}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${data.summary.criticalCount}</div>
                    <div class="stat-label">Crítico</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${data.summary.highCount}</div>
                    <div class="stat-label">Alto</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${data.summary.mediumCount}</div>
                    <div class="stat-label">Médio</div>
                </div>
            </div>
            
            ${data.downloadUrl ? `
            <a href="${data.downloadUrl}" class="download-button">📥 Baixar Relatório</a>
            ` : ''}
            
            <p><small>Este relatório contém informações sensíveis e deve ser tratado com confidencialidade conforme a LGPD.</small></p>
        </div>
        
        <div class="footer">
            <p>N.Crisis - Sistema de Detecção de PII</p>
            <p>Domain: monster.e-ness.com.br</p>
        </div>
    </div>
</body>
</html>`;

  return await sendEmail({
    to,
    subject: `N.Crisis - Relatório ${data.reportType} Disponível`,
    html,
    from: 'reports@e-ness.com.br'
  });
}

/**
 * Send welcome email for new users
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string,
  loginUrl: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao N.Crisis</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #112240 0%, #1e3a5f 100%); color: white; padding: 40px; text-align: center; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .dot { color: #00ade0; }
        .content { padding: 40px; }
        .feature { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; }
        .login-button { display: inline-block; background-color: #00ade0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 30px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">n<span class="dot">.</span>crisis</div>
            <h1>🎉 Bem-vindo!</h1>
        </div>
        
        <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Seja bem-vindo ao <strong>N.Crisis</strong>, a solução completa para detecção e análise de PII (Informações Pessoais Identificáveis) com conformidade LGPD.</p>
            
            <div class="feature">
                <h3>🔍 Detecção Avançada</h3>
                <p>Algoritmos brasileiros para detecção de CPF, CNPJ, telefones, emails e outros dados pessoais.</p>
            </div>
            
            <div class="feature">
                <h3>📊 Relatórios LGPD</h3>
                <p>Relatórios detalhados para compliance e auditoria conforme a Lei Geral de Proteção de Dados.</p>
            </div>
            
            <div class="feature">
                <h3>🛡️ Segurança Total</h3>
                <p>Criptografia, backups automáticos e monitoramento contínuo dos seus dados.</p>
            </div>
            
            <a href="${loginUrl}" class="login-button">🚀 Acessar Sistema</a>
            
            <p>Se você tiver alguma dúvida, nossa equipe está pronta para ajudar.</p>
        </div>
        
        <div class="footer">
            <p>N.Crisis - Sistema de Detecção de PII</p>
            <p>Domain: monster.e-ness.com.br</p>
            <p>Este email foi enviado para ${to}</p>
        </div>
    </div>
</body>
</html>`;

  return await sendEmail({
    to,
    subject: 'Bem-vindo ao N.Crisis - Sistema de Detecção de PII',
    html,
    from: 'welcome@e-ness.com.br'
  });
}

export default {
  sendEmail,
  sendNotificationEmail,
  sendReportEmail,
  sendWelcomeEmail
};