import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Upload, User, Building, AlertTriangle, Save, Send, X } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface FormData {
  organizationId: string;
  date: string;
  type: string;
  description: string;
  attachments: File[];
  assigneeId: string;
  isDraft: boolean;
}

interface FormErrors {
  organizationId?: string;
  date?: string;
  type?: string;
  description?: string;
}

const INCIDENT_TYPES = [
  'Malware',
  'Phishing',
  'DDoS',
  'Vazamento de Dados',
  'Acesso Não Autorizado',
  'Ransomware',
  'Engenharia Social',
  'Violação de Sistemas',
  'Perda de Dispositivo',
  'Erro Humano',
  'Outros'
];

export const CreateIncident: React.FC = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    organizationId: '',
    date: new Date().toISOString().split('T')[0],
    type: '',
    description: '',
    attachments: [],
    assigneeId: '',
    isDraft: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (orgSearch) {
      const timeoutId = setTimeout(() => fetchOrganizations(orgSearch), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [orgSearch]);

  useEffect(() => {
    if (userSearch) {
      const timeoutId = setTimeout(() => fetchUsers(userSearch), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [userSearch]);

  const fetchOrganizations = async (search?: string) => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/v1/organizations${params}`);
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchUsers = async (search?: string) => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/v1/users${params}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.organizationId) {
      newErrors.organizationId = 'Empresa é obrigatória';
    }

    if (!formData.date) {
      newErrors.date = 'Data do incidente é obrigatória';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        newErrors.date = 'Data não pode ser no futuro';
      }
    }

    if (!formData.type) {
      newErrors.type = 'Tipo de incidente é obrigatório';
    }

    if (!formData.description) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Descrição deve ter pelo menos 50 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Upload attachments first if any
      const attachmentUrls: string[] = [];
      if (formData.attachments.length > 0) {
        setUploading(true);
        // In a real implementation, upload files to storage service
        for (const file of formData.attachments) {
          // Simulate upload
          attachmentUrls.push(`/uploads/${file.name}`);
        }
        setUploading(false);
      }

      const payload = {
        organizationId: formData.organizationId,
        date: formData.date,
        type: formData.type,
        description: formData.description,
        attachments: attachmentUrls,
        assigneeId: formData.assigneeId || null,
        isDraft
      };

      const response = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar incidente');
      }

      const incident = await response.json();
      
      // Show success message
      if (isDraft) {
        alert('Rascunho salvo com sucesso!');
      } else {
        alert('Incidente criado com sucesso!');
      }

      // Redirect to incident detail
      navigate(`/incidents/${incident.id}`);
    } catch (error) {
      console.error('Error submitting incident:', error);
      alert(error instanceof Error ? error.message : 'Erro ao enviar incidente');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const isFormValid = !errors.organizationId && !errors.date && !errors.type && !errors.description;

  return (
    <div className="space-y-6 fade-in">
      {/* Breadcrumb */}
      <nav className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
        Dashboard / Incidentes / Cadastrar Incidente
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
          Cadastrar Incidente Cibernético
        </h1>
      </div>

      <form className="space-y-6">
        <div className="card" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Organization */}
              <div>
                <label className="form-label">
                  <Building size={16} className="inline mr-2" />
                  Empresa *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    onFocus={() => setOrgSearch('')}
                    placeholder="Digite para buscar empresa..."
                    className="form-input"
                    style={{ borderColor: errors.organizationId ? 'var(--color-error)' : undefined }}
                  />
                  {orgSearch && organizations.length > 0 && (
                    <div 
                      className="absolute top-full left-0 right-0 z-10 max-h-60 overflow-auto rounded-lg border mt-1"
                      style={{ 
                        backgroundColor: 'var(--color-surface)', 
                        borderColor: 'var(--color-border)' 
                      }}
                    >
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, organizationId: org.id }));
                            setOrgSearch(org.name);
                            setErrors(prev => ({ ...prev, organizationId: undefined }));
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors"
                          style={{ 
                            color: 'var(--color-text-primary)',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {org.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.organizationId && (
                  <p className="text-small mt-1" style={{ color: 'var(--color-error)' }}>
                    {errors.organizationId}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="form-label">
                  <Calendar size={16} className="inline mr-2" />
                  Data do Incidente *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, date: e.target.value }));
                    setErrors(prev => ({ ...prev, date: undefined }));
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="form-input"
                  style={{ borderColor: errors.date ? 'var(--color-error)' : undefined }}
                />
                {errors.date && (
                  <p className="text-small mt-1" style={{ color: 'var(--color-error)' }}>
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="form-label">
                  <AlertTriangle size={16} className="inline mr-2" />
                  Tipo de Incidente *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, type: e.target.value }));
                    setErrors(prev => ({ ...prev, type: undefined }));
                  }}
                  className="form-select"
                  style={{ borderColor: errors.type ? 'var(--color-error)' : undefined }}
                >
                  <option value="">Selecione o tipo</option>
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="text-small mt-1" style={{ color: 'var(--color-error)' }}>
                    {errors.type}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Description - Full Width */}
              <div className="lg:col-span-2">
                <label className="form-label">
                  Descrição do Incidente *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Descreva detalhadamente o incidente ocorrido..."
                  rows={6}
                  className="form-input resize-none"
                  style={{ borderColor: errors.description ? 'var(--color-error)' : undefined }}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-small" style={{ color: 'var(--color-error)' }}>
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                      Mínimo 50 caracteres
                    </p>
                  )}
                  <p className="text-small" style={{ 
                    color: formData.description.length >= 50 ? 'var(--color-success)' : 'var(--color-text-secondary)' 
                  }}>
                    {formData.description.length}/50
                  </p>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="form-label">
                  <Upload size={16} className="inline mr-2" />
                  Evidências (Anexos)
                </label>
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <input
                    type="file"
                    multiple
                    accept=".zip,.pdf,.png,.jpg,.jpeg,.txt,.log"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--color-text-secondary)' }} />
                    <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                      Clique para selecionar arquivos ou arraste aqui
                    </p>
                    <p className="text-small mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      ZIP, PDF, PNG, JPG, TXT, LOG
                    </p>
                  </label>
                </div>

                {/* Attachment List */}
                {formData.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 rounded border"
                        style={{ 
                          backgroundColor: 'var(--color-background)', 
                          borderColor: 'var(--color-border)' 
                        }}
                      >
                        <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div>
                <label className="form-label">
                  <User size={16} className="inline mr-2" />
                  Responsável pela Investigação
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onFocus={() => setUserSearch('')}
                    placeholder="Digite para buscar usuário..."
                    className="form-input"
                  />
                  {userSearch && users.length > 0 && (
                    <div 
                      className="absolute top-full left-0 right-0 z-10 max-h-60 overflow-auto rounded-lg border mt-1"
                      style={{ 
                        backgroundColor: 'var(--color-surface)', 
                        borderColor: 'var(--color-border)' 
                      }}
                    >
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, assigneeId: user.id }));
                            setUserSearch(`${user.name} (${user.email})`);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors"
                          style={{ 
                            color: 'var(--color-text-primary)',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                              {user.email}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Buttons */}
        <div 
          className="sticky bottom-0 p-4 border-t bg-opacity-95 backdrop-blur-sm"
          style={{ 
            backgroundColor: 'var(--color-surface)', 
            borderColor: 'var(--color-border)' 
          }}
        >
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading || uploading}
              className="btn btn-secondary"
            >
              <Save size={16} />
              {loading && formData.isDraft ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!isFormValid || loading || uploading}
              className="btn btn-primary"
            >
              <Send size={16} />
              {loading && !formData.isDraft ? 'Enviando...' : 'Enviar Incidente'}
            </button>
          </div>
          
          {uploading && (
            <div className="mt-2">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%' }}></div>
              </div>
              <p className="text-small mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Enviando anexos...
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};