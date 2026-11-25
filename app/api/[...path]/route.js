import * as store from '../../../lib/store.js';
import {cookieHeader} from '../../../lib/runtime-mode.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200,more={})=>Response.json(data,{status,headers:{...headers,...more}});
async function handle(req,{params}){try{const {path:p}=await params;const url=new URL(req.url);if(req.method!=='GET'){const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==(req.headers.get('host')||url.host))return json({error:'Asal permintaan tidak sesuai.'},403)}
 if(p[0]==='test-mode'&&p[1]==='info'&&p.length===2&&req.method==='GET')return json(store.runtimeEnvironment());
 if(p[0]==='test-mode'&&p[1]==='enter'&&p.length===2&&req.method==='POST'){const token=store.enterTest((await req.json()).ticket);return json({ok:true},200,{'Set-Cookie':cookieHeader(token)});}
 if(p[0]==='login'&&req.method==='POST'){const b=await req.json(),token=store.login(b.username,b.password);return json({ok:true},200,{'Set-Cookie':cookieHeader(token)})}
 if(p[0]==='change-password'&&p.length===1&&req.method==='POST'){const result=store.changePassword(await req.json());return json(result,200,{'Set-Cookie':cookieHeader('')})}
 if(p[0]==='logout'&&req.method==='POST'){store.logout(req);return json({ok:true},200,{'Set-Cookie':cookieHeader('')})}
 const u=store.userFrom(req);
 if(process.env.ABT_MAINTENANCE==='1'&&req.method!=='GET')return json({error:'Aplikasi sedang dalam pemeliharaan. Silakan coba kembali setelah diberitahukan HR.'},503);
 if(p[0]==='test-mode'&&p[1]==='start'&&p.length===2&&req.method==='POST')return json(await store.openTestMode(u));
 if(p[0]==='test-mode'&&p[1]==='reset'&&p.length===2&&req.method==='POST')return json(store.resetTests(u,await req.json()));
 if(p[0]==='claims'&&p[2]==='archive'&&p.length===3&&req.method==='POST')return json(store.archiveClaim(u,p[1],await req.json()));
 if(p[0]==='quota-criteria'&&req.method==='POST'&&p.length===1)return json(store.saveCriteria(u,null,await req.json()),201);
 if(p[0]==='quota-criteria'&&p[2]==='action'&&req.method==='POST'&&p.length===3)return json(store.criteriaAction(u,p[1],await req.json()));
 if(p[0]==='quota-criteria'&&req.method==='POST'&&p.length===2)return json(store.saveCriteria(u,p[1],await req.json()));
 if(p[0]==='masters'&&req.method==='POST'&&p.length===1)return json(store.saveMaster(u,null,await req.json()),201);
 if(p[0]==='masters'&&req.method==='POST'&&p.length===2)return json(store.saveMaster(u,p[1],await req.json()));
 if(p[0]==='employees'&&req.method==='POST'&&p.length===1)return json(store.saveEmployee(u,null,await req.json()),201);
 if(p[0]==='employees'&&req.method==='POST'&&p.length===2)return json(store.saveEmployee(u,p[1],await req.json()));
 if(p[0]==='employees'&&p[2]==='change-id'&&p.length===3&&req.method==='POST')return json(store.changeEmployeeId(u,p[1],await req.json()));
 if(p[0]==='employees'&&p[2]==='id-history'&&p.length===3&&req.method==='GET')return json(store.employeeIdHistory(u,p[1]));
 if(p[0]==='employees'&&p[2]==='reset-password'&&p.length===3&&req.method==='POST')return json(store.resetEmployeePassword(u,p[1]));
 if(p[0]==='monitoring'&&p.length===1&&req.method==='GET'){const d=store.exportMonitoring(u,{year:Number(url.searchParams.get('year')||store.today().slice(0,4)),category:url.searchParams.get('category')||'outpatient',employeeId:url.searchParams.get('employee')||'all',status:url.searchParams.get('status')||'all',query:url.searchParams.get('q')||'',view:url.searchParams.get('view')||'all',archived:url.searchParams.get('archived')==='1'});return new Response(new Uint8Array(d.bytes),{headers:{...headers,'Content-Type':d.type,'Content-Disposition':'attachment; filename="'+d.name+'"'}})}
 if(p[0]==='history'&&p.length===1&&req.method==='GET'){const d=store.exportHistory(u,{id:url.searchParams.get('employee')||u.employee,year:Number(url.searchParams.get('year')||store.today().slice(0,4)),category:url.searchParams.get('category')||'outpatient',format:url.searchParams.get('format')||'pdf',view:url.searchParams.get('view')||'all',archived:url.searchParams.get('archived')==='1',status:url.searchParams.get('status')||'all',query:url.searchParams.get('q')||''});return new Response(new Uint8Array(d.bytes),{headers:{...headers,'Content-Type':d.type,'Content-Disposition':`attachment; filename="${d.name}"`}})}
 if(p[0]==='state'&&req.method==='GET'){const year=Number(url.searchParams.get('year')||store.today().slice(0,4));if(!Number.isInteger(year)||year<2000||year>Number(store.today().slice(0,4)))return json({error:'Periode tidak valid.'},400);return json(store.state(u,year,url.searchParams.get('actingEmployee')))}
 if(p[0]==='claim-eligibility'&&p.length===1&&req.method==='GET')return json(store.claimEligibility(u,Object.fromEntries(url.searchParams)));
 if(p[0]==='employees'&&p[2]==='optics-review'&&p.length===3&&req.method==='POST')return json(store.reviewOpticsHistory(u,p[1],await req.json()));
 if(p[0]==='claims'&&p[2]==='payment-request'&&p[3]==='revision'&&p.length===4&&req.method==='POST')return json(store.paymentRequestRevision(u,p[1],await req.json()));
 if(p[0]==='claims'&&req.method==='POST'&&p.length===1)return json(await store.submit(u,await req.formData()),201);
 if(p[0]==='claims'&&p[2]==='finance-dispatch'&&p.length===3&&req.method==='POST'){let body;try{body=await req.json()}catch{return json({error:'Isi tanggal email ke Finance.'},400)}return json(store.markFinanceDispatch(u,p[1],body));}
 if(p[0]==='claims'&&p[2]==='action'&&req.method==='POST')return json(await store.action(u,p[1],await req.formData()));
 if(p[0]==='claims'&&p[2]==='payment-request'&&p[3]==='update-account'&&p.length===4&&req.method==='POST')return json(store.updateSentPaymentAccount(u,p[1]));
 if(p[0]==='claims'&&p[2]==='payment-request'&&p[3]==='prepare'&&req.method==='POST')return json(store.preparePaymentRequest(u,p[1]));
 if(p[0]==='claims'&&p[2]==='payment-request'&&req.method==='POST')return json(store.savePaymentRequest(u,p[1],await req.json()));
 if(p[0]==='documents'&&p.length===2&&req.method==='GET'){const d=store.document(u,p[1]),preview=url.searchParams.get('preview')==='1'&&['application/pdf','image/png','image/jpeg'].includes(d.type);return new Response(new Uint8Array(d.bytes),{headers:{...headers,'Content-Type':d.type,'X-Frame-Options':'SAMEORIGIN',...(preview?{'Content-Security-Policy':"frame-ancestors 'self'"}:{}),'Content-Disposition':`${preview?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(d.name)}`}})}
 if(p[0]==='claims'&&p[2]==='report'&&req.method==='GET')return new Response(new Uint8Array(store.report(u,p[1])),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${p[1]}-payment-request.pdf"`}});
 return json({error:'Halaman tidak ditemukan.'},404);
 }catch(e){if(e.status===409&&e.code==='DUPLICATE_CLAIM')return json({error:e.message,code:e.code,duplicates:e.duplicates},409);if(!e.status)console.error(e);return json({error:e.status?e.message:'Terjadi kesalahan. Silakan muat ulang.'},e.status||500)}}
export const GET=handle;export const POST=handle;
