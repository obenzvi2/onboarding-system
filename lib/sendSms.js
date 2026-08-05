"use strict";

/* שכבת הפשטה לשליחת SMS - כל שאר הקוד קורא רק ל-sendSms(phone,message),
   בלי לדעת מי ספק ה-SMS בפועל. המימוש הנוכחי הוא Twilio (הכי מהיר להקמה
   בלי תהליך אישור עסקי) - כדי לעבור לספק ישראלי (inforu/019sms וכו')
   בהמשך, מספיק להחליף את גוף הפונקציה הזו בלבד, לא שום קוד שקורא לה.
   מפתחות הגישה מגיעים ממשתני סביבה בפרויקט Vercel (TWILIO_ACCOUNT_SID/
   TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER) - לעולם לא בקוד עצמו. */
const twilio = require("twilio");

async function sendSms(phone, message){
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if(!sid || !token || !from){
    throw new Error("SMS provider not configured (missing TWILIO_* environment variables)");
  }
  const client = twilio(sid, token);
  await client.messages.create({ to: normalizeToE164(phone), from, body: message });
}

// ממיר מספר ישראלי מקומי (05XXXXXXXX) לפורמט בינלאומי E.164 (+9725XXXXXXXX) שספקי SMS דורשים.
function normalizeToE164(phone){
  const digits = String(phone||"").replace(/\D/g,"");
  if(digits.startsWith("0")) return "+972" + digits.slice(1);
  if(digits.startsWith("972")) return "+" + digits;
  return phone;
}

module.exports = { sendSms };
