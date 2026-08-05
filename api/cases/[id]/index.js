"use strict";

/* GET/PUT נתוני תיק משותף, בשם העובד/ת בזמן מילוי הטפסים מהמכשיר שלו/ה.
   דורש טוקן סשן תקף לאותו caseId בדיוק (ר' lib/auth.js) - מונפק רק אחרי
   אימות קוד SMS מוצלח (/api/otp/verify). */
const { getCaseRecord, putCaseRecord } = require("../../../lib/kv");
const { requireCaseSession } = require("../../../lib/auth");
const { withErrorHandling } = require("../../../lib/withErrorHandling");

module.exports = withErrorHandling(async function handler(req, res){
  const { id } = req.query;
  if(!id){ res.status(400).json({ error: "Missing case id" }); return; }

  const session = await requireCaseSession(req, res, id);
  if(!session) return; // requireCaseSession כבר שלח 401

  if(req.method === "GET"){
    const data = await getCaseRecord(id);
    if(!data){ res.status(404).json({ error: "Case not found" }); return; }
    res.status(200).json(data);
    return;
  }

  if(req.method === "PUT"){
    const caseData = req.body;
    if(!caseData || typeof caseData !== "object"){
      res.status(400).json({ error: "Missing body" });
      return;
    }
    caseData.sharedWithEmployee = true;
    await putCaseRecord(id, caseData);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});
