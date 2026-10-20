// Imported directly into the existing gateway process; does not open another Baileys socket.
import crypto from 'node:crypto';import {processEvent}from'./webhook.mjs';
export async function onIncoming(input,sendText){if(!input.allowAutoReply)return {ignored:true};return processEvent({id:crypto.randomUUID(),event:'message.received',timestamp:new Date().toISOString(),deviceId:process.env.GATEWAY_DEVICE_ID||'device_primary',data:{...input,sourceMessageId:input.messageId}},{send:async(phone,text)=>{const r=await sendText(phone,text);return {...r,success:true,status:r.status||'sent'}}})}
export {processEvent as onEvent} from './webhook.mjs';
