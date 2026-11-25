import {randomBytes} from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const hr=u=>{if(u.role!=='hr')fail('Perubahan Employee ID hanya untuk HR.',403)};
export function initializeEmployeeIdChanges(db){db.exec(`CREATE TABLE IF NOT EXISTS employee_id_changes(id INTEGER PRIMARY KEY,employee TEXT NOT NULL,old_id TEXT NOT NULL UNIQUE,new_id TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL)`);}
export function reservedEmployeeId(db,id){
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='employee_id_changes'").get()&&db.prepare('SELECT 1 FROM employee_id_changes WHERE old_id=? COLLATE NOCASE').get(id))return true;
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='employee_events'").get())return false;
 return !!db.prepare("SELECT 1 FROM employee_events WHERE action='employee_id_changed' AND json_valid(before_data) AND json_extract(before_data,'$.id')=? COLLATE NOCASE").get(id);
}
export function employeeIdHistory(db,u,id){hr(u);if(!db.prepare('SELECT 1 FROM employees WHERE id=?').get(id))fail('Karyawan tidak ditemukan.',404);initializeEmployeeIdChanges(db);
 const rows=db.prepare('SELECT old_id oldId,new_id newId,reason,actor,created FROM employee_id_changes WHERE employee=? ORDER BY id DESC').all(id);
 for(const e of db.prepare("SELECT actor,created,before_data,after_data FROM employee_events WHERE employee=? AND action='employee_id_changed' ORDER BY id DESC").all(id)){const before=JSON.parse(e.before_data||'{}'),after=JSON.parse(e.after_data||'{}');if(before.id&&after.id&&!rows.some(r=>r.oldId===before.id&&r.newId===after.id))rows.push({oldId:before.id,newId:after.id,reason:'Perubahan ID sebelumnya dicatat HR.',actor:e.actor,created:e.created});}
 return rows.sort((a,b)=>b.created.localeCompare(a.created));
}
export function changeEmployeeId(db,u,id,input){hr(u);initializeEmployeeIdChanges(db);db.exec('BEGIN IMMEDIATE');try{
 const row=db.prepare('SELECT data FROM employees WHERE id=?').get(id);if(!row)fail('Karyawan tidak ditemukan atau ID sudah berubah. Muat ulang data.',404);const before=JSON.parse(row.data);
 if(String(input.version??'')!==String(before.profileVersion??''))fail('Profil sudah berubah. Buka ulang sebelum mengganti Employee ID.',409);
 const newId=String(input.newId??'').trim(),reason=String(input.reason??'').trim();
 if(!/^[A-Za-z0-9._-]{3,32}$/.test(newId))fail('Employee ID baru harus 3–32 huruf/angka tanpa spasi.');
 if(newId.toLowerCase()===id.toLowerCase())fail('Employee ID baru harus berbeda dari ID saat ini.');
 if(!reason||reason.length>500||/[\x00-\x1f]/.test(reason))fail('Isi alasan perubahan, maksimal 500 karakter.');
 if(input.confirmed!==true)fail('Konfirmasikan bahwa ID baru milik karyawan yang sama.');
 if(db.prepare('SELECT 1 FROM employees WHERE id=? COLLATE NOCASE').get(newId)||db.prepare('SELECT 1 FROM users WHERE username=? COLLATE NOCASE OR employee=? COLLATE NOCASE').get(newId,newId)||reservedEmployeeId(db,newId))fail('Employee ID sudah digunakan atau tersimpan sebagai ID lama. Gunakan ID lain.',409);
 const users=db.prepare('SELECT username,role FROM users WHERE employee=?').all(id);if(users.length!==1||users[0].username!==id)fail('Pemetaan akun perlu diperiksa sebelum ID dapat diubah.',409);
 for(const table of ['employee_level_history','employee_level_identity','annual_allowances','employee_events','employee_id_changes'])if(db.prepare('SELECT 1 FROM '+table+' WHERE employee=? COLLATE NOCASE').get(newId))fail('ID baru masih terkait dengan data karyawan lain.',409);
 if(db.prepare("SELECT 1 FROM claims WHERE json_extract(data,'$.employee')=? COLLATE NOCASE").get(newId))fail('ID baru masih terkait dengan riwayat klaim lain.',409);
 const at=new Date().toISOString(),after={...before,id:newId,profileVersion:randomBytes(12).toString('hex'),updatedAt:at};
 db.prepare('UPDATE employees SET id=?,data=? WHERE id=?').run(newId,JSON.stringify(after),id);
 db.prepare('UPDATE users SET username=?,employee=? WHERE username=? AND employee=?').run(newId,newId,id,id);
 db.prepare('UPDATE sessions SET username=? WHERE username=?').run(newId,id);
 db.prepare('UPDATE account_events SET username=? WHERE username=?').run(newId,id);
 for(const table of ['employee_level_history','employee_level_identity','annual_allowances','employee_events','employee_id_changes'])db.prepare('UPDATE '+table+' SET employee=? WHERE employee=?').run(newId,id);
 let claimCount=0;
 for(const row of db.prepare("SELECT id,data FROM claims WHERE json_extract(data,'$.employee')=?").all(id)){const c=JSON.parse(row.data);c.employee=newId;db.prepare('UPDATE claims SET data=? WHERE id=?').run(JSON.stringify(c),row.id);claimCount++;}
 // Audit snapshots/actors remain as originally recorded; only subject references move.
 db.prepare('INSERT INTO employee_id_changes(employee,old_id,new_id,reason,actor,created) VALUES(?,?,?,?,?,?)').run(newId,id,newId,reason,u.username,at);
 db.prepare('INSERT INTO employee_events(employee,actor,action,created,before_data,after_data) VALUES(?,?,?,?,?,?)').run(newId,u.username,'employee_id_changed',at,JSON.stringify(before),JSON.stringify(after));
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Referensi database tidak konsisten.');
 db.exec('COMMIT');return{employee:after,oldId:id,newId,claimCount};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
