import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3001';
const files = ['leads.json','sales_members.json','crm_settings.json','chat_messages.json','system_logs.json'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = Object.fromEntries(files.map(file => [file, hash('../' + file)]));
const localSnapshot = fs.readFileSync('leads.json');
async function call(path, method='GET', body) {
  const res = await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body)});
  const data = await res.json();
  assert.equal(res.status,200,`${method} ${path}: ${res.status}`);
  return data;
}
try {
  const login = await call('/api/auth/login','POST',{identifier:'admin',password:'Demo@2026!'});
  assert.ok(login.accessToken);
  assert.equal(login.user.email,'admin@sandbox.invalid');
  const leads = await call('/api/leads');
  assert.equal(leads.length,24);
  assert.ok(leads.every(l=>l.id.startsWith('sandbox-customer-')));
  const updated = {...leads[0],notes:'Isolation verification'};
  await call('/api/leads/'+updated.id,'PUT',updated);
  assert.equal(JSON.parse(fs.readFileSync('leads.json','utf8')).find(l=>l.id===updated.id).notes,updated.notes);
  await call('/api/leads/'+updated.id,'DELETE');
  assert.equal((await call('/api/leads')).length,23);
  const roster = await call('/api/sales-members');
  assert.equal(roster.length,4);
  assert.ok(roster.every(m=>m.email.endsWith('@sandbox.invalid')));
  assert.equal((await fetch(base+'/api/download/php-package')).status,403);
  const page = await fetch(base);
  assert.equal(page.status,200);
  assert.ok(page.headers.get('content-security-policy').includes("connect-src 'self'"));
  const outside = await fetch(base+'/@fs/'+fs.realpathSync('../leads.json').replaceAll('\\','/'));
  assert.equal(outside.status,403,'Vite must not expose original data');
  for(const file of files) assert.equal(hash('../'+file),original[file],'Original changed: '+file);
  console.log('PASS: login, synthetic records, local writes/deletion, blocked downloads, CSP, Vite isolation, original file hashes.');
} finally {
  // Restore only the synthetic demo fixture after the verification.
  fs.writeFileSync('leads.json',localSnapshot);
}
