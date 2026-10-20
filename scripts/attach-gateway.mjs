import fs from'node:fs';import path from'node:path';
const root=path.resolve(process.argv[2]||'');if(!process.argv[2])throw Error('Penggunaan: node scripts/attach-gateway.mjs PATH_GATEWAY');
const file=path.join(root,'server.ts'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));if(pkg.name!=='reev-wa-gateway'||pkg.version!=='2.7.3')throw Error('Hanya Gateway v2.7.3 yang diaudit. Versi lain perlu audit ulang.');
let s=fs.readFileSync(file,'utf8');if(s.includes('REEV_BELAJAR_ADAPTER')){console.log('Adapter sudah terpasang; tidak mengubah source.');process.exit(0)}
const incoming='  const match=findMatchingRule(messageText);',dispatch="async function dispatch(event: string, data: unknown, force = false, target?: string) {";
if(s.split(incoming).length!==2||!s.includes(dispatch))throw Error('Struktur source berbeda. Tidak mengubah file.');
const prelude=`import { pathToFileURL as reevPathToFileURL } from 'node:url';
const reevAdapter = async () => import(reevPathToFileURL(process.env.REEV_BELAJAR_ADAPTER!).href);
`;
s=prelude+s;s=s.replace(incoming,`  if (process.env.REEV_BELAJAR_ADAPTER) {
    try {
      const adapter = await reevAdapter();
      await adapter.onIncoming({senderNumber,senderName,messageText,remoteJid,messageId,timestamp,allowAutoReply},
        (phone: string, text: string) => sendReal(phone,text,'auto_reply','device_primary',remoteJid));
    } catch { console.error('REEV BELAJAR: handler gagal; periksa konfigurasi dan database.'); }
    return null;
  }
`+incoming);
s=s.replace(dispatch,dispatch+`
  if (process.env.REEV_BELAJAR_ADAPTER && event !== 'message.received') {
    try { const adapter = await reevAdapter(); await adapter.onEvent({id:crypto.randomUUID(),event,timestamp:new Date().toISOString(),deviceId:'device_primary',data}); }
    catch { console.error('REEV BELAJAR: pembaruan status gagal.'); }
  }
`);
const backup=file+'.before-reev-belajar';if(fs.existsSync(backup))throw Error('Backup sudah ada. Tinjau dahulu; tidak ditimpa.');fs.copyFileSync(file,backup);fs.writeFileSync(file,s);console.log('Adapter dipasang; backup server.ts.before-reev-belajar. Tambahkan REEV_BELAJAR_ADAPTER (path absolut), SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ke .env Gateway. Matikan webhook bot jika memakai adapter langsung.');
