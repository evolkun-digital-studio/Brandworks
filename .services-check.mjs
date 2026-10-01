import fs from 'node:fs';
const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, {once:true}));
let id=0; const pending=new Map();
ws.addEventListener('message', e=>{const m=JSON.parse(e.data); if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id); pending.delete(m.id); m.error?reject(m.error):resolve(m.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=async expression => (await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
if(process.argv[2]==='reference'){
 await send('Page.navigate',{url:'file:///C:/Users/Navneet/Downloads/Recording%202026-09-30%20191433.mp4'});
 await pause(1500);
 console.log(await evaluate('JSON.stringify({duration:document.querySelector("video")?.duration,width:document.querySelector("video")?.videoWidth})'));
 for(const t of [2,6,10]){
 await evaluate(`new Promise(r=>{const v=document.querySelector('video');v.pause();v.onseeked=()=>r(true);v.currentTime=${t}})`);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`.services-reference-${t}.png`,Buffer.from(shot.data,'base64'));
 }
}else{
 await send('Page.navigate',{url:'http://127.0.0.1:5173/'});await pause(12000);
 console.log(await evaluate('JSON.stringify({section:!!document.querySelector(".services-showcase"),errors:document.querySelector("vite-error-overlay")?.textContent})'));
 await evaluate('document.querySelector(".services-showcase").scrollIntoView()');await pause(1500);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.services-desktop.png',Buffer.from(shot.data,'base64'));
 console.log(await evaluate('JSON.stringify([...document.querySelectorAll(".services-showcase .service-card")].map(c=>({label:c.textContent.trim(),transform:c.style.transform,rect:c.getBoundingClientRect().toJSON()})))'));
}
ws.close();
