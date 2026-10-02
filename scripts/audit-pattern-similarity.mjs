import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const raw=JSON.parse(fs.readFileSync("public/pattern-library.json","utf8"));
const records=Array.isArray(raw)?raw:(raw.patterns||raw.families||raw.items||[]);

async function differenceHash(file){
  const {data}=await sharp(file).resize(9,8,{fit:"fill"}).grayscale().raw().toBuffer({resolveWithObject:true});
  let bits="";
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=data[y*9+x]>data[y*9+x+1]?"1":"0";
  return BigInt(`0b${bits}`);
}
function distance(a,b){let x=a^b,n=0;while(x){n+=Number(x&1n);x>>=1n}return n}

const rows=[];
for(const record of records){
  const rel=String(record.image||"").replace(/^\//,"");
  const file=path.join("public",rel);
  if(fs.existsSync(file))rows.push({id:record.id,name:record.name,theme:record.primaryTheme,file:rel,hash:await differenceHash(file)});
}
const pairs=[];
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const d=distance(rows[i].hash,rows[j].hash);
  if(d<=3)pairs.push({distance:d,a:rows[i].id,b:rows[j].id,aName:rows[i].name,bName:rows[j].name});
}
const report={generatedAt:new Date().toISOString(),records:records.length,imagesChecked:rows.length,nearDuplicateThreshold:"dHash <= 3",nearDuplicatePairs:pairs.length,note:"The report keeps the first 200 pairs; rerun the script for a fresh full scan.",pairs:pairs.slice(0,200)};
fs.writeFileSync("public/pattern-similarity-audit.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,pairs:report.pairs.slice(0,20)},null,2));

