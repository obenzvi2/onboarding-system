"use strict";

/* עוטפת handler של פונקציית /api ותופסת כל שגיאה לא-צפויה (כולל, למשל,
   "Redis is not configured" מ-lib/kv.js אם עדיין לא חוברה אינטגרציית
   ה-Redis) ומחזירה תשובת JSON נקייה עם קוד 500, במקום עמוד השגיאה הגנרי
   של Vercel. שימוש בכל נקודות הקצה תחת /api, כדי שהתנהגות השגיאה תהיה
   אחידה ולא תלויה בכך שכל handler יזכור בעצמו לעטוף הכל ב-try/catch. */
function withErrorHandling(handler){
  return async function(req, res){
    try{
      await handler(req, res);
    }catch(err){
      // לוג מפורט (כל property, כולל כאלה שספריית Redis/ה-SDK מוסיפות
      // מעבר ל-message הרגיל) - זמני, לצורך אבחון תקלת ה-Upstash הראשונה
      // מול ה-Redis האמיתי; console.error רגיל על אובייקט Error לא תמיד
      // מציג את כל השדות המותאמים-אישית.
      console.error("API error:", err && err.message, JSON.stringify(err, Object.getOwnPropertyNames(err||{})));
      if(!res.headersSent){
        res.status(500).json({ error: "שגיאת שרת פנימית. יש לנסות שוב מאוחר יותר." });
      }
    }
  };
}

module.exports = { withErrorHandling };
