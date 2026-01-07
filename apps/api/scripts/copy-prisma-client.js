#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = __dirname.replace('/scripts', '');
const workspaceRoot = path.join(apiDir, '../..');

// Find the Prisma client in workspace root
const pnpmPattern = path.join(workspaceRoot, 'node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client');
const glob = require('glob');
const matches = glob.sync(pnpmPattern);

if (matches.length > 0) {
  const src = matches[0];
  const dst = path.join(apiDir, 'node_modules/.prisma/client');
  
  if (fs.existsSync(src)) {
    // Remove old client if exists
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    
    // Copy to apps/api
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.cpSync(src, dst, { recursive: true });
    console.log('✅ Copied Prisma client to apps/api/node_modules/.prisma/client');
  }
} else {
  console.warn('⚠️  Prisma client not found in workspace root');
}

