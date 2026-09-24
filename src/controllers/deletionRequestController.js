import { appBackendRequest } from "../services/appBackendService.js";

export async function listDeletionRequests(req, res, next) {
  try {
    const query = new URLSearchParams({ page: String(req.query.page || 1) });
    if (req.query.status) query.set("status", String(req.query.status));
    res.setHeader("Cache-Control", "no-store");
    res.json(await appBackendRequest(req.admin, `/deletion-requests?${query}`));
  } catch (error) { next(error); }
}
export async function getDeletionRequest(req, res, next) {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await appBackendRequest(req.admin, `/deletion-requests/${encodeURIComponent(req.params.id)}`)); }
  catch (error) { next(error); }
}
export async function updateDeletionRequest(req, res, next) {
  try { res.setHeader("Cache-Control", "no-store"); res.json(await appBackendRequest(req.admin, `/deletion-requests/${encodeURIComponent(req.params.id)}`, { method: "PATCH", body: req.body })); }
  catch (error) { next(error); }
}
