"use strict";

/* POST בלבד: העלאת קובץ מסמך תומך ע"י העובד/ת (אחרי אימות SMS) - מאומת
   באותו טוקן סשן כמו /api/cases/[id] (ר' lib/auth.js). הגוף הוא JSON עם
   הקובץ מקודד ב-base64 (לא multipart) - כדי לא להוסיף תלות חדשה (ספריית
   פענוח multipart) לפרויקט שכבר מסתמך על JSON בכל שאר נקודות הקצה.
   כל מסמך תומך עד 3 קבצים (ר' doc.files[] ב-buildDocuments ב-state.js) -
   כל העלאה היא תוספת למערך, לא החלפה (מחיקת קובץ בודדת נעשית דרך
   DELETE ב-[docKey]/[fileId].js). */
const crypto = require("crypto");
const { getCaseRecord, putCaseRecord } = require("../../../lib/kv");
const { requireCaseSession } = require("../../../lib/auth");
const { uploadDocument } = require("../../../lib/blob");
const { withErrorHandling } = require("../../../lib/withErrorHandling");

/* 3MB גולמי -> כ-4MB אחרי קידוד base64 + מבנה ה-JSON, בטוח מתחת למגבלת
   גוף הבקשה של פונקציות Vercel (כ-4.5MB). מספיק בהחלט לצילום מסמך/ת.ז
   מהטלפון (אחרי דחיסה רגילה של המצלמה). */
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"];

module.exports = withErrorHandling(async function handler(req, res){
  if(req.method !== "POST"){ res.status(405).json({ error: "Method not allowed" }); return; }
  const { caseId } = req.query;
  if(!caseId){ res.status(400).json({ error: "Missing case id" }); return; }

  const session = await requireCaseSession(req, res, caseId);
  if(!session) return; // requireCaseSession כבר שלח 401

  const { docKey, fileName, contentType, dataBase64 } = req.body || {};
  if(!docKey || !fileName || !contentType || !dataBase64){
    res.status(400).json({ error: "חסרים פרטי הקובץ." });
    return;
  }
  if(!ALLOWED_TYPES.includes(contentType)){
    res.status(400).json({ error: "סוג קובץ לא נתמך. יש להעלות תמונה (JPEG/PNG/HEIC) או PDF." });
    return;
  }

  const buffer = Buffer.from(dataBase64, "base64");
  if(buffer.length > MAX_FILE_BYTES){
    res.status(400).json({ error: "הקובץ גדול מדי (מקסימום 3MB)." });
    return;
  }

  const caseData = await getCaseRecord(caseId);
  if(!caseData){ res.status(404).json({ error: "Case not found" }); return; }
  const docIdx = (caseData.documents||[]).findIndex(d=>d.key===docKey);
  if(docIdx<0){ res.status(400).json({ error: "מסמך לא מוכר עבור תיק זה." }); return; }

  const doc = caseData.documents[docIdx];
  const files = doc.files || [];
  if(files.length >= 3){
    res.status(400).json({ error: "ניתן לצרף עד 3 קבצים למסמך זה." });
    return;
  }

  const { pathname } = await uploadDocument(caseId, docKey, fileName, buffer, contentType);
  const newFile = { id: crypto.randomUUID(), fileName: fileName, pathname: pathname, size: buffer.length, uploadedAt: new Date().toISOString() };
  caseData.documents[docIdx] = Object.assign({}, doc, { status: "uploaded", files: files.concat([newFile]) });
  await putCaseRecord(caseId, caseData);

  res.status(200).json({ ok: true, document: caseData.documents[docIdx] });
});
