const fail=(m,status=400)=>{throw Object.assign(new Error(m),{status})};
export function initializeArchives(db){db.exec('CREATE TABLE IF NOT EXISTS claim_archives(claim TEXT PRIMARY KEY REFERENCES claims(id),actor TEXT NOT NULL,created TEXT NOT NULL)');}
export function archiveInfo(db,id){return db.prepare('SELECT actor,created FROM claim_archives WHERE claim=?').get(id)||null;}
export function setArchive(db,u,id,input){
 if(u.role!=='hr')fail('Arsip hanya dapat dikelola HR.',403);
 if(typeof input.archived!=='boolean')fail('Tindakan arsip tidak valid.');
 db.exec('BEGIN IMMEDIATE');try{
  const row=db.prepare('SELECT data FROM claims WHERE id=?').get(id);if(!row)fail('Pengajuan tidak ditemukan.',404);const c=JSON.parse(row.data);
  if(c.status!=='rejected')fail('Hanya pengajuan yang ditolak dapat diarsipkan.');
  const current=archiveInfo(db,id);if(!!current===input.archived){db.exec('COMMIT');return {ok:true,archived:!!current};}
  const now=new Date().toISOString();if(input.archived)db.prepare('INSERT INTO claim_archives VALUES(?,?,?)').run(id,u.username,now);else db.prepare('DELETE FROM claim_archives WHERE claim=?').run(id);
  db.prepare('INSERT INTO audit(claim,actor,action,created,data) VALUES(?,?,?,?,?)').run(id,u.username,input.archived?'archived':'archive_restored',now,JSON.stringify({status:c.status}));db.exec('COMMIT');return {ok:true,archived:input.archived};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
