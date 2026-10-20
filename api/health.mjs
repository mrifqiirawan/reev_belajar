export default function handler(_req,res){res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({service:'reev-belajar',version:'1.0.0',status:'ok'}))}
