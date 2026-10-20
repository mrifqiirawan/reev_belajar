import fs from'node:fs';import{spawn,spawnSync}from'node:child_process';
const major=Number(process.versions.node.split('.')[0]);if(major<22||major>=25||(major===22&&Number(process.versions.node.split('.')[1])<12))throw Error('Gunakan Node >=22.12 dan <25');
if(!fs.existsSync('.env')){fs.copyFileSync('.env.example','.env');console.error('.env dibuat. Isi konfigurasi lalu jalankan kembali.');process.exit(1)}process.loadEnvFile('.env');
if(!process.env.VITE_SUPABASE_URL||!process.env.VITE_SUPABASE_ANON_KEY)throw Error('Isi konfigurasi Supabase pada .env');
function npm(...args){const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1)}
if(!fs.existsSync('node_modules'))npm('ci');npm('run','build');
const port=Number(process.env.PORT||3001);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT harus 1024–65535');
const server=spawn(process.execPath,['server/local.mjs'],{stdio:'inherit',env:process.env});let attempts=0;const poll=setInterval(async()=>{try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok){clearInterval(poll);if(process.platform==='win32')spawn('cmd.exe',['/c','start','',`http://localhost:${port}`]);else console.log(`Buka http://localhost:${port}`)}}catch{}if(++attempts>=20)clearInterval(poll)},500);server.on('exit',code=>{clearInterval(poll);process.exitCode=code||0});process.on('SIGINT',()=>{clearInterval(poll);server.kill('SIGINT')});
