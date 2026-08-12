import fs from "node:fs"; import sharp from "sharp";
const S="public/samples/pedestrian";
const OUT="/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/ped-pick.jpg";
const n=JSON.parse(fs.readFileSync(`${S}-meta.json`,"utf8")).length;
const CW=210,CH=158,COLS=5,LBL=18; const rows=Math.ceil(n/COLS);
const W=CW*COLS,H=(CH+LBL)*rows; const svg=[`<rect width="${W}" height="${H}" fill="#111"/>`]; const tiles=[];
for(let i=1;i<=n;i++){const x=((i-1)%COLS)*CW,y=Math.floor((i-1)/COLS)*(CH+LBL);
svg.push(`<text x="${x+5}" y="${y+13}" font-family="sans-serif" font-size="13" font-weight="700" fill="#fef08a">ped/${i}</text>`);
tiles.push({input:await sharp(`${S}/${i}-masked.jpg`).resize(CW,CH,{fit:"cover"}).toBuffer(),top:y+LBL,left:x});}
await sharp({create:{width:W,height:H,channels:3,background:"#111"}}).composite([{input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`),top:0,left:0},...tiles]).jpeg({quality:88}).toFile(OUT);
console.log("wrote",OUT,n);
