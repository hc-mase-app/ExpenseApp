import {TEST_MODE} from './runtime-mode.js';
import history from '../config/payment-number-history.json' with {type:'json'};
export function initializeNumbers(db){
 db.exec(`CREATE TABLE IF NOT EXISTS payment_request_sequences(prefix TEXT PRIMARY KEY,last_number INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS payment_request_numbers(number TEXT PRIMARY KEY,claim TEXT UNIQUE,source TEXT NOT NULL,created TEXT NOT NULL);`);
 db.exec('BEGIN IMMEDIATE');try{
  for(const number of TEST_MODE?[]:history.numbers)db.prepare('INSERT OR IGNORE INTO payment_request_numbers VALUES(?,NULL,?,?)').run(number,'monitoring-history',new Date().toISOString());
  for(const row of db.prepare('SELECT id,data FROM claims').all()){
   const c=JSON.parse(row.data),number=c.paymentRequestNo||c.paymentRequest?.requestNo;
   if(!number||number==='0')continue;
   const existing=db.prepare('SELECT claim FROM payment_request_numbers WHERE number=?').get(number);
   if(existing?.claim&&existing.claim!==c.id)continue;
   if(existing)db.prepare('UPDATE payment_request_numbers SET claim=?,source=? WHERE number=? AND claim IS NULL').run(c.id,'existing-request',number);
   else db.prepare('INSERT OR IGNORE INTO payment_request_numbers VALUES(?,?,?,?)').run(number,c.id,'existing-request',new Date().toISOString());
  }
  let last=0;for(const row of db.prepare('SELECT number FROM payment_request_numbers').all()){const match=/^EXPRBPR\d{2}-(\d+)$/.exec(row.number);if(match)last=Math.max(last,Number(match[1]))}
  db.prepare('INSERT INTO payment_request_sequences VALUES(?,?) ON CONFLICT(prefix) DO UPDATE SET last_number=MAX(last_number,excluded.last_number)').run('EXPRBPR',last);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
}
// Caller holds BEGIN IMMEDIATE: the number and claim are committed atomically.
export function reserveNumber(db,c,date){
 const assigned=db.prepare('SELECT number FROM payment_request_numbers WHERE claim=?').get(c.id);
 if(assigned){c.paymentRequestNo=assigned.number;return assigned.number}
 let next=Number(db.prepare('SELECT last_number FROM payment_request_sequences WHERE prefix=?').get('EXPRBPR').last_number),number;
 do{next++;number=(TEST_MODE?'UJI-':'')+'EXPRBPR'+date.slice(2,4)+'-'+String(next).padStart(3,'0')}while(db.prepare('SELECT 1 FROM payment_request_numbers WHERE number=?').get(number));
 db.prepare('UPDATE payment_request_sequences SET last_number=? WHERE prefix=?').run(next,'EXPRBPR');
 db.prepare('INSERT INTO payment_request_numbers VALUES(?,?,?,?)').run(number,c.id,'generated',new Date().toISOString());c.paymentRequestNo=number;return number;
}
