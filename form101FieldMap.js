"use strict";
/* ============================================================
   מיפוי קואורדינטות לתצוגת ההדפסה הרשמית של טופס 101 - שכבת HTML
   שקופה שמונחת מעל תמונת הרקע של הטופס הרשמי עצמו. יש שתי תמונות רקע -
   assets/form101_official_bg.png (עמוד 1) ו-assets/form101_official_bg_page2.png
   (עמוד 2, שנוסף ב-2026-07-18: בגרסת הטופס הנוכחית עמוד 2 כולל תוכן אמיתי
   למילוי - חלקים ח/ט/י - ורק החלק התחתון שלו, מתחת לתיבת ההצהרה, הוא
   דברי הסבר גרידא) - ר' renderForm101OfficialPage ב-print.js ששתי
   התמונות שלה container נפרד (form101OfficialPage1/2). כל שדה שייך לעמוד
   1 כברירת מחדל; page:2 מעביר אותו לתמונת הרקע/container של עמוד 2.

   כל הקואורדינטות באחוזים (%) יחסית לעמוד A4 שלם (210x297mm) - כך
   שהמיקום נשאר תקף בלי קשר לרזולוציית התמונה בפועל (ר' renderForm101OfficialPage
   ב-print.js, ששם ה-container מקבל width:210mm;height:297mm בדיוק כמו
   שאר תצוגות ה-print-frame הקיימות באפליקציה).

   שלב 1 בלבד (ר' סיכום היקף השלב שסוכם עם המשתמשת): פרטי מעסיק (סעיף א')
   ופרטי זהות/יצירת קשר של העובד/ת (חלק מסעיף ב'). שאר סעיפי הטופס
   (ילדים, בן/בת זוג, הכנסות נוספות, זיכויי מס, תיאום מס, הצהרה) ימופו
   בשלבים הבאים ויתווספו לאובייקט הזה - אין למפות הכל בבת אחת.

   כל שדה בעל type אחד מתוך:
   - "text": מחרוזת טקסט רגילה (עברית, RTL) בתוך תיבה מלבנית אחת.
   - "digits": מספר המחולק לתיבות בודדות לכל ספרה (כמו בטופס הרשמי) -
     ר' renderDigitBoxes ב-print.js. דורש שדה digits (מספר התיבות).
   - "checkbox": סימון X קבוע במיקום מדויק בתוך תיבת הסימון המודפסת.
   ============================================================ */
/* מיפוי זה כויל ידנית ע"י המשתמשת דרך עורך הגרירה (?editform101=1) מול
   הטופס הרשמי שהועלה ב-2026-07-18, וייוצא/הודבק בשיחה ב-2026-07-18 -
   ר' assets/form101_official_bg.png לתמונת הרקע התואמת. residentYesCheckbox
   ו-residentNoCheckbox עדיין מחזיקים בערכי ההשערה המקוריים (זהים למה
   שהוצע לפני הכיול, בשני ייצואים ברציפות) - כנראה עדיין לא נבדקו בפועל. */
const FORM101_FIELD_MAP = {
  /* שדה "שנת המס" בראש עמוד 1 (תיבת ספרות קצרה, לא קשורה לסעיף א') ומספר
     הזהות שחוזר בראש עמוד 2 (כותרת חלק ח') - מיקום ראשוני בלבד, חושב מזיהוי
     קווי המסגרת בתמונת הרקע (לא מטקסט, כי אלה שדות ריקים ללא תווית טקסט
     צמודה למדוד ממנה) - טעון כיול. */
  taxYear: { type:"digits", digits:4, top:11.219, right:52.107, width:10.886, fontSize:8 },
  employeeIdNumberPage2: { type:"digits", digits:9, page:2, top:2.951, right:71.372, width:12.539, fontSize:8 },

  employerName: { type:"text", top:20.19, right:9.286, width:21.839, fontSize:9 },
  employerAddress: { type:"text", top:20.19, right:31.124, width:34.606, fontSize:9 },
  employerPhone: { type:"text", top:20.101, right:65.604, width:11.171, fontSize:9, ltr:true },
  /* הספרה "9" הראשונה מודפסת מראש על גבי הטופס הרשמי (כל מספרי תיקי
     הניכויים בישראל מתחילים ב-9), בתיבה השמאלית ביותר מבין 9 התיבות -
     ולכן 8 התיבות הממולאות (digits) תופסות את 8 התיבות הימניות מתוך 9
     (boxCount) בלי דילוג (ר' renderF101ODigitBoxes ב-print.js וה-slice(1)
     שמדלג על הספרה הראשונה בפועל ב-form101OfficialValues). */
  employerDeductionFile: { type:"digits", digits:8, boxCount:9, top:20.279, right:78.413, width:16.799, fontSize:9 },
  employeeIdNumber: { type:"digits", digits:9, top:26.636, right:9.286, width:16.967, fontSize:9 },
  employeeLastName: { type:"text", top:26.369, right:27.261, width:21.167, fontSize:8.5 },
  employeeFirstName: { type:"text", top:26.369, right:48.427, width:17.303, fontSize:8.5 },
  employeeBirthDate: { type:"digits", digits:8, top:26.725, right:64.722, width:15.287, fontSize:8.5 },
  employeeAliyaDate: { type:"digits", digits:8, top:26.814, right:80.387, width:14.59, fontSize:8.5 },
  employeeStreet: { type:"text", top:29.487, right:38.769, width:18.731, fontSize:8.5 },
  employeeHouseNumber: { type:"text", top:29.487, right:62.286, width:3.275, fontSize:8.5, ltr:true },
  employeeCity: { type:"text", top:29.487, right:68.46, width:11.171, fontSize:8.5 },
  employeeZip: { type:"digits", digits:7, top:29.576, right:81.899, width:13.33, fontSize:8 },
  /* בטופס הרשמי כל שדה טלפון מחולק ל"קידומת / מספר" (קידומת בצד שמאל של
     ה"/" המודפס, מספר בצד ימין) - ר' form101SplitPhone ב-print.js לפירוק
     הערך המאוחסן (למשל "050-1234567") לשני החלקים האלה. */
  employeePhonePrefix: { type:"text", top:37.059, right:60.104, width:4.106, fontSize:8, ltr:true },
  employeePhoneNumber: { type:"text", top:37.148, right:53.636, width:7.736, fontSize:8, ltr:true },
  employeeMobilePhonePrefix: { type:"text", top:36.97, right:87.992, width:7.49, fontSize:8, ltr:true },
  employeeMobilePhoneNumber: { type:"text", top:36.97, right:81.102, width:9.031, fontSize:8, ltr:true },
  employeeEmail: { type:"text", top:37.505, right:17.476, width:24.946, fontSize:8, ltr:true },
  genderMaleCheckbox: { type:"checkbox", top:33.211, right:9.862, width:0.924, height:0.653 },
  genderFemaleCheckbox: { type:"checkbox", top:34.814, right:9.795, width:0.924, height:0.653 },
  residentYesCheckbox: { type:"checkbox", top:33.3, right:46.5, width:0.924, height:0.653 },
  residentNoCheckbox: { type:"checkbox", top:34.6, right:46.5, width:0.924, height:0.653 },
  maritalSingleCheckbox: { type:"checkbox", top:33.033, right:16.409, width:0.924, height:0.653 },
  maritalMarriedCheckbox: { type:"checkbox", top:33.122, right:26.421, width:0.924, height:0.653 },
  maritalDivorcedCheckbox: { type:"checkbox", top:33.174, right:37.702, width:0.924, height:0.653 },
  maritalWidowedCheckbox: { type:"checkbox", top:34.6, right:16.467, width:0.924, height:0.653 },
  maritalSeparatedCheckbox: { type:"checkbox", top:34.564, right:24.346, width:0.924, height:0.653 },

  /* ---------- ד. פרטים על הכנסותיי ממעסיק זה ---------- */
  employmentStartDate: { type:"digits", digits:8, top:45.374, right:79.757, width:14.825, fontSize:7.5 },
  incomeTypeMonthlyCheckbox:     { type:"checkbox", top:42.464, right:58.675, width:0.924, height:0.653 },
  incomeTypeAdditionalCheckbox:  { type:"checkbox", top:44.067, right:58.549, width:0.924, height:0.653 },
  incomeTypePartialCheckbox:     { type:"checkbox", top:45.404, right:58.675, width:0.924, height:0.653 },
  incomeTypeDailyCheckbox:       { type:"checkbox", top:46.918, right:58.675, width:0.924, height:0.653 },
  incomeTypePensionCheckbox:     { type:"checkbox", top:48.343, right:58.675, width:0.924, height:0.653 },
  incomeTypeScholarshipCheckbox: { type:"checkbox", top:49.68,  right:58.675, width:0.924, height:0.653 },

  /* ---------- ה. פרטים על הכנסות אחרות ---------- */
  otherIncomeHasNoCheckbox:  { type:"checkbox", top:53.926, right:59.011, width:0.924, height:0.653 },
  otherIncomeHasYesCheckbox: { type:"checkbox", top:56.777, right:59.011, width:0.924, height:0.653 },
  otherIncomeMonthlyCheckbox:     { type:"checkbox", top:58.529, right:58.927, width:0.924, height:0.653 },
  otherIncomeDailyCheckbox:       { type:"checkbox", top:58.173, right:79.001, width:0.924, height:0.653 },
  otherIncomeAdditionalCheckbox:  { type:"checkbox", top:59.746, right:59.011, width:0.924, height:0.653 },
  otherIncomePensionCheckbox:     { type:"checkbox", top:59.746, right:78.791, width:0.924, height:0.653 },
  otherIncomePartialCheckbox:     { type:"checkbox", top:60.964, right:59.011, width:0.924, height:0.653 },
  otherIncomeScholarshipCheckbox: { type:"checkbox", top:61.053, right:78.749, width:0.924, height:0.653 },
  otherIncomeCreditHereCheckbox:  { type:"checkbox", top:63.666, right:59.179, width:0.924, height:0.653 },
  otherIncomeCreditOtherCheckbox: { type:"checkbox", top:66.398, right:59.011, width:0.924, height:0.653 },
  otherIncomeNoHishtalmutCheckbox: { type:"checkbox", top:69.249, right:59.179, width:0.924, height:0.653 },
  otherIncomeNoPensionCheckbox:    { type:"checkbox", top:73.406, right:59.179, width:0.924, height:0.653 },

  /* ---------- ו. פרטים על בן/בת הזוג ---------- */
  /* כויל דרך עורך הגרירה (?editform101=1) - ר' export שהתקבל 2026-07-18. */
  spouseIdNumber: { type:"digits", digits:9, top:83.294, right:9.748, width:16.505, fontSize:8 },
  spouseLastName: { type:"text", top:83.027, right:28.688, width:14.321, fontSize:8 },
  spouseFirstName: { type:"text", top:83.116, right:48.847, width:10.29, fontSize:8 },
  spouseBirthDate: { type:"digits", digits:8, top:83.383, right:64.974, width:15.035, fontSize:7 },
  spouseAliyaDate: { type:"digits", digits:8, top:83.384, right:80.261, width:14.405, fontSize:7 },
  spousePassportNumber: { type:"text", top:86.204, right:9.244, width:19.697, fontSize:8, ltr:true },
  spouseHasNoIncomeCheckbox: { type:"checkbox", top:85.047, right:29.78, width:0.924, height:0.653 },
  spouseHasIncomeCheckbox:   { type:"checkbox", top:85.047, right:51.283, width:0.924, height:0.653 },
  spouseIncomeWorkPensionBusinessCheckbox: { type:"checkbox", top:85.166, right:71.946, width:0.924, height:0.653 },
  spouseIncomeOtherCheckbox: { type:"checkbox", top:85.255, right:85.301, width:0.672, height:0.653 },

  /* ---------- עמוד 2: ח. פטור או זיכוי ממס - 17 תיבות סימון ראשיות
     (הסעיף "2" בטופס מתפצל לשתי תיבות 2א/2ב, ולכן 17 ולא 16) - ר' TAX_CREDIT_META
     ב-data.js לרשימת המפתחות/הכותרות המלאה. מיקומים ראשוניים בלבד, טעונים
     כיול. תת-שדות של כל סעיף (יישוב מזכה, תאריכים, מספר ילדים בטווחי גיל
     וכו') אינם ממופים כאן עדיין - התיבה הראשית בלבד. */
  taxCreditC1Checkbox:  { type:"checkbox", page:2, top:4.87,  right:12.645, width:0.924, height:0.653 },
  taxCreditC2aCheckbox: { type:"checkbox", page:2, top:6.533, right:12.645, width:0.924, height:0.653 },
  taxCreditC2bCheckbox: { type:"checkbox", page:2, top:9.265, right:12.645, width:0.924, height:0.653 },
  taxCreditC3Checkbox:  { type:"checkbox", page:2, top:11.165,right:12.645, width:0.924, height:0.653 },
  taxCreditC4Checkbox:  { type:"checkbox", page:2, top:14.491,right:12.645, width:0.924, height:0.653 },
  taxCreditC5Checkbox:  { type:"checkbox", page:2, top:19.361,right:12.645, width:0.924, height:0.653 },
  taxCreditC6Checkbox:  { type:"checkbox", page:2, top:21.974,right:12.645, width:0.924, height:0.653 },
  taxCreditC7Checkbox:  { type:"checkbox", page:2, top:24.706,right:12.645, width:0.924, height:0.653 },
  taxCreditC8Checkbox:  { type:"checkbox", page:2, top:31.596,right:12.645, width:1.05,  height:0.92 },
  taxCreditC9Checkbox:  { type:"checkbox", page:2, top:37.535,right:12.645, width:0.924, height:0.653 },
  taxCreditC10Checkbox: { type:"checkbox", page:2, top:39.554,right:12.645, width:1.05,  height:1.009 },
  taxCreditC11Checkbox: { type:"checkbox", page:2, top:42.523,right:12.645, width:0.924, height:0.831 },
  taxCreditC12Checkbox: { type:"checkbox", page:2, top:45.137,right:12.645, width:1.05,  height:0.92 },
  taxCreditC13Checkbox: { type:"checkbox", page:2, top:47.156,right:12.645, width:1.05,  height:0.831 },
  taxCreditC14Checkbox: { type:"checkbox", page:2, top:48.938,right:12.645, width:0.924, height:0.831 },
  taxCreditC15Checkbox: { type:"checkbox", page:2, top:51.788,right:12.645, width:0.924, height:0.653 },
  taxCreditC16Checkbox: { type:"checkbox", page:2, top:53.332,right:12.645, width:0.924, height:0.92 }
};

/* ============================================================
   ג. פרטים על ילדיי שבשנת המס טרם מלאו להם 19 שנה - טבלה חוזרת (מספר
   ילדים משתנה, בניגוד לכל שאר השדות שהם ערך יחיד). FORM101_CHILDREN_ROW
   מגדיר את מיקום/רוחב כל עמודה (זהה לכל השורות); FORM101_CHILDREN_TABLE
   מגדיר את מיקום השורה הראשונה, גובה כל שורה, ומספר השורות המקסימלי
   המודפס בטופס עצמו - ר' renderF101ChildrenTable ב-print.js שמייצר את
   כל השורות בפועל (top מחושב per-row = firstRowTop + i*rowHeight).
   ============================================================ */
const FORM101_CHILDREN_ROW = {
  birthDate: { type:"digits", digits:8, right:41.842, width:14.741, fontSize:7 },
  idNumber:  { type:"digits", digits:9, right:24.556, width:17.16,  fontSize:7 },
  name:      { type:"text",   right:12.939, width:10.482, fontSize:7.5 },
  allowanceCheckbox: { type:"checkbox", right:10.747, width:1.176, height:0.92,  topOffset:-0.356 }, // טור 2
  custodyCheckbox:   { type:"checkbox", right:9.135,  width:0.924, height:0.653, topOffset:-0.178 } // טור 1
};
/* rowOffsets: תיקון עדין אופציונלי לשורה ספציפית (מפתח = אינדקס השורה),
   למקרה שהרווח האמיתי בין השורות בטופס המודפס אינו אחיד לחלוטין - ר'
   ההערה המורחבת מעל form101ChildRowTop ב-print.js. */
const FORM101_CHILDREN_TABLE = { firstRowTop:46.691, rowHeight:2.77, maxRows:10,
  rowOffsets:{0:0.01, 1:-0.1, 2:-0.37, 3:-0.52, 4:-0.68, 5:-0.94, 6:-1.1, 7:-1.2, 8:-1.45, 9:-1.6} };

/* דגל מצב כיול - מופעל דרך ?calibrate101=1 בכתובת ה-URL בלבד (ר'
   DOMContentLoaded בתחתית print.js). לעולם לא פעיל אוטומטית בסביבת
   עבודה רגילה, ולכן אין צורך בכפתור ממשק גלוי - מסך הכיול מיועד
   לפיתוח/כיול קואורדינטות בלבד. */
let FORM101_CALIBRATE = false;

/* מצב עריכה אינטראקטיבי (גרירה/שינוי גודל) - מופעל דרך ?editform101=1
   בלבד, לפיתוח/כיול בלבד (ר' renderForm101EditPanel ב-print.js). מרמז
   אוטומטית על FORM101_CALIBRATE (כדי שהתיבות האדומות יוצגו) בלי לגעת
   בדגל הכיול הבסיסי עצמו - שני המצבים נשארים נפרדים ועצמאיים בקוד. */
let FORM101_EDIT_MODE = false;
/* מפתח השדה הנבחר כרגע בעורך (לתצוגת פאנל המאפיינים). */
let FORM101_SELECTED_KEY = null;
