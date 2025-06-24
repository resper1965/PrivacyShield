-- PIIDetector Seed Data
-- Default users, patterns, and configurations

-- Insert default patterns
INSERT INTO patterns (name, pattern, type, description, "isActive", "isDefault") VALUES
('CPF', '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}', 'CPF', 'Cadastro de Pessoa Física brasileiro', true, true),
('CNPJ', '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}', 'CNPJ', 'Cadastro Nacional da Pessoa Jurídica', true, true),
('Email', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', 'Email', 'Endereços de email', true, true),
('Telefone BR', '\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}', 'Telefone', 'Telefones brasileiros', true, true),
('CEP', '\\d{5}-?\\d{3}', 'CEP', 'Código de Endereçamento Postal', true, true),
('RG', '\\d{2}\\.\\d{3}\\.\\d{3}-\\d{1}', 'RG', 'Registro Geral', true, true),
('Nome Completo', '[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)*', 'Nome Completo', 'Nomes completos em formato padrão', true, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default organizations
INSERT INTO organizations (id, name) VALUES
('org_default', 'Organização Padrão'),
('org_demo', 'Demonstração LGPD')
ON CONFLICT (id) DO NOTHING;

-- Insert default users
INSERT INTO users (id, name, email) VALUES
('user_admin', 'Administrador', 'admin@ness.com.br'),
('user_analyst', 'Analista LGPD', 'analyst@ness.com.br'),
('user_demo', 'Usuário Demo', 'demo@ness.com.br')
ON CONFLICT (id) DO NOTHING;

-- Insert sample incidents for demonstration
INSERT INTO incidents (
    id, 
    "organizationId", 
    date, 
    type, 
    description, 
    attachments, 
    "assigneeId",
    "semanticContext",
    "lgpdArticles",
    "dataCategories",
    "numSubjects",
    "riskLevel",
    "immediateMeasures",
    "actionPlan",
    "isDraft"
) VALUES
(
    'inc_demo_001',
    'org_demo',
    '2025-06-24 01:00:00'::timestamp,
    'Vazamento de Dados',
    'Exposição acidental de base de dados de clientes em servidor público.',
    ARRAY['logs_servidor.txt', 'relatorio_tecnico.pdf'],
    'user_analyst',
    'Servidor web com configuração inadequada permitiu acesso público a arquivos de backup contendo dados pessoais.',
    ARRAY['Art. 46', 'Art. 48', 'Art. 6º'],
    ARRAY['CPF', 'Email', 'Telefone', 'Endereço'],
    1250,
    'Alto',
    'Servidor isolado imediatamente. Backup movido para ambiente seguro. Logs de acesso analisados.',
    'Implementar controles de acesso. Revisar procedimentos de backup. Notificar ANPD dentro de 72h.',
    false
),
(
    'inc_demo_002',
    'org_demo',
    '2025-06-23 15:30:00'::timestamp,
    'Acesso Não Autorizado',
    'Tentativa de acesso não autorizado detectada em sistema de RH.',
    ARRAY['security_alert.log'],
    'user_admin',
    'Sistema de detecção identificou múltiplas tentativas de login com credenciais inválidas.',
    ARRAY['Art. 46', 'Art. 47'],
    ARRAY['Dados Funcionários'],
    50,
    'Médio',
    'Bloqueio automático de IP. Senhas dos usuários afetados resetadas.',
    'Revisar políticas de senha. Implementar autenticação multifator.',
    false
)
ON CONFLICT (id) DO NOTHING;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
DROP TRIGGER IF EXISTS audit_incidents ON incidents;
CREATE TRIGGER audit_incidents
    AFTER INSERT OR UPDATE OR DELETE ON incidents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_organizations ON organizations;
CREATE TRIGGER audit_organizations
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();