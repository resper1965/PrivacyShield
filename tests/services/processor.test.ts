/**
 * PII Processor Tests
 * Tests for Brazilian PII pattern detection and validation
 */

import { detectPIIInText } from '../../src/services/processor';

describe('PII Processor', () => {
  describe('CPF Detection', () => {
    test('should detect valid CPF with dots and dash', () => {
      const text = 'João Silva tem CPF 123.456.789-00 e mora em São Paulo.';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('CPF');
      expect(detections[0].valor).toBe('123.456.789-00');
      expect(detections[0].titular).toBe('João Silva');
    });

    test('should detect CPF without formatting', () => {
      const text = 'CPF: 12345678900';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].valor).toBe('12345678900');
    });

    test('should include context around detection', () => {
      const text = 'O funcionário João da Silva possui CPF 123.456.789-00 e precisa atualizar seus dados.';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections[0].context).toContain('João da Silva possui CPF 123.456.789-00 e precisa');
      expect(detections[0].position).toBeGreaterThan(0);
    });

    test('should calculate high risk level for CPF', () => {
      const text = 'CPF confidencial: 123.456.789-00';
      const detections = detectPIIInText(text, 'confidential.txt');
      
      expect(detections[0].riskLevel).toBe('critical'); // High risk due to "confidencial" context
    });
  });

  describe('CNPJ Detection', () => {
    test('should detect valid CNPJ with formatting', () => {
      const text = 'Empresa XYZ LTDA, CNPJ 12.345.678/0001-00';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('CNPJ');
      expect(detections[0].valor).toBe('12.345.678/0001-00');
    });

    test('should detect CNPJ without formatting', () => {
      const text = 'CNPJ 12345678000100';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].valor).toBe('12345678000100');
    });
  });

  describe('Email Detection', () => {
    test('should detect valid email addresses', () => {
      const text = 'Contato: joao.silva@empresa.com.br';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('Email');
      expect(detections[0].valor).toBe('joao.silva@empresa.com.br');
    });

    test('should detect multiple emails', () => {
      const text = 'Emails: admin@teste.com, user@example.org';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(2);
    });
  });

  describe('Brazilian Phone Detection', () => {
    test('should detect formatted phone numbers', () => {
      const text = 'Telefone: (11) 99999-9999';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('Telefone');
    });

    test('should detect phone with country code', () => {
      const text = 'WhatsApp: +55 11 99999-9999';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
    });
  });

  describe('RG Detection', () => {
    test('should detect RG with formatting', () => {
      const text = 'RG: 12.345.678-X';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('RG');
    });
  });

  describe('CEP Detection', () => {
    test('should detect CEP with dash', () => {
      const text = 'Endereço: Rua das Flores, 123 - CEP 01234-567';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('CEP');
      expect(detections[0].valor).toBe('01234-567');
    });

    test('should have low risk level for CEP', () => {
      const text = 'CEP: 01234-567';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections[0].riskLevel).toBe('low');
    });
  });

  describe('Full Name Detection', () => {
    test('should detect Brazilian full names', () => {
      const text = 'O cliente João da Silva Santos fez o pedido.';
      const detections = detectPIIInText(text, 'test.txt');
      
      const nameDetections = detections.filter(d => d.documento === 'Nome Completo');
      expect(nameDetections).toHaveLength(1);
      expect(nameDetections[0].valor).toBe('João da Silva Santos');
    });

    test('should not detect single names', () => {
      const text = 'João fez o pedido.';
      const detections = detectPIIInText(text, 'test.txt');
      
      const nameDetections = detections.filter(d => d.documento === 'Nome Completo');
      expect(nameDetections).toHaveLength(0);
    });
  });

  describe('Risk Level Calculation', () => {
    test('should increase risk for sensitive file contexts', () => {
      const text = 'Backup database: CPF 123.456.789-00';
      const detections = detectPIIInText(text, 'backup_export.sql');
      
      expect(detections[0].riskLevel).toBe('critical');
    });

    test('should have medium risk for regular contexts', () => {
      const text = 'Cliente: Email teste@exemplo.com';
      const detections = detectPIIInText(text, 'regular.txt');
      
      expect(detections[0].riskLevel).toBe('medium');
    });
  });

  describe('Mixed Content Detection', () => {
    test('should detect multiple PII types in single text', () => {
      const text = `
        Cliente: João da Silva Santos
        CPF: 123.456.789-00
        Email: joao@empresa.com.br
        Telefone: (11) 99999-9999
        CEP: 01234-567
      `;
      
      const detections = detectPIIInText(text, 'customer_data.txt');
      
      expect(detections.length).toBeGreaterThanOrEqual(5);
      
      const types = detections.map(d => d.documento);
      expect(types).toContain('Nome Completo');
      expect(types).toContain('CPF');
      expect(types).toContain('Email');
      expect(types).toContain('Telefone');
      expect(types).toContain('CEP');
    });
  });
});