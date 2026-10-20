import {verify,parseEvent,processEvent} from '../server/webhook.mjs';
// Web-standard handler keeps original bytes available for HMAC verification.
export default {async fetch(request){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 if(request.method!=='POST')return new Response(null,{status:405,headers});
 const reader=request.body?.getReader();let size=0;const chunks=[];
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return new Response(null,{status:413,headers})}chunks.push(Buffer.from(value))}
 const raw=Buffer.concat(chunks);
 if(!verify(raw,request.headers.get('x-reev-signature'),process.env.WEBHOOK_SECRET))return new Response(null,{status:401,headers});
 let event;try{event=JSON.parse(raw);parseEvent(event)}catch{return new Response(null,{status:400,headers})}
 try{return Response.json(await processEvent(event),{headers})}catch{return Response.json({error:'Layanan sementara tidak tersedia'},{status:503,headers})}
}};
