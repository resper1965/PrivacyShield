#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building N.Crisis for production...');

try {
  // Build backend
  console.log('📦 Building backend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Build frontend
  console.log('📦 Building frontend...');
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  
  // Copy frontend build to backend
  console.log('📁 Copying frontend build...');
  if (fs.existsSync('frontend/dist')) {
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.cpSync('frontend/dist', 'dist', { recursive: true });
  }
  
  console.log('✅ Build completed successfully!');
  console.log('📂 Frontend: ./dist');
  console.log('📂 Backend: ./build');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}