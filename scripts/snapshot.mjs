import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {DatabaseSync,backup} from 'node:sqlite';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function inspectDatabase(file){
 if(!fs.existsSync(file))throw Error('Database tidak ditemukan: '+file);
 const db=new DatabaseSync(file,{readOnly:true});try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Pemeriksaan integritas database gagal.');
  const tableNames=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name),tables={};
  for(const table of tableNames){const rows=db.prepare('SELECT * FROM "'+table.replaceAll('"','""')+'" ORDER BY rowid').all();tables[table]={count:rows.length,sha256:sha(JSON.stringify(rows))};}
  for(const required of ['employees','users','claims','documents','payment_request_sequences'])if(!tables[required])throw Error('Tabel wajib tidak ditemukan: '+required);
  const summary={employees:tables.employees.count,users:tables.users.count,claims:tables.claims.count,documents:tables.documents.count,documentBytes:db.prepare('SELECT COALESCE(SUM(length(bytes)),0) n FROM documents').get().n,claimStatuses:db.prepare("SELECT json_extract(data,'$.category') category,json_extract(data,'$.status') status,COUNT(*) count FROM claims GROUP BY category,status ORDER BY category,status").all(),paymentRequestSequences:db.prepare('SELECT * FROM payment_request_sequences ORDER BY prefix').all(),claimSequences:db.prepare('SELECT * FROM claim_sequences ORDER BY prefix,year').all()};
  return{tables,summary};
 }finally{db.close();}
}
export function compareManifest(file,manifest){
 const actual=inspectDatabase(file),changes=[];for(const [table,baseline]of Object.entries(manifest.tables)){if(actual.tables[table]?.sha256!==baseline.sha256||actual.tables[table]?.count!==baseline.count)changes.push(table);}
 if(changes.length)throw Error('Data tidak sama dengan snapshot pada tabel: '+changes.join(', '));return actual;
}
export async function captureSnapshot(source,folder){
 const output=path.resolve(folder);if(fs.existsSync(path.join(output,'trial.sqlite'))||fs.existsSync(path.join(output,'snapshot-manifest.json')))throw Error('Folder tujuan sudah berisi snapshot. Gunakan folder baru.');
 if(!fs.existsSync(source))throw Error('Database sumber tidak ditemukan.');fs.mkdirSync(output,{recursive:true});
 const started=new Date().toISOString(),db=new DatabaseSync(source,{readOnly:true});try{await backup(db,path.join(output,'trial.sqlite'));}finally{db.close();}
 const portable=new DatabaseSync(path.join(output,'trial.sqlite'));portable.exec('PRAGMA journal_mode=DELETE');portable.close();
 const manifest={format:1,captureStartedUTC:started,capturedAtUTC:new Date().toISOString(),capturedAtWIB:new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'long',timeStyle:'long'}).format(new Date()),databaseFile:'trial.sqlite',databaseSha256:sha(fs.readFileSync(path.join(output,'trial.sqlite'))),...inspectDatabase(path.join(output,'trial.sqlite'))};
 fs.writeFileSync(path.join(output,'snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});fs.chmodSync(path.join(output,'trial.sqlite'),0o600);return manifest;
}
