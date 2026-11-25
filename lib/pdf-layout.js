import {branding,reportLogo} from './product-branding.js';
import {TEST_MODE} from './runtime-mode.js';
import widths from '../config/pdf-font-widths.json' with {type:'json'};

const colors={green:[0,.4784,.2392],ink:[.11,.18,.14],muted:[.33,.40,.36],line:[.78,.85,.81],soft:[.94,.97,.95],white:[1,1,1]};
const extended=new Map([..."€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"].map((c,i)=>[c,[128,130,131,132,133,134,135,136,137,138,139,140,142,145,146,147,148,149,150,151,152,153,154,155,156,158,159][i]]));
const bytes=value=>[...String(value??'')].map(c=>extended.get(c)??(c.codePointAt(0)<=255?c.codePointAt(0):63));
const encoded=value=>Buffer.from(bytes(value)).toString('hex');
const measure=(value,size,bold)=>bytes(value).reduce((n,b)=>n+widths[bold?'bold':'regular'][b],0)*size/1000;

// A4 table layout shared by both downloadable reports. No external processes or data writes.
export class PdfReport{
 constructor(title,subtitle=''){this.brand=branding();this.logo=reportLogo();this.title=title;this.subtitle=subtitle;this.pages=[];this.stream='';this.newPage();}
 text(x,y,value,{size=10,bold=false,color='ink'}={}){this.stream+=`${colors[color].join(' ')} rg BT /${bold?'F2':'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td <${encoded(value)}> Tj ET\n`;}
 rect(x,y,w,h,fill,stroke=false){this.stream+=`${colors[fill].join(' ')} rg ${colors.line.join(' ')} RG .5 w ${x} ${y} ${w} ${h} re ${stroke?'B':'f'}\n`;}
 wrap(value,width,size=10,bold=false){const out=[];for(const paragraph of String(value??'').replace(/\r/g,'').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;let rest=word;if(line&&measure(line+' '+rest,size,bold)>width){out.push(line);line='';}while(measure(rest,size,bold)>width){let n=1;while(n<rest.length&&measure(rest.slice(0,n+1),size,bold)<=width)n++;out.push(rest.slice(0,n));rest=rest.slice(n);}if(rest)line+=(line?' ':'')+rest;}out.push(line);}return out.length?out:[''];}
 newPage(){if(this.stream)this.pages.push(this.stream);this.stream='';this.rect(42,781,511,29,'green');const label=(TEST_MODE?'DATA UJI | ':'')+this.brand.companyName+' | '+this.brand.productName;let start=54;if(this.logo){const h=Math.min(21,65*this.logo.height/this.logo.width),w=h*this.logo.width/this.logo.height;this.rect(47,784,72,23,'white');this.stream+='q '+w+' 0 0 '+h+' 50 '+(785+(21-h)/2)+' cm /CustomerLogo Do Q\n';start=125;}this.text(start,791,label,{bold:true,color:'white',size:Math.min(11,10*(553-start)/Math.max(1,measure(label,10,true)))});this.text(42,754,this.title,{bold:true,size:17});const lines=this.wrap(this.subtitle,511,9);lines.forEach((line,i)=>this.text(42,734-i*13,line,{size:9,color:'muted'}));this.y=718-(lines.length-1)*13;}
 ensure(height){if(this.y-height<57)this.newPage();}
 gap(n=14){this.y-=n;}
 section(title){this.ensure(66);this.gap(12);this.rect(42,this.y-26,511,26,'green');this.text(51,this.y-17,title,{bold:true,color:'white',size:11});this.y-=26;}
 paragraph(value,{size=9,color='muted',lineHeight=14,gap=6}={}){for(const line of this.wrap(value,511,size)){this.ensure(lineHeight+1);this.text(42,this.y-lineHeight+2,line,{size,color});this.y-=lineHeight;}this.gap(gap);}
 table(rows,{columns=[185,326],header=null,boldFirst=false,size=10,lineHeight=14,rowPadding=14,minRowHeight=28,headerPadding=16}={}){
  const headerHeight=header?Math.max(...header.map((v,i)=>this.wrap(v,columns[i]-16,9,true).length))*12+headerPadding:0;
  const drawHeader=()=>{if(!header)return;this.ensure(headerHeight+26);let x=42;header.forEach((v,i)=>{this.rect(x,this.y-headerHeight,columns[i],headerHeight,'green',true);this.wrap(v,columns[i]-16,9,true).forEach((line,j)=>this.text(x+8,this.y-14-j*12,line,{size:9,bold:true,color:'white'}));x+=columns[i];});this.y-=headerHeight;};
  drawHeader();
  rows.forEach((row,index)=>{const lines=row.map((v,i)=>this.wrap(v,columns[i]-16,size,boldFirst&&i===0));let remaining=Math.max(...lines.map(l=>l.length)),offset=0;
   while(remaining>0){let capacity=Math.floor((this.y-57-rowPadding)/lineHeight);if(capacity<1){this.newPage();drawHeader();capacity=Math.floor((this.y-57-14)/14);}const take=Math.min(remaining,capacity),height=Math.max(minRowHeight,take*lineHeight+rowPadding);
    if(this.y-height<57){this.newPage();drawHeader();continue;}
    let x=42;row.forEach((v,i)=>{this.rect(x,this.y-height,columns[i],height,index%2===0?'soft':'white',true);const part=lines[i].slice(offset,offset+take),baseline=this.y-(height-part.length*lineHeight)/2-size;part.forEach((line,j)=>this.text(x+8,baseline-j*lineHeight,line,{size,bold:boldFirst&&i===0}));x+=columns[i];});this.y-=height;offset+=take;remaining-=take;
   }
  });
 }
 finish(){const streams=[...this.pages,this.stream];streams.forEach((s,i)=>{const footer=`${colors.line.join(' ')} RG .5 w 42 43 m 553 43 l S\n`;this.stream=footer;this.text(42,28,this.brand.companyName+' | '+this.brand.productName,{size:8,color:'muted'});this.text(470,28,`Halaman ${i+1} / ${streams.length}`,{size:8,color:'muted'});streams[i]=s+this.stream;});
  const imageId=5+streams.length*2;const objects=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Count ${streams.length} /Kids [${streams.map((_,i)=>`${5+i*2} 0 R`).join(' ')}] >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  streams.forEach((s,i)=>objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${this.logo?`/XObject << /CustomerLogo ${imageId} 0 R >>`:``} >> /Contents ${6+i*2} 0 R >>`,`<< /Length ${Buffer.byteLength(s)} >>\nstream\n${s}\nendstream`));if(this.logo){const l=this.logo,hex=l.bytes.toString('hex')+'>';objects.push(`<< /Type /XObject /Subtype /Image /Width ${l.width} /Height ${l.height} /ColorSpace /${l.colors} /BitsPerComponent 8 /Filter [/ASCIIHexDecode /${l.filter}] /Length ${hex.length} >>\nstream\n${hex}\nendstream`);}let out='%PDF-1.4\n',offset=[];objects.forEach((s,i)=>{offset.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${s}\nendobj\n`;});const start=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offset.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(out);
 }
}
