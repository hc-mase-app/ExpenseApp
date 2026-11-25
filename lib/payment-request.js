import {hasExpenseCompany,expenseCompanyCode} from '../public/expense-company.js';
import {autoAccount} from '../public/payment-account-utils.js';
import {formatDate,formatDateTime} from '../public/date-format.js';
import {financeDispatchLabel,financeDispatchTime,financeMarkedTime} from './claim-status.js';
import {PdfReport} from './pdf-layout.js';
export const paymentRequestFields=[
 ['company','Company',true],
 ['projectName','Project Name/ Overhead',true],
 ['projectCode','Project Code',true],
 ['classification','R/NR/EXP',true],
 ['payroll','Payroll/ Non payroll',true],
 ['requestNo','Payment Request No.',true],
 ['accountName','Account Name',true],
 ['accountNo','Account No.',true],
 ['bankName','Bank Name',true],
 ['transferAmount','Transfer Amount',true],
 ['invoiceNo','Invoice No.',false],
 ['remarks','Remarks',true]
].map(([key,label,required])=>({key,label,required}));
export function paymentRequestDefaults(c,e){return{
 company:e.code,projectName:c.category==='expense'?'':'Overhead',projectCode:c.category==='expense'?'':'Overhead',classification:'EXP',payroll:'Non Payroll',requestNo:'',accountName:e.accountName||e.name,accountNo:e.account,bankName:e.bank,transferAmount:c.approved,invoiceNo:'',remarks:c.category==='expense'?'Expense':'Medical',...(c.paymentRequest||{}),...autoAccount(c,e),...(hasExpenseCompany(c)?{company:expenseCompanyCode(c,e)}:{}),requestNo:c.paymentRequestNo||(c.paymentRequest?.requestNo&&c.paymentRequest.requestNo!=='0'?c.paymentRequest.requestNo:''),transferAmount:c.approved
}}
// Compact A4 report; shared history exports keep their existing dimensions.
class FinancePdfReport extends PdfReport{
 table(rows,options={}){return super.table(rows,{size:10,lineHeight:12,rowPadding:8,minRowHeight:22,headerPadding:10,...options});}
 paragraph(value,options={}){return super.paragraph(value,{size:9,lineHeight:12,gap:3,...options});}
 section(title){this.ensure(44);this.gap(8);this.rect(42,this.y-24,511,24,'green');this.text(51,this.y-16,title,{bold:true,color:'white',size:10});this.y-=24;}
}
export function paymentRequestPdf(c,e,b){
 const r=paymentRequestDefaults(c,e),pdf=new FinancePdfReport('Payment Request to Finance','Referensi pengajuan: '+c.id+'\nKaryawan: '+e.name+' | Tanggal biaya: '+formatDate(c.date));
 const revision=c.paymentRequestRevision?.needsResend?c.paymentRequestRevision:c.paymentAccountRevision;
 if(revision?.needsResend){pdf.section('PAYMENT REQUEST DIREVISI - KIRIM ULANG KE FINANCE');pdf.paragraph('Revisi: '+formatDateTime(revision.updatedAt)+' | Petugas: '+revision.actorName);}
 if(c.managerApproval){pdf.section('Persetujuan atasan untuk klaim HR');pdf.paragraph('Disetujui: '+c.managerApproval.approver+' | Dicatat: '+formatDateTime(c.managerApproval.recordedAt)+' | Petugas: '+c.managerApproval.recordedBy);}
 if(c.status==='cancelled'){pdf.section('DIBATALKAN - JANGAN DIPROSES UNTUK PEMBAYARAN');pdf.paragraph('Alasan: '+(c.cancellation?.reason||'-'));pdf.paragraph('Dibatalkan: '+formatDateTime(c.cancellation?.createdAt)+' | Petugas: '+(c.cancellation?.actorName||'-'));}
 pdf.table(paymentRequestFields.map(f=>[f.label,f.key==='transferAmount'?Number(r[f.key]).toLocaleString('id-ID'):r[f.key]??'']),{boldFirst:true,header:['Payment Request to Finance','']});
 pdf.section('Rincian klaim');
 pdf.table([['Tanggal pengeluaran',formatDate(c.date),'Tanggal pengajuan',formatDate(c.submitted)||'Tidak tercatat pada sumber']],{columns:[110,145,110,146],size:9});
 pdf.table([['Penyedia / vendor',c.provider||'-'],...(hasExpenseCompany(c)?[['PT yang menanggung biaya',c.expenseCompany.name]]:[]),...(c.purpose?[['Keperluan',c.purpose]]:[])],{boldFirst:true,size:9});
 pdf.gap(8);
 pdf.table([...(c.items||[]).map(i=>[i.desc,i.amount===null?'Belum diketahui':'Rp'+Number(i.amount).toLocaleString('id-ID')]),['Total diajukan',c.amount===null?'Belum diketahui':'Rp'+Number(c.amount).toLocaleString('id-ID')],['Total disetujui','Rp'+Number(c.approved).toLocaleString('id-ID')]],{header:['Rincian','Nominal'],columns:[361,150],size:9});
 if(c.note)pdf.paragraph('Catatan HR: '+c.note);
 if(c.docs?.length){pdf.gap(5);pdf.paragraph('Lampiran pendukung: '+c.docs.map((d,i)=>(i+1)+'. '+d.name).join('; '));}
 if(c.status==='approved'||c.financeDispatch){pdf.gap(5);pdf.paragraph('Pengiriman ke Finance: '+financeDispatchLabel(c)+(c.financeDispatch?' | Tanggal email: '+(financeDispatchTime(c)||'Belum dicatat')+' | Ditandai: '+financeMarkedTime(c)+' | Petugas: '+c.financeDispatch.actorName+' ('+c.financeDispatch.actor+')':''));}
 if(b){pdf.section('Monitoring Medical Benefits - '+b.period);pdf.table([[b.limit,b.unknownCurrentAmounts?null:b.paid,b.held,b.available].map(v=>v===null?'Belum diketahui':'Rp'+Number(v).toLocaleString('id-ID'))],{header:['Plafon','Terpakai (riwayat & dibayar)','Menunggu pembayaran','Sisa saldo tersedia'],columns:[127.75,127.75,127.75,127.75],size:9});}
 pdf.gap(8);pdf.paragraph('Lampiran kuitansi/resep dan bukti pendukung dikirim bersama laporan ini.');return pdf.finish();
}
