import {verify,service} from './webhook.mjs';
export function validateFunctionEvent(e,now=Date.now()){
 if(!e||typeof e.id!=='string'||!e.id||e.id.length>300||!Number.isFinite(Date.parse(e.timestamp))||Math.abs(now-Date.parse(e.timestamp))>300000||typeof e.phone!=='string'||!/^\+[1-9]\d{7,14}$/.test(e.phone)||!['register','confirm','cancel','profile','tasks','grades','stars','hearts','attendance'].includes(e.action)||typeof e.argument!=='string'||e.argument.length>30)throw Error('Invalid event');
 return e;
}
export async function handleFunction(request,dbFactory=service){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 if(request.method!=='POST')return new Response(null,{status:405,headers});
 const chunks=[];let size=0;const reader=request.body?.getReader();if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return new Response(null,{status:413,headers})}chunks.push(Buffer.from(value))}
 const raw=Buffer.concat(chunks);
 if(!verify(raw,request.headers.get('x-reev-signature'),process.env.REEV_GATEWAY_FUNCTION_SECRET))return new Response(null,{status:401,headers});
 let e;try{e=validateFunctionEvent(JSON.parse(raw))}catch{return new Response(null,{status:400,headers})}
 try{const {data,error}=await dbFactory().rpc('reev_gateway_function',{p_event:e.id,p_phone:e.phone,p_action:e.action,p_argument:e.argument});if(error)throw Error('db');return Response.json(data,{headers})}catch{return Response.json({ok:false,text:'REEV Belajar sedang tidak tersedia.'},{status:503,headers})}
}
export async function nodeFunctionHandler(req,res){
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192){res.statusCode=413;return res.end()}chunks.push(chunk)}
 const response=await handleFunction(new Request('https://reev.local/api/gateway-functions',{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}
