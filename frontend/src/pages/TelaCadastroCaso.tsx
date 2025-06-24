import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useListOrganizations, useCreateIncident } from '../hooks/useIncidents';

// Zod schema para validação
const incidentSchema = z.object({
  organizationId: z.string().uuid('ID da organização deve ser um UUID válido'),
  date: z.string().refine((val) => {
    // Verifica se é uma data ISO válida
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.includes('T');
  }, 'Data inválida'),
  type: z.enum(['Malware', 'Phishing', 'DDoS', 'Vazamento de dados'], {
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
  const { data: organizations, isLoading: loadingOrgs } = useListOrganizations();
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
        organizationId: data.organizationId,
        severity: 'medium',
        type: data.type,
        affectedDataTypes: [],
        detectedAt: data.date,
        reportedBy: 'Sistema'
      });
      
      showToastMessage('success', 'Incidente criado com sucesso!');
      setTimeout(() => navigate('/incidents'), 1500);
    } catch (error) {
      showToastMessage('error', 'Erro ao criar incidente. Tente novamente.');
    }
  };

  const saveDraft = () => {
    setIsDraft(true);
    localStorage.setItem('incident-draft', JSON.stringify(watch()));
    showToastMessage('success', 'Rascunho salvo com sucesso!');
    setTimeout(() => setIsDraft(false), 2000);
  };

  if (loadingOrgs) {
    return (
      <div style={{ 
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
          <p style={{ color: '#E0E1E6', margin: 0 }}>Carregando organizações...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D1B2A', position: 'relative' }}>
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

      <div style={{ maxWidth: '448px', margin: '0 auto', padding: '24px' }}>
        <form 
          onSubmit={handleSubmit(onSubmit)}
          style={{
            backgroundColor: '#112240',
            border: '1px solid #1B263B',
            borderRadius: '8px',
            padding: '24px'
          }}
        >
          <h2 style={{ 
            color: '#E0E1E6', 
            fontSize: '24px', 
            fontWeight: '600',
            marginBottom: '24px',
            textAlign: 'center',
            margin: '0 0 24px 0'
          }}>
            Cadastro de Incidente
          </h2>

          {/* Empresa */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Empresa *
            </label>
            <select
              {...register('organizationId')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.organizationId ? '#ef4444' : '#1B263B'}`,
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.organizationId ? '#ef4444' : '#1B263B'}
            >
              <option value="">Selecione uma empresa</option>
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {errors.organizationId && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                {errors.organizationId.message}
              </p>
            )}
          </div>

          {/* Data */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Data do Incidente *
            </label>
            <input
              type="datetime-local"
              {...register('date')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.date ? '#ef4444' : '#1B263B'}`,
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.date ? '#ef4444' : '#1B263B'}
            />
            {errors.date && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                {errors.date.message}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Tipo de Incidente *
            </label>
            <select
              {...register('type')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.type ? '#ef4444' : '#1B263B'}`,
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.type ? '#ef4444' : '#1B263B'}
            >
              <option value="">Selecione o tipo</option>
              <option value="Malware">Malware</option>
              <option value="Phishing">Phishing</option>
              <option value="DDoS">DDoS</option>
              <option value="Vazamento de dados">Vazamento de dados</option>
            </select>
            {errors.type && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <label style={{ 
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Descrição *
            </label>
            <textarea
              {...register('description')}
              placeholder="Descreva o incidente em detalhes (mínimo 50 caracteres)"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: `1px solid ${errors.description ? '#ef4444' : '#1B263B'}`,
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                paddingBottom: '32px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = errors.description ? '#ef4444' : '#1B263B'}
            />
            
            {/* Contador de caracteres */}
            <div style={{
              position: 'absolute',
              bottom: '32px',
              right: '12px',
              color: '#A5A8B1',
              fontSize: '12px',
              backgroundColor: '#112240',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {description?.length || 0}
            </div>
            
            {errors.description && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Loading State */}
          {createIncidentMutation.isPending && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(0, 173, 224, 0.1)',
              border: '1px solid #00ade0',
              borderRadius: '6px',
              marginBottom: '16px',
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
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>
                Erro ao criar incidente. Tente novamente.
              </p>
            </div>
          )}

          {/* Footer com botões */}
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #1B263B'
          }}>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isDraft}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #1B263B',
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isDraft ? 'not-allowed' : 'pointer',
                opacity: isDraft ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDraft) e.target.style.backgroundColor = '#1B263B';
              }}
              onMouseLeave={(e) => {
                if (!isDraft) e.target.style.backgroundColor = 'transparent';
              }}
            >
              {isDraft ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            
            <button
              type="submit"
              disabled={!isValid || createIncidentMutation.isPending}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: isValid && !createIncidentMutation.isPending ? '#00ade0' : '#374151',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isValid && !createIncidentMutation.isPending ? 'pointer' : 'not-allowed',
                opacity: isValid && !createIncidentMutation.isPending ? 1 : 0.6
              }}
            >
              {createIncidentMutation.isPending ? 'Enviando...' : 'Enviar Caso'}
            </button>
          </div>
        </form>
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