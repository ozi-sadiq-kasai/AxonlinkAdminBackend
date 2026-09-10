import { prisma } from "../prisma.js";
import { audit } from "../services/authService.js";

const defaults = {
  id: "global", maxQueueSize: 40, maxWaitMinutes: 252,
  whoCanRefer: "CLINICIANS_AND_SPECIALISTS", whoCanAcceptReferral: "SPECIALIST",
  referralAutoCancelDays: 3, reReferralEnabled: true, multiReferralLimit: 3,
  maxBookingsPerPatientDay: 1, advanceBookingLimitDays: 40,
  cancellationRole: "PATIENT_AND_CLINICIAN", emailNotificationsEnabled: false,
  pushNotificationsEnabled: false, smsNotificationsEnabled: false,
};

const integerRules = {
  maxQueueSize: [1, 10000], maxWaitMinutes: [1, 10080], referralAutoCancelDays: [1, 90],
  multiReferralLimit: [1, 25], maxBookingsPerPatientDay: [1, 25], advanceBookingLimitDays: [1, 365],
};
const booleanFields = ["reReferralEnabled", "emailNotificationsEnabled", "pushNotificationsEnabled", "smsNotificationsEnabled"];
const choices = {
  whoCanRefer: ["CLINICIANS", "SPECIALISTS", "CLINICIANS_AND_SPECIALISTS"],
  whoCanAcceptReferral: ["CLINICIAN", "SPECIALIST", "CLINICIANS_AND_SPECIALISTS"],
  cancellationRole: ["PATIENT", "CLINICIAN", "PATIENT_AND_CLINICIAN", "ADMIN_ONLY"],
};

export async function getSystemControl(_req, res, next) {
  try {
    const settings = await prisma.systemControlSettings.upsert({ where: { id: "global" }, create: defaults, update: {} });
    res.json({ settings });
  } catch (error) { next(error); }
}

export async function updateSystemControl(req, res, next) {
  try {
    const data = {};
    for (const [field, [min, max]] of Object.entries(integerRules)) {
      if (req.body[field] === undefined) continue;
      const value = Number(req.body[field]);
      if (!Number.isInteger(value) || value < min || value > max) return res.status(400).json({ message: `${field} must be an integer between ${min} and ${max}.` });
      data[field] = value;
    }
    for (const field of booleanFields) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== "boolean") return res.status(400).json({ message: `${field} must be true or false.` });
      data[field] = req.body[field];
    }
    for (const [field, allowed] of Object.entries(choices)) {
      if (req.body[field] === undefined) continue;
      if (!allowed.includes(req.body[field])) return res.status(400).json({ message: `Choose a valid ${field}.` });
      data[field] = req.body[field];
    }
    if (!Object.keys(data).length) return res.status(400).json({ message: "No supported settings supplied." });
    data.updatedById = req.admin.id;
    const settings = await prisma.systemControlSettings.upsert({ where: { id: "global" }, create: { ...defaults, ...data }, update: data });
    await audit(req, "SYSTEM_CONTROL_UPDATED", data, settings.id);
    res.json({ settings });
  } catch (error) { next(error); }
}
