import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/prisma.js');
const { config } = await import('../src/config.js');

test('mounted /api/app Allied routes forward through the existing internal prefix', async t => {
  const oldFetch=globalThis.fetch, oldFind=prisma.adminUser.findUnique, oldAudit=prisma.adminAuditLog.create;
  prisma.adminUser.findUnique=async()=>({id:'reviewer',role:'SUPER_ADMIN',status:'ACTIVE'});
  prisma.adminAuditLog.create=async()=>({});
  const paths=[];
  globalThis.fetch=async(url,options)=>{
    const path=new URL(url).pathname;paths.push(path);
    assert.ok(path.startsWith('/internal/admin/v1/allied-medical-officers'));
    const claims=jwt.verify(options.headers.Authorization.slice(7),config.appServiceSecret);
    assert.equal(claims.adminId,'reviewer');
    return {ok:true,json:async()=>path.endsWith('/review')?{status:'REJECTED'}:path.endsWith('/officer')?{clinician:{id:'officer'},credential:null}:{clinicians:[{id:'officer',status:'PENDING_VERIFICATION'}]}};
  };
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{globalThis.fetch=oldFetch;prisma.adminUser.findUnique=oldFind;prisma.adminAuditLog.create=oldAudit;await new Promise(resolve=>server.close(resolve));});
  const token=jwt.sign({type:'admin-access'},config.accessSecret,{subject:'reviewer',issuer:'axonlink-admin-api',audience:'axonlink-admin-frontend',expiresIn:'1m'});
  async function request(path,body){return new Promise((resolve,reject)=>{const request=http.request({host:'127.0.0.1',port:server.address().port,path,method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}},res=>{let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(raw)}));});request.on('error',reject);request.end(body?JSON.stringify(body):undefined);});}
  const list=await request('/api/app/allied-medical-officers');assert.equal(list.status,200);assert.equal(list.data.clinicians.length,1);
  assert.equal((await request('/api/app/allied-medical-officers/officer')).status,200);
  assert.equal((await request('/api/app/allied-medical-officers/officer/review',{action:'REJECTED',note:'Unreadable',expectedVersion:1})).status,200);
  assert.deepEqual(paths,['/internal/admin/v1/allied-medical-officers','/internal/admin/v1/allied-medical-officers/officer','/internal/admin/v1/allied-medical-officers/officer/review']);
});
