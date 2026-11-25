import {initLevelQuotaIdentity,recordLevelIdentity} from './level-quota.js';
import {randomBytes} from 'node:crypto';
const entitlement=b=>Object.fromEntries(['limit','eligible','start','eligibilityConfirmed'].map(k=>[k,b[k]]));
export function initBenefitHistory(db,es,today,calculate,group){
 db.exec(`CREATE TABLE IF NOT EXISTS benefit_history_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS employee_level_history(employee TEXT NOT NULL,effective_date TEXT NOT NULL,level TEXT NOT NULL,benefit_group TEXT NOT NULL,created TEXT NOT NULL,actor TEXT NOT NULL,PRIMARY KEY(employee,effective_date));
 CREATE TABLE IF NOT EXISTS annual_allowances(employee TEXT NOT NULL,year INTEGER NOT NULL,data TEXT NOT NULL,source TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(employee,year));`);
 db.exec('BEGIN IMMEDIATE');try{
  for(const e of es)db.prepare('INSERT OR IGNORE INTO employee_level_history VALUES(?,?,?,?,?,?)').run(e.id,'0001-01-01',e.level,group(e.level),new Date().toISOString(),'preserved-profile');
  initLevelQuotaIdentity(db);
  const migrated=db.prepare("SELECT 1 FROM benefit_history_meta WHERE key='annual-preserved-v1'").get();
  for(const e of es)for(let y=2000;y<Number(today.slice(0,4));y++){if(db.prepare('SELECT 1 FROM annual_allowances WHERE employee=? AND year=?').get(e.id,y))continue;const data={outpatient:entitlement(calculate(e.id,'outpatient',y,true)),optics:entitlement(calculate(e.id,'optics',y,true))};db.prepare('INSERT INTO annual_allowances VALUES(?,?,?,?,?)').run(e.id,y,JSON.stringify(data),migrated?'year-closed':'preserved-existing-report',new Date().toISOString());}
  db.prepare('INSERT OR IGNORE INTO benefit_history_meta VALUES(?,?)').run('annual-preserved-v1',JSON.stringify({date:today,note:'Preserves previously displayed annual entitlement; does not reconstruct unverified historical job levels.'}));db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
}
export function levelAt(db,e,date){return db.prepare('SELECT h.level,h.benefit_group,i.level_id FROM employee_level_history h LEFT JOIN employee_level_identity i ON i.employee=h.employee AND i.effective_date=h.effective_date WHERE h.employee=? AND h.effective_date<=? ORDER BY h.effective_date DESC LIMIT 1').get(e.id,date)||{level:e.level,benefit_group:null};}
export function annualEntitlement(db,id,year,category){const r=db.prepare('SELECT data FROM annual_allowances WHERE employee=? AND year=?').get(id,year);return r?JSON.parse(r.data)[category]:null;}
export function recordLevel(db,e,existing,input,today,actor,group){
 if(existing&&existing.level===e.level)return;
 const effective=existing?String(input.levelEffectiveDate||''):e.joinDate;
 if(existing&&(!/^\d{4}-\d{2}-\d{2}$/.test(effective)||!Number.isFinite(Date.parse(effective))||new Date(effective+'T00:00:00Z').toISOString().slice(0,10)!==effective||effective<today))throw Object.assign(new Error('Tanggal berlaku perubahan level wajib hari ini atau sesudahnya.'),{status:400});
 db.prepare('INSERT INTO employee_level_history VALUES(?,?,?,?,?,?) ON CONFLICT(employee,effective_date) DO UPDATE SET level=excluded.level,benefit_group=excluded.benefit_group,created=excluded.created,actor=excluded.actor').run(e.id,effective,e.level,group(e.level),new Date().toISOString(),actor);recordLevelIdentity(db,e.id,effective,e.level);
}
export const levelDates=db=>Object.fromEntries(db.prepare("SELECT employee,MAX(effective_date) date FROM employee_level_history WHERE effective_date!='0001-01-01' GROUP BY employee").all().map(r=>[r.employee,r.date]));
