"use strict";

/* ============================================================
   יצוא אמיתי לקובץ Excel של שיקלולית - לפי מיפוי השדות שסוכם עם המשתמשת
   (ר' "מיפוי שדות ליצוא לשיקלולית.xlsx" ששמור אצלה). כרגע ממומש רק יעד
   "שיקלולית" - יעד "כחולה" (המערכת הפנימית) עדיין ללא מיפוי שדות מוסכם,
   ולכן עדיין מדומה (ר' createBatchNow/openBatchFile ב-render.js).
   שימוש בספריית SheetJS (vendor/xlsx.full.min.js, גלובל בשם XLSX) ליצירת
   קובץ ה-Excel בפועל בצד הלקוח, ללא צורך בשרת.
   ============================================================ */

// כותרות העמודות (75) - זהות בדיוק לכותרות בקובץ התבנית שקיבלנו משיקלולית,
// כדי שהקובץ שנוצר יתאים למבנה שהמערכת שלהם מצפה לו.
const SHIKULIT_HEADERS = [
  "מספר עובד","שם פרטי","שם משפחה","מספר זהות","תאריך לידה","רחוב","בית","עיר","מיקוד",
  "טל' בית","טל' נייד","Email","תאריך תחילת עבודה","מין","מצב משפחתי",
  "בת/בן זוג - ת.ז.","בת/בן זוג - שם משפחה","בת/בן זוג - שם פרטי","בת/בן זוג - תאריך לידה","בת/בן זוג - תאריך עלייה",
  "תאריך עלייה",
  "ילד 1 - ת.ז.","ילד 1 - שם פרטי","ילד 1 - תאריך לידה",
  "ילד 2 - ת.ז.","ילד 2 - שם פרטי","ילד 2 - תאריך לידה",
  "ילד 3 - ת.ז.","ילד 3 - שם פרטי","ילד 3 - תאריך לידה",
  "ילד 4 - ת.ז.","ילד 4 - שם פרטי","ילד 4 - תאריך לידה",
  "ילד 5 - ת.ז.","ילד 5 - שם פרטי","ילד 5 - תאריך לידה",
  "ילד 6 - ת.ז.","ילד 6 - שם פרטי","ילד 6 - תאריך לידה",
  "ילד 7 - ת.ז.","ילד 7 - שם פרטי","ילד 7 - תאריך לידה",
  "ילד 8 - ת.ז.","ילד 8 - שם פרטי","ילד 8 - תאריך לידה",
  "ילד 9 - ת.ז.","ילד 9 - שם פרטי","ילד 9 - תאריך לידה",
  "ילד 10 - ת.ז.","ילד 10 - שם פרטי","ילד 10 - תאריך לידה",
  "תאריך תחילת שירות","תאריך סיום שירות",
  "בנק-קוד בנק","בנק-קוד סניף","בנק-מספר חשבון",
  "מחלקה","תת מחלקה","דירוג","דרגה","סניף",
  "קבוצת רכב","הנחת יישובי פיתוח","קוד מיוחד - ביטוח לאומי","מס אירגון","קופת חולים",
  "שם אב","סמל","סמל","סוג עובד","סמל","סמל","סמל","סמל","סמל"
];

// מספר זהות/דרכון - לפי סוג הזיהוי שנבחר (עובד/ת או בן/בת זוג). שיקלולית
// לא הבחינה בין השניים בעמודה נפרדת (ר' תכנון היצוא), ולכן זה תמיד תא אחד.
function personIdValue(person){
  return person.idType==="passport" ? (person.passportNumber||"") : (person.idNumber||"");
}
// אות ראשונה בלבד של שם המצב המשפחתי (רווק/ה=ר, נשוי/אה=נ, גרוש/ה=ג,
// אלמן/ה=א, פרוד/ה=פ) - נגזר אוטומטית, אין קוד ידני לשדה הזה (ר' הסרת
// "מצב משפחתי" ממסך טבלאות הקוד).
function maritalStatusShikulitCode(maritalStatusId){
  const item = CODE_TABLES.maritalStatuses.find(m=>m.id===maritalStatusId);
  return item ? item.name.charAt(0) : "";
}
// קוד קופת החולים לפי מה שהוזן במסך "טבלאות קוד" (item.shikulitCode) -
// כולל המקרה "לא חבר" (healthFundMember!=="yes") שממופה לפריט הייעודי
// {id:"none"} ב-CODE_TABLES.healthFunds (ר' data.js).
function healthFundShikulitCode(emp){
  if(emp.healthFundMember!=="yes"){
    const none = CODE_TABLES.healthFunds.find(h=>h.id==="none");
    return none ? (none.shikulitCode||"") : "";
  }
  const item = CODE_TABLES.healthFunds.find(h=>h.name===emp.healthFundName);
  return item ? (item.shikulitCode||"") : "";
}
// שורת נתונים אחת (75 ערכים, אותו סדר בדיוק כמו SHIKULIT_HEADERS) עבור תיק
// קליטה אחד. כל התאריכים מיוצאים כמחרוזת DD/MM/YYYY (לא כתאריך Excel), וכל
// קוד בנק/סניף נשאר מחרוזת טקסט (לא מספר) כדי לא לאבד אפס מוביל.
function buildShikulitRow(c){
  const emp = c.employee, sp = emp.spouse, kids = emp.children||[], tc = emp.taxCredits;
  const kidCols = [];
  for(let i=0;i<10;i++){
    const k = kids[i];
    kidCols.push(
      k ? (k.idNumber||"") : "",
      k ? (k.name||"") : "",
      (k && k.birthDate) ? formatDateHe(k.birthDate) : ""
    );
  }
  return [
    emp.employeeNumber||"",
    emp.firstName||"",
    emp.lastName||"",
    personIdValue(emp),
    emp.birthDate ? formatDateHe(emp.birthDate) : "",
    emp.street||"",
    emp.houseNumber||"",
    emp.city||"",
    emp.zip||"",
    emp.phone2||"",
    emp.mobilePhone||"",
    emp.email||"",
    c.startDate ? formatDateHe(c.startDate) : "",
    emp.gender==="male" ? "ז" : (emp.gender==="female" ? "נ" : ""),
    maritalStatusShikulitCode(emp.maritalStatus),
    personIdValue(sp),
    sp.lastName||"",
    sp.firstName||"",
    sp.birthDate ? formatDateHe(sp.birthDate) : "",
    sp.aliyaDate ? formatDateHe(sp.aliyaDate) : "",
    emp.aliyaDate ? formatDateHe(emp.aliyaDate) : "",
    ...kidCols,
    (tc.c14.checked && tc.c14.startDate) ? formatDateHe(tc.c14.startDate) : "",
    (tc.c14.checked && tc.c14.endDate) ? formatDateHe(tc.c14.endDate) : "",
    c.bank.bankCode||"",
    c.bank.branchCode||"",
    c.bank.accountNumber||"",
    departmentName(c.departmentId)||"",
    subDepartmentName(c.subDepartmentId)||"",
    rankName(c.rankId)||"",
    gradeName(c.gradeId)||"",
    worksiteName(c.worksiteId)||"",
    0, // קבוצת רכב - ערך קבוע
    0, // הנחת יישובי פיתוח - ערך קבוע
    0, // קוד מיוחד - ביטוח לאומי - ערך קבוע
    1, // מס אירגון - ערך קבוע
    healthFundShikulitCode(emp),
    "", // שם אב - לא נאסף
    "","", // סמל x2
    "", // סוג עובד
    "","","","","" // סמל x5
  ];
}
function buildShikulitRows(cases){
  return [SHIKULIT_HEADERS, ...cases.map(buildShikulitRow)];
}
// יוצר בפועל את קובץ ה-Excel (גליון אחד, "עובדים") מתוך שורות (מערך מערכים,
// שורה ראשונה = כותרות) ומפעיל הורדה בדפדפן - ר' XLSX.writeFile (SheetJS).
function downloadExcelRows(rows, filename){
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "עובדים");
  XLSX.writeFile(wb, filename);
}
