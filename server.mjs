import http from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {seed} from './seed.mjs';
import {rating,cleanCard,decide,complete,fields} from './domain.mjs';
import {analyze,compose} from './ai.mjs';
import {publicProvider} from './provider.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const dir=process.env.DATA_DIR||path.join(root,'data');mkdirSync(dir,{recursive:true});const dbFile=path.join(dir,'db.json');let db=existsSync(dbFile)?JSON.parse(readFileSync(dbFile,'utf8')):seed();
function save(){writeFileSync(dbFile+'.tmp',JSON.stringify(db,null,2));renameSync(dbFile+'.tmp',dbFile);}save();
function output(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function requireText(v,label,max=4000){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Проверьте поле «'+label+'»');return v.trim();}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/api/state')return output(res,200,{...db,tasks:db.tasks.map(t=>({...t,...rating(t.card,t.confirmed)})),fields,ai:publicProvider()});
if(req.method==='POST'&&url.pathname.startsWith('/api/')){if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return output(res,403,{error:'Недопустимый источник запроса'});if(!req.headers['content-type']?.startsWith('application/json'))return output(res,415,{error:'Ожидается JSON'});let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>80000)throw Error('Слишком большой запрос');}const b=JSON.parse(raw||'{}');
if(url.pathname==='/api/ai/analyze'){return output(res,200,await analyze(requireText(b.text,'Описание',10000)));}
if(url.pathname==='/api/ai/compose'){if(!Array.isArray(b.answers)||b.answers.length>7||b.answers.some(a=>typeof a?.question!=='string'||typeof a?.answer!=='string'||a.answer.length>4000))throw Error('Некорректные ответы');return output(res,200,await compose(requireText(b.text,'Описание',10000),cleanCard(b.card),b.answers));}
if(url.pathname==='/api/tasks'){if(b.confirmed!==true)throw Error('Подтвердите карточку перед сохранением');const card=cleanCard(b.card);requireText(card.title,'Название');const theme=requireText(b.theme,'Тема',100);let task=b.id?db.tasks.find(t=>t.id===b.id):null;if(b.id&&!task)throw Error('Задача не найдена');if(!task){task={id:randomUUID(),createdAt:new Date().toISOString()};db.tasks.push(task);}Object.assign(task,{card,theme,confirmed:true,published:true});save();return output(res,200,{id:task.id,...rating(card)});}
if(url.pathname==='/api/proposals'){if(!db.tasks.some(t=>t.id===b.taskId&&t.published)||!db.teams.some(t=>t.id===b.teamId))throw Error('Задача или команда не найдена');const link=requireText(b.link,'Ссылка',2000);if(!['http:','https:'].includes(new URL(link).protocol))throw Error('Ссылка должна начинаться с https:// или http://');const p={id:randomUUID(),taskId:b.taskId,teamId:b.teamId,idea:requireText(b.idea,'Идея'),plan:requireText(b.plan,'План'),deadline:requireText(b.deadline,'Срок',200),link,status:'pending',completed:false};db.proposals.push(p);save();return output(res,200,p);}
if(url.pathname==='/api/decision'){const p=db.proposals.find(p=>p.id===b.id);if(!p)throw Error('Отклик не найден');decide(p,b.status);save();return output(res,200,p);}
if(url.pathname==='/api/complete'){const p=db.proposals.find(p=>p.id===b.id);if(!p)throw Error('Отклик не найден');complete(p,db.teams.find(t=>t.id===p.teamId));save();return output(res,200,p);}
return output(res,404,{error:'Маршрут не найден'});}
const staticFiles={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/domain.mjs':'../domain.mjs'};const file=staticFiles[url.pathname];if(req.method!=='GET'||!file)return output(res,404,{error:'Не найдено'});res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'"});res.end(readFileSync(path.join(root,'public',file)));}catch(e){output(res,400,{error:e.name==='TimeoutError'?'AI-сервис не ответил за 60 секунд. Попробуйте снова.':e.message});}});
server.listen(Number(process.env.PORT||3210),'127.0.0.1',()=>console.log('Alem: http://localhost:'+(process.env.PORT||3210)));
export {server};
