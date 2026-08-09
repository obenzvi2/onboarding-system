"use strict";

/* GET: הזרמת תוכן הקובץ (view/download) - פתוח בלי אימות טוקן, באותו
   אופן בדיוק כמו /api/cases/[id]/share (GET) - אין עדיין login למש"א,
   וזה בדיוק השימוש המיועד (מש"א צופה בקובץ דרך מסך "מסמכים"). זו הסיבה
   שהקובץ נשמר עם access:"private" ב-Blob ולא "public": מי שלא עובר דרך
   נקודת הקצה הזו (עם ה-pathname המדויק) לא יכול לגשת לקובץ בכלל.
   DELETE: מחיקת קובץ שהועלה (לצורך "החלפה") - מאומת בטוקן סשן העובד/ת,
   כמו העלאה. */
const { getCaseRecord, putCaseRecord } = require("../../../lib/kv");
const { requireCaseSession } = require("../../../lib/auth");
const { deleteDocument, getDocumentStream } = require("../../../lib/blob");
const { withErrorHandling } = require("../../../lib/withErrorHandling");

module.exports = withErrorHandling(async function handler(req, res){
  const { caseId, docKey } = req.query;
  if(!caseId || !docKey){ res.status(400).json({ error: "Missing case id or document key" }); return; }

  if(req.method === "GET"){
    const caseData = await getCaseRecord(caseId);
    const doc = caseData && (caseData.documents||[]).find(d=>d.key===docKey);
    if(!doc || !doc.pathname){ res.status(404).json({ error: "המסמך לא נמצא." }); return; }
    const result = await getDocumentStream(doc.pathname);
    if(!result || !result.stream){ res.status(404).json({ error: "המסמך לא נמצא." }); return; }
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", 'inline; filename="'+encodeURIComponent(doc.fileName||"document")+'"');
    res.status(200).send(buffer);
    return;
  }

  if(req.method === "DELETE"){
    const session = await requireCaseSession(req, res, caseId);
    if(!session) return; // requireCaseSession כבר שלח 401
    const caseData = await getCaseRecord(caseId);
    if(!caseData){ res.status(404).json({ error: "Case not found" }); return; }
    const docIdx = (caseData.documents||[]).findIndex(d=>d.key===docKey);
    if(docIdx<0){ res.status(404).json({ error: "המסמך לא נמצא." }); return; }
    const pathname = caseData.documents[docIdx].pathname;
    if(pathname){ await deleteDocument(pathname); }
    caseData.documents[docIdx] = { key: docKey, label: caseData.documents[docIdx].label, status: "missing" };
    await putCaseRecord(caseId, caseData);
    res.status(200).json({ ok: true, document: caseData.documents[docIdx] });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});
