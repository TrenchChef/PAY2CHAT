#!/usr/bin/env node
// Start the signaling server (node server.js) and the static Python server
// Usage: node scripts/start-dev.js
const { spawn } = require('child_process');
const path = require('path');

function startNodeServer() {
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { stdio: 'inherit' });
  proc.on('exit', (code) => { console.log('server.js exited with', code); });
  return proc;
}

function startPythonServer(port = 8080) {
  const proc = spawn('python3', ['-m', 'http.server', String(port)], { stdio: 'inherit' });
  proc.on('exit', (code) => { console.log('python http.server exited with', code); });
  return proc;
}

async function main() {
  console.log('Starting Pay2Chat dev servers...');
  const nodeProc = startNodeServer();
  const pyProc = startPythonServer(8080);

  function shutdown() {
    console.log('Shutting down dev servers...');
    try { nodeProc.kill(); } catch(e){}
    try { pyProc.kill(); } catch(e){}
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
