import { audit } from "../services/authService.js";
import { appBackendRequest } from "../services/appBackendService.js";

export async function listAppPatients(req, res, next) {
  try {
    const query = new URLSearchParams({ page: String(req.query.page || 1), limit: String(req.query.limit || 20) });
    if (req.query.search) query.set("search", String(req.query.search));
    const payload = await appBackendRequest(req.admin, `/patients?${query}`);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function getAppPatient(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/patients/${encodeURIComponent(req.params.patientId)}`);
    await audit(req, "APP_PATIENT_PROFILE_VIEWED", { patientId: req.params.patientId });
    res.json(payload);
  } catch (error) { next(error); }
}

export async function listAppSpecialists(req, res, next) {
  try {
    const query = new URLSearchParams({ page: String(req.query.page || 1), limit: String(req.query.limit || 20) });
    if (req.query.search) query.set("search", String(req.query.search));
    res.json(await appBackendRequest(req.admin, `/specialists?${query}`));
  } catch (error) { next(error); }
}

export async function getAppSpecialist(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/specialists/${encodeURIComponent(req.params.clinicianId)}`);
    await audit(req, "APP_SPECIALIST_PROFILE_VIEWED", { clinicianId: req.params.clinicianId });
    res.json(payload);
  } catch (error) { next(error); }
}

export async function reviewAppSpecialistDocument(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/specialists/${encodeURIComponent(req.params.clinicianId)}/documents/${encodeURIComponent(req.params.documentType)}/review`, { method: "POST", body: req.body });
    await audit(req, "APP_SPECIALIST_DOCUMENT_REVIEWED", { clinicianId: req.params.clinicianId, documentType: req.params.documentType, action: req.body.action }, req.params.clinicianId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function listAppFacilities(req, res, next) {
  try { const query = new URLSearchParams({ page: String(req.query.page || 1), limit: String(req.query.limit || 20) }); if (req.query.search) query.set("search", String(req.query.search)); res.json(await appBackendRequest(req.admin, `/facilities?${query}`)); } catch (error) { next(error); }
}

export async function getAppFacility(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/facilities/${encodeURIComponent(req.params.facilityId)}`); await audit(req, "APP_FACILITY_PROFILE_VIEWED", { facilityId: req.params.facilityId }); res.json(payload); } catch (error) { next(error); }
}

export async function reviewAppFacilityDocument(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/facilities/${encodeURIComponent(req.params.facilityId)}/documents/${encodeURIComponent(req.params.affiliationId)}/review`, { method: "POST", body: req.body }); await audit(req, "APP_FACILITY_DOCUMENT_REVIEWED", { facilityId: req.params.facilityId, affiliationId: req.params.affiliationId, action: req.body.action }); res.json(payload); } catch (error) { next(error); }
}

export async function reviewAppFacility(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/facilities/${encodeURIComponent(req.params.facilityId)}/review`, { method: "POST", body: req.body }); await audit(req, "APP_FACILITY_REVIEWED", { facilityId: req.params.facilityId, action: req.body.action }); res.json(payload); } catch (error) { next(error); }
}

export async function getAppActivities(req, res, next) {
  try { const query = new URLSearchParams({ page: String(req.query.page || 1), limit: String(req.query.limit || 20), tab: String(req.query.tab || "APPOINTMENT") }); res.json(await appBackendRequest(req.admin, `/activities?${query}`)); } catch (error) { next(error); }
}
export async function getAppReports(req,res,next){try{res.json(await appBackendRequest(req.admin,"/reports"));}catch(error){next(error)}}

export async function getAppActivityAppointment(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/activities/appointments/${encodeURIComponent(req.params.appointmentId)}`); await audit(req, "APP_APPOINTMENT_VIEWED", { appointmentId: req.params.appointmentId }); res.json(payload); } catch (error) { next(error); }
}

export async function endAppActivityConsultation(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/activities/appointments/${encodeURIComponent(req.params.appointmentId)}/end`, { method: "POST", body: req.body }); await audit(req, "APP_CONSULTATION_ENDED", { appointmentId: req.params.appointmentId }, req.params.appointmentId); res.json(payload); } catch (error) { next(error); }
}

export async function getAppReferrals(req, res, next) {
  try { const query = new URLSearchParams({ page: String(req.query.page || 1), limit: String(req.query.limit || 20) }); res.json(await appBackendRequest(req.admin, `/referrals?${query}`)); } catch (error) { next(error); }
}

export async function getAppReferral(req, res, next) {
  try { const payload = await appBackendRequest(req.admin, `/referrals/${encodeURIComponent(req.params.referralId)}`); await audit(req, "APP_REFERRAL_VIEWED", { referralId: req.params.referralId }); res.json(payload); } catch (error) { next(error); }
}

export async function grantAppPatientRecordAccess(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/patients/${encodeURIComponent(req.params.patientId)}/access-grants/${encodeURIComponent(req.params.grantId)}/grant`, { method: "POST", body: req.body });
    await audit(req, "APP_RECORD_ACCESS_GRANTED", { patientId: req.params.patientId, grantId: req.params.grantId, reason: req.body.reason }, req.params.patientId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function denyAppPatientRecordAccess(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/patients/${encodeURIComponent(req.params.patientId)}/access-grants/${encodeURIComponent(req.params.grantId)}/deny`, { method: "POST", body: req.body });
    await audit(req, "APP_RECORD_ACCESS_DENIED", { patientId: req.params.patientId, grantId: req.params.grantId }, req.params.patientId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function revokeAppPatientRecordAccess(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/patients/${encodeURIComponent(req.params.patientId)}/access-grants/${encodeURIComponent(req.params.grantId)}/revoke`, { method: "POST", body: req.body });
    await audit(req, "APP_RECORD_ACCESS_REVOKED", { patientId: req.params.patientId, grantId: req.params.grantId, reason: req.body.reason }, req.params.patientId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function suspendAppUser(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/users/${encodeURIComponent(req.params.userId)}/suspensions`, { method: "POST", body: req.body });
    await audit(req, "APP_USER_SUSPENDED", { userId: req.params.userId, reason: req.body.reason }, req.params.userId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function liftAppUserSuspension(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/users/${encodeURIComponent(req.params.userId)}/suspension`, { method: "DELETE" });
    await audit(req, "APP_USER_SUSPENSION_LIFTED", { userId: req.params.userId }, req.params.userId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function resetAppUserAccess(req, res, next) {
  try {
    const payload = await appBackendRequest(req.admin, `/users/${encodeURIComponent(req.params.userId)}/reset-access`, { method: "POST" });
    await audit(req, "APP_USER_ACCESS_RESET", { userId: req.params.userId }, req.params.userId);
    res.json(payload);
  } catch (error) { next(error); }
}

export async function getAppDashboard(req, res, next) {
  try {
    const data = await appBackendRequest(req.admin, "/dashboard", { timeoutMs: 20000 });
    if (!data || !Array.isArray(data.overview)) throw Object.assign(new Error("Dashboard data is unavailable."), { statusCode: 502 });
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (error) { next(error); }
}
