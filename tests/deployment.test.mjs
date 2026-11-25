import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {captureSnapshot,compareManifest} from '../scripts/snapshot.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'abt-package-check-'));
const appRoot=path.resolve(import.meta.dirname,'..');
const run=(env)=>spawnSync(process.execPath,['--input-type=module','-e',"await import('./lib/runtime-mode.js')"],{cwd:appRoot,env:{...process.env,ABT_TEST_MODE:'0',ABT_DEPLOYMENT:'server',ABT_INSTANCE_ID:'validation',ABT_PUBLIC_URL:'https://benefits.example.com/',ABT_COOKIE_SECURE:'1',ABT_ENABLE_TEST_MODE:'0',...env},encoding:'utf8'});
test('server refuses missing database and data within application',()=>{
 assert.notEqual(run({ABT_DATA_ROOT:root}).status,0);
 assert.notEqual(run({ABT_DATA_ROOT:appRoot}).status,0);
});
test('server requires HTTPS and Secure cookie',()=>{
 fs.mkdirSync(path.join(root,'data'),{recursive:true});fs.writeFileSync(path.join(root,'data','trial.sqlite'),'guard fixture');
 assert.notEqual(run({ABT_DATA_ROOT:root,ABT_PUBLIC_URL:'http://public.example.com/'}).status,0);
 assert.notEqual(run({ABT_DATA_ROOT:root,ABT_COOKIE_SECURE:'0'}).status,0);
 assert.notEqual(run({ABT_DATA_ROOT:root,ABT_ENABLE_TEST_MODE:'1',ABT_TEST_PUBLIC_URL:'https://benefits.example.com/'}).status,0);
 assert.equal(run({ABT_DATA_ROOT:root}).status,0);
});
test('online backup preserves records and blobs, refuses overwrite and detects changes',async()=>{
 const file=path.join(root,'fixture.sqlite'),db=new DatabaseSync(file);
 db.exec(`CREATE TABLE employees(id TEXT);CREATE TABLE users(username TEXT);CREATE TABLE claims(data TEXT);CREATE TABLE documents(bytes BLOB);CREATE TABLE payment_request_sequences(prefix TEXT,last_number INTEGER);CREATE TABLE claim_sequences(prefix TEXT,year TEXT,last_number INTEGER);`);
 db.prepare('INSERT INTO employees VALUES(?)').run('TEST001');db.prepare('INSERT INTO users VALUES(?)').run('TEST001');
 db.prepare('INSERT INTO claims VALUES(?)').run(JSON.stringify({category:'outpatient',status:'paid'}));
 db.prepare('INSERT INTO documents VALUES(?)').run(Buffer.from('attachment fixture'));db.close();
 const folder=path.join(root,'backup'),manifest=await captureSnapshot(file,folder);
 assert.equal(compareManifest(path.join(folder,'trial.sqlite'),manifest).summary.documentBytes,18);
 await assert.rejects(captureSnapshot(file,folder));
 const modified=new DatabaseSync(path.join(folder,'trial.sqlite'));modified.exec("UPDATE employees SET id='CHANGED'");modified.close();
 assert.throws(()=>compareManifest(path.join(folder,'trial.sqlite'),manifest));
});
