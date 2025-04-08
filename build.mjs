#!/usr/bin/env node

/**
 * Enhanced build script for the Superhero application
 * 
 * This script:
 * 1. Builds the client-side application using Vite
 * 2. Builds the server-side application using Vite with a custom config
 * 
 * It replaces the previous approach of using esbuild directly for server bundling.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute a command and return a promise that resolves when the command completes
 * 
 * @param {string} command - The command to execute
 * @param {string[]} args - Arguments for the command
 * @param {Object} options - Options for spawn
 * @returns {Promise<void>} - A promise that resolves when the command completes
 */
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}`));
      }
    });

    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function build() {
  try {
    console.log('🚀 Starting build process...');

    // 1. Build client-side application
    console.log('\n📦 Building client-side application...');
    await executeCommand('npx', ['vite', 'build']);
    console.log('✅ Client-side build complete!');

    // 2. Build server-side application
    console.log('\n📦 Building server-side application...');
    await executeCommand('npx', ['vite', 'build', '--config', 'vite.server.config.ts']);
    console.log('✅ Server-side build complete!');

    console.log('\n🎉 Build completed successfully!');
    console.log('Run `npm start` to start the production server.');
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

build();