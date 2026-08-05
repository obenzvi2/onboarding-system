"use strict";

const { getOtpState, setOtpState, clearOtpState, createSession, VERIFY_MAX_ATTEMPTS } = require("../../lib/kv");
const { withErrorHandling } = require("../../lib/withErrorHandling");

module.exports = withErrorHandling(async function handler(req, res){
  if(req.method !== "POST"){ res.status(405).json({ error: "Method not allowed" }); return; }
  const { caseId, code } = req.body || {};
  if(!caseId || !code){ res.status(400).json({ error: "Missing caseId or code" }); return; }

  const state = await getOtpState(caseId);
  if(!state){
    res.status(400).json({ error: "לא נשלח קוד, או שהקוד פג תוקף. יש לבקש קוד חדש." });
    return;
  }
  if(state.attempts >= VERIFY_MAX_ATTEMPTS){
    res.status(429).json({ error: "יותר מדי נסיונות שגויים. יש לבקש קוד חדש." });
    return;
  }

  if(String(code) !== String(state.code)){
    await setOtpState(caseId, { code: state.code, attempts: state.attempts + 1 });
    res.status(400).json({ error: "הקוד שהוקלד שגוי." });
    return;
  }

  await clearOtpState(caseId);
  const token = await createSession(caseId);
  res.status(200).json({ ok: true, token });
});
