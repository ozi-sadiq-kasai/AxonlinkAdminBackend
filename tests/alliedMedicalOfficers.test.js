import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {prisma} from '../src/prisma.js';
import {config} from '../src/config.js';
import {listAppAlliedMedicalOfficers,getAppAlliedMedicalOfficer,reviewAppAlliedMedicalOfficer} from '../src/controllers/appDataController.js';
import routes from '../src/routes/appDataRoutes.js';
const response=()=>({json(body){this.body=body;return this;}});
function fixture(t,payload,check){const oldFetch=globalThis.fetch,oldAudit=prisma.adminAuditLog.create;prisma.adminAuditLog.create=async()=>({});globalThis.fetch=async(url,options)=>{check?.(url,options);return{ok:true,json:async()=>payload};};t.after(()=>{globalThis.fetch=oldFetch;prisma.adminAuditLog.create=oldAudit;});}
const req={admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'allied'},get:()=>''};
test('list uses existing Allied endpoint and actual reviewer identity',async t=>{fixture(t,{clinicians:[]},(url,options)=>{assert.match(url,/\/allied-medical-officers$/);assert.equal(jwt.verify(options.headers.Authorization.slice(7),config.appServiceSecret).adminId,'admin');});const res=response();await listAppAlliedMedicalOfficers(req,res,e=>{throw e;});assert.deepEqual(res.body,{clinicians:[]});});
test('detail preserves credential lifecycle and resolves both protected document URLs',async t=>{fixture(t,{clinician:{id:'allied'},credential:{version:2,status:'PENDING_VERIFICATION',certificateUrl:'/api/assets?certificate',licenceUrl:'/api/assets?licence'},verificationHistory:[{documentUrl:'/api/assets?old'}]});const res=response();await getAppAlliedMedicalOfficer(req,res,e=>{throw e;});assert.equal(res.body.credential.version,2);assert.equal(res.body.credential.certificateUrl,new URL('/api/assets?certificate',config.appApiUrl).href);assert.equal(res.body.credential.licenceUrl,new URL('/api/assets?licence',config.appApiUrl).href);});
for(const action of ['APPROVED','REJECTED'])test(`review ${action} whitelists action, reason and version`,async t=>{fixture(t,{status:action},(url,options)=>{assert.match(url,/\/allied-medical-officers\/allied\/review$/);assert.deepEqual(JSON.parse(options.body),{action,note:'Reason',expectedVersion:2});});const res=response();await reviewAppAlliedMedicalOfficer({...req,body:{action,note:'Reason',expectedVersion:2,reviewerId:'forged',clinicalClassification:'SPECIALIST'}},res,e=>{throw e;});assert.equal(res.body.status,action);});
test('Allied proxy routes require existing Super Admin role',()=>{for(const layer of routes.stack.filter(layer=>layer.route?.path.startsWith('/allied-medical-officers'))){let allowed=false,status;layer.route.stack[0].handle({admin:{role:'SUPPORT'}},{status(value){status=value;return this;},json(){}},()=>{allowed=true;});assert.equal(allowed,false);assert.equal(status,403);}});

test('employment document proxy resolves secure asset URL without adding review state',async t=>{
 const oldFetch=globalThis.fetch,oldAudit=prisma.adminAuditLog.create;
 prisma.adminAuditLog.create=async()=>({});
 globalThis.fetch=async()=>({ok:true,json:async()=>({employmentDocuments:[{affiliationId:'hospital-1',hospital:'Axon Hospital',name:'letter.pdf',submitted:true,url:'/api/assets?sig=employment'}]})});
 t.after(()=>{globalThis.fetch=oldFetch;prisma.adminAuditLog.create=oldAudit;});
 const res=response();await getAppAlliedMedicalOfficer({admin:{id:'admin',role:'SUPER_ADMIN'},params:{clinicianId:'p'},get:()=>''},res,e=>{throw e;});
 assert.deepEqual(res.body.employmentDocuments,[{affiliationId:'hospital-1',hospital:'Axon Hospital',name:'letter.pdf',submitted:true,url:new URL('/api/assets?sig=employment',config.appApiUrl).href}]);
});
