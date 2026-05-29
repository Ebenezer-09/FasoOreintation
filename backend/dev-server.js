#!/usr/bin/env node
/**
 * Script pour développement avec auto-reload
 * Utilise nodemon pour relancer automatiquement sur changement de fichiers
 */

const { spawn } = require('child_process');
const path = require('path');

const nodemon = spawn('npx', ['nodemon', 'server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

nodemon.on('exit', (code) => {
  process.exit(code);
});
