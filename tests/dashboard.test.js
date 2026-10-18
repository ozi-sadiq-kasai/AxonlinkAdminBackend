import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { config } from "../src/config.js";
import { prisma } from "../src/prisma.js";
import { requireAdmin, requireRole } from "../src/middleware/security.js";
import { getAppDashboard } from "../src/controllers/appDataController.js";
const res = () => ({ statusCode:200, status(code){this.statusCode=code;return this;}, json(body){this.body=body;}, setHeader(){} });
test("dashboard auth requires an active admin session and allowed role", async () => {
 const original=prisma.adminUser.findUnique;
 try {
  let response=res(); await requireAdmin({headers:{}},response,()=>assert.fail()); assert.equal(response.statusCode,401);
  prisma.adminUser.findUnique=async()=>({id:"admin",role:"AUDITOR",status:"ACTIVE"});
  const token=jwt.sign({type:"admin-access"},config.accessSecret,{subject:"admin",issuer:"axonlink-admin-api",audience:"axonlink-admin-frontend"});
  const req={headers:{authorization:`Bearer ${token}`}};let allowed=false;
  await requireAdmin(req,res(),()=>{allowed=true;});assert.equal(allowed,true);
  requireRole("SUPER_ADMIN","ADMIN","SUPPORT","AUDITOR")(req,res(),()=>{});
  response=res();requireRole("SUPER_ADMIN","ADMIN","SUPPORT","AUDITOR")({admin:{role:"UNKNOWN"}},response,()=>assert.fail());assert.equal(response.statusCode,403);
  prisma.adminUser.findUnique=async()=>({status:"SUSPENDED"});response=res();await requireAdmin(req,response,()=>assert.fail());assert.equal(response.statusCode,401);
 } finally { prisma.adminUser.findUnique=original; }
});
test("dashboard proxy uses signed integration and does not disguise upstream errors", async () => {
 const original=globalThis.fetch;const old=config.appApiUrl;config.appApiUrl="http://development.invalid";
 try {
  globalThis.fetch=async(url,options)=>{assert.equal(url,"http://development.invalid/internal/admin/v1/dashboard");const token=jwt.verify(options.headers.Authorization.slice(7),config.appServiceSecret);assert.equal(token.adminRole,"SUPER_ADMIN");return {ok:true,json:async()=>({overview:[{value:0}]})};};
  const response=res();await getAppDashboard({admin:{id:"admin",role:"SUPER_ADMIN"}},response,error=>{throw error;});assert.equal(response.body.overview[0].value,0);
  globalThis.fetch=async()=>({ok:false,status:503,json:async()=>({message:"Unavailable"})});let failure;
  await getAppDashboard({admin:{id:"admin",role:"SUPER_ADMIN"}},res(),error=>{failure=error;});assert.equal(failure.statusCode,503);
 } finally {globalThis.fetch=original;config.appApiUrl=old;}
});
