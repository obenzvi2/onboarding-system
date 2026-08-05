"use strict";

/* מש"א בלבד: POST דוחף עותק נוכחי של התיק (מה-localStorage בדפדפן שלה)
   ל-KV, ומסמן אותו כמשותף - נקרא מ-copyEmployeeLink/openEmployeeFillTab
   ב-render.js, לפני שהקישור נוצר. GET מחזיר את העותק העדכני מהשרת -
   נקרא מכפתור "רענון נתונים מהעובד/ת" בכרטיס העובד/ת, כדי שמש"א תוכל
   לראות מה שהעובד/ת מילא/ה במכשיר שלו/ה (ר' scheduleEmployeeCaseSync
   ב-render.js). אין כאן שום אימות משתמש/ת - בשלב הזה אין עדיין login
   למש"א (ר' DB.currentUser הקבוע ב-state.js), כך שנקודת הקצה הזו פתוחה
   כמו כל שאר האפליקציה היום; זה שונה במכוון מ-/api/cases/[id] (הנקודה
   שמשמשת את העובד/ת עצמו/ה) שדורשת טוקן סשן אחרי אימות SMS. */
const { putCaseRecord, getCaseRecord } = require("../../../lib/kv");
const { withErrorHandling } = require("../../../lib/withErrorHandling");

module.exports = withErrorHandling(async function handler(req, res){
  const { id } = req.query;
  if(!id){ res.status(400).json({ error: "Missing case id" }); return; }

  if(req.method === "GET"){
    const data = await getCaseRecord(id);
    if(!data){ res.status(404).json({ error: "Case not found" }); return; }
    res.status(200).json(data);
    return;
  }

  if(req.method === "POST"){
    const caseData = req.body;
    if(!caseData || typeof caseData !== "object"){
      res.status(400).json({ error: "Missing body" });
      return;
    }
    if(!caseData.employee || !caseData.employee.verifiedPhone){
      res.status(400).json({ error: "Case is missing a verified phone number" });
      return;
    }
    caseData.sharedWithEmployee = true;
    await putCaseRecord(id, caseData);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});
