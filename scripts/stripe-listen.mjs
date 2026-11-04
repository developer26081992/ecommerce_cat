import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const key = process.env.STRIPE_SECRET_KEY || '';
if (!/^(sk|rk)_test_/.test(key)) throw new Error('Set a Stripe test secret/restricted key in .env.local first.');
const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new Error('This listener is for local testing. Configure a hosted webhook endpoint for a deployed shop.');
const endpoint = new URL('/api/stripe/webhook', origin).href;
const cli = fileURLToPath(new URL('../node_modules/@stripe/cli/bin/shim.js', import.meta.url));
const envFile = new URL('../.env.local', import.meta.url);
const child = spawn(process.execPath, [cli, 'listen', '--forward-to', endpoint, '--events', 'checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed'], {
  env: { ...process.env, STRIPE_API_KEY: key }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});

function printLine(line) {
  const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (secret && secret !== process.env.STRIPE_WEBHOOK_SECRET) {
    let source = readFileSync(envFile, 'utf8').replace(/^\uFEFF/, '');
    const replacement = `STRIPE_WEBHOOK_SECRET=${secret}`;
    source = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(source) ? source.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, replacement) : `${source}\n${replacement}\n`;
    writeFileSync(envFile, source);
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    console.log('Saved the local webhook signing secret privately in .env.local. Restart the shop if it does not reload environment changes.');
  }
  console.log(line.replace(/whsec_[A-Za-z0-9]+/g, '[signing secret saved privately]').replace(/(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+/g, '[API key redacted]'));
}
for (const stream of [child.stdout, child.stderr]) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    lines.forEach(printLine);
  });
  stream.on('end', () => { if (pending) printLine(pending); });
}
child.on('error', () => { console.error('Stripe CLI could not start. Run npm ci and try again.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
console.log(`Forwarding Stripe test checkout events to ${endpoint}. Keep this terminal running.`);
