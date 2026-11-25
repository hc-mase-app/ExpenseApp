import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomInt,scryptSync,createHash} from 'node:crypto';
import {mkdirSync,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {TEST_MODE,DB_PATH,APP_ID,DATA_ROOT,MAIN_PUBLIC_URL,TEST_PUBLIC_URL,TEST_INTERNAL_URL,TEST_MODE_ENABLED,MANAGED_TEST} from './runtime-mode.js';
const testPath=path.join(DATA_ROOT,'data-test','trial.sqlite');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const hash=t=>createHash('sha256').update(String(t)).digest('hex');
const quote=n=>'"'+n.replaceAll('"','""')+'"';
const settings=['master_items','master_meta','quota_criteria','product_identity'];
export const environment=()=>({appId:APP_ID,testMode:TEST_MODE,testModeEnabled:TEST_MODE_ENABLED,mainPublicUrl:MAIN_PUBLIC_URL});
export function guardTestDatabase(db){
 const actual=db.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file;
 if(!TEST_MODE||path.resolve(DB_PATH).toLowerCase()!==path.resolve(testPath).toLowerCase()||path.resolve(actual||'.').toLowerCase()!==path.resolve(testPath).toLowerCase())fail('Reset hanya tersedia untuk database Mode Uji.',403);
 if(db.prepare("SELECT value FROM test_meta WHERE key='app-id'").get()?.value!==APP_ID)fail('Identitas database uji tidak sesuai.',403);
}
function insertRows(db,table,rows){for(const r of rows){const keys=Object.keys(r);db.prepare(`INSERT INTO ${quote(table)} (${keys.map(quote)}) VALUES (${keys.map(()=>'?')})`).run(...keys.map(k=>r[k]));}}
function fictionalProfiles(db){
 const name=type=>db.prepare('SELECT * FROM master_items WHERE type=? AND active=1 ORDER BY name').all(type),company=name('companies')[0],department=name('departments')[0],position=name('positions').find(p=>p.parent===department?.id),level=name('levels').find(r=>r.name==='Associate')||name('levels')[0];
 const base={company:company?.name||'Perusahaan Uji',code:company?.code||'UJI',department:department?.name||'',position:position?.name||'',level:level?.name||'Associate',grade:'',contract:'PKWTT',joinDate:'2020-01-01',status:'active',probationPassed:'2020-04-01',gender:'male',bank:'Bank Uji',account:'0000000000',email:'',profileVersion:randomBytes(12).toString('hex'),opticsHistoryPending:false};
 for(const [id,name,role] of [['HRTEST','HR Uji','hr'],['TEST001','Karyawan Uji','employee']]){
  const e={...base,id,name,accountName:name},password=randomBytes(12).toString('base64url'),salt=randomBytes(16).toString('hex');
  db.prepare('INSERT INTO employees VALUES(?,?)').run(id,JSON.stringify(e));
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,role,id,salt,scryptSync(password,salt,64).toString('hex'));
  db.prepare('INSERT OR REPLACE INTO test_meta VALUES(?,?)').run('credential-'+id,password);
 }
}
export function prepareTestDatabase(source){
 mkdirSync(path.dirname(testPath),{recursive:true});const target=new DatabaseSync(testPath);
 try{
  const exists=target.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='test_meta'").get();
  if(exists){if(target.prepare("SELECT value FROM test_meta WHERE key='app-id'").get()?.value!==APP_ID)fail('Database pada folder uji bukan milik aplikasi ini.',409);return;}
  if(target.prepare("SELECT 1 FROM sqlite_master WHERE type='table'").get())fail('Folder data-test sudah berisi database lain; tidak ditimpa.',409);
  target.exec('BEGIN IMMEDIATE');try{
   for(const r of source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())target.exec(r.sql);
   for(const r of source.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all())target.exec(r.sql);
   target.exec('CREATE TABLE test_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE test_tickets(token TEXT PRIMARY KEY,expires INTEGER NOT NULL);');
   target.prepare('INSERT INTO test_meta VALUES(?,?)').run('app-id',APP_ID);
   const snapshot=Object.fromEntries(settings.map(t=>[t,source.prepare(`SELECT * FROM ${quote(t)}`).all().map(r=>t==='product_identity'?{...r,logo:null,logo_type:null}:r)]));
   target.prepare('INSERT INTO test_meta VALUES(?,?)').run('settings-seed',JSON.stringify(snapshot));
   for(const t of settings)insertRows(target,t,snapshot[t]);fictionalProfiles(target);target.exec('COMMIT');
  }catch(e){target.exec('ROLLBACK');throw e;}
 }finally{target.close();}
}
let starting;
async function ready(){try{const r=await fetch(new URL('/api/test-mode/info',TEST_INTERNAL_URL),{signal:AbortSignal.timeout(800)});const d=await r.json();if(d.appId!==APP_ID||d.testMode!==true)fail('Port Mode Uji sedang digunakan aplikasi lain.',409);return true;}catch(e){if(e.status)throw e;return false;}}
async function launch(source){prepareTestDatabase(source);if(await ready())return;if(MANAGED_TEST)fail('Layanan Mode Uji belum aktif. Hubungi IT untuk menyalakannya.',503);
 const dir=path.dirname(testPath),out=openSync(path.join(dir,'server-out.log'),'a'),err=openSync(path.join(dir,'server-error.log'),'a');
 try{const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3101'],{cwd:process.cwd(),env:{...process.env,ABT_TEST_MODE:'1',NEXT_TELEMETRY_DISABLED:'1'},detached:true,windowsHide:true,stdio:['ignore',out,err]});child.on('error',()=>{});child.unref();}finally{closeSync(out);closeSync(err);}
 for(let i=0;i<100;i++){if(await ready())return;await new Promise(r=>setTimeout(r,120));}fail('Mode Uji belum siap. Silakan coba lagi.',503);
}
export async function startTestMode(db,u){if(u.role!=='hr'||TEST_MODE||!TEST_MODE_ENABLED)fail('Mode Uji dibuka melalui akun HR aplikasi utama.',403);
 if(!starting)starting=launch(db).finally(()=>{starting=null;});await starting;
 const target=new DatabaseSync(testPath),ticket=randomBytes(32).toString('hex');try{target.prepare('DELETE FROM test_tickets WHERE expires<?').run(Date.now());target.prepare('INSERT INTO test_tickets VALUES(?,?)').run(hash(ticket),Date.now()+60000);}finally{target.close();}
 const url=new URL(TEST_PUBLIC_URL);url.searchParams.set('testTicket',ticket);return {url:url.href};
}
export function enterTestMode(db,ticket){guardTestDatabase(db);db.exec('BEGIN IMMEDIATE');try{
 const t=db.prepare('DELETE FROM test_tickets WHERE token=? AND expires>? RETURNING token').get(hash(ticket),Date.now());if(!t)fail('Tautan Mode Uji sudah kedaluwarsa. Buka kembali dari HR aplikasi utama.',401);
 const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),'HRTEST',Date.now()+43200000);db.exec('COMMIT');return token;
 }catch(e){db.exec('ROLLBACK');throw e;}}
export function testCredentials(db,u){if(!TEST_MODE||u.role!=='hr')return null;guardTestDatabase(db);return ['HRTEST','TEST001'].map(username=>({username,password:db.prepare('SELECT value FROM test_meta WHERE key=?').get('credential-'+username)?.value}));}
export function resetTestMode(db,u,confirmed){if(u.role!=='hr')fail('Reset hanya untuk HR uji.',403);guardTestDatabase(db);if(confirmed!=='RESET DATA UJI')fail('Konfirmasi reset belum sesuai.');
 const seed=JSON.parse(db.prepare("SELECT value FROM test_meta WHERE key='settings-seed'").get().value);
 db.exec('BEGIN IMMEDIATE');try{
  db.exec('PRAGMA defer_foreign_keys=ON');
  const sessions=db.prepare('SELECT * FROM sessions WHERE username=?').all(u.username);
  for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())if(name!=='test_meta')db.exec(`DELETE FROM ${quote(name)}`);
  for(const table of settings)insertRows(db,table,seed[table]);fictionalProfiles(db);
  for(const session of sessions)db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(session.token,'HRTEST',session.expires);
  db.prepare('INSERT INTO payment_request_sequences VALUES(?,?)').run('EXPRBPR',0);
  db.exec('COMMIT');return {ok:true};
 }catch(e){db.exec('ROLLBACK');throw e;}
}

