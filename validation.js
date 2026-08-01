"use strict";

/* ============================================================
   4. פונקציות עזר כלליות
   ============================================================ */
function escapeHtml(s){
  if(s===null||s===undefined) return "";
  return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function todayIso(){ return new Date().toISOString().slice(0,10); }
function formatDateHe(iso){
  if(!iso) return "";
  const d = new Date(iso+"T00:00:00");
  if(isNaN(d.getTime())) return "";
  return d.getDate().toString().padStart(2,"0")+"/"+(d.getMonth()+1).toString().padStart(2,"0")+"/"+d.getFullYear();
}
function formatDateTimeHe(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(isNaN(d.getTime())) return "";
  return formatDateHe(d.toISOString().slice(0,10))+" "+d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");
}
function ageAt(birthIso, atIso){
  const b = new Date(birthIso), a = new Date(atIso||todayIso());
  let age = a.getFullYear()-b.getFullYear();
  const m = a.getMonth()-b.getMonth();
  if(m<0 || (m===0 && a.getDate()<b.getDate())) age--;
  return age;
}
function validIsraeliId(id){
  if(!id) return false;
  id = id.trim();
  if(!/^\d{1,9}$/.test(id)) return false;
  id = id.padStart(9,"0");
  let sum=0;
  for(let i=0;i<9;i++){
    let d = Number(id[i]) * ((i%2===0)?1:2);
    if(d>9) d = Math.floor(d/10)+(d%10);
    sum+=d;
  }
  return sum%10===0;
}
function normalizeIsraeliId(id){
  if(!id) return "";
  return id.trim().padStart(9,"0");
}
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||""); }
// בלי מקף אופציונלי (בכוונה) - liveFormatError בשדות הטלפון בטופס 101 חוסם
// כל תו שאינו ספרה תוך כדי הקלדה (כולל מקף), ולכן הבדיקה הסופית כאן חייבת
// להסכים אתה; אם היא הייתה מאפשרת מקף, ערך עם מקף היה נראה "לא תקין" בזמן
// ההקלדה אך "תקין" ברגע ה-blur (הבדיקה הסופית), וההודעה הייתה נעלמת בטעות.
function validPhone(v){ return /^0\d{1,2}\d{6,7}$/.test((v||"").trim()); }
/* מספר נייד ישראלי: קידומת נייד מוכרת בלבד (050-056, 058, וגם 059 עבור
   רשתות פלסטיניות) ואחריה 7 ספרות בדיוק (10 ספרות סה"כ, כמו מספרי נייד
   אמיתיים) - בשונה מ-validPhone הכללי שמאפשר כל קידומת בת 2-3 ספרות
   ו-6 עד 7 ספרות (משמש לשדה "מספר טלפון נוסף", שיכול להיות גם קווי).
   גם כאן בלי מקף אופציונלי, מאותה סיבה כמו ב-validPhone לעיל. */
function validIsraeliMobilePhone(v){ return /^0(50|51|52|53|54|55|56|58|59)\d{7}$/.test((v||"").trim()); }
