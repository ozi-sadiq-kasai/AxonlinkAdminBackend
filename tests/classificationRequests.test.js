import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import {config} from '../src/config.js';
import {requireRole} from '../src/middleware/security.js';
import {listAppClassificationRequests,reviewAppClassificationRequest} from '../src/controllers/appDataController.js';
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;}});
test('classification review routes require active Admin auth and SUPER_ADMIN',()=>{
 const source=fs.readFileSync('src/routes/appDataRoutes.js','utf8');assert.match(source,/router.use\(requireAdmin\)/);assert.match(source,/classification-requests", requireRole\("SUPER_ADMIN"\)/);assert.match(source,/classification-requests\/:id\/review", requireRole\("SUPER_ADMIN"\)/);
 for(const role of ['ADMIN','SUPPORT','AUDITOR']){const res=response();requireRole('SUPER_ADMIN')({admin:{role}},res,()=>assert.fail());assert.equal(res.statusCode,403);}
});
test('proxy signs reviewer identity, allowlists decisions and resolves app document links',async t=>{
 const original=globalThis.fetch;const old=config.appApiUrl;config.appApiUrl='http://development.invalid';t.after(()=>{globalThis.fetch=original;config.appApiUrl=old;});
 globalThis.fetch=async(url,options)=>{assert.match(url,/internal\/admin\/v1\/classification-requests/);const token=jwt.verify(options.headers.Authorization.slice(7),config.appServiceSecret);assert.equal(token.adminRole,'SUPER_ADMIN');assert.equal(token.adminId,'admin');if(options.method==='POST'){assert.deepEqual(JSON.parse(options.body),{decision:'REJECTED',rejectionReason:'Insufficient evidence'});return {ok:true,json:async()=>({request:{status:'REJECTED'}})};}return {ok:true,json:async()=>({requests:[{documentUrl:'/api/assets?sig=unit',id:'one'}]})};};
 const req={admin:{id:'admin',role:'SUPER_ADMIN'},query:{},params:{id:'one'},body:{decision:'REJECTED',rejectionReason:'Insufficient evidence',reviewerId:'forged',clinicalClassification:'SPECIALIST'}};
 const res=response();await listAppClassificationRequests(req,res,e=>{throw e;});assert.equal(res.body.requests[0].documentUrl,'http://development.invalid/api/assets?sig=unit');await reviewAppClassificationRequest(req,response(),e=>{throw e;});
});
test('upstream conflict is propagated without claiming success',async t=>{const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});globalThis.fetch=async()=>({ok:false,status:409,json:async()=>({message:'Already reviewed'})});let failure;await reviewAppClassificationRequest({admin:{id:'admin',role:'SUPER_ADMIN'},params:{id:'one'},body:{decision:'APPROVED'}},response(),e=>{failure=e;});assert.equal(failure.statusCode,409);});
