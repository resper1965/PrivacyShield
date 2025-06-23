# PrivacyDetective Project

## Overview

This is a Node.js/Express application built with TypeScript that appears to be the foundation for a privacy detection service. The project is configured with modern development tools including ESLint, Prettier, and strict TypeScript settings. The server includes security middleware and is designed to handle privacy-related API operations.

## System Architecture

### Backend Architecture
- **Framework**: Express.js 5.x with TypeScript
- **Runtime**: Node.js 20 (as specified in .replit configuration)
- **Language**: TypeScript with strict type checking enabled
- **Module System**: ESNext modules with Node.js resolution

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

Changelog:
- June 23, 2025. Initial setup

## Notes for Development

The application is currently in foundation stage with:
- Server infrastructure established
- Security middleware configured
- Type system foundation in place
- Development tooling configured
- Route handlers and business logic pending implementation

The architecture supports future expansion for privacy detection features while maintaining type safety and code quality standards.