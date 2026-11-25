// Read-only process information. No deadlines, status changes, or financial calculations.
const jakarta=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});
function validDay(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function processDay(value){const s=String(value||'');if(validDay(s))return s;if(!/^\d{4}-\d{2}-\d{2}T/.test(s)||!validDay(s.slice(0,10))||!/(Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))return null;return jakarta.format(new Date(s));}
const latest=values=>values.filter(v=>processDay(v)).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
const auditDate=(events,actions)=>latest(events.filter(e=>actions.includes(e.action)).map(e=>e.created));
export function processStage(c){if(c.status!=='approved')return c.status;if(c.paymentRequestDraft)return 'revision_draft';if(c.financeDispatch?.resendRequired||c.paymentRequestRevision?.needsResend||c.paymentAccountRevision?.needsResend)return 'finance_resend';return c.financeDispatch?.sentAt?'finance_sent':'finance_unsent';}
export function claimStageTiming(c,events=[]){const stage=processStage(c);let since=null,basis='',waiting=['submitted','returned','finance_unsent','finance_sent','finance_resend','revision_draft'].includes(stage);
 if(stage==='submitted'){since=auditDate(events,['submitted','submitted_by_hr','resubmitted'])||[c.submitted,c.createdAt].find(v=>processDay(v))||null;basis='Pengajuan terakhir';}
 else if(stage==='returned'){since=auditDate(events,['return'])||([c.returnedAt].find(v=>processDay(v))||null);basis='Dikembalikan oleh HR';}
 else if(stage==='finance_unsent'){since=[c.approvedAt,c.managerApproval?.recordedAt].find(v=>processDay(v))||auditDate(events,['approve','manager_approval_recorded']);basis='Persetujuan';}
 else if(stage==='finance_sent'){if(processDay(c.financeDispatch?.sentDate)){since=c.financeDispatch.sentDate;basis='Email terakhir ke Finance';}else{since=[c.financeDispatch?.markedAt,c.financeDispatch?.sentAt].find(v=>processDay(v))||null;basis='Penandaan pengiriman; tanggal email belum tercatat';}}
 else if(stage==='finance_resend'){since=latest([c.paymentRequestRevision,c.paymentAccountRevision].filter(r=>r?.needsResend).map(r=>r.updatedAt))||auditDate(events,['payment_request_revised_requires_resend','payment_account_updated_requires_resend']);basis='Revisi terakhir yang perlu dikirim ulang';}
 else if(stage==='revision_draft'){since=processDay(c.paymentRequestDraft?.startedAt)?c.paymentRequestDraft.startedAt:auditDate(events,['payment_request_revision_started']);basis='Draft revisi dibuka';}
 return {stage,waiting,since:waiting?since:null,basis:waiting?basis:''};}
export function claimProgress(c,{today=jakarta.format(new Date()),isHR=false,employeeId=null}={}){const stage=processStage(c),timing=c.stageTiming?.stage===stage?c.stageTiming:claimStageTiming(c,c.audit||[]),day=processDay(timing.since),current=processDay(today);let days=null;if(timing.waiting&&day&&current){const n=(Date.parse(current+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000;if(n>=0)days=n;}
 let next='Lihat detail pengajuan untuk pemeriksaan status.';
 if(stage==='submitted')next=isHR?(c.employee===employeeId?'Catat persetujuan atasan dan lampirkan bukti email.':'Periksa dokumen dan catat keputusan HR.'):'Jika belum, informasikan pengajuan ke HR; lalu tunggu pemeriksaan.';
 else if(stage==='returned')next=isHR?'Menunggu karyawan melengkapi pengajuan sesuai catatan HR.':'Lengkapi sesuai catatan HR dan kirim ulang pengajuan yang sama.';
 else if(stage==='finance_unsent')next=isHR?(c.paymentRequest?'Kirim Payment Request dan catat tanggal email ke Finance.':'Lengkapi Payment Request, lalu kirim dan catat tanggal email ke Finance.'):'Menunggu HR mengirim Payment Request ke Finance.';
 else if(stage==='finance_resend')next=isHR?'Kirim ulang Payment Request revisi dan catat tanggal emailnya.':'Menunggu HR mengirim ulang dokumen revisi ke Finance.';
 else if(stage==='revision_draft')next=isHR?'Simpan atau batalkan draft revisi Payment Request.':'Menunggu HR menyelesaikan draft revisi Payment Request.';
 else if(stage==='finance_sent')next=isHR?(!processDay(c.financeDispatch?.sentDate)?'Lengkapi tanggal email pengiriman ke Finance.':'Setelah konfirmasi transfer, unggah bukti dan tandai Dibayar.'):'Menunggu pembayaran dari Finance.';
 else if(stage==='paid')next='Proses pembayaran sudah selesai dicatat.';
 else if(stage==='rejected')next='Lihat catatan penolakan pada detail pengajuan.';
 else if(stage==='cancelled')next=isHR&&c.financeDispatch?'Pastikan pembatalan telah diinformasikan kepada Finance.':'Lihat alasan pembatalan pada detail pengajuan.';
 else if(stage==='historical')next='Riwayat impor tersimpan; tidak ada tindakan pengajuan.';
 const ageText=timing.waiting?(days===null?'Lama menunggu belum tersedia':days+' hari kalender'):stage==='historical'?'Riwayat impor — tidak dalam antrean':['paid','rejected','cancelled'].includes(stage)?'Tidak dalam antrean':'Lama menunggu tidak tersedia';
 return {...timing,days,ageText,next};}
