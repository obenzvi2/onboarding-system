"use strict";

/* עטיפה דקה מעל Vercel Blob (אחסון קבצים) - מקבילה בדיוק ל-lib/kv.js,
   כדי שיהיה מקום אחד להחליף אם בעתיד עוברים לאחסון קבצים אחר (ר'
   התוכנית: שלב ביניים לפני שרת הארגוני).

   בניגוד ל-lib/kv.js, כאן *לא* בודקים משתנה סביבה ספציפי בעצמנו לפני
   הקריאה: @vercel/blob תומך בשתי שיטות אימות שונות שמוגדרות אוטומטית
   ע"י Vercel לפי איך שמחברים את חנות ה-Blob לפרויקט - טוקן קבוע
   (BLOB_READ_WRITE_TOKEN) *או* OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID,
   השיטה שבה מחוברת החנות אצלנו בפועל) - והספרייה עצמה כבר יודעת לבדוק
   את שתיהן לפי סדר עדיפות (ר' resolveAccessToken בקוד המקור) ולזרוק
   שגיאה ברורה משלה אם שתיהן חסרות. לכן פשוט לא מעבירים token/oidcToken
   בכלל לפונקציות למטה - משאירים לספרייה לזהות לבד. */
const { put, del, get } = require("@vercel/blob");

/* מעלה קובץ תחת נתיב ייחודי (caseId/docKey/שם-קובץ-מקורי, עם חותמת זמן
   כדי למנוע דריסה בשקט אם מעלים את אותו מסמך פעמיים). access:"private" -
   שדרוג לעומת התוכנית המקורית (שהניחה שרק "public" נתמך): גרסה עדכנית
   של @vercel/blob תומכת גם ב-private, כלומר הקובץ *לא* נגיש ישירות דרך
   URL בכלל - צריך לעבור דרך get() המאומת (ר' /api/documents/[caseId]/
   [docKey] ל-streaming מאומת). זו הגנה ממשית, לא רק "URL לא מנוחש". */
async function uploadDocument(caseId, docKey, fileName, buffer, contentType){
  const safeName = String(fileName||"file").replace(/[^\w.\-]+/g,"_");
  const pathname = "documents/"+caseId+"/"+docKey+"/"+Date.now()+"-"+safeName;
  const blob = await put(pathname, buffer, { access: "private", contentType: contentType });
  return { pathname: blob.pathname };
}

async function deleteDocument(pathname){
  await del(pathname);
}

/* שולפת stream + metadata לקובץ פרטי - משמשת את נקודת הקצה שמזרימה
   (streaming) את תוכן הקובץ למי שמאומת לצפות בו. */
async function getDocumentStream(pathname){
  return await get(pathname, { access: "private" });
}

module.exports = { uploadDocument, deleteDocument, getDocumentStream };
