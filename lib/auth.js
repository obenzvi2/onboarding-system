"use strict";

/* בודק שכותרת ה-Authorization מכילה טוקן סשן תקף (שהונפק ב-/api/otp/verify)
   ושהוא שייך בדיוק לתיק caseId המבוקש - מונע ממישהו שאומת לתיק אחד לגשת
   לתיק אחר. משמש בכל נקודת קצה שקוראת/כותבת נתוני תיק בשם העובד/ת. */
const { getSession } = require("./kv");

async function requireCaseSession(req, res, caseId){
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = await getSession(token);
  if(!session || session.caseId !== caseId){
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}

module.exports = { requireCaseSession };
