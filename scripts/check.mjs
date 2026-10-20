import {execFileSync}from'node:child_process';import fs from'node:fs';import path from'node:path';
for(const dir of ['server','api','scripts','tests'])for(const f of fs.readdirSync(dir))if(f.endsWith('.mjs'))execFileSync(process.execPath,['--check',path.join(dir,f)],{stdio:'inherit'});
for(const f of fs.readdirSync('src')){const s=fs.readFileSync(path.join('src',f),'utf8');if(/SUPABASE_SERVICE_ROLE_KEY|GATEWAY_API_KEY|WEBHOOK_SECRET/.test(s))throw Error('Server secret reference in client: '+f)}console.log('PASS: Node syntax and frontend secret separation. JSX checked by build.');
