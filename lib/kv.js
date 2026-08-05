"use strict";

/* עטיפה דקה מעל Redis (Upstash, מחובר כאינטגרציית Marketplace ב-Vercel) -
   כל פונקציות ה-API תחת /api עוברות דרך הקובץ הזה בלבד, כדי שיהיה מקום
   אחד להחליף אם בעתיד עוברים לאחסון אחר (ר' התוכנית: זהו שלב ביניים
   לפני מעבר לשרת הארגוני). שימו לב: "Vercel KV" הישן (@vercel/kv) הוצא
   משימוש - הדרך הנוכחית היא לחבר אינטגרציית Redis (Upstash) מה-
   Marketplace ולהשתמש ב-@upstash/redis ישירות. מפתחות הגישה מגיעים
   אוטומטית ממשתני הסביבה של הפרויקט ב-Vercel ברגע שמחברים את
   האינטגרציה - אין צורך להזין אותם ידנית. קוראים לשני שמות אפשריים
   למשתני הסביבה (KV_REST_API_URL/TOKEN וגם UPSTASH_REDIS_REST_URL/TOKEN)
   כי שמם המדויק תלוי בגרסת האינטגרציה שמחוברת בפועל. */
const { Redis } = require("@upstash/redis");
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
/* חשוב: לא בונים את לקוח ה-Redis בכלל אם url/token חסרים, ולא קוראים לו.
   כשבנינו אותו בלי הגדרות (למשל בסביבת פיתוח מקומית לפני חיבור
   האינטגרציה) גילינו שקריאה כלשהי (get/set וכו') זורקת שגיאה א-סינכרונית
   נפרדת ברקע (מנגנון ה-auto-pipelining הפנימי של הספרייה מתזמן שליחה
   דחויה ל-URL לא תקין) שלא נתפסת ע"י שום try/catch בקוד הקורא, ומפילה
   את כל תהליך ה-Node (גם ב-vercel dev מקומי וגם, בפוטנציה, בסביבת
   Production עצמה). הבדיקה הבאה מונעת מצב כזה מלכתחילה - כל פונקציה
   כאן זורקת שגיאה ברורה וסינכרונית (הנתפסת כרגיל ע"י try/catch) הרבה
   לפני שמגיעים לספריית ה-Redis בכלל. */
const kv = (REDIS_URL && REDIS_TOKEN) ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;
function requireKv(){
  if(!kv) throw new Error("Redis (KV) is not configured - missing KV_REST_API_URL/TOKEN environment variables.");
  return kv;
}

const CASE_PREFIX = "case:";
const OTP_PREFIX = "otp:";
const SESSION_PREFIX = "session:";
const SEND_RATE_PREFIX = "otpsend:";

const OTP_TTL_SECONDS = 10 * 60; // 10 דקות
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 שעות
const SEND_RATE_TTL_SECONDS = 10 * 60; // חלון הגבלת הקצב לשליחת קודים
const SEND_RATE_MAX = 3; // מקסימום שליחות קוד לתיק בחלון הזמן שלמעלה
const VERIFY_MAX_ATTEMPTS = 5;

function caseKey(id){ return CASE_PREFIX + id; }
function otpKey(id){ return OTP_PREFIX + id; }
function sessionKey(token){ return SESSION_PREFIX + token; }
function sendRateKey(id){ return SEND_RATE_PREFIX + id; }

async function getCaseRecord(caseId){
  return await requireKv().get(caseKey(caseId));
}

async function putCaseRecord(caseId, data){
  await requireKv().set(caseKey(caseId), data);
}

async function getOtpState(caseId){
  return await requireKv().get(otpKey(caseId));
}

async function setOtpState(caseId, state){
  await requireKv().set(otpKey(caseId), state, { ex: OTP_TTL_SECONDS });
}

async function clearOtpState(caseId){
  await requireKv().del(otpKey(caseId));
}

/* מונה שליחות קוד בחלון הזמן הנוכחי - מחזיר true אם עוד מותר לשלוח,
   ומקדם את המונה. משמש למניעת הצפת SMS על חשבון הארגון. */
async function consumeSendRateLimit(caseId){
  const client = requireKv();
  const key = sendRateKey(caseId);
  const count = await client.incr(key);
  if(count === 1) await client.expire(key, SEND_RATE_TTL_SECONDS);
  return count <= SEND_RATE_MAX;
}

async function createSession(caseId){
  const token = require("crypto").randomBytes(32).toString("hex");
  await requireKv().set(sessionKey(token), { caseId, createdAt: Date.now() }, { ex: SESSION_TTL_SECONDS });
  return token;
}

async function getSession(token){
  if(!token) return null;
  return await requireKv().get(sessionKey(token));
}

module.exports = {
  getCaseRecord, putCaseRecord,
  getOtpState, setOtpState, clearOtpState,
  consumeSendRateLimit,
  createSession, getSession,
  VERIFY_MAX_ATTEMPTS
};
