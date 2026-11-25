import {formatDate,formatDateTime} from '../public/date-format.js';
import {claimWorkflowStatus,matchesWorkflowFilter} from '../public/hr-list-utils.js';
export const claimStatusLabels={historical:'Riwayat impor',submitted:'Menunggu pemeriksaan HR',finance_unsent:'Disetujui - belum dikirim ke Finance',finance_sent:'Sudah dikirim ke Finance - menunggu pembayaran',finance_resend:'Payment Request direvisi - perlu dikirim ulang ke Finance',paid:'Dibayar',returned:'Perlu dilengkapi',rejected:'Ditolak',cancelled:'Dibatalkan (duplikat)'};
export const claimStatus=claimWorkflowStatus;
export const claimStatusLabel=c=>claimStatusLabels[claimStatus(c)]||c.status;
export const matchesClaimStatus=matchesWorkflowFilter;
export const financeDispatchLabel=c=>c.financeDispatch?.resendRequired?'Perlu dikirim ulang ke Finance':c.financeDispatch?.sentAt?'Sudah dikirim ke Finance':c.status==='approved'?'Belum dikirim ke Finance':'Tidak tercatat';
export const financeMarkedTime=c=>formatDateTime(c.financeDispatch?.markedAt||c.financeDispatch?.sentAt); 

export const financeDispatchTime=c=>formatDate(c.financeDispatch?.sentDate);
