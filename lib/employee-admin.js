import {reservedEmployeeId} from './employee-id.js';
import {recordLevel} from './benefit-history.js';
import {benefitGroup} from './master-data.js';
import {randomBytes,randomInt,scryptSync} from 'node:crypto';
import {applyReferences} from './master-data.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const get=(db,id)=>{const row=db.prepare('SELECT data FROM employees WHERE id=?').get(id);return row?JSON.parse(row.data):null};
const text=(input,key,max=160)=>{const v=String(input[key]??'').trim();if(v.length>max||/[\x00-\x1f]/.test(v))fail('Isi '+key+' tidak valid.');return v};
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}
function record(db,u,employee,action,before,after){db.exec('CREATE TABLE IF NOT EXISTS employee_events(id INTEGER PRIMARY KEY,employee TEXT,actor TEXT,action TEXT,created TEXT,before_data TEXT,after_data TEXT)');db.prepare('INSERT INTO employee_events(employee,actor,action,created,before_data,after_data) VALUES(?,?,?,?,?,?)').run(employee,u.username,action,new Date().toISOString(),JSON.stringify(before),JSON.stringify(after));}
function hr(u){if(u.role!=='hr')fail('Menu ini hanya untuk HR.',403)}
function credentials(db,id){const password=String(randomInt(10000000,100000000)),salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');db.prepare('INSERT INTO users(username,role,employee,salt,hash) VALUES(?,?,?,?,?)').run(id,'employee',id,salt,hash);return password}
export function saveEmployee(db,u,id,input,today){hr(u);return transaction(db,()=>{
 const existing=id?get(db,id):null;if(id&&!existing)fail('Karyawan tidak ditemukan.',404);
 if(existing&&String(input.version??'')!==String(existing.profileVersion??''))fail('Data sudah berubah. Buka ulang form sebelum menyimpan.',409);
 const employeeId=existing?.id||text(input,'id',32);if(!/^[A-Za-z0-9._-]{3,32}$/.test(employeeId))fail('Employee ID harus 3–32 huruf/angka tanpa spasi.');
 if(existing&&input.id!==existing.id)fail('Employee ID tidak dapat diubah.');if(!existing&&(get(db,employeeId)||db.prepare('SELECT 1 FROM users WHERE username=?').get(employeeId)||reservedEmployeeId(db,employeeId)))fail('Employee ID sudah digunakan.',409);
 const e={...(existing||{}),id:employeeId};for(const key of ['name','company','code','department','position','email','bank','account','accountName','grade'])e[key]=text(input,key,key==='account'?40:160);
 e.level=text(input,'level');e.contract=text(input,'contract');e.joinDate=text(input,'joinDate');e.status=text(input,'status')||'active';
 if(!e.name||!e.level||!['PKWT','PKWTT'].includes(e.contract)||!date(e.joinDate))fail('Lengkapi nama, level, status kontrak, dan tanggal masuk yang valid.');
 applyReferences(db,e,existing,fail);
 if(!['active','resigned'].includes(e.status))fail('Status karyawan tidak valid.');
 if(e.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))fail('Email tidak valid.');if(e.account&&!/^\d+$/.test(e.account))fail('Nomor rekening harus berupa angka.');
 const account=db.prepare('SELECT username,role FROM users WHERE employee=?').all(employeeId);if(e.status==='resigned'&&account.some(a=>a.role==='hr'))fail('Akun HR aktif tidak dapat diubah menjadi resign.');
 e.resignDate=e.status==='resigned'?text(input,'resignDate'):null;if(e.status==='resigned'&&(!date(e.resignDate)||e.resignDate<e.joinDate||e.resignDate>today))fail('Isi tanggal resign antara tanggal masuk dan hari ini.');
 const probation=text(input,'probationStatus');e.probationPassed=null;e.confirmedMedicalEligibility=false;
 if(e.contract==='PKWTT'){
  if(probation==='passed'){e.probationPassed=text(input,'probationPassed');if(!date(e.probationPassed)||e.probationPassed<e.joinDate||e.probationPassed>today)fail('Tanggal lulus probation tidak valid.');}
  else if(probation==='confirmed'&&existing?.confirmedMedicalEligibility===true){e.confirmedMedicalEligibility=true;e.eligibilityConfirmationAsOf=existing.eligibilityConfirmationAsOf;}
  else if(probation!=='pending')fail('Isi status probation. Untuk konfirmasi baru, cantumkan tanggal lulus.');
 }
 if(!existing)e.opticsHistoryPending=input.opticsHistoryMode==='pending';
 recordLevel(db,e,existing,input,today,u.username,level=>benefitGroup(db,level));
 e.profileVersion=randomBytes(12).toString('hex');e.updatedAt=new Date().toISOString();
 db.prepare('INSERT INTO employees VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(e.id,JSON.stringify(e));
 let password;if(!existing)password=credentials(db,e.id);
 if(e.status==='resigned')db.prepare('DELETE FROM sessions WHERE username IN (SELECT username FROM users WHERE employee=?)').run(e.id);
 record(db,u,e.id,existing?'employee_updated':'employee_created',existing,e);
 return{employee:e,...(password?{password}:{} )};
})}
export function resetEmployeePassword(db,u,id){hr(u);return transaction(db,()=>{const e=get(db,id);if(!e)fail('Karyawan tidak ditemukan.',404);const account=db.prepare('SELECT username,role FROM users WHERE employee=?').get(id);if(!account)fail('Akun karyawan tidak ditemukan.');if(account.role==='hr')fail('Gunakan menu Ubah password untuk akun HR.');const password=String(randomInt(10000000,100000000)),salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');db.prepare('UPDATE users SET salt=?,hash=? WHERE username=?').run(salt,hash,account.username);db.prepare('DELETE FROM sessions WHERE username=?').run(account.username);record(db,u,id,'password_reset',null,{username:account.username});return{username:account.username,name:e.name,password};})}
