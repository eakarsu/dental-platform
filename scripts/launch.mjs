import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const app=JSON.parse(readFileSync(path.join(root,'config/app.json'))),port=Number(process.env.PORT||process.env.HUB_PORT||app.port);
if(!existsSync(path.join(root,'dist/hub/server.mjs'))){const {build}=await import('../../_platform-builder/scripts/build.mjs');await build(root);}
const {clearPorts}=await import('../dist/scripts/clear-ports.mjs');await clearPorts([port]);
if(process.env.SEED_DEMO_DATA!=='0'){const seeded=spawnSync(process.execPath,[path.join(root,'dist/scripts/seed.mjs')],{cwd:root,stdio:'inherit',env:process.env});if(seeded.status!==0)process.exit(seeded.status||1);}
const child=spawn(process.execPath,[path.join(root,'dist/hub/server.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,PORT:String(port)}});
const folder=path.join(root,'.runtime'),pidfile=path.join(folder,'process.json');mkdirSync(folder,{recursive:true});writeFileSync(pidfile,JSON.stringify({pid:child.pid,port,app:app.id}));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
child.on('exit',code=>{try{if(JSON.parse(readFileSync(pidfile)).pid===child.pid)unlinkSync(pidfile);}catch{}process.exitCode=code||0;});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
