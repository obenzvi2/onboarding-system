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
   שהוצע לפני הכיול, בשני ייצואים ברציפות) - כנראה עדיין לא נבדקו בפועל.
   סבב כיול נוסף ב-2026-08-16 תיקן את כל 17 תיבות הסימון של סעיף ח' ואת
   3 תיבות הסימון של סעיף ט' (ה-X לא ישב בדיוק בתוך התיבה המודפסת). */
const FORM101_FIELD_MAP = {
  /* שדה "שנת המס" בראש עמוד 1 (תיבת ספרות קצרה, לא קשורה לסעיף א') ומספר
     הזהות שחוזר בראש עמוד 2 (כותרת חלק ח') - מיקום ראשוני בלבד, חושב מזיהוי
     קווי המסגרת בתמונת הרקע (לא מטקסט, כי אלה שדות ריקים ללא תווית טקסט
     צמודה למדוד ממנה) - טעון כיול. */
  taxYear: { type:"digits", digits:4, top:10.595, right:52.107, width:10.886, fontSize:9.5 },
  employeeIdNumberPage2: { type:"digits", digits:9, page:2, top:2.15, right:71.372, width:12.413, fontSize:9.5 },

  employerName: { type:"text", top:20.19, right:9.412, width:21.839, fontSize:10.5 },
  employerAddress: { type:"text", top:20.19, right:31.124, width:34.606, fontSize:10.5 },
  employerPhone: { type:"text", top:20.101, right:65.604, width:11.171, fontSize:10.5, ltr:true },
  /* הספרה "9" הראשונה מודפסת מראש על גבי הטופס הרשמי (כל מספרי תיקי
     הניכויים בישראל מתחילים ב-9), בתיבה השמאלית ביותר מבין 9 התיבות -
     ולכן 8 התיבות הממולאות (digits) תופסות את 8 התיבות הימניות מתוך 9
     (boxCount) בלי דילוג (ר' renderF101ODigitBoxes ב-print.js וה-slice(1)
     שמדלג על הספרה הראשונה בפועל ב-form101OfficialValues). */
  employerDeductionFile: { type:"digits", digits:8, boxCount:9, top:20.279, right:78.413, width:16.799, fontSize:10.5 },
  employeeIdNumber: { type:"digits", digits:9, top:26.636, right:9.286, width:16.967, fontSize:10.5 },
  /* מספר דרכון (למי שאין מספר ת.ז.) - שדה נפרד לגמרי מ-employeeIdNumber,
     אבל עדיין מוצג כתיבות בודדות ("digits", לא "text") כי גם על השורה
     המודפסת של מספר הדרכון יש תיבה נפרדת לכל תו (בדיוק כמו renderF101ODigitBoxes
     שכבר משמש למספר זהות - הפונקציה הזו לא באמת "ספרות בלבד" למרות השם,
     היא פשוט שמה כל תו בתיבה שלו, כולל אותיות, ר' render.js/print.js).
     digits:15 הוא ניחוש התחלתי למספר התיבות המודפסות בפועל - יש לכייל
     גם אותו (לא רק מיקום/רוחב) מול התמונה, דרך שדה "digits" בפאנל. */
  employeePassportNumber: { type:"digits", digits:15, top:30.377, right:9.034, width:25.03, fontSize:9.5 },
  employeeLastName: { type:"text", top:26.369, right:27.261, width:21.167, fontSize:10 },
  employeeFirstName: { type:"text", top:26.369, right:48.427, width:17.303, fontSize:10 },
  employeeBirthDate: { type:"digits", digits:8, top:26.725, right:64.722, width:15.287, fontSize:10 },
  employeeAliyaDate: { type:"digits", digits:8, top:26.814, right:80.387, width:14.59, fontSize:10 },
  employeeStreet: { type:"text", top:29.487, right:38.769, width:18.731, fontSize:10 },
  employeeHouseNumber: { type:"text", top:29.487, right:62.286, width:3.275, fontSize:10, ltr:true },
  employeeCity: { type:"text", top:29.487, right:68.46, width:11.171, fontSize:10 },
  employeeZip: { type:"digits", digits:7, top:29.576, right:81.899, width:13.33, fontSize:9.5 },
  /* בטופס הרשמי כל שדה טלפון מחולק ל"קידומת / מספר" (קידומת בצד שמאל של
     ה"/" המודפס, מספר בצד ימין) - ר' form101SplitPhone ב-print.js לפירוק
     הערך המאוחסן (למשל "050-1234567") לשני החלקים האלה. */
  // קידומת/מספר טלפון נשארו בגודל הפונט המקורי (8, לא 9.5 כמו שאר השדות) -
  // תיבות הקידומת/המספר כבר צמודות זו לזו ול"/" המודפס-מראש בטופס במידה
  // מסוימת (הן חופפות קלות בפועל במיקום המכויל), ובגודל גדול יותר הספרות
  // כבר נגעו בסלש (ר' התיקון בשיחה עם המשתמשת אחרי הגדלת הפונט הכללית).
  employeePhonePrefix: { type:"text", top:37.059, right:60.104, width:4.106, fontSize:8, ltr:true },
  employeePhoneNumber: { type:"text", top:37.148, right:53.636, width:7.736, fontSize:8, ltr:true },
  employeeMobilePhonePrefix: { type:"text", top:36.97, right:87.992, width:7.49, fontSize:8, ltr:true },
  employeeMobilePhoneNumber: { type:"text", top:36.97, right:81.102, width:9.031, fontSize:8, ltr:true },
  employeeEmail: { type:"text", top:37.684, right:14.578, width:24.946, fontSize:9.5, ltr:true },
  genderMaleCheckbox: { type:"checkbox", top:33.389, right:9.988, width:0.924, height:0.653 },
  genderFemaleCheckbox: { type:"checkbox", top:34.903, right:9.921, width:0.924, height:0.653 },
  residentYesCheckbox: { type:"checkbox", top:33.389, right:46.878, width:0.924, height:0.653 },
  residentNoCheckbox: { type:"checkbox", top:34.778, right:46.878, width:0.924, height:0.653 },
  maritalSingleCheckbox: { type:"checkbox", top:33.211, right:16.535, width:0.924, height:0.653 },
  maritalMarriedCheckbox: { type:"checkbox", top:33.3, right:26.421, width:0.924, height:0.653 },
  maritalDivorcedCheckbox: { type:"checkbox", top:33.263, right:37.702, width:0.924, height:0.653 },
  maritalWidowedCheckbox: { type:"checkbox", top:34.689, right:16.593, width:0.924, height:0.653 },
  maritalSeparatedCheckbox: { type:"checkbox", top:34.653, right:24.346, width:0.924, height:0.653 },

  /* חבר/ת קיבוץ + קופת חולים - עד 2026-08-16 לא הופיעו בכלל בטופס המודפס
     (לא היה להם מיפוי כלל). כויל דרך עורך הגרירה (?editform101=1) -
     ר' export שהתקבל 2026-08-16. בטופס המודפס לשאלת הקיבוץ יש שתי תשובות
     "כן" נפרדות (הכנסותיי מועברות/אינן מועברות לקיבוץ, ר' updateKibbutzPrimary
     ב-render.js). */
  kibbutzYesTransferredCheckbox: { type:"checkbox", top:33.438, right:57.195, width:0.924, height:0.653 },
  kibbutzYesNotTransferredCheckbox: { type:"checkbox", top:34.952, right:53.406, width:0.924, height:0.653 },
  kibbutzNoCheckbox: { type:"checkbox", top:33.527, right:53.614, width:0.924, height:0.653 },
  healthFundYesCheckbox: { type:"checkbox", top:34.847, right:78.111, width:0.924, height:0.653 },
  healthFundNoCheckbox: { type:"checkbox", top:33.244, right:78.056, width:0.924, height:0.653 },
  healthFundName: { type:"text", top:34.402, right:87.767, width:7.778, fontSize:9 },

  /* ---------- ד. פרטים על הכנסותיי ממעסיק זה ---------- */
  employmentStartDate: { type:"digits", digits:8, top:45.374, right:79.757, width:14.825, fontSize:9 },
  incomeTypeMonthlyCheckbox:     { type:"checkbox", top:42.553, right:58.801, width:0.924, height:0.653 },
  incomeTypeAdditionalCheckbox:  { type:"checkbox", top:44.156, right:58.801, width:0.924, height:0.653 },
  incomeTypePartialCheckbox:     { type:"checkbox", top:45.582, right:58.801, width:0.924, height:0.653 },
  incomeTypeDailyCheckbox:       { type:"checkbox", top:47.007, right:58.801, width:0.924, height:0.653 },
  incomeTypePensionCheckbox:     { type:"checkbox", top:48.432, right:58.675, width:0.924, height:0.653 },
  incomeTypeScholarshipCheckbox: { type:"checkbox", top:49.858, right:58.675, width:0.924, height:0.653 },

  /* ---------- ה. פרטים על הכנסות אחרות ---------- */
  otherIncomeHasNoCheckbox:  { type:"checkbox", top:54.104, right:59.011, width:0.924, height:0.653 },
  otherIncomeHasYesCheckbox: { type:"checkbox", top:56.955, right:59.137, width:0.924, height:0.653 },
  otherIncomeMonthlyCheckbox:     { type:"checkbox", top:58.44,  right:59.053, width:0.924, height:0.653 },
  otherIncomeDailyCheckbox:       { type:"checkbox", top:58.44,  right:78.875, width:0.924, height:0.653 },
  otherIncomeAdditionalCheckbox:  { type:"checkbox", top:59.746, right:59.011, width:0.924, height:0.653 },
  otherIncomePensionCheckbox:     { type:"checkbox", top:59.924, right:78.917, width:0.924, height:0.653 },
  otherIncomePartialCheckbox:     { type:"checkbox", top:61.142, right:59.011, width:0.924, height:0.653 },
  otherIncomeScholarshipCheckbox: { type:"checkbox", top:61.142, right:78.749, width:0.924, height:0.653 },
  otherIncomeCreditHereCheckbox:  { type:"checkbox", top:63.844, right:59.179, width:0.924, height:0.653 },
  otherIncomeCreditOtherCheckbox: { type:"checkbox", top:66.665, right:59.263, width:0.924, height:0.653 },
  otherIncomeNoHishtalmutCheckbox: { type:"checkbox", top:69.427, right:59.179, width:0.924, height:0.653 },
  otherIncomeNoPensionCheckbox:    { type:"checkbox", top:73.673, right:59.179, width:0.924, height:0.653 },

  /* ---------- ו. פרטים על בן/בת הזוג ---------- */
  /* כויל דרך עורך הגרירה (?editform101=1) - ר' export שהתקבל 2026-07-18. */
  spouseIdNumber: { type:"digits", digits:9, top:83.294, right:9.748, width:16.505, fontSize:9.5 },
  spouseLastName: { type:"text", top:83.027, right:28.688, width:14.321, fontSize:9.5 },
  spouseFirstName: { type:"text", top:83.116, right:48.847, width:10.29, fontSize:9.5 },
  spouseBirthDate: { type:"digits", digits:8, top:83.383, right:64.974, width:15.035, fontSize:8.5 },
  spouseAliyaDate: { type:"digits", digits:8, top:83.384, right:80.261, width:14.405, fontSize:8.5 },
  /* היה type:"text" (רצף טקסט חופשי) - כמו אצל employeePassportNumber,
     השורה המודפסת של מספר הדרכון מחולקת לתיבות בודדות, לא רצף חופשי.
     הומר ל-"digits" (ר' ההערה המורחבת ליד employeePassportNumber למעלה) -
     המיקום/רוחב הקיימים כויילו במקור עבור טקסט רציף, כך שעכשיו כשכל תו
     מקבל תיבה נפרדת (רוחב/סה"כ תיבות) הם כנראה לא מדויקים - טעון כיול
     מחדש, כולל מספר התיבות (digits, ניחוש התחלתי 15) מול התמונה. */
  spousePassportNumber: { type:"digits", digits:15, top:86.204, right:9.37, width:20.201, fontSize:9.5 },
  spouseHasNoIncomeCheckbox: { type:"checkbox", top:85.403, right:29.78, width:0.924, height:0.653 },
  spouseHasIncomeCheckbox:   { type:"checkbox", top:85.403, right:51.283, width:0.924, height:0.653 },
  spouseIncomeWorkPensionBusinessCheckbox: { type:"checkbox", top:85.433, right:71.82, width:0.924, height:0.653 },
  spouseIncomeOtherCheckbox: { type:"checkbox", top:85.522, right:85.427, width:0.672, height:0.653 },

  /* ---------- עמוד 2: ח. פטור או זיכוי ממס - 17 תיבות סימון ראשיות
     (הסעיף "2" בטופס מתפצל לשתי תיבות 2א/2ב, ולכן 17 ולא 16) - ר' TAX_CREDIT_META
     ב-data.js לרשימת המפתחות/הכותרות המלאה. כויל דרך עורך הגרירה
     (?editform101=1) מול הדפסה בפועל - ר' export שהתקבל 2026-08-16. */
  taxCreditC1Checkbox:  { type:"checkbox", page:2, top:5.137, right:12.897, width:0.924, height:0.653 },
  taxCreditC2aCheckbox: { type:"checkbox", page:2, top:6.8,   right:13.275, width:0.546, height:0.831 },
  taxCreditC2bCheckbox: { type:"checkbox", page:2, top:9.443, right:12.897, width:0.924, height:0.653 },
  taxCreditC3Checkbox:  { type:"checkbox", page:2, top:11.254,right:12.645, width:1.176, height:1.098 },
  taxCreditC4Checkbox:  { type:"checkbox", page:2, top:14.847,right:12.771, width:0.924, height:0.653 },
  taxCreditC5Checkbox:  { type:"checkbox", page:2, top:19.628,right:12.771, width:0.924, height:0.653 },
  taxCreditC6Checkbox:  { type:"checkbox", page:2, top:22.241,right:12.897, width:0.924, height:0.653 },
  taxCreditC7Checkbox:  { type:"checkbox", page:2, top:25.062,right:12.897, width:0.924, height:0.653 },
  taxCreditC8Checkbox:  { type:"checkbox", page:2, top:31.774,right:12.771, width:1.05,  height:0.92 },
  taxCreditC9Checkbox:  { type:"checkbox", page:2, top:37.891,right:12.897, width:0.924, height:0.653 },
  taxCreditC10Checkbox: { type:"checkbox", page:2, top:39.732,right:12.771, width:1.05,  height:1.009 },
  taxCreditC11Checkbox: { type:"checkbox", page:2, top:42.612,right:12.897, width:0.924, height:0.831 },
  taxCreditC12Checkbox: { type:"checkbox", page:2, top:45.404,right:12.771, width:1.05,  height:0.92 },
  taxCreditC13Checkbox: { type:"checkbox", page:2, top:47.245,right:12.771, width:1.05,  height:0.831 },
  taxCreditC14Checkbox: { type:"checkbox", page:2, top:49.294,right:13.023, width:0.924, height:0.831 },
  taxCreditC15Checkbox: { type:"checkbox", page:2, top:52.055,right:12.897, width:0.924, height:0.653 },
  taxCreditC16Checkbox: { type:"checkbox", page:2, top:53.421,right:12.897, width:0.924, height:0.92 },

  /* תת-שדות (יישוב מזכה, תאריכים, מספר ילדים בטווחי גיל וכו') של סעיפי ח'
     שיש להם יותר מתיבת סימון בודדת - ר' TAX_CREDIT_META/emp.taxCredits
     ב-state.js למבנה הנתונים המלא של כל אחד. מיקומים נמדדו ישירות מול
     assets/form101_official_bg_page2.png ע"י סריקת פיקסלים אוטומטית
     (איתור הקווים הריקים למילוי לפי ריצות פיקסלים כהים רציפות, לא הערכה
     חזותית/גרירה בעורך) - ראשוניים בלבד, כדאי לוודא/לכייל דרך
     ?editform101=1 מול הדפסה בפועל. */
  taxCreditC3FromDate:   { type:"text", page:2, top:11.6, right:44.4, width:13.5, fontSize:8.5, ltr:true },
  taxCreditC3Settlement: { type:"text", page:2, top:13.2, right:26.1, width:24.5, fontSize:8.5 },
  taxCreditC4FromDate:          { type:"text", page:2, top:14.9, right:31.6, width:13.5, fontSize:8.5, ltr:true },
  taxCreditC4NoIncomeUntilDate: { type:"text", page:2, top:16.6, right:58.0, width:10.5, fontSize:8.5, ltr:true },
  // c7/c8: שתי עמודות (ימין/שמאל) על פני 3 שורות - ר' renderForm101SectionH
  // ב-render.js לאותו סדר שדות בדיוק (bornThisYear, age4to5, age1to2,
  // age6to17, age3, age18). c8 חסר age18 (אין תיבה מקבילה בטופס הרשמי) -
  // age3 שלו תופס במקום זאת את מקום העמודה הימנית בשורה השלישית (כך נמדד
  // בפועל מול הטופס - העמודה השמאלית בשורה זו ריקה לגמרי בסעיף 8).
  taxCreditC7BornThisYear: { type:"text", page:2, top:27.7, right:34.3, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC7Age4to5:      { type:"text", page:2, top:27.8, right:88.8, width:4.4, fontSize:8.5, ltr:true },
  taxCreditC7Age6to17:     { type:"text", page:2, top:29.0, right:49.2, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC7Age1to2:      { type:"text", page:2, top:29.0, right:89.5, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC7Age18:        { type:"text", page:2, top:30.3, right:41.8, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC7Age3:         { type:"text", page:2, top:30.3, right:83.0, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC8BornThisYear: { type:"text", page:2, top:33.3, right:34.3, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC8Age4to5:      { type:"text", page:2, top:33.4, right:88.8, width:4.4, fontSize:8.5, ltr:true },
  taxCreditC8Age6to17:     { type:"text", page:2, top:34.7, right:49.2, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC8Age1to2:      { type:"text", page:2, top:34.6, right:89.5, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC8Age3:         { type:"text", page:2, top:36.0, right:41.8, width:4.3, fontSize:8.5, ltr:true },
  taxCreditC11Count:     { type:"text", page:2, top:42.6, right:21.6, width:3.7, fontSize:8.5, ltr:true },
  taxCreditC14StartDate: { type:"text", page:2, top:49.3, right:58.1, width:10,  fontSize:8, ltr:true },
  taxCreditC14EndDate:   { type:"text", page:2, top:49.4, right:80.1, width:8.3, fontSize:8, ltr:true },
  taxCreditC16Days:      { type:"text", page:2, top:53.7, right:38.9, width:3.8, fontSize:8.5, ltr:true },

  /* ---------- עמוד 2: ט. תיאום מס - 3 תיבות סימון (סיבת הבקשה; ר'
     emp.taxCoordination.option באפליקציה). אין תיבת סימון נפרדת עבור
     "מבקש/ת תיאום מס" עצמו - בטופס המודפס, סימון אחת מ-3 הסיבות האלה
     *הוא* אופן הבקשה, ולכן emp.taxCoordination.requested נגזר במקום
     להיות תיבה נפרדת (ר' form101OfficialValues). כויל דרך עורך הגרירה
     (?editform101=1) - ר' export שהתקבל 2026-08-16. */
  taxCoordNoIncomeYetCheckbox:    { type:"checkbox", page:2, top:57.436, right:12.645, width:0.924, height:0.653 },
  taxCoordHasOtherIncomeCheckbox: { type:"checkbox", page:2, top:60.877, right:12.519, width:0.924, height:0.653 },
  taxCoordApprovedCheckbox:       { type:"checkbox", page:2, top:70.502, right:12.519, width:0.924, height:0.653 }
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
  birthDate: { type:"digits", digits:8, right:41.842, width:14.741, fontSize:8.5 },
  idNumber:  { type:"digits", digits:9, right:24.556, width:17.16,  fontSize:8.5 },
  name:      { type:"text",   right:12.939, width:10.482, fontSize:9, topOffset:-0.089 },
  allowanceCheckbox: { type:"checkbox", right:10.999, width:1.176, height:0.92,  topOffset:-0.267 }, // טור 2
  custodyCheckbox:   { type:"checkbox", right:9.513,  width:0.924, height:0.653 } // טור 1
};
/* rowOffsets: תיקון עדין אופציונלי לשורה ספציפית (מפתח = אינדקס השורה),
   למקרה שהרווח האמיתי בין השורות בטופס המודפס אינו אחיד לחלוטין - ר'
   ההערה המורחבת מעל form101ChildRowTop ב-print.js. */
const FORM101_CHILDREN_TABLE = { firstRowTop:46.691, rowHeight:2.77, maxRows:10,
  rowOffsets:{0:0.01, 1:-0.1, 2:-0.37, 3:-0.52, 4:-0.68, 5:-0.94, 6:-1.1, 7:-1.2, 8:-1.45, 9:-1.6} };

/* ============================================================
   עמוד 2, ט. מקורות הכנסה נוספים לתיאום מס - טבלה חוזרת שנייה (ר'
   emp.taxCoordination.sources באפליקציה), אותו מנגנון בדיוק כמו טבלת
   הילדים (FORM101_TAXCOORDSOURCES_ROW/FORM101_TAXCOORDSOURCES_TABLE במקום
   FORM101_CHILDREN_ROW/FORM101_CHILDREN_TABLE) - ר' FORM101_REPEATING_TABLES
   למטה ו-form101TableRowTop ב-print.js שמכליל את form101ChildRowTop לעבוד
   עם כל טבלה חוזרת רשומה, לא רק טבלת הילדים. הטופס המודפס תומך ב-3 שורות
   בלבד (מעבר לכך יש הפניה ל"מעבר לדף" - לא נתמך בתצוגה זו). מיקומים
   ראשוניים בלבד, טעונים כיול. deductionFileNumber מתנהג כמו
   employerDeductionFile (הספרה "9" הראשונה מודפסת-מראש). */
const FORM101_TAXCOORDSOURCES_ROW = {
  employerName:       { type:"text",   right:9.568,  width:15.804, fontSize:8.5, topOffset:0.267 },
  address:            { type:"text",   right:25.372, width:22.113, fontSize:8.5, topOffset:0.267 },
  deductionFileNumber:{ type:"digits", digits:8, boxCount:9, right:47.994, width:12.932, fontSize:8, topOffset:0.267 },
  incomeType:         { type:"text",   right:61.18,  width:9.418,  fontSize:7.5, topOffset:0.356 },
  monthlyIncome:      { type:"text",   right:71.084, width:11.546, fontSize:8.5, ltr:true, topOffset:0.356 },
  taxWithheld:        { type:"text",   right:83.148, width:11.631, fontSize:8.5, ltr:true, topOffset:0.356 }
};
const FORM101_TAXCOORDSOURCES_TABLE = { firstRowTop:64.865, rowHeight:1.696, maxRows:3, rowOffsets:{} };

/* רישום כל הטבלאות החוזרות (שם -> {row,table,page}) - כך שכל הלוגיקה
   הגנרית בעורך (parse/resolve/drag/export) עובדת עם כל טבלה חוזרת מבלי
   לשכפל אותה בכל פעם שמוסיפים טבלה נוספת. ר' form101ParseChildKey/
   form101TableRowTop ב-print.js. */
const FORM101_REPEATING_TABLES = {
  children: { row: FORM101_CHILDREN_ROW, table: FORM101_CHILDREN_TABLE, page: 1 },
  taxCoordSources: { row: FORM101_TAXCOORDSOURCES_ROW, table: FORM101_TAXCOORDSOURCES_TABLE, page: 2 }
};

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
