// Presentation only. Stored ISO dates remain the input to calculations and validation.
const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export function formatDate(value){
 const s=String(value??''),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
 if(!m||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)return s;
 return `${m[3]} ${months[Number(m[2])-1]} ${m[1]}`;
}
export function formatDateTime(value){
 const s=String(value??'');if(/^\d{4}-\d{2}-\d{2}$/.test(s))return formatDate(s);
 if(!/^\d{4}-\d{2}-\d{2}T/.test(s)||Number.isNaN(Date.parse(s)))return s;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(s)).map(p=>[p.type,p.value]));
 return `${parts.day} ${months[Number(parts.month)-1]} ${parts.year}, ${parts.hour}:${parts.minute} WIB`;
}
