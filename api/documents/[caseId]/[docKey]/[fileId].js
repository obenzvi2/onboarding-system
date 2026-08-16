"use strict";

/* GET: הזרמת תוכן קובץ בודד (view/download) - פתוח בלי אימות טוקן, באותו
   אופן בדיוק כמו /api/cases/[id]/share (GET) - אין עדיין login למש"א,
   וזה בדיוק השימוש המיועד (מש"א צופה בקובץ דרך מסך "מסמכים"). זו הסיבה
   שהקובץ נשמר עם access:"private" ב-Blob ולא "public": מי שלא עובר דרך
   נקודת הקצה הזו (עם ה-pathname המדויק, שנשמר רק בצד השרת) לא יכול לגשת
   לקובץ בכלל.
   DELETE: מחיקת קובץ בודד מתוך doc.files[] - מאומת בטוקן סשן העובד/ת,
   כמו העלאה. כל מסמך יכול להכיל עד 3 קבצים (ר' [caseId]/index.js). */
const { getCaseRecord, putCaseRecord } = require("../../../../lib/kv");
const { requireCaseSession } = require("../../../../lib/auth");
const { deleteDocument, getDocumentStream } = require("../../../../lib/blob");
const { withErrorHandling } = require("../../../../lib/withErrorHandling");

module.exports = withErrorHandling(async function handler(req, res){
  const { caseId, docKey, fileId } = req.query;
  if(!caseId || !docKey || !fileId){ res.status(400).json({ error: "Missing case id, document key or file id" }); return; }

  if(req.method === "GET"){
    const caseData = await getCaseRecord(caseId);
    const doc = caseData && (caseData.documents||[]).find(d=>d.key===docKey);
    const file = doc && (doc.files||[]).find(f=>f.id===fileId);
    if(!file){ res.status(404).json({ error: "המסמך לא נמצא." }); return; }
    const result = await getDocumentStream(file.pathname);
    if(!result || !result.stream){ res.status(404).json({ error: "המסמך לא נמצא." }); return; }
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", 'inline; filename="'+encodeURIComponent(file.fileName||"document")+'"');
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
    const doc = caseData.documents[docIdx];
    const files = doc.files || [];
    const fileIdx = files.findIndex(f=>f.id===fileId);
    if(fileIdx<0){ res.status(404).json({ error: "הקובץ לא נמצא." }); return; }
    await deleteDocument(files[fileIdx].pathname);
    const remaining = files.slice(0,fileIdx).concat(files.slice(fileIdx+1));
    caseData.documents[docIdx] = Object.assign({}, doc, { files: remaining, status: remaining.length ? "uploaded" : "missing" });
    await putCaseRecord(caseId, caseData);
    res.status(200).json({ ok: true, document: caseData.documents[docIdx] });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});
