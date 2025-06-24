import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useListOrganizations, useCreateIncident } from '../hooks/useIncidents';

// Zod schema para validação
const incidentSchema = z.object({
  company: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  date: z.string().refine((val) => {
    // Verifica se é uma data ISO válida
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.includes('T');
  }, 'Data inválida'),
  type: z.enum([
    'Ataque Cibernético',
    'Vazamento (Exfiltração) de Dados', 
    'Deleção ou Destruição Indevida de Dados',
    'Acesso Não Autorizado',
    'Alteração Não Autorizada de Dados',
    'Compartilhamento ou Divulgação Indevida',
    'Interrupção de Serviços Críticos'
  ], {
    required_error: 'Tipo de incidente é obrigatório'
  }),
  description: z.string()
    .min(50, 'Descrição deve ter pelo menos 50 caracteres')
});

type IncidentFormData = z.infer<typeof incidentSchema>;

const TelaCadastroCaso: React.FC = () => {
  const navigate = useNavigate();
  const [isDraft, setIsDraft] = useState(false);
  const [showToast, setShowToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Tooltips explicativos para cada tipo de incidente
  const incidentTooltips = {
    'Ataque Cibernético': 'Ações maliciosas voltadas a comprometer sistemas ou dados, como malware (vírus, worms, trojans), ransomware (criptografia de dados seguida de demanda de resgate), ataques de negação de serviço (DDoS), Man-in-the-Middle e exploração de vulnerabilidades zero-day',
    'Vazamento (Exfiltração) de Dados': 'Extração ou divulgação não autorizada de informações pessoais, seja por exploração de falhas, engenharia social (phishing/spear-phishing) ou má configuração de sistemas, expondo bases de dados ou credenciais sensíveis',
    'Deleção ou Destruição Indevida de Dados': 'Remoção acidental ou deliberada de arquivos, bancos de dados ou backups, seja por falha de hardware, erro humano ou ação de malware (por exemplo, ransomware que apaga cópias de segurança), tornando irrecuperáveis informações essenciais',
    'Acesso Não Autorizado': 'Quando agentes internos ou externos obtêm acesso a sistemas ou repositórios de dados sem permissão — por credenciais comprometidas, falta de controles de autenticação/autorização ou exploração de vulnerabilidades ― violando o princípio do menor privilégio',
    'Alteração Não Autorizada de Dados': 'Modificação indevida de registros ou parâmetros em sistemas (inserção de informações falsas, adulteração de transações), comprometendo a integridade dos dados pessoais',
    'Compartilhamento ou Divulgação Indevida': 'Envio ou disponibilização de dados pessoais a terceiros sem base legal ou consentimento, incluindo publicação em local público, transferência irregular a parceiros ou envio de informações ao destinatário errado',
    'Interrupção de Serviços Críticos': 'Ataques que causam indisponibilidade de sistemas (DDoS, sabotagem interna, falhas em infraestrutura de nuvem), comprometendo a disponibilidade dos dados pessoais tratados'
  };
  
  // React Hook Form com Zod resolver
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    mode: 'onChange'
  });

  // Hooks para API
  const createIncidentMutation = useCreateIncident();

  // Watch description para contador de caracteres
  const description = watch('description', '');

  const showToastMessage = (type: 'success' | 'error', message: string) => {
    setShowToast({ type, message });
    setTimeout(() => setShowToast(null), 3000);
  };

  const onSubmit = async (data: IncidentFormData) => {
    try {
      await createIncidentMutation.mutateAsync({
        title: `Incidente ${data.type}`,
        description: data.description,
        organizationId: 'temp-id', // Temporary since we're using company name
        severity: 'medium',
        type: data.type,
        affectedDataTypes: [],
        detectedAt: data.date,
        reportedBy: 'Sistema',
        company: data.company
      });
      
      showToastMessage('success', 'Incidente cadastrado com sucesso!');
      setTimeout(() => navigate('/incidents'), 1500);
    } catch (error) {
      showToastMessage('error', 'Erro ao cadastrar incidente. Tente novamente.');
    }
  };

  const saveDraft = () => {
    setIsDraft(true);
    localStorage.setItem('incident-draft', JSON.stringify(watch()));
    showToastMessage('success', 'Rascunho salvo com sucesso!');
    setTimeout(() => setIsDraft(false), 2000);
  };



  return (
    <div style={{ padding: '24px' }}>
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

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          color: '#E0E1E6', 
          fontSize: '28px', 
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>
          Novo Incidente
        </h1>
        <p style={{ 
          color: '#A5A8B1', 
          fontSize: '16px',
          margin: 0
        }}>
          Registre um novo incidente de segurança da informação
        </p>
      </div>

      <div style={{ 
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '12px',
        padding: '32px'
      }}>
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* Grid para Empresa e Data */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '24px', 
            marginBottom: '24px' 
          }}>
            {/* Empresa */}
            <div>
              <label style={{ 
                display: 'block',
                color: '#E0E1E6',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '10px'
              }}>
                Empresa *
              </label>
              <input
                type="text"
                {...register('company')}
                placeholder="Nome da empresa"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#0D1B2A',
                  border: `1px solid ${errors.company ? '#ef4444' : '#1B263B'}`,
                  borderRadius: '8px',
                  color: '#E0E1E6',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                onBlur={(e) => e.target.style.borderColor = errors.company ? '#ef4444' : '#1B263B'}
              />
              {errors.company && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', margin: '6px 0 0 0' }}>
                  {errors.company.message}
                </p>
              )}
            </div>

            {/* Data */}
            <div>
              <label style={{ 
                display: 'block',
                color: '#E0E1E6',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '10px'
              }}>
                Data do Incidente *
              </label>
              <input
                type="datetime-local"
                {...register('date')}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#0D1B2A',
                  border: `1px solid ${errors.date ? '#ef4444' : '#1B263B'}`,
                  borderRadius: '8px',
                  color: '#E0E1E6',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00ade0'}
                onBlur={(e) => e.target.style.borderColor = errors.date ? '#ef4444' : '#1B263B'}
              />
              {errors.date && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', margin: '6px 0 0 0' }}>
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Espaço vazio para manter o grid */}
            <div></div>
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <label style={{ 
                color: '#E0E1E6',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                Tipo de Incidente *
              </label>
              <button
                type="button"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#1B263B',
                  border: '1px solid #00ade0',
                  color: '#00ade0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={() => setShowTooltip('general')}
                onMouseLeave={() => setShowTooltip(null)}
              >
                ?
              </button>
            </div>
            
            {showTooltip === 'general' && (
              <div style={{
                position: 'absolute',
                top: '35px',
                right: '0',
                zIndex: 1000,
                backgroundColor: '#1B263B',
                border: '1px solid #00ade0',
                borderRadius: '8px',
                padding: '12px',
                maxWidth: '400px',
                color: '#E0E1E6',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                Selecione a classificação que melhor descreve o tipo de incidente de segurança ocorrido.
              </div>
            )}
            
            <select
              {...register('type')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.type ? '#ef4444' : '#1B263B'}`,
                borderRadius: '8px',
                color: '#E0E1E6',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.type ? '#ef4444' : '#1B263B'}
            >
              <option value="">Selecione o tipo de incidente</option>
              {Object.keys(incidentTooltips).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            {/* Tooltip específico para o tipo selecionado */}
            {watch('type') && incidentTooltips[watch('type') as keyof typeof incidentTooltips] && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                backgroundColor: '#0D1B2A',
                border: '1px solid #1B263B',
                borderRadius: '8px',
                color: '#A5A8B1',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                <div style={{ 
                  color: '#00ade0', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Definição
                </div>
                {incidentTooltips[watch('type') as keyof typeof incidentTooltips]}
              </div>
            )}
            
            {errors.type && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', margin: '6px 0 0 0' }}>
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: '32px', position: 'relative' }}>
            <label style={{ 
              display: 'block',
              color: '#E0E1E6',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '10px'
            }}>
              Descrição *
            </label>
            <textarea
              {...register('description')}
              placeholder="Descreva o incidente em detalhes (mínimo 50 caracteres)"
              style={{
                width: '100%',
                minHeight: '160px',
                padding: '16px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.description ? '#ef4444' : '#1B263B'}`,
                borderRadius: '8px',
                color: '#E0E1E6',
                fontSize: '16px',
                resize: 'vertical',
                outline: 'none',
                paddingBottom: '40px',
                lineHeight: '1.5'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.description ? '#ef4444' : '#1B263B'}
            />
            
            {/* Contador de caracteres */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              right: '16px',
              color: '#A5A8B1',
              fontSize: '13px',
              backgroundColor: '#112240',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              {description?.length || 0}
            </div>
            
            {errors.description && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', margin: '6px 0 0 0' }}>
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Loading State */}
          {createIncidentMutation.isPending && (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 173, 224, 0.1)',
              border: '1px solid #00ade0',
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#00ade0', fontSize: '14px', margin: 0 }}>
                Criando incidente...
              </p>
            </div>
          )}

          {/* Error State */}
          {createIncidentMutation.isError && !showToast && (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>
                Erro ao criar incidente. Tente novamente.
              </p>
            </div>
          )}

          {/* Footer com botões */}
          <div style={{
            display: 'flex',
            gap: '16px',
            paddingTop: '32px',
            borderTop: '1px solid #1B263B'
          }}>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isDraft}
              style={{
                padding: '14px 24px',
                backgroundColor: 'transparent',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#A5A8B1',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isDraft ? 'not-allowed' : 'pointer',
                opacity: isDraft ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isDraft) {
                  e.target.style.backgroundColor = '#1B263B';
                  e.target.style.borderColor = '#1B263B';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDraft) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#374151';
                }
              }}
            >
              {isDraft ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            
            <button
              type="submit"
              disabled={!isValid || createIncidentMutation.isPending}
              style={{
                padding: '14px 32px',
                backgroundColor: isValid && !createIncidentMutation.isPending ? '#00ade0' : '#374151',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isValid && !createIncidentMutation.isPending ? 'pointer' : 'not-allowed',
                opacity: isValid && !createIncidentMutation.isPending ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (isValid && !createIncidentMutation.isPending) {
                  e.target.style.backgroundColor = '#0099c7';
                }
              }}
              onMouseLeave={(e) => {
                if (isValid && !createIncidentMutation.isPending) {
                  e.target.style.backgroundColor = '#00ade0';
                }
              }}
            >
              {createIncidentMutation.isPending ? 'Cadastrando...' : 'Cadastrar Incidente'}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TelaCadastroCaso;