import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/prisma.js';
import {config} from '../src/config.js';
import {reviewAppSpecialistDocument,getAppSpecialist} from '../src/controllers/appDataController.js';
const response=()=>({json(body){this.body=body;return this;}});
test('certificate proxy forwards only version/action/reason and signs actual reviewer',async t=>{
 const original=globalThis.fetch,old=prisma.adminAuditLog.create;prisma.adminAuditLog.create=async()=>({});t.after(()=>{globalThis.fetch=original;prisma.adminAuditLog.create=old;});
 globalThis.fetch=async(url,options)=>{assert.match(url,/documents\/SPECIALIZATION%3Aone\/review$/);assert.deepEqual(JSON.parse(options.body),{action:'APPROVED',expectedVersion:2});const claims=jwt.verify(options.headers.Authorization.slice(7),config.appServiceSecret);assert.equal(claims.adminId,'admin');return {ok:true,json:async()=>({status:'APPROVED'})};};
 const res=response();await reviewAppSpecialistDocument({admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'p',documentType:'SPECIALIZATION:one'},body:{action:'APPROVED',expectedVersion:2,reviewerId:'forged'},get:()=>''},res,e=>{throw e;});assert.equal(res.body.status,'APPROVED');
});
test('authenticated detail preserves per-certificate status and resolves signed local views',async t=>{
 const original=globalThis.fetch,old=prisma.adminAuditLog.create;prisma.adminAuditLog.create=async()=>({});t.after(()=>{globalThis.fetch=original;prisma.adminAuditLog.create=old;});
 globalThis.fetch=async()=>({ok:true,json:async()=>({documents:{'SPECIALIZATION:one':{id:'one',status:'REJECTED',url:'/api/assets?sig=fixture'}},verificationHistory:[{documentUrl:'/api/assets?sig=old'}]})});
 const res=response();await getAppSpecialist({admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'p'},get:()=>''},res,e=>{throw e;});assert.equal(res.body.documents['SPECIALIZATION:one'].status,'REJECTED');assert.equal(res.body.documents['SPECIALIZATION:one'].url,new URL('/api/assets?sig=fixture',config.appApiUrl).href);
});

test('employment document proxy resolves secure asset URL without adding review state',async t=>{
 const oldFetch=globalThis.fetch,oldAudit=prisma.adminAuditLog.create;
 prisma.adminAuditLog.create=async()=>({});
 globalThis.fetch=async()=>({ok:true,json:async()=>({employmentDocuments:[{affiliationId:'hospital-1',hospital:'Axon Hospital',name:'letter.pdf',submitted:true,url:'/api/assets?sig=employment'}]})});
 t.after(()=>{globalThis.fetch=oldFetch;prisma.adminAuditLog.create=oldAudit;});
 const res=response();await getAppSpecialist({admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'p'},get:()=>''},res,e=>{throw e;});
 assert.deepEqual(res.body.employmentDocuments,[{affiliationId:'hospital-1',hospital:'Axon Hospital',name:'letter.pdf',submitted:true,url:new URL('/api/assets?sig=employment',config.appApiUrl).href}]);
});

test('affiliation employment proxy preserves hospital and submitted status with secure viewing',async t=>{
 const oldAudit=prisma.adminAuditLog.create;prisma.adminAuditLog.create=async()=>({});t.after(()=>{prisma.adminAuditLog.create=oldAudit;});
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({employmentDocuments:[{affiliationId:'a',hospital:'Hospital',name:'id.pdf',submitted:true,url:'/api/assets?sig=affiliation'}]})}));
 const res=response();await getAppSpecialist({admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'p'},get:()=>''},res,e=>{throw e;});
 assert.deepEqual(res.body.employmentDocuments,[{affiliationId:'a',hospital:'Hospital',name:'id.pdf',submitted:true,url:new URL('/api/assets?sig=affiliation',config.appApiUrl).href}]);
});
