"use strict";

const { getCaseRecord, setOtpState, consumeSendRateLimit } = require("../../lib/kv");
const { sendSms } = require("../../lib/sendSms");
const { withErrorHandling } = require("../../lib/withErrorHandling");

function generateCode(){
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 ספרות, לעולם לא מתחיל ב-0 כדי שלא "ייעלם" בהצגה/הקלדה
}

// מסתיר את רוב מספר הטלפון בהודעת התשובה ללקוח - כדי שהמסך יוכל להציג
// "שלחנו קוד לטלפון המסתיים ב-***XXX" (3 ספרות אחרונות בלבד, לבקשת
// המשתמשת) בלי לחשוף את המספר המלא לצד הלקוח.
function maskPhone(phone){
  const digits = String(phone||"");
  return digits.length > 3 ? "*".repeat(digits.length - 3) + digits.slice(-3) : digits;
}

module.exports = withErrorHandling(async function handler(req, res){
  if(req.method !== "POST"){ res.status(405).json({ error: "Method not allowed" }); return; }
  const { caseId } = req.body || {};
  if(!caseId){ res.status(400).json({ error: "Missing caseId" }); return; }

  const caseData = await getCaseRecord(caseId);
  const phone = caseData && caseData.employee && caseData.employee.verifiedPhone;
  if(!caseData || !phone){
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const allowed = await consumeSendRateLimit(caseId);
  if(!allowed){
    res.status(429).json({ error: "יותר מדי בקשות לשליחת קוד. נסה/י שוב בעוד כמה דקות." });
    return;
  }

  /* מצב "בכאילו" זמני, עד שמתחברים לספק SMS אמיתי: אם משתנה הסביבה
     OTP_MOCK_CODE מוגדר (קוד קבוע בין 6 ספרות, מוסכם מראש בין הצדדים),
     משתמשים בו במקום קוד אקראי ומדלגים על שליחת ה-SMS בפועל - כך שאפשר
     להעתיק/לשלוח את הקישור בוואטסאפ/מייל, וכל מי שפותח אותו מקליד את
     הקוד הקבוע שכולם יודעים אותו. הסרת המשתנה הזה מהגדרות הפרויקט
     (בדשבורד Vercel) מחזירה מיד לשליחת SMS אמיתית וקוד אקראי - בלי שום
     שינוי קוד. שימו לב: מצב זה עדיין דורש חיבור Redis תקין (ר' lib/kv.js)
     - הוא רק מדלג על שלב שליחת ה-SMS עצמו, לא על שמירת מצב האימות. */
  const mockCode = (process.env.OTP_MOCK_CODE||"").trim();
  const code = mockCode || generateCode();
  await setOtpState(caseId, { code, attempts: 0 });

  if(!mockCode){
    try{
      await sendSms(phone, "קוד האימות שלך למילוי טפסי הקליטה: " + code);
    }catch(e){
      res.status(502).json({ error: "שליחת ה-SMS נכשלה. נסה/י שוב." });
      return;
    }
  }

  res.status(200).json({ ok: true, maskedPhone: maskPhone(phone) });
});
