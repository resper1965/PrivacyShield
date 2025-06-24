# PrivacyDetective Project

## Overview

This is a Node.js/Express application built with TypeScript for detecting personally identifiable information (PII) in ZIP files. The system processes uploaded ZIP files asynchronously using BullMQ queues, validates them using MIME type checking and ClamAV virus scanning, extracts contents securely, and detects CPF, CNPJ, Email, and Phone patterns with Brazilian validation algorithms. Data is persisted in PostgreSQL database using Prisma ORM. The server provides RESTful API endpoints for file upload, queue monitoring, and filtered reporting by data subjects.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript and modular class-based structure
- **Runtime**: Node.js 20 with ts-node development execution
- **Language**: TypeScript with strict type checking and comprehensive validation
- **Entry Point**: `src/main.ts` with graceful shutdown handling
- **Application**: `src/app.ts` with structured middleware and route management

### Modular Structure
- **Services**: Separated business logic (`zipService`, `processor`, `queue`)
- **Routes**: RESTful API endpoints (`archives`, `reports`, `patterns`)
- **Workers**: Background processing (`archiveWorker`, `fileWorker`)
- **Utils**: Shared utilities (`logger`, configuration validation)
- **Database**: Prisma ORM with PostgreSQL and enhanced schema

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
- June 24, 2025: **Major Architecture Restructuring** - Implemented modular architecture with separated concerns:
  - Created `src/app.ts` with modern Express application class
  - Added `src/main.ts` as new entry point with graceful shutdown
  - Modularized services: `zipService.ts`, `processor.ts`, `queue.ts` with Redis fallback
  - Created structured routes: `archives.ts`, `reports.ts`, `patterns.ts`
  - Added workers: `archiveWorker.ts`, `fileWorker.ts` for background processing
  - Enhanced environment configuration with comprehensive validation
  - Updated Prisma schema with AI validation fields and pattern management
  - Implemented fallback queue system for Redis unavailability
  - Added structured logging with Pino and development prettifier

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