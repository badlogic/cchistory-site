#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const envFile = join(projectRoot, '.env');

// Check if CCHISTORY_ANTHROPIC_API_KEY is set
const apiKey = process.env.CCHISTORY_ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('Error: CCHISTORY_ANTHROPIC_API_KEY environment variable is not set');
  console.error('Please set it before running this command');
  process.exit(1);
}

const envContent = `CCHISTORY_ANTHROPIC_API_KEY=${apiKey}\n`;
writeFileSync(envFile, envContent);
console.log('Generated .env file with API key');