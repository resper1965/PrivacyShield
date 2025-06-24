import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Shield, Lock, Unlock, UserCheck, UserX } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'blocked';
  lastLogin?: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

interface FormData {
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'blocked';
  password: string;
  confirmPassword: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrador', description: 'Acesso completo ao sistema' },
  { value: 'analyst', label: 'Analista', description: 'Pode criar e analisar incidentes' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização de dados' }
];

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'viewer',
    status: 'active',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from /api/v1/users
      const mockUsers: User[] = [
        {
          id: 'user_1',
          name: 'Admin Sistema',
          email: 'admin@empresa.com',
          role: 'admin',
          status: 'active',
          lastLogin: '2025-06-24T01:00:00Z',
          createdAt: '2025-01-01T00:00:00Z',
          twoFactorEnabled: true
        },
        {
          id: 'user_2',
          name: 'João Silva',
          email: 'joao.silva@empresa.com',
          role: 'analyst',
          status: 'active',
          lastLogin: '2025-06-23T15:30:00Z',
          createdAt: '2025-02-15T00:00:00Z',
          twoFactorEnabled: false
        },
        {
          id: 'user_3',
          name: 'Maria Santos',
          email: 'maria.santos@empresa.com',
          role: 'analyst',
          status: 'active',
          lastLogin: '2025-06-23T09:15:00Z',
          createdAt: '2025-03-10T00:00:00Z',
          twoFactorEnabled: true
        },
        {
          id: 'user_4',
          name: 'Pedro Oliveira',
          email: 'pedro.oliveira@empresa.com',
          role: 'viewer',
          status: 'blocked',
          lastLogin: '2025-06-20T14:20:00Z',
          createdAt: '2025-04-05T00:00:00Z',
          twoFactorEnabled: false
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.email) {
        alert('Nome e email são obrigatórios');
        return;
      }

      if (!editingUser && formData.password !== formData.confirmPassword) {
        alert('Senhas não coincidem');
        return;
      }

      if (editingUser) {
        // Update existing user
        setUsers(users.map(u => 
          u.id === editingUser.id 
            ? { ...u, name: formData.name, email: formData.email, role: formData.role, status: formData.status }
            : u
        ));
      } else {
        // Create new user
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          createdAt: new Date().toISOString(),
          twoFactorEnabled: false
        };
        setUsers([...users, newUser]);
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro ao salvar usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
      confirmPassword: ''
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    const user = users.find(u => u.id === id);
    
    if (user?.role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
      alert('Não é possível excluir o último administrador do sistema');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleToggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    
    if (user?.role === 'admin' && user.status === 'active' && users.filter(u => u.role === 'admin' && u.status === 'active').length === 1) {
      alert('Não é possível bloquear o último administrador ativo');
      return;
    }

    setUsers(users.map(u => 
      u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u
    ));
  };

  const handleForce2FA = async (id: string) => {
    setUsers(users.map(u => 
      u.id === id ? { ...u, twoFactorEnabled: true } : u
    ));
    alert('2FA forçado para o usuário');
  };

  const handleResetPassword = async (id: string) => {
    if (window.confirm('Tem certeza que deseja resetar a senha deste usuário?')) {
      // In real implementation, send password reset email
      alert('Email de reset de senha enviado');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'viewer',
      status: 'active',
      password: '',
      confirmPassword: ''
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'analyst':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <User className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' 
      ? <UserCheck className="h-4 w-4 text-green-500" />
      : <UserX className="h-4 w-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
          Gerenciamento de Usuários
        </h1>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Função</th>
              <th>Status</th>
              <th>2FA</th>
              <th>Último Login</th>
              <th>Criado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 p-1 rounded-full" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {user.name}
                      </div>
                      <div className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role)}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {ROLES.find(r => r.value === user.role)?.label}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(user.status)}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {user.twoFactorEnabled ? (
                      <Lock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {user.twoFactorEnabled ? 'Habilitado' : 'Desabilitado'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                  </span>
                </td>
                <td>
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    {formatDate(user.createdAt)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    
                    <button
                      onClick={() => handleToggleStatus(user.id)}
                      className={`${user.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      title={user.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                    >
                      {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>

                    {!user.twoFactorEnabled && (
                      <button
                        onClick={() => handleForce2FA(user.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Forçar 2FA"
                      >
                        <Lock size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Reset senha"
                    >
                      <Shield size={16} />
                    </button>

                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Função</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="form-select"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-small mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {ROLES.find(r => r.value === formData.role)?.description}
                  </p>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="form-select"
                  >
                    <option value="active">Ativo</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Senha *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="form-input"
                      placeholder="Senha temporária"
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirmar Senha *</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="form-input"
                      placeholder="Confirmar senha"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="btn btn-primary"
                disabled={!formData.name || !formData.email || (!editingUser && (!formData.password || formData.password !== formData.confirmPassword))}
              >
                {editingUser ? 'Atualizar' : 'Criar'} Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
            Nenhum usuário encontrado
          </h3>
          <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>
            Crie o primeiro usuário para gerenciar o sistema.
          </p>
        </div>
      )}
    </div>
  );
};