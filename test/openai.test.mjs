import test from 'node:test';
import assert from 'node:assert/strict';
import {providerConfig,publicProvider} from '../provider.mjs';
import {callAgent} from '../ai.mjs';
test('OpenAI: отдельный ключ и модель, строгая схема, ошибки и отсутствие секрета в публичных данных',async()=>{
const old=process.env.AI_PROVIDER;process.env.AI_PROVIDER='openai';
try{const config=providerConfig({AI_PROVIDER:'openai',OPENAI_API_KEY:'test-secret',AI_MODEL_ANALYST:'qwen/old'});assert.equal(config.models.analyst,'gpt-4.1-mini');assert.equal(config.key,'test-secret');assert.equal(publicProvider().key,undefined);
for(const role of ['analyst','interviewer','editor']){await callAgent(role,{},async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');const b=JSON.parse(opts.body);assert.equal(b.response_format.type,'json_schema');assert.equal(b.response_format.json_schema.strict,true);assert.equal(b.response_format.json_schema.schema.additionalProperties,false);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]})};});}
for(const [choice,pattern] of [[{message:{refusal:'refused'}},/отказалась/],[{finish_reason:'length',message:{content:'{' }},/обрезан/],[{message:{}},/пустой/]])await assert.rejects(callAgent('analyst',{},async()=>({ok:true,json:async()=>({choices:[choice]})})),pattern);
await assert.rejects(callAgent('analyst',{},async()=>({ok:false,status:429,json:async()=>({error:{code:'insufficient_quota'}})})),/Billing/);
await assert.rejects(callAgent('analyst',{},async()=>({ok:false,status:401,json:async()=>({})})),/Неверный/);
}finally{if(old===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=old;}
});
