(function(root){
const normalize=s=>s.toLowerCase().replace(/ё/g,'е').normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const prepared=new WeakMap();
function oneTypo(a,b){
 if(a===b)return true;
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){
  const diffs=[];
  for(let i=0;i<a.length;i++)if(a[i]!==b[i]){diffs.push(i);if(diffs.length>2)return false;}
  if(diffs.length===1)return true;
  return diffs.length===2&&diffs[1]===diffs[0]+1&&a[diffs[0]]===b[diffs[1]]&&a[diffs[1]]===b[diffs[0]];
 }
 if(a.length>b.length)[a,b]=[b,a];
 let i=0,j=0,skipped=false;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;}
  else{if(skipped)return false;skipped=true;j++;}
 }
 return true;
}
function prepare(t){
 if(!prepared.has(t)){
  const title=normalize(t.title),body=normalize(t.text);
  prepared.set(t,{title,body,titleWords:[...new Set(title.split(' '))],bodyWords:[...new Set(body.split(' '))]});
 }
 return prepared.get(t);
}
function match(word,text,tokens){
 if(text.includes(word))return 2;
 // Short words and numbers need exact matches to keep results useful.
 if(word.length<3||!/^\p{L}+$/u.test(word))return 0;
 return tokens.some(token=>token.length>=3&&oneTypo(word,token))?1:0;
}
function rank(tickets,query){
 const q=normalize(query),words=[...new Set(q.split(/\s+/).filter(Boolean))];
 return tickets.map(t=>{
  const p=prepare(t);
  if(!q)return {ticket:t,score:0,source:'title'};
  if(/^\d+$/.test(q)&&t.number===Number(q))return {ticket:t,score:10000000,source:'number'};
  const titleMatches=words.map(w=>match(w,p.title,p.titleWords));
  const hits=titleMatches.filter(Boolean).length;
  let score=0,source='body';
  if(hits){
   source='title';
   score=1000000+hits/words.length*10000+titleMatches.filter(m=>m===2).length/words.length*1000;
   if(p.title===q)score+=1000;
   else if(p.title.startsWith(q))score+=500;
   else if(p.title.includes(q))score+=300;
  }else{
   const bodyMatches=words.map(w=>match(w,p.body,p.bodyWords));
   const bodyHits=bodyMatches.filter(Boolean).length;
   if(bodyHits)score=bodyHits/words.length*10000+bodyMatches.filter(m=>m===2).length/words.length*1000+(p.body.includes(q)?300:0);
  }
  return {ticket:t,score,source};
 }).filter(x=>!q||x.score>0).sort((a,b)=>b.score-a.score||a.ticket.id-b.ticket.id);
}
root.ExamSearch={normalize,rank};
})(globalThis);
