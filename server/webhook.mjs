import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {phone as normalizePhone} from '../src/domain.mjs';
export function verify(raw,signature,secret){if(!secret||secret.length<32||typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;const expected='sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex');return crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))}
export function parseEvent(event,now=Date.now()){
 if(!event||typeof event.id!=='string'||event.id.length>100||typeof event.event!=='string'||!Number.isFinite(Date.parse(event.timestamp))||Math.abs(now-Date.parse(event.timestamp))>300000)throw Error('Event timestamp invalid');
 if(event.deviceId!==(process.env.GATEWAY_DEVICE_ID||'device_primary'))throw Error('Device invalid');
 if(event.event!=='message.received')return {kind:event.event,data:event.data};
 const d=event.data;if(!d||typeof d.sourceMessageId!=='string'||!d.sourceMessageId||d.sourceMessageId.length>150||typeof d.messageText!=='string'||d.messageText.length>1000)throw Error('Payload invalid');
 // Reject groups/broadcasts. Gateway resolves LID to senderNumber; unresolved phone is rejected.
 if(typeof d.remoteJid!=='string'||!/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/.test(d.remoteJid))return {ignored:true};
 const phone=normalizePhone(d.senderNumber);if(!phone)return {ignored:true};const jidPhone=d.remoteJid.endsWith('@lid')?phone:normalizePhone(d.remoteJid.split('@')[0].split(':')[0]);if(phone!==jidPhone)throw Error('Sender mismatch');
 if(!/^\.|^KONFIRMASI\s/i.test(d.messageText.trim()))return {ignored:true};
 return {key:`${event.deviceId}:${d.remoteJid}:${d.sourceMessageId}`,phone,message:d.messageText.trim()};
}
export function service(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Server not configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function data(q){const r=await q;if(r.error)throw Error('Database operation failed');return r.data}
export async function processEvent(event,{send}={}){
 const parsed=parseEvent(event);if(parsed.ignored)return {ignored:true};const db=service();
 if(parsed.kind){const d=parsed.data;
 if(parsed.kind==='device.status'&&['connected','disconnected','connecting'].includes(d?.status))await data(db.from('gateway_state').upsert({id:true,status:d.status,last_event:event.timestamp}));
 if(['message.sent','message.delivered','message.failed'].includes(parsed.kind)&&typeof d?.id==='string'){
 const status=String(d.status).toLowerCase();if(['sent','delivered','read','failed'].includes(status)){
 // Receipts may race the HTTP response; persist only monotone progress.
 await data(db.rpc('reev_receipt',{message_id:d.id,new_status:status}));}}
 return {ok:true};}
 await data(db.rpc('reev_bot',{event_key:parsed.key,phone:parsed.phone,message:parsed.message}));
 const rows=await data(db.rpc('reev_claim_reply',{key:parsed.key}));if(!rows?.length)return {ok:true,duplicate:true};const row=rows[0];
 let status='unknown',gatewayId=null;
 try {const r=send?await send(row.phone,row.body):await gatewaySend(row.phone,row.body);gatewayId=r.messageId||r.id||null;status=r.success===false?'failed':['delivered','read','failed'].includes(r.status)?r.status:'sent'}catch{/* Timeout ambiguous: no automatic retry. */}
 await data(db.rpc('reev_finish_reply',{key:row.event_key,final_status:status,message_id:gatewayId}));
 return {ok:true,reply_status:status};
}
export async function gatewaySend(recipient,message){const url=new URL(process.env.GATEWAY_URL);if(url.username||url.password||url.search||url.hash||(url.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error('Gateway URL invalid');if(!process.env.GATEWAY_API_KEY)throw Error('Gateway key missing');const response=await fetch(new URL('/api/messages/send',url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.GATEWAY_API_KEY}`},body:JSON.stringify({recipient,message,deviceId:process.env.GATEWAY_DEVICE_ID||'device_primary'})});if(!response.ok)throw Error('Gateway response failed');return response.json()}
export async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.statusCode=405;res.end();return}try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.statusCode=413;res.end();return}chunks.push(chunk)}const raw=Buffer.concat(chunks);if(!verify(raw,req.headers['x-reev-signature'],process.env.WEBHOOK_SECRET)){res.statusCode=401;res.end();return}let event;try{event=JSON.parse(raw);parseEvent(event)}catch{res.statusCode=400;res.end();return}const result=await processEvent(event);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result))}catch{res.statusCode=503;res.end(JSON.stringify({error:'Layanan sementara tidak tersedia'}))}}
