#!/usr/bin/env node
/**
 * Combined entrypoint: REST API (port 8000 by default) + Streamable HTTP MCP
 * (port 8080 by default). Lives at scripts/start-all.js so we can keep the
 * container ENTRYPOINT plain `node` -- no shell required (works on distroless
 * too) -- while still bringing both transports up by default.
 *
 * Behaviour:
 *   - spawns each child with inherited stdio
 *   - propagates SIGTERM / SIGINT to the children
 *   - exits with a non-zero code if either child exits, so K8s/podman will
 *     restart the pod/container rather than running a degraded singleton
 *
 * Override:
 *   - run the REST or MCP entrypoint directly to get the single-mode behaviour:
 *       node src/server.js              # REST only on :8000
 *       node dist/mcp/server-http.js    # MCP only on :8080
 */

const { spawn } = require('child_process');
const path = require('path');

const children = [];
let shuttingDown = false;

function start(name, script) {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[start-all] ${name} exited (code=${code}, signal=${signal}) — bringing the rest down`);
    shuttingDown = true;
    for (const other of children) {
      if (other.child !== child && other.child.exitCode === null) {
        try { other.child.kill('SIGTERM'); } catch (_) { /* already dead */ }
      }
    }
    process.exit(typeof code === 'number' ? code : 1);
  });
  children.push({ name, child });
  console.log(`[start-all] started ${name} (pid=${child.pid})`);
}

start('REST', path.resolve(__dirname, '..', 'src', 'server.js'));
start('MCP',  path.resolve(__dirname, '..', 'dist', 'mcp', 'server-http.js'));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[start-all] received ${sig}, forwarding to children`);
    for (const c of children) {
      try { c.child.kill(sig); } catch (_) { /* already dead */ }
    }
  });
}
