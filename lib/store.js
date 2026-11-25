import {expenseCompanyCode,hasExpenseCompany,selectExpenseCompany} from '../public/expense-company.js';
import {TEST_MODE,DATA_DIR,DB_PATH,SESSION_COOKIE} from './runtime-mode.js';
import {environment,startTestMode,enterTestMode,testCredentials,resetTestMode,guardTestDatabase} from './test-mode.js';
import {initializeArchives,archiveInfo,setArchive} from './claim-archive.js';
import {initializeEmployeeIdChanges,changeEmployeeId as changeProfileId,employeeIdHistory as profileIdHistory} from './employee-id.js';
import {claimStageTiming} from '../public/claim-progress.js';
import {levelQuota} from './level-quota.js';
import {initBenefitHistory,levelAt,annualEntitlement,levelDates} from './benefit-history.js';
import {accountFields,profileAccount,savedAccount,completeAccount,sameAccount} from '../public/payment-account-utils.js';
import {matchesClaimScope,matchesEmployeeSearch,claimScopeLabels} from '../public/hr-list-utils.js';
import {matchingClaims} from './duplicate-claims.js';
import {formatDate} from '../public/date-format.js';
import {claimStatusLabels,matchesClaimStatus,claimStatusLabel} from './claim-status.js';
import {monitoringXlsx} from './monitoring-export.js';
import {initializeQuotaCriteria,criteriaAt,criteriaList,saveCriteria as saveQuota,criteriaAction as quotaAction} from './quota-criteria.js';
import {saveEmployee as saveProfile,resetEmployeePassword as resetProfilePassword} from './employee-admin.js';
import {initializeMasterData,formOptions,masterList,saveMaster as saveMasterItem,benefitGroup} from './master-data.js';
import {initializeNumbers,reserveNumber} from './payment-numbers.js';
import {historyPdf,historyXlsx} from './history-export.js';
import {paymentRequestFields,paymentRequestDefaults,paymentRequestPdf} from './payment-request.js';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
mkdirSync(DATA_DIR,{recursive:true});
const db=globalThis.__abtTrialDB??=new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS employees(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY,role TEXT NOT NULL,employee TEXT,salt TEXT,hash TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,username TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,claim TEXT NOT NULL,name TEXT,type TEXT,kind TEXT,bytes BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,claim TEXT,actor TEXT,action TEXT,created TEXT,data TEXT);`);
db.exec('CREATE TABLE IF NOT EXISTS finance_dispatch(claim TEXT PRIMARY KEY REFERENCES claims(id), sent_at TEXT NOT NULL, actor TEXT NOT NULL, actor_name TEXT NOT NULL)');
if(!db.prepare('PRAGMA table_info(finance_dispatch)').all().some(c=>c.name==='sent_date'))db.exec('ALTER TABLE finance_dispatch ADD COLUMN sent_date TEXT');
initializeEmployeeIdChanges(db);
initializeArchives(db);
if(TEST_MODE)guardTestDatabase(db);
const financeDispatch=id=>{const row=db.prepare('SELECT sent_at,sent_date,actor,actor_name FROM finance_dispatch WHERE claim=?').get(id);return row?{sentAt:row.sent_at,markedAt:row.sent_at,sentDate:row.sent_date||null,actor:row.actor,actorName:row.actor_name}:null};
const requiresResend=c=>!!(c.paymentRequestRevision?.needsResend||c.paymentAccountRevision?.needsResend);
const latestRevision=c=>[c.paymentRequestRevision,c.paymentAccountRevision].filter(r=>r?.needsResend).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
const completeRequest=c=>!!(c.paymentRequest&&c.paymentRequestNo&&c.paymentRequest.requestNo===c.paymentRequestNo&&paymentRequestFields.every(f=>!f.required||String(c.paymentRequest[f.key]??'').trim()));
const withFinanceDispatch=c=>{const d=financeDispatch(c.id);return d?{...c,financeDispatch:{...d,...(c.status==='approved'&&requiresResend(c)?{resendRequired:true}:{})}}:c};
function syncOneUnsentAccount(c,u,source){
 if(c.status!=='approved'||financeDispatch(c.id)||!c.paymentRequestNo)return false;
 const e=employee(c.employee),after=profileAccount(e);if(!completeAccount(after))return false;
 if(c.paymentRequest&&c.paymentRequest.requestNo!==c.paymentRequestNo)return false;
 const before=c.paymentRequest?savedAccount(c):null;if(before&&sameAccount(before,after))return false;
 const next={...(c.paymentRequest||paymentRequestDefaults(c,e)),...after};if(!paymentRequestFields.every(f=>!f.required||String(next[f.key]??'').trim()))return false;
 c.paymentRequest=next;c.paymentRequestUpdatedAt=isoNow();c.updatedAt=c.paymentRequestUpdatedAt;put(c);audit(c.id,u,'payment_account_auto_synced',{before,after,source,profileVersion:e.profileVersion||null,paymentRequestNo:c.paymentRequestNo});return true;
}
function syncUnsentAccounts(u,employeeId=null,source='hr_state'){
 if(u.role!=='hr')return;return transaction(()=>{for(const c of claims())if(!employeeId||c.employee===employeeId)syncOneUnsentAccount(c,u,source);});
}
export function updateSentPaymentAccount(u,id){
 if(u.role!=='hr')fail('Pembaruan rekening Payment Request hanya untuk HR.',403);
 return transaction(()=>{const c=owned(u,id),previousDispatch=financeDispatch(id);if(c.status!=='approved'||!previousDispatch)fail('Hanya Payment Request yang sudah dikirim dan belum dibayar dapat diperbarui melalui tombol ini.',409);
  if(!c.paymentRequest||!c.paymentRequestNo||c.paymentRequest.requestNo!==c.paymentRequestNo)fail('Payment Request belum lengkap.');
  if(c.paymentRequestDraft)fail('Simpan atau batalkan draft revisi sebelum memperbarui rekening.',409);const e=employee(c.employee),before=savedAccount(c),after=profileAccount(e);if(!completeAccount(after))fail('Lengkapi bank, nomor rekening dan nama pemilik rekening pada profil karyawan.');if(sameAccount(before,after))fail('Rekening Payment Request sudah sesuai profil.',409);
  c.paymentRequest={...c.paymentRequest,...after};const updatedAt=isoNow();c.paymentAccountRevision={updatedAt,actor:u.username,actorName:employee(u.employee)?.name||u.username,before,after,previousDispatch,needsResend:true};c.paymentRequestUpdatedAt=updatedAt;c.updatedAt=updatedAt;put(c);audit(id,u,'payment_account_updated_requires_resend',{before,after,previousDispatch,paymentRequestNo:c.paymentRequestNo,updatedAt});return withFinanceDispatch(c);
 });
}
export function markFinanceDispatch(u,id,input={}){
 if(u.role!=='hr')fail('Penanda pengiriman hanya dapat dilakukan HR.',403);if(!input||typeof input!=='object'||Array.isArray(input))fail('Isi tanggal email ke Finance.');
 return transaction(()=>{const c=owned(u,id),previous=financeDispatch(id),resending=!!(previous&&requiresResend(c));if(c.status!=='approved')fail('Hanya klaim yang sudah disetujui dan belum dibayar dapat ditandai dikirim.',409);if(previous?.sentDate&&!resending)fail('Klaim sudah ditandai dikirim ke Finance. Muat ulang.',409);
  if(!previous)syncOneUnsentAccount(c,u,'before_dispatch');
  if(!completeRequest(c))fail('Lengkapi Payment Request sebelum menandai pengiriman ke Finance.');if(c.paymentRequestDraft)fail('Simpan atau batalkan draft revisi sebelum menandai pengiriman.');
  if(resending&&c.paymentAccountRevision?.needsResend&&!sameAccount(savedAccount(c),profileAccount(employee(c.employee))))fail('Profil rekening berubah lagi. Perbarui rekening Payment Request sebelum mengirim ulang.',409);
  const sentDate=String(input.sentDate||'');validDate(sentDate);if(sentDate>today())fail('Tanggal email ke Finance tidak boleh melewati hari ini.');
  const dateOf=value=>value&&!Number.isNaN(Date.parse(value))?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):null,approvalDate=dateOf(c.approvedAt),revisionDate=resending?dateOf(latestRevision(c).updatedAt):null;
  if(approvalDate&&sentDate<approvalDate)fail('Tanggal email ke Finance tidak boleh sebelum tanggal persetujuan klaim ('+formatDate(approvalDate)+').');if(revisionDate&&sentDate<revisionDate)fail('Tanggal email ulang tidak boleh sebelum pembaruan rekening ('+formatDate(revisionDate)+').');
  const sentAt=isoNow(),actorName=employee(u.employee)?.name||u.username;
  db.prepare('INSERT INTO finance_dispatch(claim,sent_at,actor,actor_name,sent_date) VALUES(?,?,?,?,?) ON CONFLICT(claim) DO UPDATE SET sent_at=excluded.sent_at,actor=excluded.actor,actor_name=excluded.actor_name,sent_date=excluded.sent_date').run(id,sentAt,u.username,actorName,sentDate);
  if(resending){for(const key of ['paymentAccountRevision','paymentRequestRevision'])if(c[key]?.needsResend)c[key]={...c[key],needsResend:false,resentAt:sentAt,resentBy:u.username};c.updatedAt=sentAt;put(c);}
  audit(id,u,resending?'resent_to_finance':'sent_to_finance',{sentDate,markedAt:sentAt,sentAt,actor:u.username,actorName,paymentRequestNo:c.paymentRequestNo,...(resending?{previousDispatch:previous}:{})});return withFinanceDispatch(c);
 });
}
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const isoNow=()=>new Date().toISOString();
function addMonths(date,n){const d=new Date(date+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString().slice(0,10)}
const employee=id=>{const r=db.prepare('SELECT data FROM employees WHERE id=?').get(id);return r?JSON.parse(r.data):null};
const employees=()=>db.prepare('SELECT data FROM employees').all().map(r=>JSON.parse(r.data));
const claims=()=>db.prepare('SELECT data FROM claims').all().map(r=>JSON.parse(r.data));
function put(c){db.prepare('INSERT INTO claims VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(c.id,JSON.stringify(c))}
const audit=(c,u,a,extra={})=>db.prepare('INSERT INTO audit(claim,actor,action,created,data) VALUES(?,?,?,?,?)').run(c,u.username,a,isoNow(),JSON.stringify(extra));
function transaction(fn){closeAllowanceYears();db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v}catch(e){db.exec('ROLLBACK');throw e}}
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
export function pdfBytes(lines){let stream='BT /F1 11 Tf 45 795 Td 16 TL\n';const wrap=[];for(const s of lines){const text=String(s).replace(/[^\x20-\x7e]/g,'-');for(let i=0;i<Math.max(1,text.length);i+=84)wrap.push(text.slice(i,i+84))}for(const s of wrap.slice(0,45))stream+='('+s.replace(/[\\()]/g,'\\$&')+') Tj T*\n';stream+='ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];let out='%PDF-1.4\n',offset=[];objects.forEach((s,i)=>{offset.push(out.length);out+=(i+1)+' 0 obj\n'+s+'\nendobj\n'});const start=out.length;out+='xref\n0 6\n0000000000 65535 f \n'+offset.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';return Buffer.from(out,'ascii')}
// Initial employees are loaded only by the reviewed import, never demo-seeded.
initializeNumbers(db);
initializeMasterData(db);
initializeQuotaCriteria(db);
export function login(username,password){const u=db.prepare('SELECT * FROM users WHERE username=?').get(String(username));if(!u||!timingSafeEqual(scryptSync(String(password),u.salt,64),Buffer.from(u.hash,'hex')))fail('Nama pengguna atau kata sandi salah.',401);if(u.employee&&employee(u.employee)?.status==='resigned')fail('Akun karyawan sudah tidak aktif.',403);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),u.username,Date.now()+12*3600000);return token}
export function changePassword(input){
 const username=String(input.username??'').trim(),current=String(input.currentPassword??''),password=String(input.newPassword??''),confirmation=String(input.confirmPassword??'');
 if(!username||username.length>64||!current||current.length>128)fail('Isi akun dan kata sandi saat ini.');
 if(!/^\d{8}$/.test(password))fail('Kata sandi baru harus tepat 8 angka.');
 if(password!==confirmation)fail('Konfirmasi kata sandi baru tidak sama.');
 if(password===current)fail('Kata sandi baru harus berbeda dari kata sandi saat ini.');
 return transaction(()=>{const u=db.prepare('SELECT * FROM users WHERE username=?').get(username);
 if(!u||!timingSafeEqual(scryptSync(current,u.salt,64),Buffer.from(u.hash,'hex')))fail('Employee ID / akun atau kata sandi saat ini salah.');
 const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
 db.prepare('UPDATE users SET salt=?,hash=? WHERE username=?').run(salt,hash,username);
 db.prepare('DELETE FROM sessions WHERE username=?').run(username);
 db.exec('CREATE TABLE IF NOT EXISTS account_events(id INTEGER PRIMARY KEY,username TEXT,event TEXT,created TEXT)');
 db.prepare('INSERT INTO account_events(username,event,created) VALUES(?,?,?)').run(username,'password_changed',isoNow());
 return{ok:true};});
}
export function userFrom(req){const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);if(!raw)fail('Silakan masuk kembali.',401);const key=createHash('sha256').update(raw).digest('hex');const row=db.prepare('SELECT u.username,u.role,u.employee FROM sessions s JOIN users u ON u.username=s.username WHERE s.token=? AND s.expires>?').get(key,Date.now());if(!row)fail('Sesi berakhir. Silakan masuk kembali.',401);if(row.employee&&employee(row.employee)?.status==='resigned')fail('Akun karyawan sudah tidak aktif.',401);return row}
export function logout(req){const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);if(raw)db.prepare('DELETE FROM sessions WHERE token=?').run(createHash('sha256').update(raw).digest('hex'))}
export function eligibility(e,date=today()){return e.contract==='PKWT'?addMonths(e.joinDate,criteriaAt(db,date).data.eligibility.pkwtMonths):e.probationPassed||null}
function eligibleOn(e,date){const start=eligibility(e,date);return !!(start&&start<=date)||!!(e.contract==='PKWTT'&&e.confirmedMedicalEligibility===true&&date>=e.joinDate)}
const lowerBenefit=e=>benefitGroup(db,e.level)==='staff';
const cents=n=>Math.round(Number(n||0)*100);
const totalMoney=list=>list.reduce((sum,n)=>sum+cents(n),0)/100;
function newClaimId(category){const prefix=category==='expense'?'EXP':'MED',year=today().slice(0,4);db.exec('CREATE TABLE IF NOT EXISTS claim_sequences(prefix TEXT,year TEXT,last_number INTEGER NOT NULL,PRIMARY KEY(prefix,year))');db.prepare('INSERT OR IGNORE INTO claim_sequences VALUES(?,?,0)').run(prefix,year);let n=db.prepare('SELECT last_number FROM claim_sequences WHERE prefix=? AND year=?').get(prefix,year).last_number,id;do{n++;id=prefix+year+'-'+String(n).padStart(6,'0')}while(db.prepare('SELECT 1 FROM claims WHERE id=?').get(id));db.prepare('UPDATE claim_sequences SET last_number=? WHERE prefix=? AND year=?').run(n,prefix,year);return id}

function calculateBalance(id,category='outpatient',year=Number(today().slice(0,4)),ignoreLocks=false){const e=employee(id),asof=String(year)<today().slice(0,4)?`${year}-12-31`:today(),rule=criteriaAt(db,asof).data,start=eligibility(e,asof),all=claims().filter(c=>c.employee===id&&c.category===category&&['approved','paid','historical'].includes(c.status));const savedLevel=levelAt(db,e,asof),quota=levelQuota(db,rule,savedLevel);let limit=0,eligible=eligibleOn(e,asof),period=String(year),nextDate=null;
 if(category==='outpatient')limit=eligible?(asof>addMonths(e.joinDate,quota.outpatient.seniorityMonths)?quota.outpatient.senior:quota.outpatient.base):0;
 if(category==='optics'){eligible=eligible&&asof>addMonths(e.joinDate,quota.optics.minServiceMonths);limit=eligible?quota.optics.amount:0;period='Siklus '+(quota.optics.cycleMonths%12===0?quota.optics.cycleMonths/12+' tahun':quota.optics.cycleMonths+' bulan');}
 const cycleMonths=c=>quotaAt(e,c.date).optics.cycleMonths;
 const relevant=category==='optics'?all.filter(c=>c.date<=asof&&addMonths(c.date,cycleMonths(c))>asof):all.filter(c=>c.date.startsWith(String(year)));
 const historical=totalMoney(relevant.filter(c=>c.status==='historical').map(c=>c.approved)),paidActual=totalMoney(relevant.filter(c=>c.status==='paid').map(c=>c.approved)),paid=totalMoney([paidActual,historical]),held=totalMoney(relevant.filter(c=>c.status==='approved').map(c=>c.approved));
 const opticsLast=category==='optics'?all.filter(c=>c.date<=asof).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).at(-1):null;
 if(category==='optics'){if(opticsLast)nextDate=addMonths(opticsLast.date,cycleMonths(opticsLast));else if(asof<=addMonths(e.joinDate,quota.optics.minServiceMonths)){const d=new Date(addMonths(e.joinDate,quota.optics.minServiceMonths)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);nextDate=d.toISOString().slice(0,10);}}
 const pending=category==='optics'&&e.opticsHistoryPending===true;if(pending)eligible=false;const locked=!ignoreLocks&&year<Number(today().slice(0,4))?annualEntitlement(db,id,year,category):null;if(locked){limit=locked.limit;eligible=locked.eligible;}
 return{limit,paid,paidActual,historical,held,available:pending||category==='optics'&&relevant.length?0:Math.max(0,totalMoney([limit,-paid,-held])),eligible,start:locked?locked.start:start,period,nextDate,historyPending:pending,eligibilityConfirmed:locked?locked.eligibilityConfirmed:!!e.confirmedMedicalEligibility,...(category==='optics'?{lastClaimDate:opticsLast?.date||null,lastClaimAmount:opticsLast?.approved??null,unknownCurrentAmounts:relevant.filter(c=>c.amountUnknown).length,usageCount:relevant.length}:{} )};}
let allowanceYear=Number(today().slice(0,4));
function closeAllowanceYears(){const year=Number(today().slice(0,4));if(year!==allowanceYear){initBenefitHistory(db,employees(),today(),calculateBalance,level=>benefitGroup(db,level));allowanceYear=year;}}
export function balance(id,category='outpatient',year=Number(today().slice(0,4))){closeAllowanceYears();return calculateBalance(id,category,year)}
initBenefitHistory(db,employees(),today(),calculateBalance,level=>benefitGroup(db,level));
const expenseCompanies=()=>masterList(db).filter(r=>r.type==='companies'&&r.active&&r.code).map(({id,name,code})=>({id,name,code}));
export function state(actor,year,actingId=null){if(actor.role==='hr')syncUnsentAccounts(actor,actingId||null);let u=actor;if(actingId){if(actor.role!=='hr')fail('Hanya HR dapat mengajukan atas nama karyawan.',403);const target=employee(actingId);if(!target||target.status==='resigned')fail('Karyawan aktif tidak ditemukan.',404);u={username:actor.username,role:'employee',employee:target.id,actingAs:true,actorName:employee(actor.employee)?.name||actor.username};}const es=u.role==='hr'?employees():[employee(u.employee)];return{testMode:TEST_MODE,testCredentials:u.role==='hr'?testCredentials(db,u):null,user:u,today:today(),year,paymentRequestFields,expenseCompanies:expenseCompanies(),medicalCriteria:criteriaAt(db,today()).data,...(u.role==='hr'?{levelEffectiveDates:levelDates(db),employeeFormOptions:formOptions(db),masterItems:masterList(db),quotaCriteria:criteriaList(db,today())}:{}),employees:es,claims:claims().filter(c=>u.role==='hr'||c.employee===u.employee).map(c=>{const decorated=withFinanceDispatch(c),events=db.prepare('SELECT actor,action,created,data FROM audit WHERE claim=? ORDER BY id').all(c.id);return {...decorated,archive:u.role==='hr'?archiveInfo(db,c.id):null,stageTiming:claimStageTiming(decorated,events),audit:u.role==='hr'?events:[]};}),benefitRules:Object.fromEntries(es.map(e=>[e.id,quotaAt(e,year<Number(today().slice(0,4))?year+'-12-31':today())])),balances:Object.fromEntries(es.map(e=>[e.id,{outpatient:balance(e.id,'outpatient',year),optics:balance(e.id,'optics',year)}]))}}
export const saveCriteria=(u,id,input)=>saveQuota(db,u,id,input,today());
export const criteriaAction=(u,id,input)=>quotaAction(db,u,id,input,today());
export const saveMaster=(u,id,input)=>saveMasterItem(db,u,id,input);
export const saveEmployee=(u,id,input)=>{initBenefitHistory(db,employees(),today(),calculateBalance,level=>benefitGroup(db,level));const result=saveProfile(db,u,id,input,today());syncUnsentAccounts(u,result.employee.id,'profile_updated');return result;};
export const changeEmployeeId=(u,id,input)=>changeProfileId(db,u,id,input);
export const employeeIdHistory=(u,id)=>profileIdHistory(db,u,id);
export const resetEmployeePassword=(u,id)=>resetProfilePassword(db,u,id);
export function exportMonitoring(u,{year,category,employeeId='all',status='all',query='',view='all',archived=false}){
 if(u.role!=='hr')fail('Monitoring Excel hanya untuk HR.',403);
 if(!Number.isInteger(year)||year<2000||year>Number(today().slice(0,4)))fail('Periode tidak valid.');
 if(!['outpatient','optics','expense'].includes(category))fail('Jenis pengajuan tidak valid.');
 if(!['all','approved',...Object.keys(claimStatusLabels)].includes(status))fail('Status tidak valid.');
 if(!['all','pending','history','balances'].includes(view))fail('Tab laporan tidak valid.');
 let es=employees().filter(e=>employeeId==='all'||e.id===employeeId);if(employeeId!=='all'&&!es.length)fail('Karyawan tidak ditemukan.',404);
 const q=String(query).slice(0,300).toLowerCase();if(view==='balances'){es=es.filter(e=>matchesEmployeeSearch(e,q));status='all';}
 const ids=new Set(es.map(e=>e.id));
 const cs=claims().map(withFinanceDispatch).filter(c=>ids.has(c.employee)&&c.category===category&&Number(c.date.slice(0,4))===year&&matchesClaimScope(c,view)&&(view!=='history'||!!archiveInfo(db,c.id)===archived)&&matchesClaimStatus(c,status)&&(view==='balances'||[c.id,employee(c.employee)?.name,c.provider].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 if(['pending','history'].includes(view)){const selectedIds=new Set(cs.map(c=>c.employee));es=es.filter(e=>selectedIds.has(e.id));}
 const balances=Object.fromEntries(es.map(e=>[e.id,category==='expense'?null:balance(e.id,category,year)]));
 return {bytes:monitoringXlsx({employees:es,claims:cs,balances,year,category,status,query:q,view,archived,generated:isoNow(),asOf:year<Number(today().slice(0,4))?year+'-12-31':today()}),type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name:'Monitoring-'+category+'-'+year+(view==='all'?'':'-'+claimScopeLabels[view].replaceAll(' ','-'))+'.xlsx'};
}
export function exportHistory(u,{id,year,category,format,view='all',status='all',query='',archived=false}){
 if(!['hr','employee'].includes(u.role))fail('Akses tidak diizinkan.',403);
 if(u.role!=='hr'&&id!==u.employee)fail('Riwayat tidak ditemukan.',404);
 if(!Number.isInteger(year)||year<2000||year>Number(today().slice(0,4)))fail('Periode tidak valid.');
 if(!['outpatient','optics','expense'].includes(category)||!['pdf','xlsx'].includes(format))fail('Jenis unduhan tidak valid.');
 if(!['all','pending','history'].includes(view)||!['all','approved',...Object.keys(claimStatusLabels)].includes(status))fail('Filter riwayat tidak valid.');
 const q=String(query).slice(0,300).toLowerCase();
 const e=employees().find(e=>e.id===id);if(!e)fail('Karyawan tidak ditemukan.',404);
 const list=claims().map(withFinanceDispatch).filter(c=>c.employee===id&&c.category===category&&Number(c.date.slice(0,4))===year&&matchesClaimScope(c,view)&&(u.role!=='hr'||view!=='history'||!!archiveInfo(db,c.id)===archived)&&matchesClaimStatus(c,status)&&[c.id,e.name,c.provider].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const data={employee:e,category,year,balance:category==='expense'?null:balance(id,category,year),claims:list,generated:today(),scopeNote:view==='all'&&status==='all'&&!q?'':'Tab '+(view==='history'&&archived?'Arsip pengajuan ditolak':claimScopeLabels[view])+'; status: '+(status==='all'?'semua status':claimStatusLabels[status]||'disetujui')+(q?'; pencarian: '+q:'')+'. Mencakup seluruh hasil filter, bukan hanya halaman yang tampil. Saldo tetap mengikuti seluruh transaksi yang berlaku.'};
 return{bytes:format==='pdf'?historyPdf(data):historyXlsx(data),name:`Riwayat-${e.name.replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/ +/g,'-')}-${category}-${year}.${format}`,type:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
}
async function filesFrom(form,field){const files=form.getAll(field).filter(f=>f&&typeof f.arrayBuffer==='function'&&f.size);if(files.length>10)fail('Maksimal 10 dokumen per pengajuan.');const result=[];for(const f of files){if(f.size>10*1024*1024)fail('Ukuran setiap dokumen maksimal 10 MB.');const bytes=Buffer.from(await f.arrayBuffer());let type=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes[0]===0xff&&bytes[1]===0xd8?'image/jpeg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':null;if(!type)fail('Dokumen harus PDF, JPG, atau PNG yang valid.');result.push({name:f.name.slice(0,180),type,bytes})}return result}
function addDocs(c,files,kind){for(const f of files){const id=randomBytes(12).toString('hex');db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run(id,c.id,f.name,f.type,kind,f.bytes);c.docs.push({id,name:f.name,kind})}}
function owned(u,id){const c=claims().find(c=>c.id===id);if(!c||(u.role!=='hr'&&u.employee!==c.employee))fail('Pengajuan tidak ditemukan.',404);return c}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('Tanggal tidak valid.')}
export async function submit(actor,form){const target=String(form.get('actingEmployee')||'');if(actor.role!=='hr'&&target)fail('Pengajuan atas nama karyawan hanya untuk HR.',403);if(actor.role==='hr'&&!target)fail('Pilih karyawan untuk pengajuan manual.');const u=actor.role==='hr'?{...actor,role:'employee',employee:target}:actor;if(u.role!=='employee')fail('Pengajuan hanya untuk akun karyawan.',403);const category=String(form.get('category')),date=String(form.get('date')),provider=String(form.get('provider')||'').trim(),purpose=String(form.get('purpose')||'').trim(),expenseType=String(form.get('expenseType')||'');if(!['outpatient','optics','expense'].includes(category))fail('Jenis manfaat tidak valid.');validDate(date);const days=(Date.parse(today())-Date.parse(date))/86400000;if(days<0||days>30)fail('Pengajuan harus dalam 30 hari sejak tanggal pengeluaran.');if(!provider)fail('Isi penyedia layanan.');const e=employee(u.employee);if(!e||e.status==='resigned')fail('Karyawan aktif tidak ditemukan.');const start=eligibility(e);if(category!=='expense'&&!eligibleOn(e,date))fail('Biaya terjadi sebelum karyawan berhak atas Medical Benefits.');if(category==='optics'&&e.opticsHistoryPending)fail('Riwayat kacamata belum dimuat. Hubungi HR sebelum mengajukan.');if(category==='optics')assertOpticsPurchase(e.id,date);if(category==='optics'&&date<=addMonths(e.joinDate,quotaAt(e,date).optics.minServiceMonths))fail('Masa kerja belum memenuhi syarat kacamata pada kriteria yang berlaku.');if(category==='expense'&&(!purpose||!form.get('priorApproval')))fail('Expense trial ini memerlukan keperluan dinas dan persetujuan sebelumnya.');
 let items;try{items=JSON.parse(String(form.get('items')))}catch{fail('Rincian biaya tidak valid.')}if(!Array.isArray(items)||!items.length||items.length>50)fail('Isi rincian pengeluaran.');items=items.map(i=>({desc:String(i.desc||'').trim().slice(0,300),amount:Number(i.amount)}));if(items.some(i=>!i.desc||!Number.isSafeInteger(i.amount)||i.amount<=0))fail('Nominal harus berupa rupiah bulat yang positif.');const amount=items.reduce((s,i)=>s+i.amount,0);if(!Number.isSafeInteger(amount))fail('Nominal terlalu besar.');const files=await filesFrom(form,'files'),approvals=await filesFrom(form,'approvalFiles'),id=String(form.get('editId')||'');return transaction(()=>{if(employee(e.id)?.status==='resigned')fail('Karyawan sudah tidak aktif.');const existing=id?owned(u,id):null;if(existing&&existing.status!=='returned')fail('Pengajuan ini tidak dapat diubah.');const duplicates=matchingClaims(claims(),{employee:e.id,category,date,amount,provider,excludeId:id});let duplicateOverride=existing?.duplicateOverride;
 if(duplicates.length){const reason=String(form.get('duplicateReason')||'').trim(),confirmed=form.get('duplicateConfirmed')==='true';
  if(!confirmed||!reason||reason.length>2000)throw Object.assign(new Error(reason.length>2000?'Alasan maksimal 2000 karakter.':'Ada pengajuan dengan karyawan, jenis, tanggal, nominal dan penyedia yang sama. Periksa pengajuan sebelumnya; alasan wajib diisi jika tetap mengajukan.'),{status:409,code:'DUPLICATE_CLAIM',duplicates:duplicates.map(x=>({id:x.id,category:x.category,date:x.date,provider:x.provider,amount:x.amount,status:x.status,statusLabel:claimStatusLabel(withFinanceDispatch(x)),submitted:x.submitted||'',paymentRequestNo:x.paymentRequestNo||'',items:x.items,docs:(x.docs||[]).filter(d=>d.kind==='claim').map(d=>({id:d.id,name:d.name}))}))});
  duplicateOverride={reason,matchedClaimIds:duplicates.map(x=>x.id),createdAt:isoNow(),actor:actor.username,actorName:employee(actor.employee)?.name||actor.username};
 }
 if(!files.length&&!existing?.docs.some(d=>d.kind==='claim'))fail('Lampirkan kuitansi dan dokumen pendukung.');if(category==='expense'&&!approvals.length&&!existing?.docs.some(d=>d.kind==='approval'))fail('Lampirkan bukti persetujuan sebelumnya.');if(category==='optics')assertOpticsPurchase(e.id,date);if(category!=='expense'&&amount>balance(e.id,category,Number(date.slice(0,4))).available)fail('Nominal melebihi sisa plafon atau hak benefit belum tersedia. Hubungi HR.');const payer=category==='expense'?selectExpenseCompany(expenseCompanies(),String(form.get('expenseCompanyId')||''),existing?.category==='expense'?existing.expenseCompany:null):null;const c={...(payer?{expenseCompany:payer}:{}),id:existing?.id||newClaimId(category),employee:e.id,category,date,provider,purpose,expenseType,items,amount,approved:0,status:'submitted',...(duplicateOverride?{duplicateOverride}:{}),docs:existing?.docs||[],note:'',submittedBy:{username:actor.username,role:actor.role,onBehalf:actor.role==='hr'},submitted:today(),createdAt:existing?.createdAt||isoNow(),updatedAt:isoNow()};addDocs(c,files,'claim');addDocs(c,approvals,'approval');put(c);audit(c.id,actor,existing?'resubmitted':actor.role==='hr'?'submitted_by_hr':'submitted',{amount,employee:e.id,onBehalf:actor.role==='hr',...(payer?{expenseCompany:payer}:{}),...(duplicateOverride?{duplicateOverride}:{})});return c})}
export async function action(u,id,form){if(u.role!=='hr')fail('Tindakan ini hanya untuk HR.',403);const a=String(form.get('action')),note=String(form.get('note')||'').trim().slice(0,2000),approved=Number(form.get('approved')),paidDate=String(form.get('paidDate')||''),proof=a==='paid'?await filesFrom(form,'proof'):[],managerProof=a==='approve'&&u.employee===owned(u,id).employee?await filesFrom(form,'managerApprovalFiles'):[];return transaction(()=>{const c=owned(u,id);
 if(['approve','return','reject'].includes(a)){if(c.status!=='submitted')fail('Status pengajuan sudah berubah. Muat ulang.',409);if(a==='approve'){if(u.employee===c.employee){const approver=String(form.get('managerApprover')||'').trim();if(!approver||approver.length>160||approver.toLowerCase()===String(employee(u.employee)?.name||'').toLowerCase()||approver===u.employee||!managerProof.length)fail('Klaim pribadi HR memerlukan nama atasan lain dan lampiran bukti email persetujuannya.');if(form.get('managerApprovalConfirmed')!=='true')fail('Konfirmasi bahwa persetujuan berasal dari atasan langsung.');c.managerApproval={approver,recordedBy:u.username,recordedAt:isoNow(),method:'email'};addDocs(c,managerProof,'manager-approval');}if(c.category==='optics')assertOpticsPurchase(c.employee,c.date,c.id);if(form.get('policyChecked')!=='true')fail('Pastikan pemeriksaan Medical/Expense Policy selesai.');if(!Number.isSafeInteger(approved)||approved<=0||approved>c.amount)fail('Nominal persetujuan tidak valid.');if(approved!==c.amount&&!note)fail('Alasan penyesuaian nominal wajib diisi.');if(c.category!=='expense'){const b=balance(c.employee,c.category,Number(c.date.slice(0,4)));if(approved>b.available)fail('Plafon sudah tidak mencukupi. Muat ulang pengajuan.',409);c.balanceAfter=c.category==='optics'?0:totalMoney([b.available,-approved]);}c.status='approved';c.approved=approved;c.approvedAt=isoNow();c.note=note;reserveNumber(db,c,today());const snapshot=paymentRequestDefaults(c,employee(c.employee));if(paymentRequestFields.every(f=>!f.required||String(snapshot[f.key]??'').trim())){c.paymentRequest=snapshot;c.paymentRequestUpdatedAt=isoNow();}}else{if(!note)fail('Alasan wajib diisi.');c.status=a==='return'?'returned':'rejected';c.note=note;}}
 else if(a==='cancel'){
  if(archiveInfo(db,c.id))fail('Kembalikan pengajuan dari Arsip sebelum melakukan pembatalan.',409);
  if(!['submitted','returned','rejected','approved'].includes(c.status))fail('Hanya pengajuan yang belum dibayar dan belum dibatalkan dapat dibatalkan.',409);
  if(!note)fail('Alasan pembatalan wajib diisi.');if(String(form.get('note')||'').trim().length>2000)fail('Alasan pembatalan maksimal 2000 karakter.');
  const previousStatus=c.status,year=Number(c.date.slice(0,4)),beforeBalance=previousStatus==='approved'&&c.category!=='expense'?balance(c.employee,c.category,year):null;
  c.status='cancelled';c.cancellation={reason:note,createdAt:isoNow(),actor:u.username,actorName:employee(u.employee)?.name||u.username,previousStatus,releasedAmount:0};
  if(beforeBalance){put(c);const afterBalance=balance(c.employee,c.category,year);c.cancellation.releasedAmount=Math.max(0,totalMoney([afterBalance.available,-beforeBalance.available]));}
 }
 else if(a==='paid'){if(c.status!=='approved')fail('Hanya pengajuan menunggu pembayaran yang dapat ditandai dibayar.',409);if(requiresResend(c)||c.paymentRequestDraft)fail('Payment Request revisi wajib disimpan dan dikirim ulang ke Finance sebelum konfirmasi pembayaran.',409);const sent=financeDispatch(c.id);if(!sent?.sentDate||!completeRequest(c))fail('Lengkapi Payment Request dan catat tanggal pengiriman ke Finance sebelum konfirmasi pembayaran.',409);validDate(paidDate);const approvedDate=c.approvedAt?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date(c.approvedAt)):c.date;if(paidDate>today()||paidDate<c.date||paidDate<sent.sentDate||paidDate<approvedDate)fail('Tanggal pembayaran tidak valid.');if(!proof.length)fail('Bukti transfer berhasil wajib dilampirkan.');c.status='paid';c.paidDate=paidDate;c.bankRef=String(form.get('bankRef')||'').slice(0,200);addDocs(c,proof,'payment');}
 else fail('Tindakan tidak dikenal.');c.updatedAt=isoNow();put(c);audit(c.id,u,a==='approve'&&c.managerApproval?'manager_approval_recorded':a,{...(c.managerApproval?{managerApproval:c.managerApproval}:{}),note,approved:c.approved,paidDate:c.paidDate,paymentRequestNo:c.paymentRequestNo,...(a==='cancel'?{cancellation:c.cancellation}:{})});return c})}

function quotaAt(e,date){return levelQuota(db,criteriaAt(db,date).data,levelAt(db,e,date));}
function opticsPurchaseIssue(id,date,excludeId=''){
 const e=employee(id);if(e.opticsHistoryPending)return {message:'Riwayat kacamata belum diperiksa HR.',nextDate:null};
 const interval=quotaAt(e,date).optics.cycleMonths;
 const overlap=claims().filter(c=>c.employee===id&&c.category==='optics'&&c.id!==excludeId&&['historical','approved','paid'].includes(c.status)).find(c=>c.date<=date?addMonths(c.date,quotaAt(e,c.date).optics.cycleMonths)>date:addMonths(date,interval)>c.date);
 return overlap?{message:'Tanggal pembelian belum memenuhi siklus hak kacamata. '+(overlap.date<=date?'Hak berikutnya tersedia pada '+formatDate(addMonths(overlap.date,quotaAt(e,overlap.date).optics.cycleMonths))+'.':'Sudah ada klaim disetujui pada '+formatDate(overlap.date)+' dalam siklus yang sama.'),nextDate:overlap.date<=date?addMonths(overlap.date,quotaAt(e,overlap.date).optics.cycleMonths):null}:null;
}
function assertOpticsPurchase(id,date,excludeId=''){const issue=opticsPurchaseIssue(id,date,excludeId);if(issue)fail(issue.message,409)}
export function claimEligibility(actor,input){
 const id=actor.role==='hr'?String(input.actingEmployee||actor.employee):actor.employee;if(actor.role!=='hr'&&input.actingEmployee)fail('Akses tidak diizinkan.',403);const e=employee(id);if(!e||e.status==='resigned')fail('Karyawan aktif tidak ditemukan.',404);const date=String(input.date||''),category=String(input.category||'');validDate(date);if(date>today()||!['outpatient','optics'].includes(category))fail('Tanggal atau kategori tidak valid.');const b=balance(id,category,Number(date.slice(0,4)));let issue=category==='optics'?opticsPurchaseIssue(id,date):null;
 if(!eligibleOn(e,date)||category==='optics'&&date<=addMonths(e.joinDate,quotaAt(e,date).optics.minServiceMonths))issue={message:'Tanggal pengeluaran belum memenuhi syarat Medical Benefits.',nextDate:b.nextDate};
 return {balance:issue?{...b,available:0,eligible:false}:b,message:issue?.message||'',nextDate:issue?.nextDate||b.nextDate};
}
export function reviewOpticsHistory(u,id,input){
 if(u.role!=='hr')fail('Pemeriksaan riwayat hanya untuk HR.',403);return transaction(()=>{const e=employee(id);if(!e||!e.opticsHistoryPending)fail('Riwayat kacamata tidak sedang menunggu pemeriksaan.',409);if(String(input.version||'')!==String(e.profileVersion||''))fail('Profil berubah. Buka ulang pemeriksaan.',409);const history=claims().filter(c=>c.employee===id&&c.category==='optics'&&['historical','approved','paid'].includes(c.status));let added=null;
 if(input.mode==='none'){if(history.length)fail('Sudah ada riwayat klaim. Pilih Gunakan riwayat tercatat.');}
 else if(input.mode==='existing'){if(!history.length)fail('Belum ada riwayat tercatat.');}
 else if(input.mode==='last'){const date=String(input.date||'');validDate(date);const amount=Number(input.amount),provider=String(input.provider||'').trim();if(date>today()||date<e.joinDate||!Number.isSafeInteger(amount)||amount<=0||!provider||provider.length>160)fail('Lengkapi tanggal, penyedia dan nominal klaim terakhir yang valid.');if(history.length)fail('Riwayat sudah tersedia; gunakan riwayat tercatat agar tidak menggandakan pemakaian.');added={id:'OHR'+today().slice(0,4)+'-'+randomBytes(6).toString('hex'),employee:id,category:'optics',date,provider,amount,approved:amount,status:'historical',items:[{desc:'Riwayat kacamata dikonfirmasi HR',amount}],docs:[],source:'hr-history-review',createdAt:isoNow()};put(added);audit(added.id,u,'optics_history_recorded',{employee:id,amount,date});}
 else fail('Pilih hasil pemeriksaan riwayat.');
 const before=structuredClone(e);e.opticsHistoryPending=false;e.opticsHistoryReview={mode:input.mode,actor:u.username,reviewedAt:isoNow(),claim:added?.id||null};e.profileVersion=randomBytes(12).toString('hex');e.updatedAt=isoNow();db.prepare('UPDATE employees SET data=? WHERE id=?').run(JSON.stringify(e),id);db.prepare('INSERT INTO employee_events(employee,actor,action,created,before_data,after_data) VALUES(?,?,?,?,?,?)').run(id,u.username,'optics_history_reviewed',isoNow(),JSON.stringify(before),JSON.stringify(e));return {employee:e};
 });
}
export function paymentRequestRevision(u,id,input){
 if(u.role!=='hr')fail('Revisi Payment Request hanya untuk HR.',403);return transaction(()=>{const c=owned(u,id),dispatch=financeDispatch(id);if(c.status!=='approved'||!dispatch||!completeRequest(c))fail('Revisi hanya untuk Payment Request lengkap yang sudah dikirim dan belum dibayar.',409);const action=String(input.action||'');
 if(action==='start'){if(c.paymentRequestDraft)fail('Draft revisi sudah terbuka. Muat ulang.',409);c.paymentRequestDraft={token:randomBytes(12).toString('hex'),startedAt:isoNow(),actor:u.username};c.updatedAt=isoNow();put(c);audit(id,u,'payment_request_revision_started',{paymentRequestNo:c.paymentRequestNo});return withFinanceDispatch(c);}
 if(!c.paymentRequestDraft||input.token!==c.paymentRequestDraft.token)fail('Draft revisi sudah berubah. Buka ulang.',409);if(action==='cancel'){delete c.paymentRequestDraft;c.updatedAt=isoNow();put(c);audit(id,u,'payment_request_revision_cancelled');return withFinanceDispatch(c);}
 if(action!=='save')fail('Tindakan revisi tidak valid.');const result={...c.paymentRequest};for(const f of paymentRequestFields){if(['requestNo','transferAmount',...accountFields].includes(f.key)||f.key==='company'&&hasExpenseCompany(c))continue;const value=String(input.fields?.[f.key]??'').trim();if(f.required&&!value||value.length>160||/[\r\n\x00-\x1f]/.test(value))fail('Lengkapi '+f.label+' dengan satu baris maksimal 160 karakter.');result[f.key]=value;}
 if(!['Payroll','Non Payroll'].includes(result.payroll))fail('Pilihan payroll tidak valid.');const fields=paymentRequestFields.filter(f=>String(result[f.key]??'')!==String(c.paymentRequest[f.key]??'')).map(f=>f.key);if(!fields.length)fail('Tidak ada perubahan. Batalkan revisi jika tidak diperlukan.');const at=isoNow(),before=structuredClone(c.paymentRequest);c.paymentRequest=result;c.paymentRequestRevision={updatedAt:at,actor:u.username,actorName:employee(u.employee)?.name||u.username,before,after:structuredClone(result),fields,previousDispatch:dispatch,needsResend:true};delete c.paymentRequestDraft;c.paymentRequestUpdatedAt=at;c.updatedAt=at;put(c);audit(id,u,'payment_request_revised_requires_resend',{before,after:result,fields,previousDispatch:dispatch,paymentRequestNo:c.paymentRequestNo});return withFinanceDispatch(c);
 });
}

export function document(u,id){const d=db.prepare('SELECT * FROM documents WHERE id=?').get(id);if(!d)fail('Dokumen tidak ditemukan.',404);owned(u,d.claim);return d}
export function preparePaymentRequest(u,id){
 if(u.role!=='hr')fail('Nomor Payment Request hanya untuk HR.',403);
 return transaction(()=>{const c=owned(u,id);if(!['approved','paid'].includes(c.status))fail('Pengajuan belum disetujui.');if(c.status==='paid'||financeDispatch(c.id))return withFinanceDispatch(c);const number=reserveNumber(db,c,today());if(c.paymentRequest)c.paymentRequest.requestNo=number;syncOneUnsentAccount(c,u,'payment_request_prepared');c.updatedAt=isoNow();put(c);return c})
}
export function savePaymentRequest(u,id,input){
 if(u.role!=='hr')fail('Data Payment Request hanya dapat disimpan HR.',403);
 return transaction(()=>{const c=owned(u,id);if(!['approved','paid'].includes(c.status))fail('Pengajuan belum disetujui.');if(c.status==='paid')fail('Data laporan pembayaran yang telah dibayar tidak dapat diubah.',409);
 if(financeDispatch(c.id))fail('Payment Request sudah dikirim. Gunakan Revisi Payment Request.',409);syncOneUnsentAccount(c,u,'payment_request_saved');const e=employee(c.employee),result={},account=financeDispatch(id)?savedAccount(c):completeAccount(profileAccount(e))?profileAccount(e):null;
 for(const f of paymentRequestFields){if(f.key==='requestNo')continue;if(f.key==='transferAmount'){result[f.key]=c.approved;continue}const value=String(account&&accountFields.includes(f.key)?account[f.key]:f.key==='company'&&expenseCompanyCode(c,e)?expenseCompanyCode(c,e):input[f.key]??'').trim();if(f.required&&!value)fail('Lengkapi '+f.label+'.');if(value.length>160||/[\r\n\x00-\x1f]/.test(value))fail(f.label+' harus satu baris dan maksimal 160 karakter.');result[f.key]=value}
 if(!['Payroll','Non Payroll'].includes(result.payroll))fail('Pilihan Payroll/ Non payroll tidak valid.');
 result.requestNo=reserveNumber(db,c,today());c.paymentRequest=result;c.paymentRequestUpdatedAt=isoNow();c.updatedAt=isoNow();put(c);audit(c.id,u,'payment_request_saved',{requestNo:result.requestNo});return c})
}
export function report(u,id){if(u.role!=='hr')fail('Ringkasan Finance hanya untuk HR.',403);let c=owned(u,id);if(c.status==='approved')transaction(()=>syncOneUnsentAccount(c,u,'payment_request_pdf'));if(!['approved','paid','cancelled'].includes(c.status))fail('Pengajuan belum disetujui.');if(!c.paymentRequest||c.paymentRequest.requestNo!==c.paymentRequestNo)fail('Lengkapi dan simpan field Payment Request sesuai SOP terlebih dahulu.');const e=employee(c.employee),b=c.category==='expense'?null:balance(e.id,c.category,Number(c.date.slice(0,4)));return paymentRequestPdf(withFinanceDispatch(c),e,b)}

export const runtimeEnvironment=environment;
export const sessionCookie=SESSION_COOKIE;
export const openTestMode=u=>startTestMode(db,u);
export const enterTest=ticket=>enterTestMode(db,ticket);
export const archiveClaim=(u,id,input)=>setArchive(db,u,id,input);
export function resetTests(u,input){const result=resetTestMode(db,u,input.confirmation);initBenefitHistory(db,employees(),today(),calculateBalance,level=>benefitGroup(db,level));return result;}
