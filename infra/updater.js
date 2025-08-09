const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '43200000'); // 12 hours default
const LOG_FILE = path.join(DATA_DIR, 'logs.txt');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);

  // Append to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    // For Alpine Linux compatibility, use sh -c to run the command
    const fullCommand = `${command} ${args.join(' ')}`;
    const proc = spawn('sh', ['-c', fullCommand], {
      cwd: DATA_DIR
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Also pipe to console
      process.stdout.write(output);
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Also pipe to console
      process.stderr.write(output);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function runUpdate() {
  log('Starting update process...');

  try {
    // First install Claude Code globally if not already installed
    log('Installing Claude Code CLI...');
    await runCommand('npm', ['install', '-g', '@anthropic-ai/claude-code']);

    // Clear npm cache to ensure we get the latest version
    log('Clearing npm cache...');
    await runCommand('npm', ['cache', 'clean', '--force']);

    // Run cchistory to fetch all prompts from 1.0.0 to latest
    log('Fetching prompts from 1.0.0 to latest...');
    const { stdout, stderr } = await runCommand('npx', ['-y', '@mariozechner/cchistory@latest', '1.0.0', '--latest']);

    if (stderr) {
      log(`cchistory stderr: ${stderr}`);
    }

    // Find all prompt files that were created
    const files = fs.readdirSync(DATA_DIR);
    const promptFiles = files.filter(f => f.startsWith('prompts-') && f.endsWith('.md'));

    // Extract versions from filenames
    const versions = promptFiles
      .map(file => {
        const match = file.match(/prompts-(\d+\.\d+\.\d+)\.md/);
        return match ? match[1] : null;
      })
      .filter(v => v !== null)
      .sort(compareVersions);

    log(`Found ${versions.length} versions: ${versions.join(', ')}`);

    // Generate versions.json
    const versionsData = {
      versions: versions.map(v => ({ version: v })),
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(DATA_DIR, 'versions.json'),
      JSON.stringify(versionsData, null, 2)
    );

    // Remove error.json if it exists
    const errorPath = path.join(DATA_DIR, 'error.json');
    if (fs.existsSync(errorPath)) {
      fs.unlinkSync(errorPath);
    }

    log(`Update completed successfully. Found ${versions.length} versions.`);

  } catch (error) {
    log(`Update failed: ${error.message}`);

    // Write error.json
    const errorData = {
      error: error.message,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(DATA_DIR, 'error.json'),
      JSON.stringify(errorData, null, 2)
    );
  }
}

// Semantic version comparison
function compareVersions(a, b) {
  const parseVersion = (v) => {
    const parts = v.split('.').map(p => parseInt(p, 10));
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

// Run immediately on startup
log('Update service starting...');
runUpdate();

// Then run periodically
setInterval(() => {
  runUpdate();
}, UPDATE_INTERVAL);

const minutes = UPDATE_INTERVAL / 1000 / 60;
log(`Update service running. Will check for updates every ${minutes} minute${minutes === 1 ? '' : 's'}.`);

// Keep process running
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});