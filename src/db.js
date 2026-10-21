import {createClient} from '@supabase/supabase-js';
export const configured=!!import.meta.env.VITE_SUPABASE_URL&&!!import.meta.env.VITE_SUPABASE_ANON_KEY;
export const db=configured?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY):null;
export async function result(q){const {data,error}=await q;if(error)throw Error(error.message);return data}
export const mutate=(op,p,id=crypto.randomUUID())=>result(db.rpc(['task_update','task_delete'].includes(op)?'reev_manage_task':'reev_mutate',{op,p,request_id:id}));
