import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config.js';
import { prisma } from '../src/prisma.js';
import routes from '../src/routes/appDataRoutes.js';
import { corsMiddleware } from '../src/middleware/security.js';

// Controlled fixtures only: no real accounts, sessions, or database connections.
test('localhost dashboard HTTP: authentication, CORS, signed proxy, and upstream failure', async () => {
 const originalFind = prisma.adminUser.findUnique;
 const originalUrl = config.appApiUrl;
 const originalFetch = globalThis.fetch;
 const servers = [];
 const listen = app => new Promise(resolve => {
  const server = app.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  servers.push(server);
 });
 let role = 'SUPER_ADMIN'; let suspended = false; let upstreamFailure = false; let calls = 0;
 try {
  globalThis.fetch = (url, options) => {
   assert.equal(new URL(url).hostname, '127.0.0.1', 'Only loopback network permitted');
   return originalFetch(url, options);
  };
  prisma.adminUser.findUnique = async () => ({id:'fixture-admin', role, status:suspended ? 'SUSPENDED' : 'ACTIVE'});
  const upstream = express();
  upstream.get('/internal/admin/v1/dashboard', (req,res) => {
   const claims = jwt.verify(req.headers.authorization.slice(7), config.appServiceSecret, {issuer:'axonlink-admin-backend',audience:'axonlink-app-backend'});
   assert.equal(claims.type,'admin-service'); assert.equal(claims.adminRole,'SUPER_ADMIN'); calls++;
   if (upstreamFailure) return res.status(503).json({message:'Upstream unavailable'});
   res.json({overview:[{label:'Total Patients',value:0}]});
  });
  config.appApiUrl = await listen(upstream);
  const admin = express(); admin.use(corsMiddleware); admin.use('/api/app', routes);
  admin.use((error,req,res,next) => res.status(error.statusCode || 500).json({message:error.message}));
  const base = await listen(admin); const url = `${base}/api/app/dashboard`;
  assert.equal((await fetch(url)).status,401); assert.equal(calls,0);
  const token = jwt.sign({type:'admin-access'},config.accessSecret,{subject:'fixture-admin',issuer:'axonlink-admin-api',audience:'axonlink-admin-frontend',expiresIn:'1m'});
  const headers = {Authorization:`Bearer ${token}`,Origin:'http://localhost:5173'};
  let response = await fetch(url,{headers}); assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),'http://localhost:5173');
  assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal((await response.json()).overview[0].value,0);
  role='PATIENT'; assert.equal((await fetch(url,{headers})).status,403); assert.equal(calls,1);
  role='SUPER_ADMIN'; suspended=true; assert.equal((await fetch(url,{headers})).status,401); assert.equal(calls,1);
  suspended=false; upstreamFailure=true; response=await fetch(url,{headers}); assert.equal(response.status,503); assert.equal((await response.json()).message,'Upstream unavailable');
 } finally {
  globalThis.fetch=originalFetch; config.appApiUrl=originalUrl; prisma.adminUser.findUnique=originalFind;
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
 }
});
