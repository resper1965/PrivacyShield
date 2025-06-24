# PrivacyDetective Project

## Overview

This is a Node.js/Express application built with TypeScript for detecting personally identifiable information (PII) in ZIP files. The system processes uploaded ZIP files asynchronously using BullMQ queues, validates them using MIME type checking and ClamAV virus scanning, extracts contents securely, and detects CPF, CNPJ, Email, and Phone patterns with Brazilian validation algorithms. Data is persisted in PostgreSQL database using Prisma ORM. The server provides RESTful API endpoints for file upload, queue monitoring, and filtered reporting by data subjects.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript and comprehensive PII detection
- **Runtime**: Node.js 20 with WebSocket support for real-time progress tracking
- **Language**: TypeScript with Brazilian PII pattern validation algorithms
- **Entry Point**: `src/server-simple.ts` with integrated processing pipeline
- **Processing**: Secure ZIP extraction with ClamAV scanning and context analysis

### Core Features
- **PII Detection**: 7 Brazilian data types with validation (CPF, CNPJ, RG, CEP, Email, Telefone, Nome Completo)
- **Security**: Zip-bomb protection, virus scanning, path traversal prevention
- **Real-time**: WebSocket progress updates during upload and processing
- **Reporting**: LGPD compliance reports with domain/CNPJ filtering and CSV export
- **Database**: PostgreSQL with Prisma ORM, context and position tracking

### Security Layer
- **Helmet**: Security headers and CSP configuration
- **CORS**: Cross-origin resource sharing with configurable origins
- **Compression**: Gzip compression for responses

### Code Quality Tools
- **ESLint**: Comprehensive linting with TypeScript support
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict compilation settings for type safety

## Key Components

### Server Infrastructure
- **Main Server Class**: `PrivacyDetectiveServer` in `src/server.ts`
  - Configurable host and port settings
  - Middleware stack setup
  - Route configuration (to be implemented)
  - Centralized error handling

### Type System
- **Centralized Types**: `src/types/index.ts`
  - Server configuration interfaces
  - Standardized API response structures
  - Error handling types
  - Environment variable definitions

### Development Configuration
- **Build System**: TypeScript compiler with source maps and declarations
- **Output Directory**: `./build` for compiled JavaScript
- **Source Directory**: `./src` for TypeScript source files

## Data Flow

Currently, the application is in initial setup phase with the following planned flow:
1. HTTP requests received by Express server
2. Security middleware processing (Helmet, CORS)
3. Request compression and parsing
4. Route handling (to be implemented)
5. Standardized API responses using defined types
6. Error handling with structured error responses

## External Dependencies

### Core Dependencies
- **express**: Web framework for Node.js
- **cors**: CORS middleware
- **helmet**: Security middleware
- **compression**: Response compression
- **ts-node**: TypeScript execution for Node.js
- **typescript**: TypeScript compiler
- **nodemon**: Development server with auto-restart
- **concurrently**: Running multiple processes

### Development Dependencies
- **ESLint ecosystem**: Code linting and analysis
- **Prettier**: Code formatting
- **TypeScript types**: Type definitions for all dependencies

## Deployment Strategy

### Environment Configuration
- Environment-based CORS origins configuration
- Configurable server host and port
- Support for environment variables through process.env

### Build Process
- TypeScript compilation to JavaScript
- Source map generation for debugging
- Declaration file generation for type checking

### Replit Integration
- Configured for Node.js 20 runtime
- Automatic dependency installation workflow
- Development server setup

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Recent Updates:
- June 24, 2025: **Complete Functional Requirements Implementation** - Delivered comprehensive PII detection system:
  - Enhanced PII patterns: Nome Completo, CPF, CNPJ, RG, CEP, Email, Telefone with Brazilian validation
  - Context extraction (±60 chars) and position tracking for each detection
  - Risk level calculation (low/medium/high/critical) based on data type and file context
  - ZIP extraction to `/tmp/extracts/<uuid>` with zip-bomb protection and compression ratio limits
  - ClamAV virus scanning with fallback mechanisms for security validation
  - WebSocket progress tracking for real-time upload status and processing updates
  - LGPD compliance reporting with domain/CNPJ filtering and OR logic
  - CSV export with UTF-8 BOM for proper encoding in Excel/LibreOffice
  - Database seeding with default patterns and DEFAULT_ADMIN user
  - Comprehensive Jest test suite for CPF/CNPJ validation, zip-bomb protection, and reports
  - npm scripts: dev, worker, seed for development workflow

Previous Features:
- June 23, 2025: Initial TypeScript project scaffold and complete PII detection system
- June 23, 2025: ClamAV virus scanning with MIME validation and secure ZIP processing
- June 24, 2025: Enhanced PII detection with Brazilian validation algorithms
- June 24, 2025: PostgreSQL migration with Prisma ORM and database persistence
- June 24, 2025: BullMQ queue system with Redis backend and asynchronous processing

## Notes for Development

The application is currently in foundation stage with:
- Server infrastructure established
- Security middleware configured
- Type system foundation in place
- Development tooling configured
- Route handlers and business logic pending implementation

The architecture supports future expansion for privacy detection features while maintaining type safety and code quality standards.