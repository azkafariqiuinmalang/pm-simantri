/* eslint-disable @typescript-eslint/no-require-imports -- Offline security and API regression checks. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
function load(relative, overrides={}) {
  const filename=path.resolve(relative), instance=new Module(filename,module)
  instance.filename=filename;instance.paths=Module._nodeModulePaths(path.dirname(filename))
  const original=instance.require.bind(instance)
  instance.require=name=>Object.hasOwn(overrides,name)?overrides[name]:original(name)
  instance._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename)
  return instance.exports
}
const shared=load('src/lib/harvest/shared.ts')
const valid={title:'Panen Tajuk Nganjuk',description:'Panen uji',location:'Rejoso, Nganjuk',variety:'Tajuk',quantity_kg:1500,price_per_kg:18500,harvest_date:'2026-11-02',contact:'081234567890'}
const owner='a53fb423-cd88-4b6a-90eb-9026b08dbfb0',other='3540b480-53f7-4fb5-9fb2-346677c46bbc',id='dd4bbcf5-df05-4017-bf63-f9fce33bccb4'
test('listing validation normalizes Indonesian contact and strips authorization claims',()=>{
 const r=shared.validateHarvestInput({...valid,seller_id:other,status:'published',moderation_note:'approved',image_paths:['https://attacker.invalid']})
 assert.equal(r.data.contact,'6281234567890');assert.equal(r.data.seller_id,undefined);assert.equal(r.data.status,undefined);assert.equal(r.data.image_paths,undefined)
})
test('invalid dates, numbers, empty fields, URLs and non-Indonesian contacts fail closed',()=>{
 for(const patch of [{title:'a'},{location:''},{price_per_kg:0},{quantity_kg:-2},{price_per_kg:Infinity},{quantity_kg:'1500'},{price_per_kg:1.234},{harvest_date:'2026-02-30'},{contact:'javascript:alert(1)'},{contact:'441234567890'},{description:'x'.repeat(3001)}]) assert.ok(shared.validateHarvestInput({...valid,...patch}).error,JSON.stringify(patch))
 assert.ok(shared.validateHarvestInput(null).error)
})
test('only Admin can approve pending listings or return a review reason',()=>{
 for(const status of shared.HARVEST_STATUSES){assert.equal(shared.nextHarvestStatus(status,'publish',true,false),null);assert.equal(shared.nextHarvestStatus(status,'hide',true,false),null)}
 assert.equal(shared.nextHarvestStatus('pending','publish',false,true),'published');assert.equal(shared.nextHarvestStatus('published','publish',false,true),null)
 assert.equal(shared.nextHarvestStatus('published','hide',false,true),'hidden')
})
test('edits require renewed moderation and sold cannot be set on drafts or pending entries',()=>{
 assert.equal(shared.nextHarvestStatus('published','save',true,false),'draft')
 assert.equal(shared.nextHarvestStatus('published','submit',true,false),'pending')
 assert.equal(shared.nextHarvestStatus('published','sold',true,false),'sold')
 assert.equal(shared.nextHarvestStatus('pending','sold',true,false),null)
 assert.equal(shared.nextHarvestStatus('draft','sold',true,false),null)
 assert.equal(shared.nextHarvestStatus('draft','save',false,true),null)
 assert.equal(shared.nextHarvestStatus('pending','withdraw',true,false),'draft')
})
test('photo validation rejects SVG, fake formats, traversal and cross-owner paths',()=>{
 assert.equal(shared.photoMime(Buffer.from('<svg onload="alert(1)"/>')),null)
 assert.equal(shared.photoMime(Buffer.from([255,216,255,0])).mime,'image/jpeg')
 assert.equal(shared.photoMime(Buffer.from([137,80,78,71,13,10,26,10])).mime,'image/png')
 const row={seller_id:owner,id}
 assert.equal(shared.photoPathIsOwned(`${owner}/${id}/${other}.jpg`,row),true)
 assert.equal(shared.photoPathIsOwned(`${other}/${id}/${other}.jpg`,row),false)
 assert.equal(shared.photoPathIsOwned(`${owner}/${id}/../../secret.jpg`,row),false)
})
const server=load('src/lib/harvest/server.ts',{'@/lib/supabase/server':{createClient:async()=>{throw new Error('No network in offline test')}}})
test('foreign or malformed mutation origins are rejected before authentication',()=>{
 const request=origin=>new Request('http://internal/api/harvest',{headers:{host:'localhost:3000',origin}})
 assert.doesNotThrow(()=>server.requireSameOrigin(request('http://localhost:3000')))
 for(const origin of ['https://attacker.invalid','null','https://user:pass@localhost:3000','file://localhost:3000']) assert.throws(()=>server.requireSameOrigin(request(origin)),/Asal/)
})
test('body reader bounds payloads and rejects arrays and malformed JSON',async()=>{
 for(const body of ['[1,2]','null','invalid','x'.repeat(16001)]) await assert.rejects(server.readJson(new Request('http://local',{method:'POST',body})))
 assert.deepEqual(await server.readJson(new Request('http://local',{method:'POST',body:'{"action":"save"}'})),{action:'save'})
})
function detailRoute({role='petani',seller=owner,status='draft',photo=false,stale=false,conflict=false}={}) {
 const writes=[]
 const row={...valid,id,seller_id:seller,status,image_paths:photo?[`${seller}/${id}/${other}.jpg`]:[],moderation_note:null,updated_at:'2026-11-02T01:00:00.000Z'}
 const chain={eq:()=>chain,select:()=>chain,maybeSingle:async()=>({data:conflict?null:{...row},error:null})}
 const supabase={from:()=>({update:patch=>{writes.push(patch);return chain},delete:()=>{writes.push('delete');return chain}}),storage:{from:()=>({remove:async()=>({error:null})})}}
 const helpers={...server,harvestSession:async req=>{if(req)server.requireSameOrigin(req);return {supabase,user:{id:owner},profile:{role}}},readListing:async()=>({...row,updated_at:stale?'new':row.updated_at})}
 return {route:load('src/app/api/harvest/[id]/route.ts',{'@/lib/harvest/shared':shared,'@/lib/harvest/server':helpers}),writes,row}
}
const patch=(body)=>new Request('http://localhost/api/harvest/'+id,{method:'PATCH',body:JSON.stringify(body)})
const context={params:Promise.resolve({id})}
test('direct publish by owner and editing another seller are forbidden without writes',async()=>{
 for(const options of [{},{seller:other}]){const {route,writes,row}=detailRoute(options);const response=await route.PATCH(patch({action:options.seller?'save':'publish',updated_at:row.updated_at,data:valid}),context);assert.equal(response.status,403);assert.equal(writes.length,0)}
})
test('submissions require a photo and concurrent updates return 409',async()=>{
 let f=detailRoute();assert.equal((await f.route.PATCH(patch({action:'submit',updated_at:f.row.updated_at}),context)).status,400);assert.equal(f.writes.length,0)
 f=detailRoute({photo:true,stale:true});assert.equal((await f.route.PATCH(patch({action:'submit',updated_at:f.row.updated_at}),context)).status,409);assert.equal(f.writes.length,0)
 f=detailRoute({photo:true,conflict:true});assert.equal((await f.route.PATCH(patch({action:'submit',updated_at:f.row.updated_at}),context)).status,409)
})
test('valid owner submission and Admin approval persist only allowed data',async()=>{
 let f=detailRoute({photo:true});let r=await f.route.PATCH(patch({action:'submit',updated_at:f.row.updated_at}),context);assert.equal(r.status,200);assert.equal(f.writes[0].status,'pending')
 f=detailRoute({role:'admin',seller:other,status:'pending',photo:true});r=await f.route.PATCH(patch({action:'publish',updated_at:f.row.updated_at}),context);assert.equal(r.status,200);assert.equal(f.writes[0].status,'published')
})
test('Admin must supply a meaningful correction note; active listings cannot be deleted',async()=>{
 let f=detailRoute({role:'admin',seller:other,status:'pending',photo:true});assert.equal((await f.route.PATCH(patch({action:'hide',updated_at:f.row.updated_at,moderation_note:'x'}),context)).status,400)
 f=detailRoute({status:'published',photo:true});assert.equal((await f.route.DELETE(patch({updated_at:f.row.updated_at}),context)).status,403);assert.equal(f.writes.length,0)
})
