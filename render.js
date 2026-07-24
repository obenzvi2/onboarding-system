"use strict";

/* ============================================================
   מצב ה-UI (מסך נוכחי, סינונים, מצב חלונות מודאליים וכו׳) + מנוע
   ה-render הראשי ומסכי משאבי האנוש והעובד/ת.
   ============================================================ */
let ui = {
  mode:"hr", // "hr" | "employee"
  screen:"hr-list", // hr-list | new-case | case-home | form101 | bank-form | documents | export | batches | archive | admin | print-form101 | print-bank | print-form101-bank
  currentCaseId:null,
  filters:{company:"",worksite:"",search:""},
  archiveFilters:{company:"",worksite:"",search:"",dateRange:"3m"}, // מסך "ארכיון עובדים" - כמו filters, ועוד טווח תאריכי קליטה
  toast:null,
  errors:{}, // form101 field errors
  errorSummaryOpen:false,
  exportSelection:[],
  exportTarget:"",
  pendingExportConfirm:false,
  batchFilterCaseId:"",
  companyModalDraft:null, // טיוטת חלון "הוספת/עריכת חברה" (הגדרות מערכת), null = סגור
  companyModalOriginal:null, // ערכי המקור בעריכה (לזיהוי שינויים שלא נשמרו)
  companyModalEditId:null, // מזהה החברה הנערכת, null = מצב "הוספה"
  companyModalErrors:{},
  companyModalLeaveConfirm:false,
  highlightCompanyId:null,
  companyDeleteId:null, // מזהה חברה שבתהליך מחיקה (הגדרות מערכת), null = סגור
  worksiteModalDraft:null, // טיוטת חלון "הוספת/עריכת אתר עבודה" (הגדרות מערכת), null = סגור
  worksiteModalOriginal:null,
  worksiteModalEditId:null,
  worksiteModalErrors:{},
  worksiteModalLeaveConfirm:false,
  highlightWorksiteId:null,
  worksiteDeleteId:null, // מזהה אתר עבודה שבתהליך מחיקה (הגדרות מערכת), null = סגור
  hrListSelection:[], // מזהי תיקי קליטה מסומנים ב-checkbox (ניהול עובדים)
  hrBulkDeleteConfirmOpen:false, // האם דיאלוג אישור מחיקת תיקים מסומנים פתוח
  codeSystem:"shikulit", // מסך "טבלאות קוד": מערכת היעד המוצגת כרגע - "shikulit" | "blue"
  activeChecklistKey:null, // מפתח הטופס הפעיל כרגע בטאב מילוי הטפסים (FORM_CHECKLIST_DEFS)
  formLanguage:"he", // שפת התצוגה של טופס 101 (לא משפיע על הנתונים עצמם או על ההדפסה) - "he" | "both" | "both_ru"
  form101DisclaimerAck:false // האם אושר ה-disclaimer של תרגום טופס 101 (נדרש בכל שפה שאינה עברית)
};
/* מיפוי בין מצב דו-לשוני (ui.formLanguage) לבין קוד השפה הזרה שהוא מציג
   לצד העברית (ר' FORM101_I18N ב-i18n.js) - "both" היא הגרסה הוותיקה
   (עברית+English), "both_ru" נוספה אחריה (עברית+Русский). כל מצב דו-לשוני
   חדש שיתווסף בעתיד (עברית+ערבית וכו') צריך רק שורה נוספת כאן - שאר
   tr()/trPlain()/codeName()/sectionTitleHtml()/f101FieldWrap() כבר כלליים
   ולא צריכים שינוי. */
const BOTH_LANG_OF = { both:"en", both_ru:"ru" };
/* מחזירה את התרגום הגולמי (טקסט בלבד, ללא HTML) עבור key בשפה נתונה, או
   null אם אין תרגום כזה במילון - עוזרת פנימית ל-tr()/trPlain() (גרסאות
   הדו-לשוניות, ר' BOTH_LANG_OF). */
function rawTranslation(lang, key){
  const dict = FORM101_I18N[lang];
  const val = dict ? dict[key] : null;
  return (val!=null && val!=="") ? val : null;
}
/* מחזירה את התרגום עבור key בשפת ui.formLanguage הנוכחית, או heFallback אם
   השפה היא עברית או שהמפתח עדיין לא קיים במילון של השפה הנבחרת (ר' i18n.js).
   במצב דו-לשוני (הטופס בשפה זרה, עם תרגום עברי קטן ואפור מתחתיו בשורה
   נפרדת - ר' .bi-he-block ב-styles.css) התוצאה היא HTML ולא טקסט רגיל:
   השפה הזרה, ואחריה span בעברית עם dir="rtl" משלו (כך שהעברית תמיד תיושר
   RTL כשורה עצמאית, ולעולם לא תתערבב עם הטקסט הזר באותה שורה - עברית RTL
   ושפה זרה LTR יחד בשורה אחת נראה מבולגן).
   *** חשוב: בגלל זה אסור לעולם לעטוף קריאה ל-tr()/codeName() ב-escapeHtml()
   - זה ישבור את ה-span המוזרק (יהפוך אותו לטקסט גלוי "<span...>"). כל
   הקריאות הקיימות בקובץ הזה כבר לא עוטפות (הוסרו בכוונה) - כל תרגום חדש
   חייב לשמור על הכלל הזה. ***
   השם "tr" (ולא "t") נבחר בכוונה - "t" כבר משמש בקוד הקיים כשם פרמטר נפוץ
   בפונקציות map/filter (למשל CODE_TABLES.incomeTypes.map(t=>...)), ושימוש
   באותו שם היה גורם להסתרה (shadowing) של פונקציית התרגום הגלובלית בדיוק
   בתוך הקריאות שהכי צריכות אותה (ר' codeName למטה). */
function tr(key, heFallback){
  const lang = ui.formLanguage;
  if(!lang || lang==="he") return heFallback;
  const bothLang = BOTH_LANG_OF[lang];
  if(bothLang){
    const foreign = rawTranslation(bothLang, key);
    return foreign ? (foreign+'<span class="bi-he-block" dir="rtl">'+heFallback+'</span>') : heFallback;
  }
  const val = rawTranslation(lang, key);
  return val!=null ? val : heFallback;
}
/* כמו tr(), אבל תמיד מחזירה טקסט רגיל בפורמט "English (עברית)" גם במצב
   דו-לשוני - לשימוש בכל מקום שבו לא ניתן להזריק HTML גולמי: בתוך <option>
   של <select> (תוכן option לעולם לא מפורש כ-HTML), או בתוך ערך של attribute
   כמו title="..." (ה-span/מרכאות שמחזירה tr() היו שוברים את הפיענוח של
   התג עצמו). */
function trPlain(key, heFallback){
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  if(!bothLang) return tr(key, heFallback);
  const foreign = rawTranslation(bothLang, key);
  return foreign ? (foreign+" ("+heFallback+")") : heFallback;
}
/* כמו trPlain(), אבל בלי התוספת "(עברית)" במצב דו-לשוני - לשימוש בערך של
   attribute (כמו placeholder="...") כשהעברית כבר מוצגת בנפרד ממש ליד השדה
   (למשל בשורת ה-bi-he-block שמתחת לתווית) - הצגתה שוב בתוך ה-placeholder
   מיותרת וגורמת לצפיפות. */
function trAttrOnly(key, heFallback){
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  if(!bothLang) return tr(key, heFallback);
  return rawTranslation(bothLang, key) || heFallback;
}
/* תרגום ערך מתוך CODE_TABLES (למשל מצב משפחתי, סוג הכנסה) - prefix מזהה
   את הטבלה (כדי שמפתחות מטבלאות שונות לא יתנגשו), item.id הוא הערך בפועל.
   plain=true מבקש טקסט רגיל בפורמט "English (עברית)" במקום ה-HTML העשיר
   שמצב דו-לשוני מחזיר בדרך כלל (ר' tr()) - נחוץ בתוך <option> של <select>,
   כי תוכן option לעולם לא מפורש כ-HTML בדפדפן (תג span היה מוצג כטקסט
   מילולי במקום להיות מעוצב). */
function codeName(prefix,item,plain){
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  if(plain && bothLang){
    const foreign = rawTranslation(bothLang, prefix+"_"+item.id);
    return foreign ? (foreign+" ("+item.name+")") : item.name;
  }
  return tr(prefix+"_"+item.id, item.name);
}
// אות הסעיף (א./ב./ג'...) של טופס 101 מוחלפת לגמרי לאות המקבילה בשפה הזרה
// (A./B./C'... באנגלית, А./Б./В'... ברוסית) - בדיוק כמו 2א/2ב בחלק ח' - כי
// היא רק סימון מספור ולא תוכן שצריך לשמר. תוכן הכותרת עצמו (heContent)
// עדיין עובר דרך tr() הרגיל עם שכפול/הצללה של עברית מתחת לטקסט הזר (ר'
// sectionTitleHtml).
const SECTION_LETTER_EN = {"א":"A","ב":"B","ג":"C","ד":"D","ה":"E","ו":"F","ז":"G","ח":"H","ט":"I","י":"J"};
const SECTION_LETTER_RU = {"א":"А","ב":"Б","ג":"В","ד":"Г","ה":"Д","ו":"Е","ז":"Ж","ח":"З","ט":"И","י":"Й"};
const SECTION_LETTERS_BY_LANG = { en: SECTION_LETTER_EN, ru: SECTION_LETTER_RU };
function sectionTitleHtml(heLetter, contentKey, heContent){
  const lang = BOTH_LANG_OF[ui.formLanguage] || (ui.formLanguage!=="he" ? ui.formLanguage : null);
  const letters = lang && SECTION_LETTERS_BY_LANG[lang];
  const letter = letters ? (letters[heLetter]||heLetter) : heLetter;
  return letter+'. '+tr(contentKey, heContent);
}
function setFormLanguage(lang){
  ui.formLanguage = lang;
  render();
}
function showToast(msg){
  ui.toast = msg;
  render();
  setTimeout(()=>{ ui.toast=null; const h=document.getElementById("toast-holder"); if(h) h.innerHTML=""; },3200);
}

function setScreen(screen){
  ui.screen = screen;
  ui.errors = {};
  window.scrollTo(0,0);
  render();
}
// מיפוי בין c.formLanguage (נבחר פעם אחת בעת פתיחת התיק - ר' submitNewCase -
// "he"/"he_en"/"he_ru", קידוד "ידידותי" שמוצג ב-select) לבין ui.formLanguage
// (הקידוד הפנימי של מנגנון התרגום בפועל - "he"/"both"/"both_ru", ר'
// BOTH_LANG_OF) - קובע רק את השפה שבה טופס 101/טופס הבנק *נפתחים כברירת
// מחדל* עבור התיק הזה; העובד/ת תמיד יכול/ה לשנות בפועל דרך מתג השפה
// (ר' langSwitcherHtml/setFormLanguage) בלי שזה משפיע על ברירת המחדל
// השמורה בתיק. רוב הטפסים האחרים קיימים כרגע רק בעברית, כך שהבחירה הזו
// כלל לא משפיעה עליהם.
const CASE_LANG_TO_UI_LANG = { he:"he", he_en:"both", he_ru:"both_ru" };
function openCase(caseId, screen){
  // פרטי הזיהוי (שם, סוג זיהוי, מספר זהות/דרכון) נמסרים כבר בעת פתיחת
  // התיק, כך שאין יותר תלות בין טופס פרטי חשבון הבנק לבין השלמת טופס 101.
  // ברירת המחדל של שפת התצוגה מתאפסת רק כשעוברים לתיק *אחר* מזה שכבר
  // היה פתוח - כדי לא לבטל בחירת שפה ידנית של המשתמש/ת תוך כדי ניווט בין
  // מסכים שונים באותו תיק עצמו.
  if(ui.currentCaseId !== caseId){
    const c = getCase(caseId);
    ui.formLanguage = CASE_LANG_TO_UI_LANG[c && c.formLanguage] || "he";
  }
  ui.currentCaseId = caseId;
  ui.screen = screen || "case-home";
  ui.errors = {};
  window.scrollTo(0,0);
  render();
}
function backToList(){
  ui.mode="hr";
  ui.currentCaseId=null;
  ui.screen="hr-list";
  render();
}

/* ============================================================
   5. חישובי סטטוס לתיק
   ============================================================ */
function docsStatusInfo(c){
  const docs = c.employee.form101Status==="completed" || c.documents.length ? (c.documents.length?c.documents:buildDocuments(c)) : [];
  if(!docs.length) return {text:"—",cls:"pill-gray"};
  const missing = docs.filter(d=>d.status==="missing").length;
  if(missing===0) return {text:"הכל נמסר ("+docs.length+")",cls:"pill-green"};
  return {text:missing+" מסמכים חסרים",cls:"pill-red"};
}
function form101StatusInfo(c){
  // סטטוס טופס 101 מפושט לשני מצבים בלבד: ממתין למילוי / הושלם.
  if(c.employee.form101Status==="completed") return {text:"הושלם",cls:"pill-green"};
  return {text:"ממתין למילוי",cls:"pill-yellow"};
}
function bankStatusInfo(c){
  // סטטוס טופס הבנק מפושט לשני מצבים בלבד (בנוסף ל"לא נדרש" כשאין
  // צורך בטופס בנק כלל): ממתין למילוי / הושלם. בעבר היה מצב נפרד
  // "ממתין להשלמת טופס 101" - בוטל לפי בקשה, כי טופס הבנק נחשב חלק
  // מטופס 101 ולכן כל עוד הוא לא הושלם, גם טופס הבנק "ממתין למילוי".
  if(!c.needsBankForm) return {text:"לא נדרש",cls:"pill-gray"};
  if(c.bank.status==="completed") return {text:"הושלם",cls:"pill-green"};
  return {text:"ממתין למילוי",cls:"pill-yellow"};
}
function caseReadyForExport(c){
  return c.employee.form101Status==="completed";
}

/* ============================================================
   6. Router ראשי
   ============================================================ */
/* render() נדחה תמיד לטיק הבא (setTimeout 0). הסיבה: render מחליף את כל
   ה-innerHTML של האפליקציה, כלומר הורס ובונה מחדש את כל אלמנטי ה-DOM,
   כולל את השדה שהיה ממוקד (focused). אם render היה רץ באופן סינכרוני
   מתוך אירוע blur/change של שדה (כפי שקורה כאשר עוברים בין שדות עם
   מקש Tab), הדפדפן "מאבד" את הפוקוס - כי הוא מנסה להעביר את הפוקוס
   לשדה הבא בסדר ה-Tab, אבל האלמנט הישן כבר נהרס, אז הפוקוס נופל
   לגמרי (חוזר ל-body) במקום לעבור לשדה הבא. הדחייה נותנת לדפדפן
   להשלים קודם את מעבר הפוקוס הטבעי שלו, ורק אז אנחנו בונים מחדש את
   ה-DOM - ומיד לאחר מכן משחזרים את הפוקוס לאלמנט (הזהה לפי id) שהיה
   ממוקד באותו רגע, כך שהמעבר בין שדות עם Tab תמיד עובד. */
let renderPending = false;
/* isRerendering: true אך ורק בזמן ההחלפה הפיזית של ה-DOM (app.innerHTML=html)
   בתוך renderNow. הסיבה שהדגל הזה נחוץ: כאשר מחליפים את ה-innerHTML,
   האלמנט הממוקד (למשל שדה קלט שהמשתמש/ת עדיין מקליד/ה בתוכו) נהרס -
   וכשאלמנט ממוקד נהרס/מוסר מה-DOM, הדפדפן יורה עליו אירוע blur אמיתי
   (native), גם בלי שהמשתמש/ת בפועל עזב/ה את השדה! בלי הדגל הזה, כל
   handler שרשום על onblur (בדיקות הולידציה ה"שלמות" - למשל checksum
   של ת"ז, אורך דרכון, פורמט מייל/טלפון מלא) היה רץ בכל הקלדה (כי כל
   הקלדה גורמת ל-render, שגורם ל-blur מלאכותי), במקום רק כשבאמת יוצאים
   מהשדה. ה-handlers של onblur (ר' finalizeEmpField / finalizeCreditField)
   בודקים את הדגל הזה ומדלגים על הרצת הבדיקה אם מדובר ב-blur מלאכותי
   כזה שנגרם מהרינדור עצמו, ולא מפעולה אמיתית של המשתמש/ת. */
let isRerendering = false;
function render(){
  if(renderPending) return;
  renderPending = true;
  setTimeout(function(){
    renderPending = false;
    renderNow();
  }, 0);
}
/* מבטיחה שאין רינדור "תלוי ועומד" (שקבוע לרוץ ב-setTimeout) לפני
   שממשיכים בפעולה - שכבת הגנה נוספת נגד מצב שבו רינדור דחוי קורה
   בדיוק בין mousedown ל-click על כפתור פעולה (כמו "שמור" בחלונות
   ה-Modal), מה שמחליף את ה-DOM ממש ברגע הלחיצה ו"בולע" אותה. */
function flushPendingRender(){
  if(renderPending){
    renderPending = false;
    renderNow();
  }
}
function renderNow(){
  const app = document.getElementById("app");
  const activeEl = document.activeElement;
  const focusId = (activeEl && activeEl.id) ? activeEl.id : null;
  let selStart = null, selEnd = null;
  try{
    if(focusId && "selectionStart" in activeEl){ selStart = activeEl.selectionStart; selEnd = activeEl.selectionEnd; }
  }catch(e){ /* type אינו תומך selection (כגון date/number/checkbox) - מתעלמים */ }
  let html = "";
  // מסכי הדפסה משותפים לשני הצדדים (HR ועובד/ת פותחים אותם), ולכן לא
  // שייכים לערכת הצבעים הכתומה של HR - רק מסכי ה-HR "הרגילים" מסומנים כך
  // (ר' .hr-theme ב-styles.css) כדי שכפתורי btn-primary/btn-add-green
  // ייצבעו בכתום שם בלבד, בעוד שאצל העובד/ת (כולל טופס 101/בנק) הם יישארו ירוקים.
  const isHrScreen = ui.mode!=="employee" && !["print-form101","print-bank","print-form101-bank","print-generic"].includes(ui.screen);
  app.className = isHrScreen ? "hr-theme" : "";
  try{
    if(ui.screen==="print-form101"){ html = renderPrintForm101(); }
    else if(ui.screen==="print-bank"){ html = renderPrintBank(); }
    else if(ui.screen==="print-form101-bank"){ html = renderPrintCombined(); }
    else if(ui.screen==="print-generic"){ html = renderPrintGeneric(); }
    else if(ui.mode==="employee"){ html = renderEmployeeShell(); }
    else { html = renderHrShell(); }
  }catch(err){
    /* הגנה זמנית לאבחון: אם בניית התוכן נכשלת (שגיאת JS כלשהי),
       לא משאירים את המסך "קפוא" בלי שום הסבר - מציגים הודעת שגיאה
       גלויה על המסך + מדפיסים ל-console, כדי שאפשר יהיה להעתיק
       ולשלוח את השגיאה המדויקת במקום לנחש. */
    console.error("שגיאה בבניית המסך:", err);
    html = '<div style="padding:24px;"><div class="alert alert-warning-pink" style="white-space:pre-wrap;font-family:monospace;text-align:left;direction:ltr;">'+
      'שגיאת JavaScript מנעה את טעינת המסך:\n\n'+escapeHtml(err && err.message ? err.message : String(err))+'\n\n'+escapeHtml(err && err.stack ? err.stack : "")+
      '</div></div>';
  }
  isRerendering = true;
  try{ app.innerHTML = html; } finally { isRerendering = false; }
  const th = document.getElementById("toast-holder");
  if(th) th.innerHTML = ui.toast ? '<div class="toast">'+escapeHtml(ui.toast)+'</div>' : "";
  if(focusId){
    const newEl = document.getElementById(focusId);
    if(newEl){
      newEl.focus();
      if(selStart!==null && selEnd!==null && "setSelectionRange" in newEl){
        try{ newEl.setSelectionRange(selStart, selEnd); }catch(e){ /* type אינו תומך (כגון date/number) - מתעלמים */ }
      }
    }
  }
  saveDB();
  afterRenderHook();
}
function renderEmployeeShell(){
  const c = currentCase();
  let body = "";
  if(ui.screen==="bank-form") body = renderBankForm(false);
  else if(ui.screen==="genericForm") body = renderGenericChecklistItem();
  else if(ui.screen==="form101") body = renderForm101(false);
  else body = renderEmployeeChecklist();
  return '' +
  '<div class="employee-topbar no-print">' +
    '<div><div class="title">מילוי פרטים לקליטת עובד/ת חדש/ה</div>' +
    '<div class="sub">'+escapeHtml(companyName(c?c.companyId:""))+' &middot; '+escapeHtml(worksiteName(c?c.worksiteId:""))+'</div></div>' +
    '<div style="display:flex;align-items:center;gap:14px;">' +
      '<div class="sub">שנת מס '+(c?c.taxYear:"")+'</div>' +
    '</div>' +
  '</div>' +
  '<main class="narrow">'+body+'</main>';
}
function afterRenderHook(){
  // הפעלת טולטיפים פתוחים מחדש אם צריך, וכן פוקוס בשדה שגיאה ראשון
  initSignaturePad("emailAccess_sigCanvas","emailAccess");
  initSignaturePad("lockerCheck_sigCanvas","lockerCheck");
  initSignaturePad("safety_sigCanvas","safety");
  initSignaturePad("dataConsent_sigCanvas","dataConsent");
  initSignaturePad("polygraph_sigCanvas","polygraph");
  initSignaturePad("pensionConfirm_sigCanvas","pensionConfirm");
}

function renderHrShell(){
  const nav = [
    {id:"hr-list",label:"תיקי קליטה"},
    {id:"export",label:"יצוא טפסים"},
    {id:"batches",label:"היסטוריית יצוא"},
    {id:"archive",label:"ארכיון עובדים"},
    {id:"admin",label:"הגדרות מערכת"}
  ];
  const topScreen = ["hr-list","new-case"].includes(ui.screen) ? "hr-list" : (["export"].includes(ui.screen)?"export":(["batches"].includes(ui.screen)?"batches":(ui.screen==="archive"?"archive":(ui.screen==="admin"?"admin":"case"))));
  let body = "";
  switch(ui.screen){
    case "hr-list": body = renderHrList(); break;
    case "new-case": body = renderNewCase(); break;
    case "case-home": body = renderCaseHome(); break;
    case "form101": body = renderForm101(true); break;
    case "bank-form": body = renderBankForm(true); break;
    case "documents": body = renderDocumentsScreen(); break;
    case "export": body = renderExportScreen(); break;
    case "batches": body = renderBatchesScreen(); break;
    case "archive": body = renderArchiveScreen(); break;
    case "admin": body = renderAdminScreen(); break;
    default: body = renderHrList();
  }
  return '' +
  '<div class="topbar no-print">' +
    '<div class="brand">מערכת קליטת עובדים חדשים</div>' +
    '<div class="tabs">' +
      nav.map(n=>'<button class="tab-btn '+(topScreen===n.id?"active":"")+'" onclick="setScreen(\''+n.id+'\')">'+n.label+'</button>').join("") +
    '</div>' +
    '<div class="user-chip">משתמש/ת: '+escapeHtml(DB.currentUser)+'</div>' +
  '</div>' +
  '<main class="'+(["hr-list","batches","archive","admin"].includes(ui.screen)?"wide":(["new-case","documents"].includes(ui.screen)?"form-narrow":""))+'">' + body + '</main>';
}

/* ============================================================
   7. מסך ניהול HR — רשימת תיקי קליטה
   ============================================================ */
function passesFilters(c){
  const f = ui.filters;
  if(f.company && c.companyId!==f.company) return false;
  if(f.worksite && c.worksiteId!==f.worksite) return false;
  if(f.search){
    const s = f.search.trim();
    const name = (c.employee.firstName+" "+c.employee.lastName).trim();
    const idv = c.employee.idType==="id"?c.employee.idNumber:c.employee.passportNumber;
    if(!name.includes(s) && !(idv||"").includes(s)) return false;
  }
  return true;
}

function renderHrList(){
  const filtered = DB.cases.filter(passesFilters);
  const options = (arr,valKey,labelKey)=>arr.map(x=>'<option value="'+x[valKey]+'">'+escapeHtml(x[labelKey])+'</option>').join("");
  let rows = filtered.map(c=>{
    const emp = c.employee;
    const name = (emp.firstName||emp.lastName) ? (emp.firstName+" "+emp.lastName) : "(טרם הוזן שם)";
    const idv = emp.idType==="id" ? (emp.idNumber||"—") : (emp.passportNumber||"—");
    const docs = docsStatusInfo(c);
    const prog = checklistProgress(c);
    const progPct = prog.total ? Math.round(prog.done/prog.total*100) : 0;
    const missing = missingFormsInfo(c);
    return '<tr ondblclick="if(!event.target.closest(\'.row-actions\')&&!event.target.closest(\'.row-select\')) openCase(\''+c.id+'\',\'case-home\')" style="cursor:pointer;">'+
      '<td class="row-select"><input type="checkbox" '+(ui.hrListSelection.includes(c.id)?"checked":"")+' onchange="toggleHrRowSelect(\''+c.id+'\',this.checked)"></td>'+
      '<td><b>'+escapeHtml(name)+'</b></td>'+
      '<td>'+escapeHtml(idv)+'</td>'+
      '<td>'+escapeHtml(companyName(c.companyId))+'</td>'+
      '<td>'+escapeHtml(worksiteName(c.worksiteId))+'</td>'+
      '<td>'+(emp.form101CompletedAt?formatDateHe(emp.form101CompletedAt.slice(0,10)):"—")+'</td>'+
      '<td><span class="status-pill '+docs.cls+'">'+docs.text+'</span></td>'+
      '<td><div style="display:flex;align-items:center;gap:8px;"><div style="width:60px;background:#EEF1F3;border-radius:20px;height:8px;overflow:hidden;flex-shrink:0;"><div style="width:'+progPct+'%;height:100%;background:#2FA745;"></div></div><span style="font-size:12.5px;color:#5c7d8c;white-space:nowrap;">'+prog.done+'/'+prog.total+'</span></div></td>'+
      '<td><span class="status-pill '+missing.cls+'">'+missing.text+'</span></td>'+
    '</tr>';
  }).join("");
  if(!filtered.length){
    rows = '<tr><td colspan="9"><div class="empty-state">לא נמצאו תיקי קליטה התואמים את הסינון.</div></td></tr>';
  }
  return '' +
  '<h1>ניהול עובדים — תיקי קליטה</h1>' +
  '<div class="btn-row" style="margin-top:-10px;margin-bottom:18px;">'+
    '<button class="btn btn-primary" onclick="goNewCase()">+ פתח תיק קליטה חדש</button>'+
  '</div>' +
  '<div class="filters-bar">' +
    '<div class="field"><label>חברה</label><select onchange="ui.filters.company=this.value;render()"><option value="">הכל</option>'+options(CODE_TABLES.companies,"id","name")+'</select></div>' +
    '<div class="field"><label>אתר עבודה</label><select onchange="ui.filters.worksite=this.value;render()"><option value="">הכל</option>'+options(CODE_TABLES.worksites,"id","name")+'</select></div>' +
    '<div class="field"><label>חיפוש לפי שם / ת.ז</label><input type="text" value="'+escapeHtml(ui.filters.search)+'" oninput="ui.filters.search=this.value;render()" placeholder="הקלד/י לחיפוש..."></div>' +
    '<div class="field"><button class="btn btn-secondary btn-sm" onclick="resetFilters()">איפוס סינונים</button>'+(ui.hrListSelection.length ? ICON_BTN("trash","מחק תיקים מסומנים ("+ui.hrListSelection.length+")","requestBulkDeleteCases()","delete") : "")+'</div>' +
  '</div>' +
  '<div class="table-wrap" id="hrListTableWrap"><table class="data-table"><thead><tr>'+
    '<th></th><th>שם עובד</th><th>ת.ז/דרכון</th><th>חברה מעסיקה</th><th>אתר עבודה</th>'+
    '<th>ת. השלמת טופס</th><th>סטטוס מסמכים</th><th>התקדמות טפסים</th>'+
    '<th>טפסים חסרים</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div>' +
  renderBulkDeleteCasesModal();
}
function resetFilters(){ ui.filters={company:"",worksite:"",search:""}; render(); }
function toggleHrRowSelect(caseId, checked){
  if(checked){
    if(!ui.hrListSelection.includes(caseId)) ui.hrListSelection.push(caseId);
  } else {
    ui.hrListSelection = ui.hrListSelection.filter(id=>id!==caseId);
  }
  render();
}
function requestBulkDeleteCases(){
  if(!ui.hrListSelection.length) return;
  ui.hrBulkDeleteConfirmOpen = true;
  render();
}
function cancelBulkDeleteCases(){
  ui.hrBulkDeleteConfirmOpen = false;
  render();
}
function confirmBulkDeleteCases(){
  const ids = ui.hrListSelection.slice();
  DB.cases = DB.cases.filter(c=>!ids.includes(c.id));
  ui.hrListSelection = [];
  ui.hrBulkDeleteConfirmOpen = false;
  showToast(ids.length===1 ? "תיק הקליטה נמחק בהצלחה." : ids.length+" תיקי קליטה נמחקו בהצלחה.");
  render();
}
function renderBulkDeleteCasesModal(){
  if(!ui.hrBulkDeleteConfirmOpen) return "";
  const n = ui.hrListSelection.length;
  if(!n) return "";
  return '<div class="modal-overlay" onclick="if(event.target===this) cancelBulkDeleteCases()"><div class="modal-box" style="max-width:480px;">' +
    '<h1 style="margin:0 0 14px;">מחיקת תיקי קליטה</h1>' +
    '<div style="margin-bottom:18px;">האם למחוק את '+(n===1?"תיק הקליטה המסומן":n+" תיקי הקליטה המסומנים")+'? <b>לאחר המחיקה לא ניתן יהיה לשחזר את הטפסים והנתונים שהוזנו.</b></div>' +
    '<div class="btn-row"><button class="btn btn-danger" onclick="confirmBulkDeleteCases()">מחק</button><button class="btn btn-secondary" onclick="cancelBulkDeleteCases()">ביטול</button></div>' +
  '</div></div>';
}

function markForExport(caseId){
  ui.exportSelection = [caseId];
  setScreen("export");
}
function viewCaseExportHistory(caseId){
  ui.batchFilterCaseId = caseId;
  setScreen("batches");
}
function returnForCorrection(caseId){
  const c = getCase(caseId);
  if(!c) return;
  c.employee.form101Status = "pending";
  showToast("התיק הוחזר לתיקון — נדרש למילוי מחדש של טופס 101.");
}
function cancelCase(caseId){
  if(!confirm("לבטל את תיק הקליטה? הפעולה אינה הפיכה באב הטיפוס.")) return;
  DB.cases = DB.cases.filter(c=>c.id!==caseId);
  showToast("תיק הקליטה בוטל.");
  render();
}
function startEmployeeFill(caseId){
  openEmployeeFillTab(caseId,"checklist");
}
/* פותח טאב דפדפן נפרד לגמרי עבור העובד/ת, ללא שום גישה למסכי משאבי
   אנוש (בדומה לקישור אישי שיישלח לעובד/ת במערכת הסופית). התיק מזוהה
   בכתובת הטאב (employeeCase=<מזהה>), והנתונים משותפים בין הטאבים דרך
   localStorage (ר' saveDB/loadDB) - כך שהעובד/ת יכול/ה למלא, לשמור,
   לסגור את החלון ולחזור מאוחר יותר לאותו קישור בלי לאבד מידע. */
/* בונה את כתובת הטאב הנפרד למילוי עצמי (ר' openEmployeeFillTab), משותפת
   גם עם כפתור "העתק קישור" (copyEmployeeLink) - כדי ששני המקומות תמיד
   ייצרו בדיוק אותה כתובת ולא יסטו זה מזה בטעות. */
function employeeFillUrl(caseId, screen){
  const base = location.href.split("?")[0].split("#")[0];
  return base + "?employeeCase=" + encodeURIComponent(caseId) + "&screen=" + encodeURIComponent(screen||"checklist");
}
// מעתיק את קישור הטאב הנפרד ללוח (בלי לפתוח אותו) - לשימוש כשרוצים לשלוח
// את הקישור לעובד/ת עצמו/ה (למשל בווטסאפ/מייל), בניגוד לכפתור "לעמוד מילוי
// טפסים" שמיועד לפתיחה עצמית של מש"א.
function copyEmployeeLink(caseId){
  const url = employeeFillUrl(caseId,"checklist");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(
      ()=>showToast("הקישור לעובד/ת הועתק."),
      ()=>showToast("שגיאה בהעתקת הקישור.")
    );
  } else {
    showToast("שגיאה בהעתקת הקישור.");
  }
}
function openEmployeeFillTab(caseId, screen){
  saveDB();
  const url = employeeFillUrl(caseId, screen);
  const win = window.open(url, "_blank");
  if(!win){ showToast("חוסם חלונות קופצים מנע פתיחת טאב נפרד. יש לאשר חלונות קופצים לעמוד זה ולנסות שוב."); }
}
function printForm(caseId,type){
  ui.currentCaseId = caseId;
  const c = getCase(caseId);
  if(c) c.lastPrintAt = new Date().toISOString();
  const screenMap = {"form101":"print-form101","bank":"print-bank","form101-bank":"print-form101-bank"};
  setScreen(screenMap[type] || "print-bank");
}

/* ============================================================
   8. מסך פתיחת קליטת עובד
   ============================================================ */
function goNewCase(){
  ui.newCaseDraft = {taxYear:2026, companyId:"", worksiteId:"", startDate:"", formLanguage:"he", formSelection: defaultFormSelection(),
    firstName:"", lastName:"", idType:"id", idNumber:"", passportNumber:"", employeeNumber:"",
    departmentId:"", subDepartmentId:"", rankId:"", gradeId:""};
  ui.newCaseErrors = {};
  setScreen("new-case");
}
function updateNewCaseDraft(field,value){
  ui.newCaseDraft[field]=value;
  if(field==="companyId") ui.newCaseDraft.worksiteId="";
  if(field==="departmentId") ui.newCaseDraft.subDepartmentId="";
  render();
}
function updateNewCaseFormSelection(key,checked){
  ui.newCaseDraft.formSelection[key] = checked;
  render();
}
function validateNewCase(){
  const d = ui.newCaseDraft, errs={};
  if(!d.taxYear) errs.taxYear="שדה חובה.";
  if(!d.companyId) errs.companyId="שדה חובה.";
  if(!d.worksiteId) errs.worksiteId="שדה חובה.";
  if(!d.formLanguage) errs.formLanguage="שדה חובה.";
  if(!d.firstName||!d.firstName.trim()) errs.firstName="שדה חובה.";
  if(!d.lastName||!d.lastName.trim()) errs.lastName="שדה חובה.";
  if(!d.idType) errs.idType="שדה חובה.";
  else if(d.idType==="id"){
    if(!d.idNumber) errs.idNumber="שדה חובה.";
    else if(!validIsraeliId(d.idNumber)) errs.idNumber="מספר זהות אינו תקין (בדיקת ספרת ביקורת נכשלה).";
  } else if(d.idType==="passport"){
    if(!d.passportNumber) errs.idNumber="שדה חובה.";
    else if(!/^[A-Za-z0-9]{3,20}$/.test(d.passportNumber)) errs.idNumber="יש להזין 3 עד 20 אותיות ו/או ספרות בלבד.";
  }
  ui.newCaseErrors = errs;
  return Object.keys(errs).length===0;
}
function submitNewCase(){
  if(!validateNewCase()){ render(); return; }
  const d = ui.newCaseDraft;
  const c = emptyCase();
  c.taxYear=Number(d.taxYear); c.companyId=d.companyId; c.worksiteId=d.worksiteId;
  c.startDate=d.startDate; c.formLanguage=d.formLanguage;
  c.formSelection = Object.assign({}, d.formSelection);
  c.needsForm101 = !!c.formSelection.form101;
  c.needsBankForm = !!c.formSelection.bank;
  // פרטי הזיהוי (שם, סוג זיהוי, מספר זהות/דרכון) נמסרים כאן בעת פתיחת
  // התיק - זהו מקור האמת היחיד להם בכל התיק. גם טופס 101 וגם טופס פרטי
  // חשבון הבנק מציגים אותם בהמשך כשדות לקריאה בלבד, ולא מאפשרים עריכה.
  c.employee.firstName = (d.firstName||"").trim();
  c.employee.lastName = (d.lastName||"").trim();
  c.employee.idType = d.idType;
  c.employee.idNumber = d.idType==="id" ? (d.idNumber||"").trim() : "";
  c.employee.passportNumber = d.idType==="passport" ? (d.passportNumber||"").trim() : "";
  // שדה חופשי לא-חובה, ממולא ע"י מנהל/ת משאבי אנוש בעת פתיחת התיק - נועד
  // ליצוא לשיקלולית/מערכת כחולה (ר' תכנון מיפוי היצוא), לא נבדק/מאומת.
  c.employee.employeeNumber = (d.employeeNumber||"").trim();
  c.departmentId = d.departmentId||""; c.subDepartmentId = d.subDepartmentId||"";
  c.rankId = d.rankId||""; c.gradeId = d.gradeId||"";
  c.documents = buildDocuments(c);
  DB.cases.push(c);
  showToast("תיק הקליטה נפתח בהצלחה.");
  // טאב מילוי הטפסים נפתח עבור העובד/ת בטאב נפרד לגמרי (ר' openEmployeeFillTab) -
  // כך שלעובד/ת אין גישה למסכי משאבי אנוש, וטאב משאבי אנוש הזה נשאר
  // על מסך התיק ויכול לשמש למעקב אחר ההתקדמות. נפתח ישירות לרשימת
  // הטפסים (checklist), כל עוד נבחר לפחות טופס אחד רלוונטי לעובד/ת.
  if(Object.keys(c.formSelection).some(k=>c.formSelection[k])){
    openEmployeeFillTab(c.id,"checklist");
  }
  openCase(c.id,"case-home");
}
function renderNewCase(){
  const d = ui.newCaseDraft || (ui.newCaseDraft={taxYear:2026,companyId:"",worksiteId:"",startDate:"",formLanguage:"he",formSelection:defaultFormSelection(),
    firstName:"",lastName:"",idType:"id",idNumber:"",passportNumber:"",employeeNumber:"",
    departmentId:"",subDepartmentId:"",rankId:"",gradeId:""});
  const errs = ui.newCaseErrors || {};
  const worksitesForCompany = CODE_TABLES.worksites.filter(w=>w.companyId===d.companyId);
  const subDepartmentsForDepartment = CODE_TABLES.subDepartments.filter(sd=>sd.departmentId===d.departmentId);
  const fld = (key,label,control,span,optional)=>'<div class="field '+(span?("span-"+span):"")+'"><label>'+label+' '+(optional?"":'<span class="req-star">*</span>')+'</label>'+control+(errs[key]?'<div class="field-error">'+errs[key]+'</div>':'')+'</div>';
  return '' +
  '<h1>פתיחת קליטת עובד חדש</h1>' +
  '<div class="panel">' +
    '<h2 class="section-title" style="margin-top:0;">פרטי החברה המעסיקה</h2>' +
    '<div class="form-grid cols-2">' +
      fld("taxYear","שנת מס",'<select onchange="updateNewCaseDraft(\'taxYear\',this.value)"><option value="2025" '+(d.taxYear==2025?"selected":"")+'>2025</option><option value="2026" '+(d.taxYear==2026?"selected":"")+'>2026</option></select>') +
      fld("companyId","חברה מעסיקה",'<select onchange="updateNewCaseDraft(\'companyId\',this.value)"><option value="">בחר/י חברה...</option>'+CODE_TABLES.companies.map(x=>'<option value="'+x.id+'" '+(d.companyId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>') +
      fld("worksiteId","אתר עבודה",'<select '+(!d.companyId?"disabled":"")+' onchange="updateNewCaseDraft(\'worksiteId\',this.value)"><option value="">'+(d.companyId?"בחר/י אתר עבודה...":"יש לבחור חברה תחילה")+'</option>'+worksitesForCompany.map(x=>'<option value="'+x.id+'" '+(d.worksiteId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>') +
      fld("startDate","תאריך תחילת עבודה",'<input type="date" value="'+d.startDate+'" onblur="updateNewCaseDraft(\'startDate\',this.value)">',null,true) +
      fld("formLanguage","שפת טופס",'<select onchange="updateNewCaseDraft(\'formLanguage\',this.value)"><option value="he" '+(d.formLanguage==="he"?"selected":"")+'>עברית</option><option value="he_en" '+(d.formLanguage==="he_en"?"selected":"")+'>עברית + אנגלית</option><option value="he_ru" '+(d.formLanguage==="he_ru"?"selected":"")+'>עברית + רוסית</option></select>') +
    '</div>' +
    '<hr class="divider">' +
    '<h2 class="section-title">פרטי העובד/ת</h2>' +
    '<div class="form-grid cols-2">' +
      fld("firstName","שם פרטי",'<input type="text" id="newcase_firstName" value="'+escapeHtml(d.firstName||"")+'" oninput="updateNewCaseDraft(\'firstName\',this.value)">') +
      fld("lastName","שם משפחה",'<input type="text" id="newcase_lastName" value="'+escapeHtml(d.lastName||"")+'" oninput="updateNewCaseDraft(\'lastName\',this.value)">') +
      fld("idType","זיהוי לפי",
        '<div class="radio-group"><label><input type="radio" name="newCaseIdType" value="id" '+(d.idType==="id"?"checked":"")+' onchange="updateNewCaseDraft(\'idType\',\'id\')"> תעודת זהות</label>'+
        '<label><input type="radio" name="newCaseIdType" value="passport" '+(d.idType==="passport"?"checked":"")+' onchange="updateNewCaseDraft(\'idType\',\'passport\')"> דרכון (עבור עובד זר)</label></div>') +
      (d.idType==="passport" ?
        fld("idNumber","מספר דרכון",'<input type="text" id="newcase_idNumber" maxlength="20" value="'+escapeHtml(d.passportNumber||"")+'" oninput="updateNewCaseDraft(\'passportNumber\',this.value.trim())">')
        :
        fld("idNumber","מספר תעודת זהות (9 ספרות)",'<input type="text" id="newcase_idNumber" maxlength="9" value="'+escapeHtml(d.idNumber||"")+'" oninput="updateNewCaseDraft(\'idNumber\',this.value.trim())">')
      ) +
      fld("employeeNumber","מספר עובד",'<input type="text" id="newcase_employeeNumber" value="'+escapeHtml(d.employeeNumber||"")+'" oninput="updateNewCaseDraft(\'employeeNumber\',this.value)">',null,true) +
      // תא ריק שממלא את הזוג של "מספר עובד" בשורה שלו - כדי שמחלקה/תת-מחלקה
      // וגם דירוג/דרגה ימשיכו להיות זוגות באותה שורה בגריד cols-2 (בלי זה,
      // מחלקה היה "נגרר" לתפוס את התא הפנוי ליד מספר עובד ומזיז את כל הזוגות
      // אחריו בשורה אחת, ר' תיקון קודם עם span-2 שהיה רחב מדי).
      '<div class="field"></div>' +
      fld("departmentId","מחלקה",'<select onchange="updateNewCaseDraft(\'departmentId\',this.value)"><option value="">בחר/י מחלקה...</option>'+CODE_TABLES.departments.map(x=>'<option value="'+x.id+'" '+(d.departmentId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>',null,true) +
      fld("subDepartmentId","תת-מחלקה",'<select '+(!d.departmentId?"disabled":"")+' onchange="updateNewCaseDraft(\'subDepartmentId\',this.value)"><option value="">'+(d.departmentId?"בחר/י תת-מחלקה...":"יש לבחור מחלקה תחילה")+'</option>'+subDepartmentsForDepartment.map(x=>'<option value="'+x.id+'" '+(d.subDepartmentId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>',null,true) +
      fld("rankId","דירוג",'<select onchange="updateNewCaseDraft(\'rankId\',this.value)"><option value="">בחר/י דירוג...</option>'+CODE_TABLES.ranks.map(x=>'<option value="'+x.id+'" '+(d.rankId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>',null,true) +
      fld("gradeId","דרגה",'<select onchange="updateNewCaseDraft(\'gradeId\',this.value)"><option value="">בחר/י דרגה...</option>'+CODE_TABLES.grades.map(x=>'<option value="'+x.id+'" '+(d.gradeId===x.id?"selected":"")+'>'+escapeHtml(x.name)+'</option>').join("")+'</select>',null,true) +
    '</div>' +
    '<hr class="divider">' +
    '<h2 class="section-title" style="margin-top:0;">טפסים רלוונטיים לעובד/ת זה</h2>' +
    '<div class="page-desc" style="margin-top:-6px;">סמן את הטפסים שהעובד נדרש למלא.</div>' +
    '<div class="form-grid cols-2">' +
      FORM_CHECKLIST_DEFS.map(def=>'<div class="field"><label class="check-row"><input type="checkbox" '+(d.formSelection[def.key]?"checked":"")+' onchange="updateNewCaseFormSelection(\''+def.key+'\',this.checked)"> '+escapeHtml(def.label)+'</label></div>').join("") +
    '</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="submitNewCase()">התחל מילוי טפסים</button>' +
      '<button class="btn btn-secondary" style="margin-right:16px;" onclick="backToList()">ביטול וחזרה לרשימה</button>' +
    '</div>' +
  '</div>';
}

/* ============================================================
   9-א. פונקציות עזר גנריות לעדכון שדות ולסימני שאלה
   ============================================================ */
let TOOLTIP_SEQ = 1;
function qmarkHtml(text){
  const id = "tt"+(TOOLTIP_SEQ++);
  /* event.preventDefault()+stopPropagation(): כשה-qmark יושב בתוך <label for="...">
     (כמו ב-f101FieldWrap), קליק עליו "מדליף" קליק אוטומטי גם לשדה הקלט המקושר
     (התנהגות ברירת מחדל של label). הקליק המדולף הזה בועה עד ל-document ומפעיל
     את הלוגיקה שסוגרת tooltip פתוח (כי מקורו מחוץ ל-.tooltip-wrap), כך
     שה-tooltip נסגר מיד אחרי שנפתח ונדמה כאילו אין לו תוכן בכלל. מניעת
     ברירת המחדל של הקליק מבטלת את ההדלפה הזו. */
  return '<span class="tooltip-wrap">'+
    '<span class="qmark" onclick="event.preventDefault();event.stopPropagation();toggleTooltip(\''+id+'\')">?</span>'+
    '<div class="tooltip-pop" id="'+id+'">'+text+'</div>'+
  '</span>';
}
function toggleTooltip(id){
  document.querySelectorAll(".tooltip-pop.open").forEach(el=>{ if(el.id!==id) el.classList.remove("open"); });
  const el = document.getElementById(id);
  if(el) el.classList.toggle("open");
}
document.addEventListener("click",function(e){
  if(!e.target.closest(".tooltip-wrap")){
    document.querySelectorAll(".tooltip-pop.open").forEach(el=>el.classList.remove("open"));
  }
});
function setPath(obj,path,value){
  const parts = path.split(".");
  let cur = obj;
  for(let i=0;i<parts.length-1;i++){ cur = cur[parts[i]]; }
  cur[parts[parts.length-1]] = value;
}
function getPath(obj,path){
  return path.split(".").reduce((o,k)=> (o===undefined||o===null)?undefined:o[k], obj);
}
/* ממפה path של מודל הנתונים (למשל "children.0.name") למזהה הודעת
   השגיאה המתאים כפי שנקבע ב-validateForm101 (למשל "f101_kid_0_name") -
   כדי שאפשר יהיה למחוק את השגיאה ברגע שהשדה מתוקן. */
function errorKeyForPath(path){
  let m;
  if((m = path.match(/^children\.(\d+)\.(.+)$/))) return "f101_kid_"+m[1]+"_"+m[2];
  if((m = path.match(/^taxCoordination\.sources\.(\d+)\.(.+)$/))) return "f101_ts_"+m[1]+"_"+m[2];
  return "f101_"+path.replace(/\./g,"_");
}
/* ============================================================
   ולידציית תוכן: הפרדה בין שני תזמונים (לא נוגעת בבדיקות "שדה חובה",
   שרצות רק בשליחה, ולא באות הבדיקות עצמן):
   1. liveFormatError - בדיקת מבנה/פורמט של מה שהוקלד עד כה בלבד
      (למשל: "רק ספרות מותרות") - רצה תוך כדי הקלדה (oninput).
   2. finalFieldError - הבדיקה המלאה הקיימת (שלמות/היגיון הערך הסופי,
      כגון אורך מדויק, ספרת ביקורת, טווח, השוואה בין שדות) - זהה
      לחלוטין לבדיקה שהייתה קיימת, רק שרצה כעת אך ורק ב-blur (יציאה
      מהשדה) או בשליחת הטופס (validateForm101), ולא תוך כדי הקלדה.
   ============================================================ */
function liveFormatError(path, value){
  if(path==="idNumber" || path==="spouse.idNumber" || /^children\.\d+\.idNumber$/.test(path)){
    if(value && !/^\d*$/.test(value)) return "יש להזין ספרות בלבד.";
    return null;
  }
  if(path==="passportNumber"){
    if(value && !/^[A-Za-z0-9]*$/.test(value)) return "יש להזין אותיות ו/או ספרות בלבד.";
    return null;
  }
  if(path==="email"){
    if(value && /\s/.test(value)) return "כתובת דוא\"ל אינה יכולה להכיל רווחים.";
    return null;
  }
  if(path==="mobilePhone" || path==="phone2"){
    if(value && !/^\d*$/.test(value)) return "מספר טלפון יכול להכיל ספרות בלבד.";
    return null;
  }
  return null; // אין כלל פורמט חי לשדה זה (למשל תאריך/מספר) - הבדיקה המלאה רצה רק ב-blur
}
function finalFieldError(path, value, emp){
  let m;
  if(path==="idNumber"){
    if(emp.idType==="id" && value && !validIsraeliId(value)) return "מספר זהות אינו תקין (בדיקת ספרת ביקורת נכשלה).";
    return null;
  }
  if(path==="passportNumber"){
    if(emp.idType==="passport" && value && !/^[A-Za-z0-9]{3,20}$/.test(value)) return "יש להזין 3 עד 20 אותיות ו/או ספרות בלבד.";
    return null;
  }
  if(path==="birthDate"){
    if(value && value>todayIso()) return "תאריך לידה אינו יכול להיות עתידי.";
    return null;
  }
  if(path==="email"){
    if(value && !validEmail(value)) return "כתובת דוא\"ל אינה תקינה.";
    return null;
  }
  if(path==="mobilePhone" || path==="phone2"){
    const p1ok = emp.mobilePhone && validPhone(emp.mobilePhone);
    const p2ok = emp.phone2 && validPhone(emp.phone2);
    if((emp.mobilePhone||emp.phone2) && !p1ok && !p2ok) return "יש למלא לפחות מספר טלפון אחד תקין (לדוגמה: 050-1234567).";
    return null;
  }
  if(path==="spouse.idNumber"){
    if(emp.spouse.idType==="id" && value && !validIsraeliId(value)) return "מספר זהות אינו תקין.";
    return null;
  }
  if((m = path.match(/^children\.(\d+)\.idNumber$/))){
    if(value && !validIsraeliId(value)) return "מספר זהות אינו תקין.";
    return null;
  }
  return null; // לשדה זה אין בדיקת תוכן - רק בדיקת "שדה חובה" שנשארת לשליחה
}
/* רץ תוך כדי הקלדה (oninput): מעדכן את הערך ומריץ רק את בדיקת הפורמט
   החיה. אינו מריץ את הבדיקה המלאה - כך שהודעת שגיאה על שלמות/היגיון
   הערך (אם הייתה קיימת מ-blur קודם) נמחקת מיד כשמתחילים לערוך מחדש,
   ותופיע שוב רק אחרי היציאה הבאה מהשדה. */
function updateEmp(path,value){
  const c = currentCase();
  setPath(c.employee, path, value);
  // ביטול תיבת ההצהרה הוא בעצם החתימה הדיגיטלית של טופס 101 - ביטולה
  // (uncheck) לאחר שהטופס כבר סומן כהושלם שקול ללחיצה על "נקה" בטפסי החתימה:
  // מבטל את סימון "הושלם" כך שהלחצן "סיימתי" ננעל שוב עד להצהרה מחדש (ר' renderForm101SectionJ).
  if(path==="declarationAccepted" && !value && c.employee.form101Status==="completed"){
    c.employee.form101Status = "pending";
    c.employee.form101CompletedAt = null;
  }
  const errKey = (path==="phone2") ? "f101_mobilePhone" : errorKeyForPath(path);
  const fmtErr = liveFormatError(path, value);
  if(fmtErr) ui.errors[errKey] = fmtErr;
  else delete ui.errors[errKey];
  render();
}
/* רץ ביציאה מהשדה (onblur): מריץ את הבדיקה המלאה הקיימת (ללא שינוי
   בכללים עצמם), בדיוק כפי שהיא תרוץ גם בשליחת הטופס. */
function finalizeEmpField(path,value){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו (ר' isRerendering) - לא פעולת יציאה אמיתית
  const c = currentCase();
  setPath(c.employee, path, value);
  const errKey = (path==="phone2") ? "f101_mobilePhone" : errorKeyForPath(path);
  const err = finalFieldError(path, value, c.employee);
  if(err) ui.errors[errKey] = err;
  else delete ui.errors[errKey];
  render();
}
/* תאריך תחילת עבודה בשנת המס - שדה ברמת התיק (c.startDate, לא emp),
   לכן לא עובר דרך updateEmp. יורש ערך מ"פתיחת תיק קליטה חדש" אם הוזן
   שם, אך ניתן לשינוי כאן וגם חובה למלא אותו כאן (שדה חובה בטופס 101),
   גם אם משאבי אנוש לא מילאו אותו מראש. */
function updateCaseStartDate(value){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו - לא פעולת יציאה אמיתית
  const c = currentCase();
  c.startDate = value;
  if(value) delete ui.errors["f101_startDate"];
  else ui.errors["f101_startDate"] = "שדה חובה.";
  render();
}
/* חבר/ת קיבוץ מוצג כשתי שאלות רדיו נפרדות (עיקרית כן/לא, ותת-שאלה
   לגבי העברת ההכנסה לקיבוץ), אבל בפועל עדיין נשמר בשדה יחיד
   kibbutzMember עם 3 ערכים אפשריים ("no"/"yes_transferred"/
   "yes_not_transferred") - כדי לא לשנות את מודל הנתונים בשאר הטופס
   (הדפסה, נתוני דוגמה וכו'). כשעוברים מ"לא" ל"כן" בשאלה העיקרית,
   משמרים את התת-בחירה הקודמת אם הייתה כזו, אחרת בוחרים ברירת מחדל. */
function updateKibbutzPrimary(v){
  const c = currentCase();
  if(v==="no"){
    c.employee.kibbutzMember = "no";
  } else if(c.employee.kibbutzMember!=="yes_transferred" && c.employee.kibbutzMember!=="yes_not_transferred"){
    c.employee.kibbutzMember = "yes_transferred";
  }
  render();
}
/* אני מבקש/ת תיאום מס (חלק ט') - כשמסמנים checkbox נפתחת שאלת סיבת הבקשה
   ושלושת האפשרויות. כשמבטלים סימון, מאפסים את הבחירה ואת מקורות ההכנסה
   שהוזנו כדי לא להשאיר נתונים לא רלוונטיים. */
function toggleTaxCoordRequested(checked){
  const c = currentCase();
  c.employee.taxCoordination.requested = checked;
  if(!checked){
    c.employee.taxCoordination.option = "";
    c.employee.taxCoordination.sources = [];
  }
  render();
}
function scrollToField(id){
  const el = document.getElementById(id) || document.getElementById(id+"_wrap");
  if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); if(el.focus) el.focus(); }
}

/* עטיפת שדה עם תווית, כוכבית חובה, סימן שאלה אופציונלי, והודעת שגיאה.
   התווית/tooltip/hint מתורגמים אוטומטית לפי id (עם נירמול אינדקס דינמי
   כמו f101_kid_0_name -> f101_kid_name, כדי ששורות חוזרות כמו ילדים/מקורות
   הכנסה ישתמשו כולן באותו מפתח תרגום) - ר' tr()/FORM101_I18N ב-i18n.js.
   labelKey (אופציונלי) - מפתח תרגום מפורש לתווית במקום הגזירה האוטומטית
   מ-id; נחוץ בשדות בודדים שבהם אותו id מציג תוכן שונה בתנאי (למשל
   f101_idNumber_ro שמציג "מספר זהות" או "מספר דרכון" לפי emp.idType). */
function f101FieldWrap(id,label,required,control,tooltipText,extraHint,spanCls,labelKey){
  const err = ui.errors[id];
  const tKey = id.replace(/_\d+_/,"_");
  const lKey = labelKey || (tKey+"_label");
  const tooltip2 = tooltipText ? tr(tKey+"_tooltip", tooltipText) : tooltipText;
  const hint2 = extraHint ? tr(tKey+"_hint", extraHint) : extraHint;
  const err2 = err ? tr(err, err) : err;
  // הכוכבית והסימן שאלה חייבים להישאר על שורת השפה הזרה (לא להידחק אחרי
  // שורת התרגום העברי) - ולכן במצב דו-לשוני בונים כאן ידנית: שפה זרה +
  // כוכבית/qmark, ואז שורת העברית מתווספת בסוף, אחרי הכל (ר' tr() לפורמט
  // הרגיל שמשמש בכל שאר המקומות שבהם אין את בעיית הסדר הזו).
  const starAndTip = (required?' <span class="req-star">*</span>':'')+(tooltip2?qmarkHtml(tooltip2):'');
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  let labelHtml;
  if(bothLang){
    const foreignLabel = rawTranslation(bothLang, lKey);
    labelHtml = foreignLabel
      ? (foreignLabel + starAndTip + '<span class="bi-he-block" dir="rtl">'+label+'</span>')
      : (label + starAndTip);
  } else {
    labelHtml = tr(lKey, label) + starAndTip;
  }
  return '<div class="field '+(spanCls||"")+'" id="'+id+'_wrap">' +
    '<label for="'+id+'">'+labelHtml+'</label>' +
    control +
    (hint2?'<div class="field-hint-static">'+hint2+'</div>':'') +
    (err2?'<div class="field-error">'+err2+'</div>':'') +
  '</div>';
}
/* בונה HTML של תווית (label) עם כוכבית חובה/סימן שאלה אופציונלי, לשימוש
   בתוויות עצמאיות של קבוצת radio/checkbox שלא עוברות דרך f101FieldWrap
   (אין להן control יחיד אחד, אלא כמה inputs מתחתן שנבנים בנפרד). אותה
   בעיית סדר בדיוק כמו ב-f101FieldWrap: במצב דו-לשוני הכוכבית/qmark חייבים
   להישאר צמודים לטקסט בשפה הזרה, ולא להידחק אחרי שורת התרגום העברי
   (שמופיעה בשורה נפרדת בגלל .bi-he-block) - קריאה ישירה ל-tr() ואז הוספת
   הכוכבית/qmark בסוף (כמו שהיה כאן לפני התיקון) גורמת להם "לצוף" מתחת
   לשתי השורות במקום להישאר צמודים לשורה הראשונה. */
function trLabelHtml(key, heFallback, required, tooltipText){
  const starAndTip = (required?' <span class="req-star">*</span>':'')+(tooltipText?qmarkHtml(tooltipText):'');
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  if(bothLang){
    const foreign = rawTranslation(bothLang, key);
    return foreign
      ? (foreign + starAndTip + '<span class="bi-he-block" dir="rtl">'+heFallback+'</span>')
      : (heFallback + starAndTip);
  }
  return tr(key, heFallback) + starAndTip;
}
const IDNUM_TOOLTIP = "אין צורך להכניס אפסים בתחילת המספר והם לא ישמרו.";
/* אייקון אזהרה (משולש צהוב עם סימן קריאה שחור) המוצג לפני שורות
   "מסמך נדרש: ..." בטופס, כדי להבליט אותן לעין. */
const WARNING_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px;"><path d="M12 2.5 L23 21.5 H1 Z" fill="#FFC700" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><rect x="10.8" y="9" width="2.4" height="7" rx="1.2" fill="#000"/><circle cx="12" cy="18.3" r="1.35" fill="#000"/></svg>';
/* אייקוני קו פשוטים (עריכה/מחיקה) לכפתורי פעולה בטבלאות - קו שחור בלבד,
   ללא מסגרת/רקע לכפתור עצמו (ר' ICON_BTN). */
const ICON_SVGS = {
  pencil: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  printer: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
};
/* כפתור אייקון "שקוף" - בלי מסגרת ובלי רקע, רק הקו של האייקון עצמו,
   באותו צבע כמו טקסט השורה; צבע שונה מופיע רק במעבר עכבר (ר' CSS
   ‎.row-icon-btn). מחלקת edit/delete קובעת את צבע ה-hover. */
function ICON_BTN(name,title,onclick,variant){
  return '<button class="row-icon-btn '+(variant||"")+'" onclick="'+onclick+'" title="'+escapeHtml(title)+'">'+ICON_SVGS[name]+'</button>';
}

/* ============================================================
   9-ב. וולידציית טופס 101
   ============================================================ */
function validateForm101(c){
  const emp = c.employee, errs = {};
  if(!c.startDate) errs["f101_startDate"]="שדה חובה.";
  // שם, סוג זיהוי ומספר זהות/דרכון מאומתים בעת פתיחת התיק (ר' validateNewCase)
  // ומוצגים כאן לקריאה בלבד - אין צורך לאמת אותם שוב במסך זה.
  if(!emp.birthDate) errs["f101_birthDate"]="שדה חובה.";
  else if(emp.birthDate > todayIso()) errs["f101_birthDate"]="תאריך לידה אינו יכול להיות עתידי.";
  if(!emp.gender) errs["f101_gender"]="שדה חובה.";
  if(!emp.maritalStatus) errs["f101_maritalStatus"]="שדה חובה.";
  if(!emp.isIsraeliResident) errs["f101_isIsraeliResident"]="שדה חובה.";
  if(!emp.healthFundMember) errs["f101_healthFundMember"]="שדה חובה.";
  else if(emp.healthFundMember==="yes" && !emp.healthFundName) errs["f101_healthFundName"]="שדה חובה כאשר חבר/ה בקופת חולים.";
  const p1ok = emp.mobilePhone && validPhone(emp.mobilePhone);
  const p2ok = emp.phone2 && validPhone(emp.phone2);
  if(!p1ok && !p2ok) errs["f101_mobilePhone"]="יש למלא לפחות מספר טלפון אחד תקין (לדוגמה: 050-1234567).";
  if(!emp.email||!emp.email.trim()) errs["f101_email"]="שדה חובה.";
  else if(!validEmail(emp.email)) errs["f101_email"]="כתובת דוא\"ל אינה תקינה.";
  if(!emp.street||!emp.street.trim()) errs["f101_street"]="שדה חובה.";
  if(!emp.houseNumber||!String(emp.houseNumber).trim()) errs["f101_houseNumber"]="שדה חובה.";
  if(!emp.city||!emp.city.trim()) errs["f101_city"]="שדה חובה.";
  if(!emp.incomeType) errs["f101_incomeType"]="שדה חובה — יש לבחור סוג הכנסה אחד ממעסיק זה.";
  if(!emp.otherIncome.has) errs["f101_otherIncomeHas"]="שדה חובה.";
  else if(emp.otherIncome.has==="yes"){
    if(!emp.otherIncome.types||!emp.otherIncome.types.length) errs["f101_otherIncomeTypes"]="יש לסמן לפחות סוג הכנסה אחד.";
    if(!emp.otherIncome.creditPointsLocation) errs["f101_creditPointsLoc"]="שדה חובה.";
    if(!emp.otherIncome.noHishtalmutDeposits || !emp.otherIncome.noPensionDeposits) errs["f101_otherIncomeDeposits"]="שדה חובה.";
  }

  if(emp.maritalStatus==="married"){
    const sp = emp.spouse;
    if(!sp.firstName||!sp.firstName.trim()) errs["f101_spouse_firstName"]="שדה חובה.";
    if(!sp.lastName||!sp.lastName.trim()) errs["f101_spouse_lastName"]="שדה חובה.";
    if(sp.idType==="id"){
      if(!sp.idNumber) errs["f101_spouse_idNumber"]="שדה חובה.";
      else if(!validIsraeliId(sp.idNumber)) errs["f101_spouse_idNumber"]="מספר זהות אינו תקין.";
    } else {
      if(!sp.passportNumber) errs["f101_spouse_passportNumber"]="שדה חובה.";
    }
    if(!sp.birthDate) errs["f101_spouse_birthDate"]="שדה חובה.";
    if(!sp.incomeStatus) errs["f101_spouse_incomeStatus"]="שדה חובה.";
  }

  emp.children.forEach((kid,idx)=>{
    if(!kid.name||!kid.name.trim()) errs["f101_kid_"+idx+"_name"]="שדה חובה.";
    if(!kid.idNumber) errs["f101_kid_"+idx+"_idNumber"]="שדה חובה.";
    else if(!validIsraeliId(kid.idNumber)) errs["f101_kid_"+idx+"_idNumber"]="מספר זהות אינו תקין.";
    if(!kid.birthDate) errs["f101_kid_"+idx+"_birthDate"]="שדה חובה.";
  });

  const tc = emp.taxCredits;
  if(tc.c3.checked){
    if(!tc.c3.fromDate) errs["f101_c3_fromDate"]="שדה חובה.";
    if(!tc.c3.settlement||!tc.c3.settlement.trim()) errs["f101_c3_settlement"]="שדה חובה.";
  }
  if(tc.c4.checked){
    if(!tc.c4.fromDate) errs["f101_c4_fromDate"]="שדה חובה.";
  }
  if(tc.c7.checked){
    ["bornThisYear","age1to2","age3","age4to5","age6to17","age18"].forEach(f=>{
      if(tc.c7[f]===""||tc.c7[f]===null||tc.c7[f]===undefined) errs["f101_c7_"+f]="שדה חובה.";
    });
  }
  if(tc.c8.checked){
    ["bornThisYear","age1to2","age3","age4to5","age6to17"].forEach(f=>{
      if(tc.c8[f]===""||tc.c8[f]===null||tc.c8[f]===undefined) errs["f101_c8_"+f]="שדה חובה.";
    });
  }
  if(tc.c11.checked){
    if(tc.c11.count===""||tc.c11.count===null||tc.c11.count===undefined) errs["f101_c11_count"]="שדה חובה.";
    else if(Number(tc.c11.count)<=0) errs["f101_c11_count"]="יש להזין מספר גדול מ-0.";
    else if(Number(tc.c11.count)>emp.children.length) errs["f101_c11_count"]="המספר לא יכול להיות גבוה ממספר הילדים שהוזנו בחלק ג'.";
  }
  if(tc.c14.checked){
    if(!tc.c14.startDate) errs["f101_c14_startDate"]="שדה חובה.";
    if(!tc.c14.endDate) errs["f101_c14_endDate"]="שדה חובה.";
    else if(tc.c14.startDate && tc.c14.endDate < tc.c14.startDate) errs["f101_c14_endDate"]="תאריך סיום לא יכול להיות לפני תאריך תחילה.";
  }
  if(tc.c16.checked){
    if(tc.c16.days===""||tc.c16.days===null||tc.c16.days===undefined) errs["f101_c16_days"]="שדה חובה.";
    else if(Number(tc.c16.days)<=0) errs["f101_c16_days"]="יש להזין מספר ימים גדול מ-0.";
  }

  if(emp.taxCoordination.requested && !emp.taxCoordination.option) errs["f101_taxCoordOption"]="שדה חובה.";
  if(emp.taxCoordination.option==="hasOtherIncome"){
    if(!emp.taxCoordination.sources.length) errs["f101_taxCoordSources"]="יש להוסיף לפחות מקור הכנסה אחד.";
    emp.taxCoordination.sources.forEach((s,idx)=>{
      if(!s.employerName) errs["f101_ts_"+idx+"_employerName"]="שדה חובה.";
      if(!s.address) errs["f101_ts_"+idx+"_address"]="שדה חובה.";
      if(!s.taxFileNum) errs["f101_ts_"+idx+"_taxFileNum"]="שדה חובה.";
      if(!s.incomeType) errs["f101_ts_"+idx+"_incomeType"]="שדה חובה.";
      if(s.monthlyIncome===""||s.monthlyIncome===undefined||s.monthlyIncome===null) errs["f101_ts_"+idx+"_monthlyIncome"]="שדה חובה.";
      if(s.taxWithheld===""||s.taxWithheld===undefined||s.taxWithheld===null) errs["f101_ts_"+idx+"_taxWithheld"]="שדה חובה.";
    });
  }

  if(!emp.declarationAccepted) errs["f101_declaration"]="יש לאשר את ההצהרה כדי לסיים.";
  return errs;
}

function submitForm101(){
  const c = currentCase();
  // פרטי חשבון בנק כבר אינם חלק ממסך טופס 101 - זהו פריט צ'ק-ליסט
  // נפרד לגמרי (ר' FORM_CHECKLIST_DEFS / renderBankForm), כך שסיום
  // טופס 101 לא נוגע כלל בסטטוס הבנק.
  const errs = validateForm101(c);
  ui.errors = errs;
  if(Object.keys(errs).length){
    render();
    setTimeout(()=>{ const k=Object.keys(errs)[0]; scrollToField(k); },60);
    showToast("נמצאו "+Object.keys(errs).length+" שגיאות למילוי. נא לתקן ולנסות שוב.");
    return;
  }
  c.employee.form101Status = "completed";
  c.employee.form101CompletedAt = new Date().toISOString();
  c.documents = buildDocuments(c);
  showToast('הטופס "כרטיס עובד (טופס 101)" סומן כהושלם.');
  backToFormsHome();
}

function deferBankDetails(){
  // "אשלים פרטי בנק במועד אחר" - נועל (disabled) את מקטע פרטי חשבון
  // הבנק בלבד, בלי לבדוק או לגעת בכלל בטופס 101 עצמו. בדיקת טופס 101
  // ועדכון סטטוסים מתבצעים אך ורק בלחיצה על "סיים והדפס טופס 101"
  // (ראו submitForm101), שמתייחס למקטע הבנק כלא-נדרש כל עוד הוא נעול.
  const c = currentCase();
  c.bank.deferred = true;
  render();
}
function reopenBankSection(){
  // "ערוך ומלא עכשיו" - העובד/ת מתחרט/ת ורוצה למלא את פרטי הבנק
  // באותה הישיבה לפני שנועלים; פותחים מחדש את המקטע לעריכה.
  const c = currentCase();
  c.bank.deferred = false;
  render();
}

/* ============================================================
   9-ג. ניהול ילדים (חלק ג')
   ============================================================ */
function addChild(){
  const c = currentCase();
  if(c.employee.children.length>=10){ showToast("ניתן להוסיף עד 10 ילדים."); return; }
  c.employee.children.push(emptyChild());
  render();
}
function removeChildRow(idx){
  const c = currentCase();
  c.employee.children.splice(idx,1);
  render();
}
function toggleChildCustody(idx,checked){
  const c = currentCase();
  const kid = c.employee.children[idx];
  kid.inCustody = checked;
  if(!checked) kid.receivesAllowance=false;
  render();
}
function toggleChildAllowance(idx,checked){
  const c = currentCase();
  const kid = c.employee.children[idx];
  if(checked && !kid.inCustody){
    ui.errors["f101_kid_"+idx+"_allowance"]="ניתן לסמן רק אם סימנת שהילד נמצא בחזקתך.";
    render();
    return;
  }
  delete ui.errors["f101_kid_"+idx+"_allowance"];
  kid.receivesAllowance = checked;
  render();
}

/* ============================================================
   9-ד. סעיפי זיכוי (חלק ח')
   ============================================================ */
function toggleCredit(key,checked){
  const c = currentCase();
  const tc = c.employee.taxCredits;
  if(typeof tc[key]==="object") tc[key].checked = checked;
  else tc[key] = checked;
  if(key==="c7" && checked) tc.c8.checked=false;
  render();
}
/* רץ תוך כדי הקלדה (oninput): מעדכן ערך בלבד. לשדות אלו (מספר/תאריך)
   אין כלל פורמט חי רלוונטי (הדפדפן עצמו מגביל לספרות בשדה number),
   ולכן שגיאת שלמות/טווח קודמת (אם הייתה) נמחקת מיד עם תחילת העריכה,
   ותופיע שוב רק ב-blur - ראו finalizeCreditField. */
function updateCreditField(key,field,value){
  const c = currentCase();
  const tc = c.employee.taxCredits;
  tc[key][field]=value;
  delete ui.errors["f101_"+key+"_"+field];
  render();
}
/* רץ ביציאה מהשדה (onblur) או בשליחת הטופס: מריץ את בדיקות השלמות/טווח
   הקיימות (ללא שינוי בכללים עצמם) - זהה למה שהיה קודם ב-updateCreditField. */
function finalizeCreditField(key,field,value){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו (ר' isRerendering) - לא פעולת יציאה אמיתית
  const c = currentCase();
  const tc = c.employee.taxCredits;
  tc[key][field]=value;
  const errKey = "f101_"+key+"_"+field;
  delete ui.errors[errKey];
  if(key==="c11" && field==="count" && value!==""&&value!==null&&value!==undefined){
    if(Number(value)<=0) ui.errors[errKey]="יש להזין מספר גדול מ-0.";
    else if(Number(value)>c.employee.children.length) ui.errors[errKey]="המספר לא יכול להיות גבוה ממספר הילדים שהוזנו בחלק ג'.";
  }
  if(key==="c16" && field==="days" && value!==""&&value!==null&&value!==undefined){
    if(Number(value)<=0) ui.errors[errKey]="יש להזין מספר ימים גדול מ-0.";
  }
  if(key==="c14" && (field==="startDate"||field==="endDate")){
    delete ui.errors["f101_c14_endDate"];
    if(tc.c14.startDate && tc.c14.endDate && tc.c14.endDate < tc.c14.startDate){
      ui.errors["f101_c14_endDate"] = "תאריך סיום לא יכול להיות לפני תאריך תחילה.";
    }
  }
  render();
}
function ageEligible1618(birthIso,taxYear){
  if(!birthIso) return false;
  const y = new Date(birthIso).getFullYear();
  const ageAtYearEnd = taxYear - y;
  return ageAtYearEnd>=16 && ageAtYearEnd<18;
}

/* ============================================================
   9-ה. תיאום מס (חלק ט') — מקורות הכנסה נוספים
   ============================================================ */
function emptyIncomeSource(){
  return {id:nextId("src"),employerName:"",address:"",taxFileNum:"",incomeType:"",monthlyIncome:"",taxWithheld:""};
}
function addIncomeSource(){
  const c = currentCase();
  c.employee.taxCoordination.sources.push(emptyIncomeSource());
  render();
}
function removeIncomeSource(idx){
  const c = currentCase();
  c.employee.taxCoordination.sources.splice(idx,1);
  render();
}

/* ============================================================
   9. מסך בית לתיק (HR) — צ'ק ליסט הטפסים (תצוגה בלבד) + כפתור פעולה יחיד
   ============================================================ */
/* mode:"actions" - טאב מילוי הטפסים (עובד/ת): כפתור התחלה/עריכה לכל שורה.
   mode:"view" - כרטיס עובד (HR, תצוגה בלבד): אין אפשרות לערוך, אבל לטופס
   שכבר הושלם מוצג כפתור "לצפייה והדפסה" שפותח את תצוגת ההדפסה שלו. */
function checklistRowsHtml(items, mode){
  return items.map(it=>{
    let badge, action = '';
    if(mode==="actions"){
      // מסך מילוי הטפסים (עובד/ת): אייקון תיבת סימון במקום תגית טקסט.
      badge = '<span title="'+(it.completed?"הושלם":"לא הושלם")+'">'+checklistCheckIcon(it.completed)+'</span>';
      action = '<button class="btn '+(it.completed?"btn-secondary":"btn-emp-start")+'" onclick="openChecklistItem(\''+it.key+'\')">'+(it.completed?"עריכה":"התחלה")+'</button>';
    } else {
      // כרטיס עובד (HR, תצוגה בלבד) - נשאר ללא שינוי: תגית טקסט + כפתור הדפסה לטופס שהושלם.
      badge = it.completed
        ? '<span class="status-pill pill-green">הושלם</span>'
        : '<span class="status-pill pill-yellow">לא הושלם</span>';
      if(it.completed) action = '<button class="checklist-print-btn" onclick="viewCompletedChecklistItem(\''+it.key+'\')" title="לצפייה והדפסה">'+ICON_SVGS.printer+'<span>הדפסה</span></button>';
    }
    const dblclick = mode==="actions" ? ' ondblclick="if(!event.target.closest(\'.checklist-action-col\')) openChecklistItem(\''+it.key+'\')" style="cursor:pointer;"' : '';
    return '<div class="checklist-row"'+dblclick+'>' +
      '<span style="font-weight:700;">'+escapeHtml(it.label)+'</span>' +
      '<span class="checklist-status-col">'+badge+'</span>' +
      '<span class="checklist-action-col">'+action+'</span>' +
    '</div>';
  }).join("");
}
function progressRingSvg(done,total,size,ringColor,textColor){
  size = size||76;
  ringColor = ringColor||"#2FA745";
  textColor = textColor||"#195E7B";
  const r = size/2 - 6, c = size/2, circumference = 2*Math.PI*r;
  const pct = total? done/total : 0;
  const offset = circumference*(1-pct);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">' +
    '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="#EEF1F3" stroke-width="9"></circle>' +
    '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+ringColor+'" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+circumference.toFixed(1)+'" stroke-dashoffset="'+offset.toFixed(1)+'" transform="rotate(-90 '+c+' '+c+')"></circle>' +
    '<text x="'+c+'" y="'+(c+6)+'" text-anchor="middle" font-size="17" font-weight="700" fill="'+textColor+'">'+Math.round(pct*100)+'%</text>' +
  '</svg>';
}
/* אייקון "הושלם" (משמש רק במסך מילוי הטפסים של העובד/ת - ר'
   checklistRowsHtml עם mode==="actions") - וי בודד ללא מסגרת (לא נראה כמו
   checkbox לחיץ), ותו ריק כשהטופס לא הושלם - במקום תגית טקסט. */
function checklistCheckIcon(checked){
  if(!checked) return '';
  return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l6 6L20 6" stroke="#2FA745" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
}
function renderCaseHome(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const emp = c.employee;
  const name = (emp.firstName||emp.lastName)?(emp.firstName+" "+emp.lastName):"(טרם הוזן שם עובד)";
  const items = relevantChecklistItems(c);
  const total = items.length, done = items.filter(i=>i.completed).length;
  const allDone = total>0 && done===total;
  return '' +
  '<button class="tab-btn active" onclick="backToList()">&rarr; חזרה לרשימת תיקי הקליטה</button>' +
  '<h1 style="margin-top:14px;">כרטיס עובד - '+escapeHtml(name)+'</h1>' +
  '<div class="panel" style="max-width:720px;">' +
    '<div class="kv">' +
      '<div class="k">חברה מעסיקה</div><div>'+escapeHtml(companyName(c.companyId))+'</div>' +
      '<div class="k">אתר עבודה</div><div>'+escapeHtml(worksiteName(c.worksiteId))+'</div>' +
      '<div class="k">תאריך תחילת עבודה</div><div>'+formatDateHe(c.startDate)+'</div>' +
      '<div class="k">שנת מס</div><div>'+c.taxYear+'</div>' +
    '</div>' +
  '</div>' +
  '<div class="panel" style="max-width:720px;">' +
    '<div style="font-weight:700;font-size:15px;color:var(--header-text);">'+done+' מתוך '+total+' טפסים הושלמו</div>' +
  '</div>' +
  '<div class="checklist-wrap">'+checklistRowsHtml(items,"view")+'</div>' +
  // אין יותר כפתור פתיחה ישירה של הטאב הנפרד - רק קישור להעתקה (ר'
  // copyEmployeeLink/employeeFillUrl למעלה) - מש"א מעתיק/ה ופותח/ת
  // ידנית בעמדת מילוי הטפסים עצמה.
  '<div class="panel" style="max-width:720px;">' +
    '<div style="font-size:13.5px;color:var(--header-text);margin-bottom:10px;">העתיקו את הקישור ופתחו אותו בעמדת מילוי הטפסים.</div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
      // צבע ירוק קבוע ב-inline style (לא class btn-primary/btn-add-green) כי
      // שניהם הופכים כתומים במסכי HR (ר' .hr-theme ב-styles.css) - כאן רוצים
      // ירוק תמיד, בלי קשר לערכת הצבע של המסך.
      '<button class="btn btn-sm" style="background:#2FA745;color:#fff;" onclick="copyEmployeeLink(\''+c.id+'\')">העתק</button>' +
      '<div style="flex:1;background:var(--bg-page);border:1px solid var(--border-teal);border-radius:8px;padding:8px 10px;">' +
        '<input readonly dir="ltr" value="'+escapeHtml(employeeFillUrl(c.id,"checklist"))+'" style="width:100%;border:none;background:transparent;font-size:13px;color:var(--header-text);text-align:left;outline:none;">' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ============================================================
   9-א. טאב מילוי הטפסים (עובד/ת) — רשימת הטפסים + מסך גנרי לטפסים
   שעדיין לא קיבלו תוכן ייעודי משלהם (ר' FORM_CHECKLIST_DEFS).
   ============================================================ */
function backToFormsHome(){
  // מפעילים במכוון על mousedown (ר' backBtn ב-renderBankForm/renderGenericChecklistItem
  // וכו') ולא על click: אם שדה טקסט (כמו מספר חשבון) עדיין ממוקד, יש
  // לוודא שה-blur/onchange שלו רץ ונשמר *לפני* שמחליפים מסך - אחרת
  // רינדור דחוי (setTimeout) שנוצר מה-blur עלול להחליף את ה-DOM בדיוק
  // בין mousedown ל-click על כפתור "חזרה" ו"לבלוע" את הלחיצה (צריך
  // ללחוץ פעמיים). קריאה יזומה ל-blur() כאן מריצה זאת באופן דטרמיניסטי.
  const activeEl = document.activeElement;
  if(activeEl && typeof activeEl.blur==="function" && activeEl!==document.body) activeEl.blur();
  flushPendingRender();
  if(ui.mode==="employee"){
    ui.screen = "checklist";
    ui.errors = {};
    render();
  } else {
    const c = currentCase();
    if(c) openCase(c.id,"case-home");
  }
}
function openChecklistItem(key){
  const c = currentCase();
  const def = FORM_CHECKLIST_DEFS.find(f=>f.key===key);
  if(!c || !def) return;
  ui.activeChecklistKey = key;
  ui.errors = {};
  if(def.kind==="form101") ui.screen = "form101";
  else if(def.kind==="bank") ui.screen = "bank-form";
  else ui.screen = "genericForm";
  render();
}
/* כרטיס עובד (HR, תצוגה בלבד) - צפייה/הדפסה של טופס שכבר הושלם, בלי
   לעבור דרך טאב מילוי הטפסים של העובד/ת ובלי לאפשר עריכה. */
function viewCompletedChecklistItem(key){
  const c = currentCase();
  const def = FORM_CHECKLIST_DEFS.find(f=>f.key===key);
  if(!c || !def) return;
  ui.activeChecklistKey = key;
  if(def.kind==="form101") printForm(c.id,"form101");
  else if(def.kind==="bank") printForm(c.id,"bank");
  else { ui.currentCaseId = c.id; ui.screen = "print-generic"; render(); }
}
function openGenericPreview(){
  ui.screen = "print-generic";
  render();
}
function finishChecklist(){
  showToast("תודה, סיימת את מילוי הטפסים.");
  render();
}
function renderEmployeeChecklist(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const emp = c.employee;
  const name = (emp.firstName||emp.lastName)?(emp.firstName+" "+emp.lastName):"(טרם הוזן שם עובד)";
  const items = relevantChecklistItems(c);
  const total = items.length, done = items.filter(i=>i.completed).length;
  const allDone = total>0 && done===total;
  return '' +
  '<div class="emp-theme">' +
  '<div class="emp-welcome-banner"><h1>שלום וברוכים הבאים '+escapeHtml(name)+'!</h1><p>נשמח שתמלא/י את כל הטפסים הבאים כדי להשלים את תהליך הקליטה שלך.</p></div>' +
  '<h1>רשימת טפסים למילוי</h1>' +
  '<div class="panel emp-progress-card" style="max-width:720px;display:flex;align-items:center;gap:22px;margin-bottom:20px;">' +
    progressRingSvg(done,total,76,"#2F6FED","#1B3F82") +
    '<div><div style="font-weight:700;font-size:16px;color:#1B3F82;">'+done+' מתוך '+total+' טפסים הושלמו</div>' +
    (allDone
      ? '<div style="font-size:13px;color:#5c7d8c;margin-top:2px;">כל הטפסים הושלמו — תודה!</div>'
      : '<div style="font-size:13px;color:#5c7d8c;margin-top:2px;">יש להשלים את שאר הטפסים ברשימה למטה.</div>') +
    '</div>' +
  '</div>' +
  '<div class="checklist-wrap">'+checklistRowsHtml(items,"actions")+'</div>' +
  '<div class="btn-row" style="justify-content:center;margin-top:24px;">' +
    '<button class="btn btn-primary" '+(allDone?"":"disabled")+' onclick="finishChecklist()">סיימתי</button>' +
  '</div>' +
  (allDone?'':'<div style="text-align:center;font-size:12px;color:#9AA5B1;margin-top:6px;">יופעל לאחר השלמת כל הטפסים</div>') +
  '</div>';
}
/* מסך גנרי לטופס שעדיין לא קיבל עיצוב/תוכן ייעודי (טופס-טופס יתווסף
   בהמשך הפיתוח - חלקם דורשים מילוי פרטים ואז חתימה, חלקם רק חתימה).
   כרגע: כותרת + תצוגה מקדימה להדפסה + סימון "סיימתי". חתימה דיגיטלית
   על הטפסים היא כיוון עתידי שטרם מומש (ר' גם ההערה בהדפסה). */
function renderGenericChecklistItem(){
  const c = currentCase();
  const key = ui.activeChecklistKey;
  const def = FORM_CHECKLIST_DEFS.find(f=>f.key===key);
  if(!c || !def) return '<div class="empty-state">טופס לא נמצא.</div>';
  // טופס "אישור על כניסה לתיבת דוא"ל", "אישור עובד לביצוע בדיקת תאי אחסון", "הסכמה
  // בדבר מסירת מידע אישי" ו"נוהל מוסכם לבדיקת פוליגרף" קיבלו תוכן אמיתי (ר'
  // renderEmailAccessForm / renderLockerCheckForm / renderDataConsentForm /
  // renderPolygraphForm) - שאר הפריטים ה-generic עדיין מוצגים במסך האחיד הזמני
  // שממשיך למטה.
  if(key==="emailAccess") return renderEmailAccessForm();
  if(key==="lockerCheck") return renderLockerCheckForm();
  if(key==="dataConsent") return renderDataConsentForm();
  if(key==="polygraph") return renderPolygraphForm();
  if(key==="safety") return renderSafetyForm();
  if(key==="pensionConfirm") return renderPensionConfirmForm();
  // מסך זה מוצג רק עבור UNBUILT_CHECKLIST_KEYS (טפסים שעדיין ללא תוכן אמיתי -
  // ר' ההערה מעל הקבוע ב-state.js) - אין להם שום דבר לאמת, ולכן "סיימתי"
  // נעול תמיד עד שייבנה תוכן אמיתי לטופס (ר' migrateCaseChecklist שמוודאת
  // שהם לעולם לא יישארו מסומנים "הושלם" גם אם ננעלו קודם).
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">'+escapeHtml(def.label)+'</h1>' +
  '<div class="page-desc">תוכן מלא לטופס זה ייקבע בהמשך הפיתוח. הטופס עדיין לא קיים ולכן אין תצוגה מקדימה, ולא ניתן לסמן כהושלם.</div>' +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" disabled title="הטופס עדיין לא קיים - אין תצוגה מקדימה">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" disabled title="הטופס עדיין לא קיים - לא ניתן לסמן כהושלם">סיימתי</button>' +
  '</div>';
}
function renderPrintGeneric(){
  const c = currentCase();
  const key = ui.activeChecklistKey;
  const def = FORM_CHECKLIST_DEFS.find(f=>f.key===key);
  if(!c || !def) return '<div class="empty-state">טופס לא נמצא.</div>';
  const emp = c.employee;
  const name = (emp.firstName||emp.lastName)?(emp.firstName+" "+emp.lastName):"";
  const isEmp = ui.mode==="employee";
  const backOnclick = isEmp ? "ui.screen='genericForm';render()" : ("openCase('"+c.id+"','case-home')");
  const backLabel = isEmp ? "חזרה לטופס" : "חזרה לתיק הקליטה";
  if(key==="emailAccess") return renderPrintEmailAccess(c, backOnclick, backLabel);
  if(key==="lockerCheck") return renderPrintLockerCheck(c, backOnclick, backLabel);
  if(key==="dataConsent") return renderPrintDataConsent(c, backOnclick, backLabel);
  if(key==="polygraph") return renderPrintPolygraph(c, backOnclick, backLabel);
  if(key==="safety") return renderPrintSafety(c, backOnclick, backLabel);
  if(key==="pensionConfirm") return renderPrintPensionConfirm(c, backOnclick, backLabel);
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">'+escapeHtml(def.label)+' — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame">' +
    '<div class="pf-header"><div><div class="pf-title">'+escapeHtml(def.label)+'</div><div class="pf-sub">הופק ממערכת קליטת עובדים חדשים (אב טיפוס)</div></div>' +
    '<div class="pf-sub" style="text-align:left;">תאריך הפקה: '+formatDateHe(todayIso())+'</div></div>' +
    '<div class="pf-section-title">פרטי העובד/ת</div>' +
    '<div class="pf-grid">'+pfCell("שם העובד/ת",name)+pfCell("חברה מעסיקה",companyName(c.companyId))+'</div>' +
    '<div class="pf-section-title">תוכן הטופס</div>' +
    '<div style="padding:14px 4px;color:#4b5765;">תוכן הטופס המלא ייקבע בהמשך הפיתוח, בהתאם לאופי הטופס הספציפי (מילוי פרטים ואז חתימה, או חתימה בלבד).</div>' +
    '<div style="margin-top:50px;display:flex;justify-content:space-between;max-width:420px;">' +
      '<div><b>חתימת העובד/ת:</b> __________________</div>' +
      '<div><b>תאריך:</b> __________________</div>' +
    '</div>' +
  '</div>';
}

/* ============================================================
   9-א. חתימה גרפית (Canvas) - רכיב לשימוש חוזר בטפסים נבחרים (לא כל הטפסים -
   ר' דוגמה בטופס "אישור על כניסה לתיבת דוא"ל" למטה). נשמרת כתמונת PNG (data
   URL) בתוך c.checklistData[key].signature, וכך משוחזרת בכל רינדור (הקנבס
   עצמו נוצר מחדש בכל render() כי app.innerHTML מוחלף לגמרי - ר' afterRenderHook
   למטה) ומוצגת גם בתצוגת ההדפסה במקום שורת "חתימה: ____" ריקה. זו חתימה
   גרפית פשוטה (תמונה) ולא חתימה אלקטרונית מאושרת בעלת תוקף משפטי אוטומטי. */
function signaturePadHtml(canvasId,key){
  return '<div style="position:relative;max-width:420px;">' +
    '<canvas id="'+canvasId+'" width="420" height="110" style="width:100%;height:110px;border:0.5px solid var(--border-teal);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;display:block;"></canvas>' +
    '<button type="button" class="btn-link" style="position:absolute;top:6px;left:8px;font-size:12px;" onclick="clearSignaturePad(\''+canvasId+'\',\''+key+'\')">נקה</button>' +
  '</div>';
}
function signaturePadDrawGuideline(ctx,canvas){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = "#C9D4DB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, canvas.height-4);
  ctx.lineTo(canvas.width-16, canvas.height-4);
  ctx.stroke();
}
function initSignaturePad(canvasId,key){
  const canvas = document.getElementById(canvasId);
  if(!canvas || canvas.dataset.sigInit) return;
  canvas.dataset.sigInit = "1";
  const ctx = canvas.getContext("2d");
  const c = currentCase();
  const saved = c && c.checklistData && c.checklistData[key] && c.checklistData[key].signature;
  if(saved){
    const img = new Image();
    img.onload = function(){ ctx.drawImage(img,0,0,canvas.width,canvas.height); };
    img.src = saved;
  } else {
    signaturePadDrawGuideline(ctx,canvas);
  }
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  let drawing = false;
  function pos(e){
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx*(canvas.width/rect.width), y: cy*(canvas.height/rect.height) };
  }
  function start(e){ drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); }
  function move(e){ if(!drawing) return; const p = pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault(); }
  function end(){
    if(!drawing) return;
    drawing = false;
    const cc = currentCase();
    if(!cc) return;
    if(!cc.checklistData) cc.checklistData = {};
    if(!cc.checklistData[key]) cc.checklistData[key] = {};
    const hadSig = !!cc.checklistData[key].signature;
    cc.checklistData[key].signature = canvas.toDataURL("image/png");
    saveDB();
    // רינדור רק במעבר מ"אין חתימה" ל"יש חתימה" - כדי לעדכן את מצב הכפתור
    // "סיימתי" (enabled/disabled), בלי לגרום להבהוב מיותר על כל משיכת קו.
    if(!hadSig) render();
  }
  canvas.addEventListener("mousedown",start);
  canvas.addEventListener("mousemove",move);
  window.addEventListener("mouseup",end);
  canvas.addEventListener("touchstart",start,{passive:false});
  canvas.addEventListener("touchmove",move,{passive:false});
  canvas.addEventListener("touchend",end);
}
function clearSignaturePad(canvasId,key){
  const c = currentCase();
  // ניקוי החתימה מבטל גם את התאריך הנעול (שנקבע בעבר בעת "סיימתי") - התאריך
  // חוזר להיות תצוגת "היום" חיה עד לחתימה+סיום מחדש (ר' finishXxxForm/renderXxxForm).
  if(c && c.checklistData && c.checklistData[key]){
    c.checklistData[key].signature = "";
    c.checklistData[key].date = "";
  }
  // ניקוי החתימה מבטל את סימון "הושלם" - כך שלחצן "סיימתי" ננעל שוב עד
  // לחתימה מחדש ולחיצה חוזרת עליו.
  if(c && c.checklist && c.checklist[key]) c.checklist[key] = false;
  const canvas = document.getElementById(canvasId);
  if(canvas){
    const ctx = canvas.getContext("2d");
    signaturePadDrawGuideline(ctx,canvas);
    // איפוס העט לצבע/עובי החתימה - signaturePadDrawGuideline משנה את strokeStyle/lineWidth
    // לצורך קו ההנחיה הבהיר, וה-ctx הוא אותו אובייקט שבו ממשיכים לצייר את החתימה הבאה.
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2.2;
  }
  saveDB();
  render(); // מעדכן את מצב הכפתור "סיימתי" בחזרה ל-disabled
}

/* ---------- אישור על כניסה לתיבת דוא"ל - תוכן אמיתי (מבוסס הטופס המודפס המקורי) ----------
   שם, סוג זיהוי ומספר זהות/דרכון נמשכים מפרטי התיק (כמו בטופס 101/טופס הבנק) ומוצגים
   לקריאה בלבד. יש למלא תאריך ולחתום בקנבס החתימה (ר' signaturePadHtml למעלה) -
   שני אלה נדרשים לפני שניתן לסמן את הטופס כהושלם. */
function finishEmailAccessForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.emailAccess) c.checklistData.emailAccess = {date:"", signature:""};
  const sigVal = c.checklistData.emailAccess.signature;
  if(!sigVal){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderEmailAccessForm)
  c.checklistData.emailAccess.date = todayIso();
  c.checklist.emailAccess = true;
  showToast('הטופס "אישור על כניסה לתיבת דוא"ל" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
const EMAIL_ACCESS_CLAUSES = [
  'במסגרת עבודתי, החברה העמידה לרשותי תיבת דוא"ל, לצרכי עבודתי.',
  'אני מתחייב/ת לעשות שימוש בתיבת הדוא"ל, אך ורק לצרכי עבודה, ומצהיר/ה כי לא אשמור מידע אישי כלשהו בתיבת הדוא"ל, וכי אין ולא תהיה לי טענה כלשהי בקשר למידע אישי שנשמר בתיבת הדוא"ל.',
  'הריני מאשר/ת לחברה ו/או מי מטעמה להיכנס לתיבת הדוא"ל, לעיין ולקרוא הודעות ולשלוח הודעות, בין אם מהמחשב שבעמדת העבודה שלי ו/או ממחשבים אחרים, מבלי לגרוע מן האמור. ידוע לי שהחברה עשויה להיכנס לתיבת הדוא"ל במקרים בהם איעדר ממקום העבודה (מכל סיבה שהיא) לצורך ביצוע העבודה, ו/או במקרים בהם יתעורר חשד להפרת אמונים מצדי, לרבות הפרת חובת הסודיות וכד\'.'
];
function emailAccessLetterHtml(c){
  const emp = c.employee;
  const idLabel = emp.idType==="id" ? "ת.ז." : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const name = ((emp.firstName||"")+" "+(emp.lastName||"")).trim();
  return '' +
  '<div style="text-align:right;font-weight:800;margin-bottom:20px;">לכבוד,<br>'+escapeHtml(companyName(c.companyId))+'</div>' +
  '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:18px;">הנדון: אישור על כניסה לתיבת דוא"ל</div>' +
  '<div style="margin-bottom:14px;">אני החתום מטה <b>'+escapeHtml(name||"—")+'</b> '+idLabel+' <b>'+escapeHtml(idValue||"—")+'</b> מצהיר/ה ומאשר/ת בזאת כדלקמן:</div>' +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:10px;">' +
    EMAIL_ACCESS_CLAUSES.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  '<div style="margin-top:22px;">ולראיה באתי על החתום:</div>';
}
function renderEmailAccessForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.emailAccess;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.emailAccess) c.checklistData.emailAccess = {date:"", signature:""};
  const sigVal = c.checklistData.emailAccess.signature || "";
  // התאריך אינו ניתן לעריכה ידנית - הוא ננעל אוטומטית למועד החתימה בפועל
  // בעת לחיצה על "סיימתי" (ר' finishEmailAccessForm). כל עוד לא נחתם, מוצג
  // תאריך היום כברירת מחדל בלבד ולא נשמר.
  const displayDate = c.checklistData.emailAccess.date || todayIso();
  const canFinish = !!sigVal && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">אישור על כניסה לתיבת דוא"ל</h1>' +
  '<div class="page-desc">הפרטים האישיים מולאו אוטומטית מפרטי תיק הקליטה. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    emailAccessLetterHtml(c) +
    '<div style="margin-top:14px;font-size:14px;"><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("emailAccess_sigCanvas","emailAccess") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishEmailAccessForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintEmailAccess(c, backOnclick, backLabel){
  const dateVal = c.checklistData && c.checklistData.emailAccess && c.checklistData.emailAccess.date;
  const sigVal = c.checklistData && c.checklistData.emailAccess && c.checklistData.emailAccess.signature;
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">אישור על כניסה לתיבת דוא"ל — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:13px;line-height:1.9;">' +
    emailAccessLetterHtml(c) +
    '<div style="margin-top:60px;display:flex;justify-content:space-between;align-items:baseline;max-width:420px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(dateVal?formatDateHe(dateVal):"__________________")+'</div>' +
      '<div><b>חתימת העובד/ת:</b> '+(sigVal ? ('<img src="'+sigVal+'" style="height:44px;vertical-align:-3.2px;">') : '__________________')+'</div>' +
    '</div>' +
  '</div>';
}

/* ---------- אישור עובד לביצוע בדיקת תאי אחסון - תוכן אמיתי (זהה במבנה לטופס
   "אישור על כניסה לתיבת דוא"ל" לעיל, רק הנוסח שונה) ---------- */
function finishLockerCheckForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.lockerCheck) c.checklistData.lockerCheck = {date:"", signature:""};
  const sigVal = c.checklistData.lockerCheck.signature;
  if(!sigVal){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderLockerCheckForm)
  c.checklistData.lockerCheck.date = todayIso();
  c.checklist.lockerCheck = true;
  showToast('הטופס "אישור עובד לביצוע בדיקת תאי אחסון" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
const LOCKER_CHECK_CLAUSES = [
  'במסגרת עבודתי, החברה מעמידה לרשותי תא איחסון ("לוקר") לצורך אחסנת חפציי האישיים במהלך המשמרת.',
  'בחתימתי מטה אני מצהיר שידוע לי שכתנאי להעמדת הלוקר לרשותי, באפשרות החברה לבצע מעת לעת בדיקות יזומות של הלוקר, בנוכחותי, בין אם בדיקות שהחברה תודיע עליהן מראש ו/או בדיקות פתע, עבור פיקוח על מלאי החברה ומניעת עבירות רכוש.'
];
function lockerCheckLetterHtml(c){
  const emp = c.employee;
  const idLabel = emp.idType==="id" ? "ת.ז." : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const name = ((emp.firstName||"")+" "+(emp.lastName||"")).trim();
  return '' +
  '<div style="text-align:right;font-weight:800;margin-bottom:20px;">לכבוד,<br>'+escapeHtml(companyName(c.companyId))+'</div>' +
  '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:18px;">הנדון: אישור עובד לביצוע בדיקות תאי אחסון "לוקרים"</div>' +
  '<div style="margin-bottom:14px;">אני החתום מטה <b>'+escapeHtml(name||"—")+'</b> '+idLabel+' <b>'+escapeHtml(idValue||"—")+'</b> מצהיר/ה ומאשר/ת בזאת כדלקמן:</div>' +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:10px;">' +
    LOCKER_CHECK_CLAUSES.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  '<div style="margin-top:22px;">ולראיה באתי על החתום:</div>';
}
function renderLockerCheckForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.lockerCheck;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.lockerCheck) c.checklistData.lockerCheck = {date:"", signature:""};
  const sigVal = c.checklistData.lockerCheck.signature || "";
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד החתימה בפועל (ר' finishLockerCheckForm)
  const displayDate = c.checklistData.lockerCheck.date || todayIso();
  const canFinish = !!sigVal && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">אישור עובד לביצוע בדיקת תאי אחסון</h1>' +
  '<div class="page-desc">הפרטים האישיים מולאו אוטומטית מפרטי תיק הקליטה. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    lockerCheckLetterHtml(c) +
    '<div style="margin-top:14px;font-size:14px;"><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("lockerCheck_sigCanvas","lockerCheck") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishLockerCheckForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintLockerCheck(c, backOnclick, backLabel){
  const dateVal = c.checklistData && c.checklistData.lockerCheck && c.checklistData.lockerCheck.date;
  const sigVal = c.checklistData && c.checklistData.lockerCheck && c.checklistData.lockerCheck.signature;
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">אישור עובד לביצוע בדיקת תאי אחסון — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:13px;line-height:1.9;">' +
    lockerCheckLetterHtml(c) +
    '<div style="margin-top:60px;display:flex;justify-content:space-between;align-items:baseline;max-width:420px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(dateVal?formatDateHe(dateVal):"__________________")+'</div>' +
      '<div><b>חתימת העובד/ת:</b> '+(sigVal ? ('<img src="'+sigVal+'" style="height:44px;vertical-align:-3.2px;">') : '__________________')+'</div>' +
    '</div>' +
  '</div>';
}

/* ---------- הסכמה בדבר מסירת מידע אישי - תוכן אמיתי (מבוסס הטופס המודפס המקורי:
   "הודעה והסכמה בדבר איסוף, עיבוד ומסירת מידע אישי – מאגר עובדים") ----------
   שם החברה נמשך מפרטי התיק, ח.פ נמשך מפרטי החברה כפי שהוזנו בהגדרות המערכת,
   ושם/מספר הזהות של העובד/ת נמשכים מכרטיס העובד - כל השדות הללו לקריאה בלבד. */
function finishDataConsentForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.dataConsent) c.checklistData.dataConsent = {date:"", signature:""};
  const sigVal = c.checklistData.dataConsent.signature;
  if(!sigVal){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderDataConsentForm)
  c.checklistData.dataConsent.date = todayIso();
  c.checklist.dataConsent = true;
  showToast('הטופס "הסכמה בדבר איסוף, עיבוד ומסירת מידע אישי" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
const DATA_CONSENT_PURPOSES = [
  'ניהול משאבי אנוש, ובכלל זה גיוס, קליטה, שיבוץ, הערכה, קידום, העסקה וסיום יחסי עבודה.',
  'תשלום שכר, הפרשות סוציאליות, הטבות, ותשלומים נלווים.',
  'עמידה בדרישות חוקיות ורגולטוריות (כגון דיני עבודה, ביטוח לאומי, רשויות המס).',
  'ניהול מערכות מידע ואבטחתן (כולל גישה למערכות המחשוב, דואר אלקטרוני, תקשורת, מצלמות אבטחה במידת הצורך).'
];
const DATA_CONSENT_CATEGORIES = [
  'פרטי זיהוי והתקשרות: שם, ת"ז, כתובת, טלפון, דוא"ל, מצב משפחתי.',
  'פרטי העסקה ושכר: תפקיד, דרגה, ותק, שעות עבודה (נוכחות), נתוני שכר, חשבון בנק, ניכויי מס.',
  'מידע השכלתי ומקצועי: קורות חיים, תעודות, רישיונות, תוצאות מבחני מיון והערכה.',
  'מידע רגיש: מצב בריאותי (לצורך עמידה בחוקי עבודה להתאמות נגישות, אישורי מחלה וכו\').',
  'מידע ביומטרי (אם משתמשים בשעון נוכחות ביומטרי – דבר המצריך בדיקת מידתיות מיוחדת והסכמה מפורשת ומודעת ביותר).'
];
const DATA_CONSENT_SHARING_TEXT = 'חלק מהמידע נדרש מכוח חובה חוקית (כגון דיני מס, ביטוח לאומי) או מכוח החוזה/יחסי עבודה (כגון פרטי חשבון בנק, נתוני נוכחות). המידע האישי הנאסף עשוי להיות מועבר לגורמים שונים לצורך מימוש מטרות המאגר (כגון רשויות המדינה, כגון רשות המיסים, המוסד לביטוח לאומי), וכן לספקי שירות חיצוניים של החברה (כגון מנהל חשבונות, חשב שכר, יועצים משפטיים, חברות ביטוח ופנסיה, ספקי שירותי IT, ספקי שירותי שכר), ובהתאם להוראות החוק ולצרכים שיפוטיים המורשים לחברה על העברת מידע, ככל שיוצאו כאלו שיחייבו את החברה להעברת מידע בהתאם לחוק.';
const DATA_CONSENT_DECLARATION_TEXT = 'אני החתום/ה מטה, מאשר/ת כי קראתי את ההודעה המפורטת לעיל בדבר איסוף, עיבוד והעברת המידע האישי שלי במאגר עובדי החברה, לרבות מטרות האיסוף, סוגי המידע הנאספים והעברת המידע לצדדים שלישיים. לאחר שקראתי את כל סעיפי ופרטי הודעה זו אני מסכים/ה באופן מפורש לאיסוף, עיבוד והעברת המידע האישי שלי על ידי החברה למטרות המפורטות ובהתאם להוראות חוק הגנת הפרטיות וכל דין או צו שיפוטי. אני מאשר/ת כי ניתנה לי האפשרות לשאול שאלות בנוגע לתוכן ההודעה וכי אני מודע/ת לזכויותיי כנושא המידע.';
function dataConsentLetterHtml(c){
  const emp = c.employee;
  const idLabel = emp.idType==="id" ? "מס ת.ז" : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const name = ((emp.firstName||"")+" "+(emp.lastName||"")).trim();
  const company = CODE_TABLES.companies.find(x=>x.id===c.companyId) || {};
  return '' +
  '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:18px;">הודעה והסכמה בדבר איסוף, עיבוד ומסירת מידע אישי – מאגר עובדים</div>' +
  '<div style="margin-bottom:16px;">החברה: <b style="text-decoration:underline;">'+escapeHtml(companyName(c.companyId))+'</b> &nbsp;&nbsp; ח.פ <b style="text-decoration:underline;">'+escapeHtml(company.companyRegNum||"—")+'</b> מנהלת מאגר מידע אודות עובדיה, לרבות עובדים לשעבר ומועמדים לעבודה.</div>' +
  '<div style="margin-bottom:8px;">המאגר הינו לשימוש בלעדי של החברה למטרות המפורטות להלן:</div>' +
  '<ul style="padding-right:20px;margin:0 0 16px;display:flex;flex-direction:column;gap:6px;">' +
    DATA_CONSENT_PURPOSES.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ul>' +
  '<div style="margin-bottom:8px;">סוגי המידע הנאספים ונשמרים במאגר העובדים של החברה:</div>' +
  '<ul style="padding-right:20px;margin:0 0 16px;display:flex;flex-direction:column;gap:6px;">' +
    DATA_CONSENT_CATEGORIES.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ul>' +
  '<div style="margin-bottom:14px;">'+escapeHtml(DATA_CONSENT_SHARING_TEXT)+'</div>' +
  '<div style="margin-bottom:20px;">'+escapeHtml(DATA_CONSENT_DECLARATION_TEXT)+'</div>' +
  '<div class="form-grid cols-2" style="max-width:500px;">' +
    '<div><b>שם מלא:</b> <span style="text-decoration:underline;">'+escapeHtml(name||"—")+'</span></div>' +
    '<div><b>'+idLabel+':</b> <span style="text-decoration:underline;">'+escapeHtml(idValue||"—")+'</span></div>' +
  '</div>';
}
function renderDataConsentForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.dataConsent;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.dataConsent) c.checklistData.dataConsent = {date:"", signature:""};
  const sigVal = c.checklistData.dataConsent.signature || "";
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד החתימה בפועל (ר' finishDataConsentForm)
  const displayDate = c.checklistData.dataConsent.date || todayIso();
  const canFinish = !!sigVal && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">הודעה והסכמה בדבר איסוף, עיבוד ומסירת מידע אישי – מאגר עובדים</h1>' +
  '<div class="page-desc">הפרטים האישיים ופרטי החברה מולאו אוטומטית מפרטי תיק הקליטה ומהגדרות המערכת. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    dataConsentLetterHtml(c) +
    '<div style="margin-top:14px;font-size:14px;"><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("dataConsent_sigCanvas","dataConsent") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishDataConsentForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintDataConsent(c, backOnclick, backLabel){
  const dateVal = c.checklistData && c.checklistData.dataConsent && c.checklistData.dataConsent.date;
  const sigVal = c.checklistData && c.checklistData.dataConsent && c.checklistData.dataConsent.signature;
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">הסכמה בדבר איסוף, עיבוד ומסירת מידע אישי — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:13px;line-height:1.9;">' +
    dataConsentLetterHtml(c) +
    '<div style="margin-top:40px;display:flex;justify-content:space-between;align-items:baseline;max-width:420px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(dateVal?formatDateHe(dateVal):"__________________")+'</div>' +
      '<div><b>חתימת העובד/ת:</b> '+(sigVal ? ('<img src="'+sigVal+'" style="height:44px;vertical-align:-3.2px;">') : '__________________')+'</div>' +
    '</div>' +
  '</div>';
}

/* ---------- נוהל מוסכם לבדיקת פוליגרף - תוכן אמיתי (מבוסס הטופס המודפס המקורי:
   "נספח נוהל מוסכם לעריכת בדיקת פוליגרף") ----------
   שם פרטי, שם משפחה ומספר הזהות/דרכון נמשכים מכרטיס העובד/ת ומוצגים לקריאה בלבד.
   "מספר עובד" ו"מס' כרטיס" הם שדות טקסט חופשיים וריקים (לא נשלפים משום מקום -
   ייתכן ויוסרו בהמשך אם יתברר שאינם נחוצים). שם החברה בגוף הטופס הוא קבוע
   ("אורשר מחסני ערובה 1985 בע"מ") ואינו תלוי בחברה המעסיקה של התיק. */
const POLYGRAPH_TITLE = 'נספח נוהל מוסכם לעריכת בדיקת פוליגרף';
/* לוגו וכותרת תחתונה של אורשר - משותפים לכל הטפסים שבהם צריך להציג אותם
   (למשל פוליגרף, הנחיות בטיחות). */
const COMPANY_LOGO_HTML = '<div style="text-align:right;margin-bottom:10px;"><img src="assets/orshar_logo.png" alt="אורשר" style="height:20px;"></div>';
const COMPANY_FOOTER_HTML = '<div style="margin-top:26px;padding-top:8px;border-top:1px solid #ccc;text-align:center;font-size:9.5px;color:#333;">' +
  '<div>אורשר מחסני ערובה (1985) בע"מ | ח.פ 511050783</div>' +
  '<div>ת.ד 4033 מיקוד 77140 אשדוד | טלפון: 08-8516000 | פקס: 08-8516009 | www.orshar.co.il | info@orshar.co.il</div>' +
'</div>';
const POLYGRAPH_COMPANY_NAME = 'אורשר מחסני ערובה 1985 בע"מ';
function updatePolygraphField(field,val){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.polygraph) c.checklistData.polygraph = {date:"", employeeNumber:"", cardNumber:""};
  c.checklistData.polygraph[field] = val;
  render();
}
function finishPolygraphForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.polygraph) c.checklistData.polygraph = {date:"", employeeNumber:"", cardNumber:"", signature:""};
  const sigVal = c.checklistData.polygraph.signature;
  if(!sigVal){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderPolygraphForm)
  c.checklistData.polygraph.date = todayIso();
  c.checklist.polygraph = true;
  showToast('הטופס "נוהל מוסכם לבדיקת פוליגרף" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
const POLYGRAPH_PARAGRAPHS_1 = [
  'אני החתום/ה בזה נותן את הסכמתי המפורשת והבלתי-מסויגת להיבדק במכונת פוליגרף, במועד ובמקום ככל שתורה לי חברת '+POLYGRAPH_COMPANY_NAME+' (להלן: "החברה"), בהתגלע חשד ו/או חשש כלשהו למעשה ו/או מחדל העולים לכדי מרמה ו/או הטעיה ו/או הפרת אמונים ו/או הפרת חובת נאמנות ו/או גניבה ו/או סיוע לגניבה ו/או זיוף ו/או סיוע לזיוף ו/או התנהגות אחרת שאינה הולמת עובד ו/או קשירת קשר לביצוע מעשה או מחדל כאמור [להלן: "החשד ו/או החשש"].',
  'אני מקבל על עצמי באופן מוחלט ובלתי חוזר את תוצאות בדיקת הפוליגרף והנני מסכים כי החברה תהא רשאית להגיש את ממצאי בדיקת הפוליגרף בכל הליך שיפוטי ו/או מעין שיפוטי ו/או משמעתי, לרבות הליך המתקיים בפני בית משפט ו/או בית דין ו/או בפני בורר, בין אם במסגרת ההליך המתנהל, חלים דיני הראיות ובין אם הם אינם חלים. הנני מוותר בזאת על כל טענה בדבר חוסר קבילות ו/או רלוונטיות, ולא יהיה לי כל פתחון פה בנוגע להגשת ממצאי בדיקת הפוליגרף, לרלוונטיות ו/או לקבילות ממצאי הבדיקה הנ"ל.',
  'הנני נותן בזה את הסכמתי המפורשת והבלתי חוזרת לכך שממצאי הפוליגרף, ככל שהן מבססות את החשד ו/או החשש, ישמשו ראיה קונקלוסיבית לאמיתות תוכנם, ויהוו הוכחה בלעדית ומכרעת, בכל הליך כאמור לעיל, ובפני כל ערכאה משפטית ו/או גוף שלטוני ו/או מעין שיפוטי.',
  'מוסכם עלי כי החברה תגיש את ממצאי בדיקת הפוליגרף באם תבחר לעשות כן ולפי שיקול דעתה הבלעדי. וכי אין החברה מחויבת להגיש את ממצאי בדיקת הפוליגרף לכל ערכאה ו/או גוף שהם ואף אינה מחויבת לגלותם לח"מ או לכל אדם ו/או גוף אחר.',
  'מוסכם עלי כי אם אסרב מכל סיבה שהיא להיבדק בבדיקת פוליגרף, יהווה סירובי, ראיה מכרעת לביסוס החשד ו/או החשש, וכי הנטל להוכחת גרסתי השונה, יוטל עלי. מוסכם כי אם לא הוכחתי להנחת דעת החברה את גרסתי השונה, יהא דיני כפי הקבוע להלן למקרה בו הוכח החשד ו/או החשש.'
];
const POLYGRAPH_LIST_INTRO = 'הוכח החשד ו/או החשש באמצעות בדיקת הפוליגרף ו/או בכל אמצעי אחר, הנני מסכים כי תהא החברה רשאית לנהוג בי כאמור להלן, לחילופין או במצטבר, הכל לפי שיקול דעתה הבלעדי:';
const POLYGRAPH_LIST_ITEMS = [
  'לפטרני ללא צורך בהודעה מוקדמת בדבר פיטורין.',
  'לפטרני ללא תשלום דמי הודעה מוקדמת וכן ללא תשלום פיצויי פיטורין בסכום כלשהו או בתשלום דמי הודעה מוקדמת ו/או פיצויי פיטורין חלקיים.',
  'להטיל עלי קנס/ות בשיעור שיראה בעיניה סביר ומקובל בנסיבות העניין, בקביעת שיעור הקנס/ות תביא החברה בחשבון את הנהוג בהטלת קנסות ושיעורן, בהסכמים הקיבוציים הכלליים החלים עלי.'
];
const POLYGRAPH_PARAGRAPHS_2 = [
  'הובאה סוגיית פיטורי ו/או תשלום פיצויי פיטורין ו/או מתן הודעה מוקדמת על פיטורין ו/או דמי הודעה מוקדמת ו/או הטלת קנסות ו/או שיעוריהן ו/או כל עניין אחר הקשור ו/או נובע מן העניינים האמורים, לדיון בפני ערכאה משפטית כלשהי לרבות בית דין ו/או גוף מעין שיפוטי, לרבות בורר, דינם של ממצאי הפוליגרף בעניינים אלה, כפי דינם האמור לעיל להוכחת קיומו של החשד ו/או החשש, דהיינו ישמשו ראיה קונקלוסיבית, בלעדית ומכרעת לאמיתות תוכנם.',
  'אני מתחייב לשאת בעלות מלאה של בדיקת הפוליגרף אם לפי ממצאיה לא ברור באופן מוחלט וחד משמעי, כי כל דברי אמת וכי מסרתי בכתב את כל הפרטים ו/או הנתונים הרלוונטיים לחברה בין מיוזמתי ובין לפי דרישת החברה, וכן ובמצטבר כי נוכח הממצאים החד משמעיים (בגבולות האפשר) של בדיקת הפוליגרף, אין ולא היה כל בסיס לחשד ו/או לחשש.',
  'הנני מאשר בזאת כי אני חותם על מסמך זה לאחר שחקרתי ובררתי את המשמעות המדויקת של חתימתי על נספח, ולאחר שהוסברה לי משמעות תוצאות בדיקת הפוליגרף לפיהן אינני דובר אמת, וכן לאחר שהוסבר לי כי אינני מחויב לחתום כלל על נספח זה.'
];
const POLYGRAPH_CLOSING_LINE = 'לאחר שקראתי היטב את האמור לעיל, ולאחר שנחה דעתי כי הבנתי את ההסברים שקיבלתי, ולאחר שגמרתי בדעתי להתחייב כאמור לעיל, הנני חותם על נספח זה:';
function polygraphBodyHtml(){
  return '' +
  POLYGRAPH_PARAGRAPHS_1.map(t=>'<div style="margin-bottom:14px;break-inside:avoid;">'+escapeHtml(t)+'</div>').join("") +
  '<div style="margin-bottom:8px;break-inside:avoid;">'+escapeHtml(POLYGRAPH_LIST_INTRO)+'</div>' +
  '<ol style="padding-right:20px;margin:0 0 16px;">' +
    POLYGRAPH_LIST_ITEMS.map(t=>'<li style="margin-bottom:6px;break-inside:avoid;">'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  POLYGRAPH_PARAGRAPHS_2.map(t=>'<div style="margin-bottom:14px;break-inside:avoid;">'+escapeHtml(t)+'</div>').join("") +
  '<div style="margin-top:6px;break-inside:avoid;">'+escapeHtml(POLYGRAPH_CLOSING_LINE)+'</div>';
}
function polygraphHeaderFieldsHtml(c){
  const emp = c.employee;
  const idLabel = emp.idType==="id" ? "מספר ת.ז" : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  return '' +
    '<div><b>שם פרטי:</b> '+escapeHtml(emp.firstName||"—")+'</div>' +
    '<div><b>שם משפחה:</b> '+escapeHtml(emp.lastName||"—")+'</div>' +
    '<div><b>'+idLabel+':</b> '+escapeHtml(idValue||"—")+'</div>';
}
function renderPolygraphForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.polygraph;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.polygraph) c.checklistData.polygraph = {date:"", employeeNumber:"", cardNumber:"", signature:""};
  const data = c.checklistData.polygraph;
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד החתימה בפועל (ר' finishPolygraphForm)
  const displayDate = data.date || todayIso();
  const canFinish = !!data.signature && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">'+POLYGRAPH_TITLE+'</h1>' +
  '<div class="page-desc">הפרטים האישיים מולאו אוטומטית מפרטי תיק הקליטה. "מספר עובד" ו"מס\' כרטיס" ניתנים למילוי חופשי. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    COMPANY_LOGO_HTML +
    '<div class="form-grid cols-5" style="margin-bottom:16px;">' +
      polygraphHeaderFieldsHtml(c) +
      f101FieldWrap("polygraph_employeeNumber","מספר עובד",false,'<input type="text" id="polygraph_employeeNumber" value="'+escapeHtml(data.employeeNumber||"")+'" onchange="updatePolygraphField(\'employeeNumber\',this.value)">') +
      f101FieldWrap("polygraph_cardNumber","מס\' כרטיס",false,'<input type="text" id="polygraph_cardNumber" value="'+escapeHtml(data.cardNumber||"")+'" onchange="updatePolygraphField(\'cardNumber\',this.value)">') +
    '</div>' +
    polygraphBodyHtml() +
    '<div style="margin-top:14px;font-size:14px;"><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("polygraph_sigCanvas","polygraph") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
    COMPANY_FOOTER_HTML +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishPolygraphForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintPolygraph(c, backOnclick, backLabel){
  const data = (c.checklistData && c.checklistData.polygraph) || {};
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">נוהל מוסכם לבדיקת פוליגרף — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:11.5px;line-height:1.55;">' +
    COMPANY_LOGO_HTML +
    '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:14px;">'+POLYGRAPH_TITLE+'</div>' +
    '<div class="form-grid cols-5" style="margin-bottom:14px;">' +
      polygraphHeaderFieldsHtml(c) +
      '<div><b>מספר עובד:</b> '+escapeHtml(data.employeeNumber||"__________")+'</div>' +
      '<div><b>מס\' כרטיס:</b> '+escapeHtml(data.cardNumber||"__________")+'</div>' +
    '</div>' +
    '<div style="column-count:2;column-gap:26px;column-rule:1px solid #d5dbe1;">' +
      polygraphBodyHtml() +
    '</div>' +
    '<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:baseline;max-width:420px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(data.date?formatDateHe(data.date):"__________________")+'</div>' +
      '<div><b>חתימת העובד/ת:</b> '+(data.signature ? ('<img src="'+data.signature+'" style="height:44px;vertical-align:-3.2px;">') : '__________________')+'</div>' +
    '</div>' +
    COMPANY_FOOTER_HTML +
  '</div>';
}

/* ---------- הנחיות בטיחות בעבודה - תוכן אמיתי (מבוסס הטופס המודפס המקורי:
   "הנחיות בטיחות בעבודה לעובד/ת חדש/ה") ----------
   שם חברה נמשך דינמית מהחברה של התיק, שם ומשפחה ותעודת זהות/דרכון נמשכים
   מכרטיס העובד/ת (לקריאה בלבד), אותה תבנית לוגו/כותרת תחתונה כמו בטופס
   הפוליגרף (ר' COMPANY_LOGO_HTML / COMPANY_FOOTER_HTML). */
const SAFETY_TITLE = 'הנחיות בטיחות בעבודה לעובד/ת חדש/ה';
function finishSafetyForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.safety) c.checklistData.safety = {date:"", signature:""};
  const sigVal = c.checklistData.safety.signature;
  if(!sigVal){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderSafetyForm)
  c.checklistData.safety.date = todayIso();
  c.checklist.safety = true;
  showToast('הטופס "הנחיות בטיחות בעבודה" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
const SAFETY_DUTIES = [
  'לבצע בדייקנות את ההוראות שנותן מנהל העבודה.',
  'לא להתרשל בעבודה.',
  'אשתמש ואשמור על כל ציוד הבטיחות שנופק לי.',
  'לא לגרום נזק לציוד, חומרים או כלי-עבודה.',
  'לא לבצע עבודה שלא ניתן לך הסבר מפורט לאופן ביצוע העבודה.',
  'לא להסתובב בתחומי המפעל שלא לצורך.',
  'שמור על סביבת עבודה נקיה ומסודרת.',
  'אסור לעשן במחסנים.',
  'חל איסור על עבודה מעל 12 שעות ביום.',
  'אסור למשוך אריזות ברצועות הקשירה.',
  'אין להשתמש בטלפון בשעת העבודה.',
  'אין לשים אוזניה בשעות העבודה (מותר מוסיקה חלשה ברקע).',
  'אין לרוץ במחסן ובעלייה או בירידה במדרגות חובה לאחוז במעקה.',
  'במקרה של תאונה, נזק לציוד וכד\', חובה לדווח מיד לראש הצוות.'
];
const SAFETY_CLOTHING = [
  'חולצה נקיה ומכנסיים נקיים.',
  'נעלי עבודה עם כיפת ברזל (אסורים כל סוגי הסנדלים).',
  'נעליים שלמות רק לעובדים משרדים שלא נכנסים למחסן.'
];
const SAFETY_ELECTRICAL = [
  'אל תיגש ללוחות חשמל.',
  'אל תנסה לתקן או לפרק כלי עבודה המופעל בחשמל.',
  'אל תנסה לתקן תקלות בחשמל (כולל הרמת מא"ז).'
];
const SAFETY_FORKLIFT_NOTICE = 'עבודה עם מלגזת אדם עומד מחייב רישיון נהיגה ופתיחת כרטיס נהג';
const SAFETY_GENERAL_ITEM1 = 'יש לקבל תדריך לעובד החדש מראש הצוות ליד פינת העבודה שלך.';
const SAFETY_GENERAL_ITEM2_INTRO = 'התדריך יכול לסיים עם הנושאים הבאים:';
const SAFETY_GENERAL_SUBITEMS = [
  'הכרת המתחם (דלתות מילוט)',
  'תחום המחלקה כולל ר"צ.',
  'חדר אוכל וזמני הפסקות.',
  'חדרי מנהלים וראשי צוותים.',
  'בעיות או סיכונים מיוחדים במחלקה.'
];
function safetySectionTitleHtml(t){
  return '<div style="font-weight:700;font-size:14px;margin:12px 0 6px;">'+escapeHtml(t)+'</div>';
}
function safetyBodyHtml(){
  return '' +
  safetySectionTitleHtml('חובות העובד:') +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:4px;">' +
    SAFETY_DUTIES.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  safetySectionTitleHtml('בגדי עבודה:') +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:4px;">' +
    SAFETY_CLOTHING.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  safetySectionTitleHtml('בטיחות בחשמל:') +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:4px;">' +
    SAFETY_ELECTRICAL.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
  '</ol>' +
  '<div class="alert alert-warning-yellow" style="text-align:center;font-weight:700;margin-top:12px;padding:8px 12px;">'+escapeHtml(SAFETY_FORKLIFT_NOTICE)+'</div>' +
  safetySectionTitleHtml('כללי:') +
  '<ol style="padding-right:20px;margin:0;display:flex;flex-direction:column;gap:4px;">' +
    '<li>'+escapeHtml(SAFETY_GENERAL_ITEM1)+'</li>' +
    '<li>'+escapeHtml(SAFETY_GENERAL_ITEM2_INTRO)+
      '<ul style="padding-right:20px;margin:6px 0 0;display:flex;flex-direction:column;gap:4px;list-style-type:disc;">' +
        SAFETY_GENERAL_SUBITEMS.map(t=>'<li>'+escapeHtml(t)+'</li>').join("") +
      '</ul>' +
    '</li>' +
  '</ol>';
}
function safetyStaticFieldsHtml(c){
  const emp = c.employee;
  const idLabel = emp.idType==="id" ? "תעודת זהות" : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const name = ((emp.firstName||"")+" "+(emp.lastName||"")).trim();
  return '' +
    '<div><b>שם חברה:</b> '+escapeHtml(companyName(c.companyId))+'</div>' +
    '<div><b>שם ומשפחה:</b> '+escapeHtml(name||"—")+'</div>' +
    '<div><b>'+idLabel+':</b> '+escapeHtml(idValue||"—")+'</div>';
}
function renderSafetyForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.safety;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.safety) c.checklistData.safety = {date:"", signature:""};
  const data = c.checklistData.safety;
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד החתימה בפועל (ר' finishSafetyForm)
  const displayDate = data.date || todayIso();
  const canFinish = !!data.signature && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">'+SAFETY_TITLE+'</h1>' +
  '<div class="page-desc">הפרטים האישיים מולאו אוטומטית מפרטי תיק הקליטה. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    COMPANY_LOGO_HTML +
    safetyBodyHtml() +
    '<div class="form-grid cols-4" style="margin-top:12px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
      safetyStaticFieldsHtml(c) +
    '</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("safety_sigCanvas","safety") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
    COMPANY_FOOTER_HTML +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishSafetyForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintSafety(c, backOnclick, backLabel){
  const data = (c.checklistData && c.checklistData.safety) || {};
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">הנחיות בטיחות בעבודה — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:11px;line-height:1.4;">' +
    COMPANY_LOGO_HTML +
    '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:10px;">'+SAFETY_TITLE+'</div>' +
    safetyBodyHtml() +
    '<div class="form-grid cols-4" style="margin-top:12px;">' +
      '<div><b>תאריך:</b> '+escapeHtml(data.date?formatDateHe(data.date):"__________")+'</div>' +
      safetyStaticFieldsHtml(c) +
    '</div>' +
    '<div style="margin-top:20px;display:flex;align-items:baseline;">' +
      '<div><b>חתימת העובד/ת:</b> '+(data.signature ? ('<img src="'+data.signature+'" style="height:44px;vertical-align:-3.2px;">') : '__________________')+'</div>' +
    '</div>' +
    COMPANY_FOOTER_HTML +
  '</div>';
}

/* ---------- אישור בדבר תשלומי מעביד לקרן פנסיה - תוכן אמיתי (מבוסס הטופס המודפס
   המקורי: "אישור כללי בדבר תשלומי מעבידים לקרן פנסיה ולקופת ביטוח ולקופות פיצויי
   פיטורים במקום פיצויי פיטורים, לפי סעיף 14 לחוק פיצויי פיטורים") ----------
   טופס זה הוא נוסח משפטי-סטטוטורי קבוע (ללא פרטי עובד/ת בגוף הטקסט) הדורש שתי
   חתימות - עובד/ת ומעביד; שתיהן פיזיות בשלב זה (ר' גם ההערה בפונקציית ה-render
   הראשית של הטופס). האחוזים השבריים (1/3, 1/2) מוצגים בכתיב עשרוני (למשל 14.333%)
   לפי בקשת המשתמשת, במקום כתיב שברי מוערם. */
const PENSION_CONFIRM_TITLE = 'אישור כללי בדבר תשלומי מעבידים לקרן פנסיה ולקופת ביטוח במקום פיצויי פיטורים';
const PENSION_CONFIRM_SUBTITLE = 'לפי סעיף 14 לחוק פיצויי פיטורים';
const PENSION_CONFIRM_INTRO = 'בתוקף סמכותי לפי סעיף 14 לחוק פיצויי פיטורים, התשכ"ג-1963 (להלן - החוק), אני מאשר כי תשלומים ששילם מעביד החל מיום פרסומו של אישור זה, בעד עובדו לפנסיה מקיפה בקופת גמל לקצבה שאינה קופת ביטוח כמשמעותה בתקנות מס הכנסה (כללים לאישור ולניהול קופות גמל), התשכ"ד-1964 (להלן - קרן פנסיה), או לביטוח מנהלים הכולל אפשרות לקבלה או שילוב של תשלומים לתכנית ותכנית קצבה בקופת ביטוח כאמור (להלן - קופת ביטוח), לרבות תשלומים ששילם תוך שילוב תכנית פנסיה וקופת ביטוח בין אם יש בקופת הביטוח תכנית לקצבה ובין לאו (להלן - תשלומי המעביד), יבואו במקום פיצויי הפיטורים המגיעים לעובד בגין השכר האמור שממנו שולמו התשלומים האמורים ולתקופה ששולמו (להלן - השכר המופטר), ובלבד שנתקיימו כל אלה:';
const PENSION_CONFIRM_CLAUSE_1_HEADER = 'תשלומי המעביד -';
const PENSION_CONFIRM_CLAUSE_1A = 'לקרן פנסיה אינם פחותים מ-14.333% מן השכר המופטר או 12% מן השכר המופטר אם משלם המעביד בעד עובדו בנוסף לכך גם תשלומים להשלמת פיצויי פיטורים לקופת גמל בשיעור של 2.333% מן השכר המופטר. לא שילם המעביד בנוסף ל-12% גם 2.333% כאמור, יבואו תשלומיו במקום פיצויי הפיטורים של העובד, בלבד;';
const PENSION_CONFIRM_CLAUSE_1B_INTRO = 'לקופת ביטוח אינם פחותים מאחד מאלה:';
const PENSION_CONFIRM_CLAUSE_1B1 = '13.333% מן השכר המופטר, אם משלם המעביד בעד עובדו בנוסף לכך גם תשלומים להבטחת הכנסה חודשית במקרה נכות שאירע אובדן כושר עבודה, בתכנית שאישר הממונה על שוק ההון ביטוח וחסכון במשרד האוצר, בשיעור הדרוש להבטחת 75% מהשכר המופטר לפחות או בשיעור של 2.5% מן השכר המופטר, לפי הנמוך מביניהם (להלן - תשלום לביטוח אובדן כושר עבודה);';
const PENSION_CONFIRM_CLAUSE_1B2 = '11% מן השכר המופטר, אם שילם המעביד גם תשלום לביטוח אובדן כושר עבודה, ובמקרה זה יבואו תשלומי המעביד במקום 72% מפיצויי הפיטורים של העובד, בלבד; שילם המעביד נוסף על אלה גם תשלומים להשלמת פיצויי פיטורים לקופת גמל בשיעור של 2.333% מן השכר המופטר, יבואו תשלומי המעביד לקופת ביטוח 100% מפיצויי הפיטורים של העובד.';
const PENSION_CONFIRM_CLAUSE_2_HEADER = 'לא יאוחר משלושה חודשים מתחילת ביצוע תשלומי המעביד ייערך הסכם בכתב בין המעביד לבין העובד ובו -';
const PENSION_CONFIRM_CLAUSE_2A = 'הסכמת העובד להסדר לפי אישור זה בנוסח המפרט את תשלומי המעביד ואת קרן הפנסיה וקופת הביטוח, לפי העניין; בהסכם האמור ייכלל גם נוסחו של אישור זה;';
const PENSION_CONFIRM_CLAUSE_2B = 'ויתור המעביד מראש על כל זכות שיכולה להיות לו להחזיר כספים מתוך תשלומיו, אלא אם כן נשללה זכות העובד לפיצויי פיטורים בפסק דין מכוח סעיפים 16 או 17 לחוק פיצויי פיטורים או שהעובד משך כספים מקרן הפנסיה שלא במקרה מזכה; לעניין זה, "אירוע מזכה" - מוות, נכות, פרישה או פרישה בגיל שישים או יותר.';
const PENSION_CONFIRM_CLAUSE_3 = 'אין באישור זה כדי לגרוע מזכותו של עובד לפיצויי פיטורים לפי החוק, צו הרחבה או חוזה עבודה, בגין שכר שמעבר לשכר המופטר.';
function pensionClauseHtml(label,text){
  return '<div style="margin:0 0 10px;padding-right:26px;position:relative;">'+
    '<span style="position:absolute;right:0;">'+escapeHtml(label)+'</span>'+escapeHtml(text)+
  '</div>';
}
function finishPensionConfirmForm(){
  const c = currentCase();
  if(!c) return;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.pensionConfirm) c.checklistData.pensionConfirm = {date:"",signature:""};
  const data = c.checklistData.pensionConfirm;
  if(!data.signature){
    showToast("יש לחתום לפני סיום.");
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderPensionConfirmForm)
  data.date = todayIso();
  c.checklist.pensionConfirm = true;
  showToast('הטופס "אישור בדבר תשלומי מעבידים לקרן פנסיה ולקופת ביטוח" סומן כהושלם.');
  ui.screen = "checklist";
  render();
}
function pensionConfirmBodyHtml(){
  return '' +
  '<div style="margin-bottom:12px;">'+escapeHtml(PENSION_CONFIRM_INTRO)+'</div>' +
  '<div style="font-weight:700;margin-bottom:8px;">'+escapeHtml(PENSION_CONFIRM_CLAUSE_1_HEADER)+'</div>' +
  pensionClauseHtml('(א)  ',PENSION_CONFIRM_CLAUSE_1A) +
  pensionClauseHtml('(ב)  ',PENSION_CONFIRM_CLAUSE_1B_INTRO) +
  '<div style="padding-right:22px;">' +
    pensionClauseHtml('(1)  ',PENSION_CONFIRM_CLAUSE_1B1) +
    pensionClauseHtml('(2)  ',PENSION_CONFIRM_CLAUSE_1B2) +
  '</div>' +
  '<div style="font-weight:700;margin:14px 0 8px;">'+escapeHtml('(2)  ')+escapeHtml(PENSION_CONFIRM_CLAUSE_2_HEADER)+'</div>' +
  pensionClauseHtml('(א)  ',PENSION_CONFIRM_CLAUSE_2A) +
  pensionClauseHtml('(ב)  ',PENSION_CONFIRM_CLAUSE_2B) +
  '<div style="font-weight:700;margin:14px 0 8px;">'+escapeHtml('(3)  ')+escapeHtml(PENSION_CONFIRM_CLAUSE_3)+'</div>';
}
function pensionConfirmEmployerLineHtml(c){
  const company = CODE_TABLES.companies.find(x=>x.id===c.companyId) || {};
  return escapeHtml(company.name||"—")+', ח.פ '+escapeHtml(company.companyRegNum||"—");
}
function renderPensionConfirmForm(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const done = !!c.checklist.pensionConfirm;
  if(!c.checklistData) c.checklistData = {};
  if(!c.checklistData.pensionConfirm) c.checklistData.pensionConfirm = {date:"",signature:""};
  const data = c.checklistData.pensionConfirm;
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד החתימה בפועל (ר' finishPensionConfirmForm)
  const displayDate = data.date || todayIso();
  const canFinish = !!data.signature && !done;
  return '' +
  '<button class="btn-back" onmousedown="backToFormsHome()">&rarr; חזרה לרשימת הטפסים</button>' +
  '<h1 style="margin-top:14px;">'+escapeHtml(PENSION_CONFIRM_TITLE)+'</h1>' +
  '<div class="page-desc">זהו נוסח משפטי-סטטוטורי קבוע. יש לחתום למטה - התאריך יתעדכן אוטומטית למועד החתימה; חתימת המעביד מוצגת אוטומטית לפי פרטי החברה.</div>' +
  '<div class="panel" style="max-width:720px;line-height:1.8;font-size:14px;">' +
    '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:6px;">'+escapeHtml(PENSION_CONFIRM_TITLE)+'</div>' +
    '<div style="font-weight:700;text-align:center;margin-bottom:14px;">'+escapeHtml(PENSION_CONFIRM_SUBTITLE)+'</div>' +
    pensionConfirmBodyHtml() +
    '<div style="margin-top:16px;font-size:14px;"><b>תאריך:</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
    '<div style="margin-top:14px;">' +
      '<label style="font-weight:600;font-size:13.5px;display:block;margin-bottom:6px;">חתימת העובד/ת <span class="req-star">*</span></label>' +
      signaturePadHtml("pensionConfirm_sigCanvas","pensionConfirm") +
      '<div style="text-align:center;font-size:11.5px;color:#9AA5B1;margin-top:2px;max-width:420px;">חתום/חתמי מעל הקו</div>' +
    '</div>' +
    '<div style="margin-top:20px;"><b style="text-decoration:underline;">חתימת המעביד</b>: '+pensionConfirmEmployerLineHtml(c)+'</div>' +
  '</div>' +
  (done ? '<div class="alert alert-info" style="max-width:720px;">טופס זה כבר סומן כהושלם.</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="openGenericPreview()">תצוגה מקדימה</button>' +
    '<button class="btn btn-primary" '+(canFinish?'':'disabled')+' onclick="finishPensionConfirmForm()">סיימתי</button>' +
  '</div>';
}
function renderPrintPensionConfirm(c, backOnclick, backLabel){
  const data = (c.checklistData && c.checklistData.pensionConfirm) || {};
  return '' +
  '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">אישור בדבר תשלומי מעבידים לקרן פנסיה ולקופת ביטוח — תצוגה מקדימה</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>' +
  '<div class="print-frame" style="font-size:11px;line-height:1.5;">' +
    '<div style="font-weight:700;text-decoration:underline;text-align:center;margin-bottom:6px;">'+escapeHtml(PENSION_CONFIRM_TITLE)+'</div>' +
    '<div style="font-weight:700;text-align:center;margin-bottom:12px;">'+escapeHtml(PENSION_CONFIRM_SUBTITLE)+'</div>' +
    pensionConfirmBodyHtml() +
    '<div style="margin-top:26px;"><b>תאריך:</b> '+escapeHtml(data.date?formatDateHe(data.date):"__________________")+'</div>' +
    '<div style="margin-top:16px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;">' +
      '<div style="text-align:center;">' +
        (data.signature ? '<img src="'+data.signature+'" style="height:44px;">' : '<div style="min-width:160px;">__________________</div>') +
        '<div style="margin-top:6px;"><b>חתימת העובד/ת:</b></div>' +
      '</div>' +
      '<div style="text-align:center;">' +
        '<div>'+pensionConfirmEmployerLineHtml(c)+'</div>' +
        '<div style="border-top:1px solid #333;min-width:160px;margin-top:6px;padding-top:4px;">חתימת המעביד:</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ============================================================
   10. טופס 101 — המסך המלא
   ============================================================ */
/* מתג עברית/English/Russian - לא מודפס (no-print), ולא משפיע על נתונים או
   על ההדפסה - רק על הטקסט שמוצג במסך המילוי (ר' tr()/FORM101_I18N). משותף
   לכל הטפסים הדו-לשוניים (טופס 101, טופס פרטי הבנק) - ר' ui.formLanguage
   ב-render.js (מצב גלובלי אחד ב-ui, לא ריסט בין מסכים, כך שהעובד/ת בוחר/ת
   שפה פעם אחת והיא נשמרת גם במעבר בין הטפסים). */
function langSwitcherHtml(){
  // אפשרות שפה זרה "טהורה" (בלי עברית על המסך) הוסרה מהמתג עצמו - הנוסח
  // שדורש אישור disclaimer לפני הצגה (ר' form101DisclaimerHtml/
  // disclaimerBlocking למטה) לא נחשב מספיק בשל למשתמשי הקצה; המצבים
  // הדו-לשוניים ("both"/"both_ru", ר' BOTH_LANG_OF) הם היחידים הנגישים
  // דרך המתג מלבד עברית טהורה.
  const langs = [["he","עברית"],["both","עברית + English"],["both_ru","עברית + Russian"]];
  return '<div class="lang-switcher no-print">'+
    langs.map(l=>'<button class="lang-btn'+((ui.formLanguage||"he")===l[0]?" active":"")+'" onclick="setFormLanguage(\''+l[0]+'\')">'+l[1]+'</button>').join("") +
  '</div>';
}
function acknowledgeForm101Disclaimer(checked){
  ui.form101DisclaimerAck = checked;
  render();
}
/* Disclaimer שחוסם את שאר הטופס בכל שפה שאינה עברית (ר' renderForm101),
   עד לסימון "I understand" - ניסוח עצמאי שלנו, לא מועתק ממקור חיצוני
   (ר' דיון על רישיון CC BY-NC-SA של tofes101.co.il/ovdim.io). */
function form101DisclaimerHtml(){
  return '' +
  '<div class="panel" style="max-width:720px;">' +
    '<div class="card-title" style="margin-bottom:10px;">'+tr("disclaimer_title","Disclaimer")+'</div>' +
    '<p style="margin:0 0 14px;">'+tr("disclaimer_p1","This English version is an informal translation provided to help you fill out the form. Everything you enter is still recorded and printed only on the original Hebrew Form 101 — that Hebrew document is the sole official version and serves as your declaration to the employer.")+'</p>' +
    '<p style="margin:0 0 14px;">'+tr("disclaimer_p2","We've done our best to keep this translation accurate, but it may contain errors, so rely on the Hebrew form for anything unclear.")+'</p>' +
    '<p style="margin:0 0 14px;">'+tr("disclaimer_p3","If you have questions, HR is available to help you fill out the form.")+'</p>' +
    '<label class="check-row"><input type="checkbox" '+(ui.form101DisclaimerAck?"checked":"")+' onchange="acknowledgeForm101Disclaimer(this.checked)"> '+tr("disclaimer_understand","I understand")+' <span class="req-star">*</span></label>' +
  '</div>';
}
// כיוון תצוגה לפי שפה - עברית/ערבית הן RTL, אנגלית/רוסית הן LTR (ר' renderForm101).
const FORM_LANG_DIR = { he:"rtl", en:"ltr", both:"ltr", ru:"ltr", both_ru:"ltr" };
function renderForm101(isHr){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const emp = c.employee;
  const errCount = Object.keys(ui.errors).length;
  const anchors = [
    ["sec-a","anchor_employer","מעסיק"],["sec-b","anchor_employee","פרטי עובד/ת"],["sec-c","anchor_children","ילדים"],["sec-d","anchor_incomeFromEmployer","הכנסה ממעסיק זה"],
    ["sec-e","anchor_otherIncome","הכנסות אחרות"]
  ];
  anchors.push(["sec-f","anchor_spouse","בן/בת זוג"]);
  anchors.push(["sec-g","anchor_changesDuringYear","שינויים במהלך השנה"],["sec-h","anchor_taxExemption","פטור וזיכוי ממס"],["sec-i","anchor_taxCoordination","תיאום מס"]);
  anchors.push(["sec-j","anchor_declaration","הצהרה וסיום"]);

  const dir = FORM_LANG_DIR[ui.formLanguage] || "rtl";
  // ה-disclaimer חוסם רק במצב שפה זרה "טהור" (תרגום בלבד, בלי עברית על
  // המסך) - לא נגיש כרגע דרך המתג (ר' langSwitcherHtml). במצב "he"
  // ובמצבים הדו-לשוניים ("both"/"both_ru") העברית המקורית תמיד נשארת גלויה
  // במלואה, ולכן אין סיכון להבנה מוטעית שמצדיק חסימה (ר' form101DisclaimerHtml).
  const disclaimerBlocking = (ui.formLanguage==="en" || ui.formLanguage==="ru") && !ui.form101DisclaimerAck;
  return '' +
  langSwitcherHtml() +
  '<div dir="'+dir+'" class="form-dir'+(BOTH_LANG_OF[ui.formLanguage]?" lang-bi":"")+'">' +
  '<div class="btn-row" style="margin:16px 0;"><button class="btn-back" onmousedown="backToFormsHome()">'+(dir==="ltr"?"&larr; ":"&rarr; ")+(isHr?tr("back_to_case","חזרה למסך התיק"):tr("back_to_forms_list","חזרה לרשימת הטפסים"))+'</button></div>' +
  '<h1 id="sec-a">'+tr("form101_title","כרטיס עובד (טופס 101)")+'</h1>' +
  (disclaimerBlocking ? form101DisclaimerHtml() : ('' +
  '<div class="anchor-nav no-print">' +
    anchors.map(a=>'<a href="#'+a[0]+'">'+tr(a[1],a[2])+'</a>').join("") +
  '</div>' +
  '<div class="page-desc">'+tr("form101_pageDesc","יש למלא את כל השדות המסומנים בכוכבית אדומה. לכל שדה עם סימן שאלה כחול ניתן ללחוץ לקבלת הסבר.")+'</div>' +
  (errCount?('<div class="alert alert-error" id="error-summary"><b>'+tr("error_summary_template","נמצאו {n} שגיאות למילוי:").replace("{n}",errCount)+'</b><div>'+
    Object.keys(ui.errors).map(k=>'<div>&bull; <a href="javascript:void(0)" onclick="scrollToField(\''+k+'\')" style="color:inherit;text-decoration:underline;">'+tr(ui.errors[k],ui.errors[k])+'</a></div>').join("") +
  '</div></div>'):'') +

  '<h2 class="section-title">'+sectionTitleHtml("א","sec_a_title","פרטי המעסיק (לקריאה בלבד)")+'</h2>' +
  '<div class="panel"><div class="kv">' +
    '<div class="k">'+tr("employer_name_label","שם המעסיק:")+'</div><div>'+escapeHtml(companyName(c.companyId))+'</div>' +
    '<div class="k">'+tr("employer_address_label","כתובת:")+'</div><div>'+escapeHtml((CODE_TABLES.companies.find(x=>x.id===c.companyId)||{}).address||"")+'</div>' +
    '<div class="k">'+tr("employer_phone_label","מספר טלפון:")+'</div><div>'+escapeHtml((CODE_TABLES.companies.find(x=>x.id===c.companyId)||{}).phone||"")+'</div>' +
    '<div class="k">'+tr("employer_deductionFile_label","מספר תיק ניכויים:")+'</div><div>'+escapeHtml((CODE_TABLES.companies.find(x=>x.id===c.companyId)||{}).deductionFileNum||"")+'</div>' +
  '</div></div>' +

  renderForm101SectionB(c) +
  renderForm101SectionC(c) +
  renderForm101SectionD(c) +
  renderForm101SectionE(c) +
  renderForm101SectionF(c) +
  renderForm101SectionG(c) +
  renderForm101SectionH(c) +
  renderForm101SectionI(c) +
  renderForm101SectionJ(c)
  )) +
  '</div>';
}

function radioGroupHtml(name,options,current,onchangeFn){
  return '<div class="radio-group">'+options.map(o=>
    '<label><input type="radio" name="'+name+'" value="'+o.id+'" '+(current===o.id?"checked":"")+' onchange="'+onchangeFn+'(\''+o.id+'\')"> '+escapeHtml(o.name)+'</label>'
  ).join("")+'</div>';
}

function renderForm101SectionB(c){
  const emp = c.employee;
  const e = (k)=>ui.errors[k] ? " err" : "";
  // ה-id ("f101_idNumber_ro") קבוע בעוד התוכן (עברית וגם מפתח התרגום)
  // משתנה לפי emp.idType - לכן מעבירים ל-f101FieldWrap מפתח תרגום מפורש
  // (labelKey) במקום לתת לו לגזור אותו אוטומטית מ-id, כדי שלא "יתקע" תמיד
  // על אותו תרגום בלי קשר לסוג הזיהוי הנבחר.
  const idLabelKey = emp.idType==="id" ? "id_number_label" : "passport_number_label";
  const idLabel = emp.idType==="id" ? "מספר זהות" : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const yes = tr("yes","כן"), no = tr("no","לא");
  return '' +
  '<h2 class="section-title" id="sec-b">'+sectionTitleHtml("ב","sec_b_title","פרטי העובד/ת")+'</h2>' +
  '<div class="panel">' +
  '<div class="form-grid">' +
    f101FieldWrap("f101_firstName_ro","שם פרטי",true,'<input type="text" value="'+escapeHtml(emp.firstName)+'" readonly disabled>') +
    f101FieldWrap("f101_lastName_ro","שם משפחה",true,'<input type="text" value="'+escapeHtml(emp.lastName)+'" readonly disabled>') +
    f101FieldWrap("f101_idType_ro","זיהוי לפי",true,
      '<div class="radio-group"><label><input type="radio" '+(emp.idType==="id"?"checked":"")+' disabled> '+tr("id_type_id","תעודת זהות")+'</label>'+
      '<label><input type="radio" '+(emp.idType==="passport"?"checked":"")+' disabled> '+tr("id_type_passport","דרכון (עבור אזרח זר)")+'</label></div>') +
    f101FieldWrap("f101_idNumber_ro",idLabel,true,'<input type="text" value="'+escapeHtml(idValue)+'" readonly disabled>',null,null,null,idLabelKey) +
    f101FieldWrap("f101_birthDate","תאריך לידה",true,'<input type="date" id="f101_birthDate" class="'+e("f101_birthDate")+'" value="'+emp.birthDate+'" max="'+todayIso()+'" onblur="finalizeEmpField(\'birthDate\',this.value)">') +
    f101FieldWrap("f101_aliyaDate","תאריך עלייה",false,'<input type="date" id="f101_aliyaDate" value="'+emp.aliyaDate+'" onblur="updateEmp(\'aliyaDate\',this.value)">') +
  '</div>' +
  '<div class="field-hint-static" style="margin-bottom:10px;">'+tr("sec_b_idHint","שם, סוג הזיהוי ומספר הזהות/דרכון נמסרו בעת פתיחת תיק הקליטה ואינם ניתנים לעריכה כאן.")+'</div>' +
  '<div class="form-grid cols-4">' +
    f101FieldWrap("f101_city","עיר או יישוב",true,'<input type="text" id="f101_city" class="'+e("f101_city")+'" value="'+escapeHtml(emp.city)+'" oninput="updateEmp(\'city\',this.value)">') +
    f101FieldWrap("f101_street","רחוב",true,'<input type="text" id="f101_street" class="'+e("f101_street")+'" value="'+escapeHtml(emp.street)+'" oninput="updateEmp(\'street\',this.value)">') +
    f101FieldWrap("f101_houseNumber","מספר בית",true,'<input type="text" id="f101_houseNumber" class="'+e("f101_houseNumber")+'" value="'+escapeHtml(emp.houseNumber)+'" oninput="updateEmp(\'houseNumber\',this.value)">') +
    f101FieldWrap("f101_zip","מיקוד",false,'<input type="text" id="f101_zip" value="'+escapeHtml(emp.zip)+'" oninput="updateEmp(\'zip\',this.value)">') +
  '</div>' +
  '<div class="form-grid cols-2">' +
    f101FieldWrap("f101_mobilePhone","מספר טלפון נייד",false,'<input type="tel" id="f101_mobilePhone" class="'+e("f101_mobilePhone")+'" value="'+escapeHtml(emp.mobilePhone)+'" oninput="updateEmp(\'mobilePhone\',this.value)" onblur="finalizeEmpField(\'mobilePhone\',this.value)">') +
    f101FieldWrap("f101_phone2","מספר טלפון נוסף",false,'<input type="tel" id="f101_phone2" value="'+escapeHtml(emp.phone2)+'" oninput="updateEmp(\'phone2\',this.value)" onblur="finalizeEmpField(\'phone2\',this.value)">') +
  '</div>' +
  '<div class="form-grid cols-2">' +
    f101FieldWrap("f101_email","כתובת דוא\"ל",true,'<input type="text" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" id="f101_email" class="'+e("f101_email")+'" dir="ltr" style="direction:ltr;unicode-bidi:plaintext;text-align:right;" value="'+escapeHtml(emp.email)+'" oninput="updateEmp(\'email\',this.value)" onblur="finalizeEmpField(\'email\',this.value)">') +
  '</div>' +
  '<div class="form-grid cols-5">' +
    f101FieldWrap("f101_gender","מין",true,
      '<div class="radio-group" style="flex-direction:column;align-items:flex-start;"><label><input type="radio" name="gender" value="male" '+(emp.gender==="male"?"checked":"")+' onchange="updateEmp(\'gender\',\'male\')"> '+tr("gender_male","זכר")+'</label>'+
      '<label><input type="radio" name="gender" value="female" '+(emp.gender==="female"?"checked":"")+' onchange="updateEmp(\'gender\',\'female\')"> '+tr("gender_female","נקבה")+'</label></div>') +
    f101FieldWrap("f101_maritalStatus","מצב משפחתי",true,
      '<div class="radio-group" style="flex-direction:column;align-items:flex-start;">'+
      CODE_TABLES.maritalStatuses.map(m=>'<label><input type="radio" name="maritalStatus" value="'+m.id+'" '+(emp.maritalStatus===m.id?"checked":"")+' onchange="updateEmp(\'maritalStatus\',\''+m.id+'\')"> '+codeName("maritalStatus",m)+'</label>').join("")+
      '</div>',
      null, emp.maritalStatus==="separated" ? '<span style="color:#a65b00;">'+tr("sec_b_separatedHint","חובה לצרף אישור פקיד שומה.")+'</span>' : '') +
    f101FieldWrap("f101_isIsraeliResident","תושב/ת ישראל",true,
      '<div class="radio-group" style="flex-direction:column;align-items:flex-start;"><label><input type="radio" name="isIsraeliResident" value="yes" '+(emp.isIsraeliResident==="yes"?"checked":"")+' onchange="updateEmp(\'isIsraeliResident\',\'yes\')"> '+yes+'</label>'+
      '<label><input type="radio" name="isIsraeliResident" value="no" '+(emp.isIsraeliResident==="no"?"checked":"")+' onchange="updateEmp(\'isIsraeliResident\',\'no\')"> '+no+'</label></div>') +
    f101FieldWrap("f101_kibbutzMember","חבר/ת קיבוץ או מושב שיתופי",false,
      '<div class="radio-group" style="flex-direction:column;align-items:flex-start;"><label><input type="radio" name="kibbutzMemberPrimary" value="yes" '+((emp.kibbutzMember==="yes_transferred"||emp.kibbutzMember==="yes_not_transferred")?"checked":"")+' onchange="updateKibbutzPrimary(\'yes\')"> '+yes+'</label>'+
      '<label><input type="radio" name="kibbutzMemberPrimary" value="no" '+(emp.kibbutzMember==="no"?"checked":"")+' onchange="updateKibbutzPrimary(\'no\')"> '+no+'</label></div>'+
      ((emp.kibbutzMember==="yes_transferred"||emp.kibbutzMember==="yes_not_transferred") ? '<div style="margin-top:10px;">'+
        '<label style="font-size:13.5px;font-weight:600;color:var(--text-main);display:flex;align-items:center;gap:5px;">'+tr("sec_b_kibbutzTransferLabel","הכנסותיי ממעסיק זה מועברות לקיבוץ")+' <span class="req-star">*</span>'+qmarkHtml(tr("sec_b_kibbutzTransferTooltip","אם המשכורת ממעסיק זה מועברת ישירות לקיבוץ או למושב השיתופי (ולא משולמת לך אישית), יש לבחור \"כן\"."))+'</label>'+
        '<div class="radio-group" style="margin-top:6px;"><label><input type="radio" name="kibbutzTransferred" value="yes_transferred" '+(emp.kibbutzMember==="yes_transferred"?"checked":"")+' onchange="updateEmp(\'kibbutzMember\',\'yes_transferred\')"> '+yes+'</label>'+
        '<label><input type="radio" name="kibbutzTransferred" value="yes_not_transferred" '+(emp.kibbutzMember==="yes_not_transferred"?"checked":"")+' onchange="updateEmp(\'kibbutzMember\',\'yes_not_transferred\')"> '+no+'</label></div>'+
      '</div>' : '')) +
    f101FieldWrap("f101_healthFundMember","קופת חולים",true,
      '<div class="radio-group" style="flex-direction:column;align-items:flex-start;"><label><input type="radio" name="healthFundMember" value="yes" '+(emp.healthFundMember==="yes"?"checked":"")+' onchange="updateEmp(\'healthFundMember\',\'yes\')"> '+yes+'</label>'+
      '<label><input type="radio" name="healthFundMember" value="no" '+(emp.healthFundMember==="no"?"checked":"")+' onchange="updateEmp(\'healthFundMember\',\'no\')"> '+no+'</label></div>'+
      (emp.healthFundMember==="yes" ? '<div style="margin-top:10px;"><label style="font-size:13.5px;font-weight:600;color:var(--text-main);">'+tr("sec_b_healthFundNameLabel","שם הקופה")+'</label>'+
        '<div class="radio-group" style="flex-direction:column;align-items:flex-start;margin-top:6px;">'+
        CODE_TABLES.healthFunds.filter(h=>h.id!=="none").map(h=>'<label><input type="radio" name="healthFundName" value="'+h.name+'" '+(emp.healthFundName===h.name?"checked":"")+' onchange="updateEmp(\'healthFundName\',\''+h.name+'\')"> '+codeName("healthFund",h)+'</label>').join("")+
        '</div>'+(ui.errors["f101_healthFundName"]?'<div class="field-error">'+tr(ui.errors["f101_healthFundName"],ui.errors["f101_healthFundName"])+'</div>':'')+'</div>' : '')) +
  '</div>' +
  '</div>';
}

/* ---------- ג. ילדים שטרם מלאו להם 19 בשנת המס ---------- */
function renderForm101SectionC(c){
  const kids = c.employee.children;
  const e = (k)=>ui.errors[k] ? " err" : "";
  const addChildBtn = '<button class="btn-add-green" onclick="addChild()">+ '+tr("add_child_btn","הוסף ילד")+'</button>';
  let inner;
  if(!kids.length){
    inner = addChildBtn;
  } else {
    inner = '<div class="kids-list">' + kids.map((kid,idx)=>{
      return '<div class="kid-card">' +
        '<div class="kid-card-head"><b>'+tr("kid_card_prefix","ילד")+' '+(idx+1)+'</b><button class="btn-icon-danger" title="'+trPlain("remove_child_title","מחק ילד")+'" onclick="removeChildRow('+idx+')">&minus;</button></div>' +
        '<div class="form-grid cols-3">' +
          f101FieldWrap("f101_kid_"+idx+"_name","שם",true,'<input type="text" id="f101_kid_'+idx+'_name" class="'+e("f101_kid_"+idx+"_name")+'" value="'+escapeHtml(kid.name)+'" oninput="updateEmp(\'children.'+idx+'.name\',this.value)">') +
          f101FieldWrap("f101_kid_"+idx+"_idNumber","מספר זהות (9 ספרות)",true,'<input type="text" id="f101_kid_'+idx+'_idNumber" class="'+e("f101_kid_"+idx+"_idNumber")+'" value="'+escapeHtml(kid.idNumber)+'" maxlength="9" oninput="updateEmp(\'children.'+idx+'.idNumber\',this.value.trim())" onblur="finalizeEmpField(\'children.'+idx+'.idNumber\',this.value.trim())">') +
          f101FieldWrap("f101_kid_"+idx+"_birthDate","תאריך לידה",true,'<input type="date" id="f101_kid_'+idx+'_birthDate" class="'+e("f101_kid_"+idx+"_birthDate")+'" value="'+kid.birthDate+'" max="'+todayIso()+'" onblur="updateEmp(\'children.'+idx+'.birthDate\',this.value)">') +
        '</div>' +
        '<div class="form-grid cols-3" style="margin-top:8px;">' +
          '<div class="check-group"><label style="white-space:nowrap;"><input type="checkbox" '+(kid.inCustody?"checked":"")+' onchange="toggleChildCustody('+idx+',this.checked)"> '+tr("kid_inCustody_label","הילד/ה נמצא/ת בחזקתי")+'</label></div>' +
          '<div class="check-group" style="grid-column:span 2;"><label style="white-space:nowrap;"><input type="checkbox" '+(kid.receivesAllowance?"checked":"")+' onchange="toggleChildAllowance('+idx+',this.checked)"> '+tr("kid_receivesAllowance_label","אני מקבל/ת בגינו/ה קצבת ילדים מביטוח לאומי")+'</label></div>' +
        '</div>' +
        (ui.errors["f101_kid_"+idx+"_allowance"] ? '<div class="field-error">'+tr(ui.errors["f101_kid_"+idx+"_allowance"],ui.errors["f101_kid_"+idx+"_allowance"])+'</div>' : '') +
      '</div>';
    }).join("") + '</div>' +
    (kids.length<10 ? '<div style="margin-top:12px;">'+addChildBtn+'</div>' : '<div class="field-hint-static" style="margin-top:10px;">'+tr("max_children_reached","הגעת למספר המרבי של 10 ילדים.")+'</div>');
  }
  return '<h2 class="section-title" id="sec-c">'+sectionTitleHtml("ג","sec_c_title","ילדים שטרם מלאו להם 19 בשנת המס")+'</h2><div class="panel">'+inner+'</div>';
}

/* ---------- ד. הכנסותיי ממעסיק זה ---------- */
function renderForm101SectionD(c){
  const emp = c.employee;
  const incomeTooltip = CODE_TABLES.incomeTypes.filter(t=>t.tooltip).map(t=>codeName("incomeType",t)+':<span style="font-weight:400;"> '+tr("incomeType_"+t.id+"_tooltip",t.tooltip)+'</span>').join('<br><br>');
  const startDateTooltip = tr("sec_d_startDateTooltip","שנת המס היא השנה הקלנדרית, כלומר השנה שמתחילה ב-1 לינואר ומסתיימת ב-31 לדצמבר. אם אתה עובד באותו המקום ברצף משנה קודמת, אז תאריך תחילת העבודה בשנת המס הוא ה-1 לינואר של השנה הנוכחית.");
  return '' +
  '<h2 class="section-title" id="sec-d">'+sectionTitleHtml("ד","sec_d_title","פרטים על הכנסותיי ממעסיק זה")+'</h2>' +
  '<div class="panel">' +
    '<div class="field" style="margin-bottom:14px;"><label>'+trLabelHtml("sec_d_incomeType_label","אני מקבל/ת",true,incomeTooltip)+'</label>' +
      '<div class="radio-group">' +
        CODE_TABLES.incomeTypes.map(t=>'<label><input type="radio" name="incomeType" value="'+t.id+'" '+(emp.incomeType===t.id?"checked":"")+' onchange="updateEmp(\'incomeType\',\''+t.id+'\')"> '+codeName("incomeType",t)+'</label>').join("") +
      '</div>' +
      (ui.errors["f101_incomeType"]?'<div class="field-error">'+tr(ui.errors["f101_incomeType"],ui.errors["f101_incomeType"])+'</div>':'') +
    '</div>' +
    (emp.incomeType==="additional" ? '<div class="alert alert-warning-pink"><b>'+tr("sec_d_additionalIncomeWarningTitle","שים לב!")+'</b>'+tr("sec_d_additionalIncomeWarning","מכיוון שסימנת שזוהי משכורת נוספת עבורך, עליך לערוך תיאום מס ולהגישו למעסיק, אחרת יורד מהשכר שלך מס בשיעור מירבי, כ-48%.<br>ניתן לערוך תיאום מס באינטרנט, על ידי הגשת טופס 116 לפקיד השומה, או בחלק ט׳ של טופס זה.<br>אם כבר יש ברשותך אישור מפקיד השומה, יש למסור אותו למשאבי אנוש.<br>אם עדיין אין ברשותך אישור מפקיד השומה, יש להעביר אותו למשאבי אנוש לפני הכנת המשכורת הראשונה.<br>אם זה לא ברור לך, יש ליצור קשר עם המעסיק.")+'</div>' : '') +
    f101FieldWrap("f101_startDate","תאריך תחילת עבודה בשנת המס",true,'<input type="date" id="f101_startDate" value="'+c.startDate+'" style="max-width:260px;" onblur="updateCaseStartDate(this.value)">',startDateTooltip) +
  '</div>';
}

/* ---------- ה. הכנסות אחרות ---------- */
function renderForm101SectionE(c){
  const emp = c.employee;
  const oi = emp.otherIncome;
  return '' +
  '<h2 class="section-title" id="sec-e">'+sectionTitleHtml("ה","sec_e_title","פרטים על הכנסות אחרות")+'</h2>' +
  '<div class="panel">' +
    '<div class="field" id="f101_otherIncomeHas_wrap"><label>'+trLabelHtml("sec_e_hasOtherIncome_label","יש לך הכנסות אחרות ממשכורת?",true)+'</label>' +
      '<div class="radio-group">' +
        '<label><input type="radio" name="otherIncomeHas" value="no" '+(oi.has==="no"?"checked":"")+' onchange="updateEmp(\'otherIncome.has\',\'no\')"> '+tr("sec_e_hasOtherIncome_no","אין לי הכנסות אחרות ממשכורת, קצבה או מלגה")+'</label>' +
        '<label><input type="radio" name="otherIncomeHas" value="yes" '+(oi.has==="yes"?"checked":"")+' onchange="updateEmp(\'otherIncome.has\',\'yes\')"> '+tr("sec_e_hasOtherIncome_yes","יש לי הכנסות אחרות")+'</label>' +
      '</div>' +
      (ui.errors["f101_otherIncomeHas"]?'<div class="field-error">'+tr(ui.errors["f101_otherIncomeHas"],ui.errors["f101_otherIncomeHas"])+'</div>':'') +
    '</div>' +
    (oi.has==="yes" ? ('' +
      '<hr class="divider">' +
      '<div class="field"><label>'+trLabelHtml("sec_e_typesLabel","פרוט הכנסות",true)+'</label>' +
        '<div class="check-group">' +
          CODE_TABLES.otherIncomeTypes.map(t=>{
            const checked = oi.types.includes(t.id);
            return '<label><input type="checkbox" '+(checked?"checked":"")+' onchange="toggleOtherIncomeType(\''+t.id+'\',this.checked)"> '+codeName("otherIncomeType",t)+'</label>';
          }).join("") +
        '</div>' +
        (ui.errors["f101_otherIncomeTypes"]?'<div class="field-error">'+tr(ui.errors["f101_otherIncomeTypes"],ui.errors["f101_otherIncomeTypes"])+'</div>':'') +
      '</div>' +
      '<div class="field" style="margin-top:14px;"><label>'+trLabelHtml("sec_e_creditPointsLabel","נקודות זיכוי",true)+'</label>' +
        '<div class="radio-group">' +
          '<label><input type="radio" name="creditPointsLoc" value="here" '+(emp.otherIncome.creditPointsLocation==="here"?"checked":"")+' onchange="updateEmp(\'otherIncome.creditPointsLocation\',\'here\')"> '+tr("sec_e_creditPointsHere","אבקש לקבל נקודות זיכוי ומדרגות מס כנגד הכנסתי זו (סעיף ד). איני מקבל/ת אותם בהכנסה אחרת.")+'</label>' +
          '<label><input type="radio" name="creditPointsLoc" value="other" '+(emp.otherIncome.creditPointsLocation==="other"?"checked":"")+' onchange="updateEmp(\'otherIncome.creditPointsLocation\',\'other\')"> '+tr("sec_e_creditPointsOther","אני מקבל/ת נקודות זיכוי ומדרגות מס בהכנסה אחרת ועל כן איני זכאי/ת להן כנגד הכנסה זו.")+'</label>' +
        '</div>' +
        (ui.errors["f101_creditPointsLoc"]?'<div class="field-error">'+tr(ui.errors["f101_creditPointsLoc"],ui.errors["f101_creditPointsLoc"])+'</div>':'') +
      '</div>' +
      '<div class="field" style="margin-top:14px;"><label>'+trLabelHtml("sec_e_depositsLabel","הפרשות",true)+'</label>' +
        '<div class="check-group" style="flex-direction:column;align-items:flex-start;">' +
          '<label><input type="checkbox" '+(emp.otherIncome.noHishtalmutDeposits?"checked":"")+' onchange="updateEmp(\'otherIncome.noHishtalmutDeposits\',this.checked)"> '+tr("sec_e_noHishtalmutDeposits","אין מפרישים עבורי לקרן השתלמות בגין הכנסתי האחרת, או שכל הפרשות המעסיק לקרן השתלמות בגין הכנסתי האחרת מצורפות להכנסתי האחרת.")+'</label>' +
          '<label><input type="checkbox" '+(emp.otherIncome.noPensionDeposits?"checked":"")+' onchange="updateEmp(\'otherIncome.noPensionDeposits\',this.checked)"> '+tr("sec_e_noPensionDeposits","אין מפרישים עבורי לקצבה/לביטוח אובדן כושר עבודה/פיצויים בגין הכנסתי האחרת, או שכל הפרשות המעסיק לקצבה/לביטוח אובדן כושר עבודה/פיצויים בגין הכנסתי האחרת מצורפות להכנסתי האחרת.")+'</label>' +
        '</div>' +
        (ui.errors["f101_otherIncomeDeposits"]?'<div class="field-error">'+tr(ui.errors["f101_otherIncomeDeposits"],ui.errors["f101_otherIncomeDeposits"])+'</div>':'') +
      '</div>'
    ) : '') +
  '</div>';
}
function toggleOtherIncomeType(id,checked){
  const c = currentCase();
  const arr = c.employee.otherIncome.types;
  const i = arr.indexOf(id);
  if(checked && i===-1) arr.push(id);
  if(!checked && i>-1) arr.splice(i,1);
  render();
}

/* ---------- ו. פרטים על בן או בת הזוג ---------- */
function renderForm101SectionF(c){
  const emp = c.employee;
  const sp = emp.spouse;
  const e = (k)=>ui.errors[k] ? " err" : "";
  if(emp.maritalStatus!=="married"){
    return '' +
    '<h2 class="section-title" id="sec-f">'+sectionTitleHtml("ו","sec_f_title","פרטים על בן/בת הזוג")+'</h2>' +
    '<div class="panel">' +
      '<div class="field-hint-static">'+tr("sec_f_notMarriedHint","חלק זה רלוונטי רק אם הינך נשוי/אה.")+'</div>' +
    '</div>';
  }
  return '' +
  '<h2 class="section-title" id="sec-f">'+sectionTitleHtml("ו","sec_f_title","פרטים על בן/בת הזוג")+'</h2>' +
  '<div class="panel">' +
  '<div class="form-grid">' +
    f101FieldWrap("f101_spouse_firstName","שם פרטי",true,'<input type="text" id="f101_spouse_firstName" class="'+e("f101_spouse_firstName")+'" value="'+escapeHtml(sp.firstName)+'" oninput="updateEmp(\'spouse.firstName\',this.value)">',"כפי שמופיע בתעודת הזהות") +
    f101FieldWrap("f101_spouse_lastName","שם משפחה",true,'<input type="text" id="f101_spouse_lastName" class="'+e("f101_spouse_lastName")+'" value="'+escapeHtml(sp.lastName)+'" oninput="updateEmp(\'spouse.lastName\',this.value)">',"כפי שמופיע בתעודת הזהות") +
    f101FieldWrap("f101_spouse_idType","זיהוי לפי",true,
      '<div class="radio-group"><label><input type="radio" name="spouseIdType" value="id" '+(sp.idType==="id"?"checked":"")+' onchange="updateEmp(\'spouse.idType\',\'id\')"> '+tr("id_type_id","תעודת זהות")+'</label>'+
      '<label><input type="radio" name="spouseIdType" value="passport" '+(sp.idType==="passport"?"checked":"")+' onchange="updateEmp(\'spouse.idType\',\'passport\')"> '+tr("id_type_passport","דרכון (עבור אזרח זר)")+'</label></div>') +
    (sp.idType==="id" ?
      f101FieldWrap("f101_spouse_idNumber","מספר זהות (9 ספרות)",true,'<input type="text" id="f101_spouse_idNumber" class="'+e("f101_spouse_idNumber")+'" value="'+escapeHtml(sp.idNumber)+'" maxlength="9" oninput="updateEmp(\'spouse.idNumber\',this.value.trim())" onblur="finalizeEmpField(\'spouse.idNumber\',this.value.trim())">')
      :
      f101FieldWrap("f101_spouse_passportNumber","מספר דרכון",true,'<input type="text" id="f101_spouse_passportNumber" class="'+e("f101_spouse_passportNumber")+'" value="'+escapeHtml(sp.passportNumber)+'" maxlength="20" oninput="updateEmp(\'spouse.passportNumber\',this.value.trim())">')
    ) +
    f101FieldWrap("f101_spouse_birthDate","תאריך לידה",true,'<input type="date" id="f101_spouse_birthDate" class="'+e("f101_spouse_birthDate")+'" value="'+sp.birthDate+'" max="'+todayIso()+'" onblur="updateEmp(\'spouse.birthDate\',this.value)">') +
    f101FieldWrap("f101_spouse_aliyaDate","תאריך עלייה",false,'<input type="date" id="f101_spouse_aliyaDate" value="'+sp.aliyaDate+'" onblur="updateEmp(\'spouse.aliyaDate\',this.value)">') +
    f101FieldWrap("f101_spouse_incomeStatus","הכנסה",true,
      '<div class="radio-group">'+CODE_TABLES.spouseIncomeOptions.map(o=>'<label><input type="radio" name="spouseIncomeStatus" value="'+o.id+'" '+(sp.incomeStatus===o.id?"checked":"")+' onchange="updateEmp(\'spouse.incomeStatus\',\''+o.id+'\')"> '+codeName("spouseIncome",o)+'</label>').join("")+'</div>') +
  '</div></div>';
}

/* ---------- ז. שינויים במהלך השנה (טקסט בלבד) ---------- */
function renderForm101SectionG(){
  return '' +
  '<h2 class="section-title" id="sec-g">'+sectionTitleHtml("ז","sec_g_title","שינויים במהלך השנה")+'</h2>' +
  '<div class="panel"><div class="alert alert-info" style="margin:0;">' +
    tr("sec_g_body","כל שינוי שיחול בפרטים שמילאת בטופס, יש להודיע למעסיק עד שבוע ימים מתאריך השינוי, על ידי מילוי טופס חדש במערכת זו או בכל אמצעי שהמעסיק מאפשר.") +
  '</div></div>';
}

/* ---------- ח. פטור או זיכוי ממס — 16 כרטיסים ---------- */
function creditCardShell(meta,disabled,disabledReason,bodyHtml,checkboxHtml){
  // meta.num הוא בדרך כלל מספר רגיל (זהה בכל שפה) חוץ מ-2א/2ב (אותיות
  // עבריות) - אלה היחידים שצריכים תרגום בפועל (ל-2a/2b, 2а/2б וכו').
  // זה מוחלף לגמרי (לא tr() הרגיל שהיה מציג "2a (2א)" במצב דו-לשוני) כי
  // האות העברית עצמה אינה מידע בעל ערך לשמר - היא רק סימון מספור, ולכן
  // גם במצב דו-לשוני מציגים רק את הגרסה המתורגמת בלי כפילות מיותרת.
  const numLang = BOTH_LANG_OF[ui.formLanguage] || (ui.formLanguage!=="he" ? ui.formLanguage : null);
  const num = numLang
    ? (rawTranslation(numLang,"cred_"+meta.key+"_num") || meta.num)
    : meta.num;
  const tooltip = meta.tooltip ? tr("cred_"+meta.key+"_tooltip", meta.tooltip) : meta.tooltip;
  const qmark = tooltip ? qmarkHtml(tooltip) : "";
  const note = meta.note ? tr("cred_"+meta.key+"_note", meta.note) : meta.note;
  // כמו ב-trLabelHtml/f101FieldWrap: סימן השאלה חייב להישאר צמוד לשורת
  // הכותרת בשפה הזרה, ולא "לצוף" מתחת לשתי השורות (הזרה+עברית) - ולכן
  // במצב דו-לשוני בונים כאן ידנית שני span נפרדים (זר ואז עברי) במקום
  // span אחד עם bi-he-block מקונן בפנים, כדי ש-.card-title (flex-wrap)
  // ישבור שורה בין השניים ויישר את הכוכבית/qmark רק מול השורה הראשונה.
  const bothLang = BOTH_LANG_OF[ui.formLanguage];
  let titleHtml;
  if(bothLang){
    const foreignTitle = rawTranslation(bothLang, "cred_"+meta.key+"_title");
    titleHtml = foreignTitle
      ? ('<span>'+num+': '+foreignTitle+'</span>'+qmark+'<span class="bi-he-block" dir="rtl">'+meta.num+': '+meta.title+'</span>')
      : ('<span>'+meta.num+': '+meta.title+'</span>'+qmark);
  } else {
    titleHtml = '<span>'+num+': '+tr("cred_"+meta.key+"_title", meta.title)+'</span>'+qmark;
  }
  return '<div class="card'+(disabled?" disabled":"")+'" id="cred_'+meta.key+'">' +
    '<div class="card-title">'+checkboxHtml+titleHtml+'</div>' +
    (note ? '<div class="card-hint">'+note+'</div>' : '') +
    (disabled && disabledReason ? '<div class="card disabled-note" style="margin-top:8px;">'+disabledReason+'</div>' : '') +
    (!disabled ? bodyHtml : '') +
  '</div>';
}
function renderForm101SectionH(c){
  const emp = c.employee, tc = emp.taxCredits;
  // c1 אוטומטי - נגזר תמיד מהצהרת תושבות ישראל, ותיבת הסימון נעולה תמיד
  tc.c1 = (emp.isIsraeliResident === "yes");
  const cards = TAX_CREDIT_META.map(meta=>{
    const key = meta.key;
    let disabled=false, disabledReason=null, extraBody="", checkbox="";
    switch(key){
      case "c1":
        disabled=false;
        checkbox = '<input type="checkbox" '+(tc.c1?"checked":"")+' disabled>';
        extraBody = '<div class="card disabled-note" style="margin-top:8px;">'+tr("cred_c1_autoNote","מסומן אוטומטית אם סימנת בסעיף ב' שהינך תושב/ת ישראל.")+'</div>';
        break;
      case "c2a":
        checkbox = '<input type="checkbox" '+(tc.c2a?"checked":"")+' onchange="toggleCredit(\'c2a\',this.checked)">';
        if(tc.c2a && emp.otherIncome.has!=="no"){
          extraBody = '<div class="alert alert-warning-pink" style="margin-top:10px;">'+tr("cred_c2a_warning","מכיוון שלא סימנת בפרק ה׳ ״אין לי הכנסות אחרות לרבות מלגות״, עליך לפנות לפקיד השומה לצורך עריכת תיאום מס. אם יש ברשותך אישור תיאום מס מפקיד השומה, יש למסור אותו למשאבי אנוש.")+'</div>';
        }
        break;
      case "c2b":
        checkbox = '<input type="checkbox" '+(tc.c2b?"checked":"")+' onchange="toggleCredit(\'c2b\',this.checked)">';
        break;
      case "c3":
        checkbox = '<input type="checkbox" '+(tc.c3.checked?"checked":"")+' onchange="toggleCredit(\'c3\',this.checked)">';
        if(tc.c3.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c3_fromDate","מתאריך",true,'<input type="date" id="f101_c3_fromDate" value="'+tc.c3.fromDate+'" onblur="updateCreditField(\'c3\',\'fromDate\',this.value)">') +
            f101FieldWrap("f101_c3_settlement","היישוב",true,'<input type="text" id="f101_c3_settlement" value="'+escapeHtml(tc.c3.settlement)+'" onchange="updateCreditField(\'c3\',\'settlement\',this.value)">') +
          '</div>';
        }
        break;
      case "c4":
        disabled = !emp.aliyaDate;
        disabledReason = disabled ? tr("cred_c4_disabledReason",'יש למלא תחילה תאריך עלייה בחלק ב׳. <button class="btn-link" onclick="scrollToField(\'f101_aliyaDate\')">מעבר לשדה תאריך עלייה</button>') : null;
        checkbox = '<input type="checkbox" '+(tc.c4.checked?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c4\',this.checked)">';
        if(tc.c4.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c4_fromDate","מתאריך",true,'<input type="date" id="f101_c4_fromDate" value="'+tc.c4.fromDate+'" onblur="updateCreditField(\'c4\',\'fromDate\',this.value)">') +
            f101FieldWrap("f101_c4_noIncomeUntilDate","לא הייתה לי הכנסה בישראל מתחילת שנת המס הנוכחית עד תאריך",false,'<input type="date" id="f101_c4_noIncomeUntilDate" value="'+tc.c4.noIncomeUntilDate+'" onblur="updateCreditField(\'c4\',\'noIncomeUntilDate\',this.value)">') +
          '</div>';
        }
        break;
      case "c5":
        disabled = emp.maritalStatus!=="married";
        disabledReason = disabled ? tr("cred_c5_disabledReason","סעיף זה מיועד לעובד/ת נשוי/אה בלבד.") : null;
        checkbox = '<input type="checkbox" '+(tc.c5?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c5\',this.checked)">';
        break;
      case "c6":
        disabled = !emp.children.some(k=>k.receivesAllowance);
        if(disabled) tc.c6 = false;
        disabledReason = disabled ? tr("cred_c6_disabledReason","לא ניתן לבחור מכיוון שלא ציינת בחלק ג' ילדים בגינם הינך מקבל/ת קצבת ילדים מביטוח לאומי.") : null;
        checkbox = '<input type="checkbox" '+(tc.c6?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c6\',this.checked)">';
        break;
      case "c7":
        disabled = emp.children.length===0;
        if(disabled) tc.c7.checked = false;
        disabledReason = disabled ? tr("cred_childRequired_disabledReason","כדי לבחור באפשרות זו, יש להוסיף לפחות ילד אחד בחלק הילדים.") : null;
        checkbox = '<input type="checkbox" '+(tc.c7.checked?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c7\',this.checked)">';
        if(tc.c7.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c7_bornThisYear","מספר ילדים שנולדו בשנת המס",true,'<input type="number" min="0" id="f101_c7_bornThisYear" value="'+tc.c7.bornThisYear+'" onchange="updateCreditField(\'c7\',\'bornThisYear\',this.value)">') +
            f101FieldWrap("f101_c7_age4to5","מספר ילדים שימלאו להם 4 שנים עד 5 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c7_age4to5" value="'+tc.c7.age4to5+'" onchange="updateCreditField(\'c7\',\'age4to5\',this.value)">') +
            f101FieldWrap("f101_c7_age1to2","מספר ילדים שימלאו להם שנה אחת עד שנתיים בשנת המס",true,'<input type="number" min="0" id="f101_c7_age1to2" value="'+tc.c7.age1to2+'" onchange="updateCreditField(\'c7\',\'age1to2\',this.value)">') +
            f101FieldWrap("f101_c7_age6to17","מספר ילדים שימלאו להם 6 שנים עד 17 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c7_age6to17" value="'+tc.c7.age6to17+'" onchange="updateCreditField(\'c7\',\'age6to17\',this.value)">') +
            f101FieldWrap("f101_c7_age3","מספר ילדים שימלאו להם 3 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c7_age3" value="'+tc.c7.age3+'" onchange="updateCreditField(\'c7\',\'age3\',this.value)">') +
            f101FieldWrap("f101_c7_age18","מספר ילדים שימלאו להם 18 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c7_age18" value="'+tc.c7.age18+'" onchange="updateCreditField(\'c7\',\'age18\',this.value)">') +
          '</div>';
        }
        break;
      case "c8":
        disabled = emp.children.length===0 || tc.c7.checked;
        disabledReason = emp.children.length===0 ? tr("cred_childRequired_disabledReason","כדי לבחור באפשרות זו, יש להוסיף לפחות ילד אחד בחלק הילדים.") : (tc.c7.checked ? tr("cred_c8_excludesC7_disabledReason","לא ניתן לסמן יחד עם סעיף 7 (״למעט הורה אשר סימן בפסקה 7 לעיל״).") : null);
        checkbox = '<input type="checkbox" '+(tc.c8.checked?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c8\',this.checked)">';
        if(tc.c8.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c8_bornThisYear","מספר ילדים שנולדו בשנת המס",true,'<input type="number" min="0" id="f101_c8_bornThisYear" value="'+tc.c8.bornThisYear+'" onchange="updateCreditField(\'c8\',\'bornThisYear\',this.value)">') +
            f101FieldWrap("f101_c8_age4to5","מספר ילדים שימלאו להם 4 שנים עד 5 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c8_age4to5" value="'+tc.c8.age4to5+'" onchange="updateCreditField(\'c8\',\'age4to5\',this.value)">') +
            f101FieldWrap("f101_c8_age1to2","מספר ילדים שימלאו להם שנה אחת עד שנתיים בשנת המס",true,'<input type="number" min="0" id="f101_c8_age1to2" value="'+tc.c8.age1to2+'" onchange="updateCreditField(\'c8\',\'age1to2\',this.value)">') +
            f101FieldWrap("f101_c8_age6to17","מספר ילדים שימלאו להם 6 שנים עד 17 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c8_age6to17" value="'+tc.c8.age6to17+'" onchange="updateCreditField(\'c8\',\'age6to17\',this.value)">') +
            f101FieldWrap("f101_c8_age3","מספר ילדים שימלאו להם 3 שנים בשנת המס",true,'<input type="number" min="0" id="f101_c8_age3" value="'+tc.c8.age3+'" onchange="updateCreditField(\'c8\',\'age3\',this.value)">') +
          '</div>';
        }
        break;
      case "c9":
        checkbox = '<input type="checkbox" '+(tc.c9?"checked":"")+' onchange="toggleCredit(\'c9\',this.checked)">';
        break;
      case "c10":
        checkbox = '<input type="checkbox" '+(tc.c10?"checked":"")+' onchange="toggleCredit(\'c10\',this.checked)">';
        break;
      case "c11":
        checkbox = '<input type="checkbox" '+(tc.c11.checked?"checked":"")+' onchange="toggleCredit(\'c11\',this.checked)">';
        if(tc.c11.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c11_count","מספר הילדים עם מוגבלות שטרם מלאו להם 19 שנים, בגינם את/ה מקבל/ת גמלת ילד נכה מהמוסד לביטוח לאומי",true,
              '<input type="number" min="1" max="'+emp.children.length+'" id="f101_c11_count" value="'+tc.c11.count+'" oninput="updateCreditField(\'c11\',\'count\',this.value)" onblur="finalizeCreditField(\'c11\',\'count\',this.value)" style="max-width:200px;">',
              null,null,"span-2") +
          '</div>';
        }
        break;
      case "c12":
        checkbox = '<input type="checkbox" '+(tc.c12?"checked":"")+' onchange="toggleCredit(\'c12\',this.checked)">';
        break;
      case "c13":{
        const ownOk = ageEligible1618(emp.birthDate,c.taxYear);
        if(!ownOk){
          if(emp.maritalStatus==="married"){
            if(!emp.spouse.birthDate){ disabled=true; disabledReason=tr("cred_c13_needSpouseBirthDate",'כדי לבחור בסעיף זה יש למלא תחילה את תאריך הלידה של בן/בת הזוג בחלק ו׳. <button class="btn-link" onclick="scrollToField(\'f101_spouse_birthDate\')">מעבר לשדה תאריך לידה בן/בת הזוג</button>'); }
            else if(!ageEligible1618(emp.spouse.birthDate,c.taxYear)){ disabled=true; disabledReason=tr("cred_c13_ageNotEligible_married","גיל העובד/ת ובן/בת הזוג אינו עומד בתנאי הזכאות לסעיף זה (16 עד 18 בשנת המס)."); }
          } else {
            disabled=true; disabledReason=tr("cred_c13_ageNotEligible_single","גיל העובד/ת אינו עומד בתנאי הזכאות לסעיף זה (16 עד 18 בשנת המס). ניתן לבדוק זכאות בהתאם לגיל בן/בת הזוג אם וכאשר יעודכן מצב משפחתי.");
          }
        }
        checkbox = '<input type="checkbox" '+(tc.c13?"checked":"")+' '+(disabled?"disabled":"")+' onchange="toggleCredit(\'c13\',this.checked)">';
        break;
      }
      case "c14":
        checkbox = '<input type="checkbox" '+(tc.c14.checked?"checked":"")+' onchange="toggleCredit(\'c14\',this.checked)">';
        if(tc.c14.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c14_startDate","תאריך תחילת שירות",true,'<input type="date" id="f101_c14_startDate" value="'+tc.c14.startDate+'" onblur="finalizeCreditField(\'c14\',\'startDate\',this.value)">') +
            f101FieldWrap("f101_c14_endDate","תאריך סיום שירות",true,'<input type="date" id="f101_c14_endDate" value="'+tc.c14.endDate+'" onblur="finalizeCreditField(\'c14\',\'endDate\',this.value)">') +
          '</div>';
        }
        break;
      case "c15":
        checkbox = '<input type="checkbox" '+(tc.c15?"checked":"")+' onchange="toggleCredit(\'c15\',this.checked)">';
        break;
      case "c16":
        checkbox = '<input type="checkbox" '+(tc.c16.checked?"checked":"")+' onchange="toggleCredit(\'c16\',this.checked)">';
        if(tc.c16.checked){
          extraBody = '<div class="form-grid cols-2" style="margin-top:10px;">' +
            f101FieldWrap("f101_c16_days","סה\"כ ימי מילואים בשנת המס הקודמת",true,'<input type="number" min="1" id="f101_c16_days" value="'+tc.c16.days+'" oninput="updateCreditField(\'c16\',\'days\',this.value)" onblur="finalizeCreditField(\'c16\',\'days\',this.value)">') +
          '</div>';
        }
        break;
    }
    if(meta.document){
      const val = tc[key];
      const checked = (typeof val==="object")?val.checked:val;
      if(checked && !disabled){
        extraBody += '<div class="card-hint" style="display:flex;align-items:flex-start;gap:8px;">'+WARNING_ICON+'<b>'+tr("document_required_prefix","מסמך נדרש:")+' '+tr("cred_"+key+"_document",meta.document)+'</b></div>';
      }
    }
    return creditCardShell(meta,disabled,disabledReason,extraBody,checkbox);
  }).join("");
  return '<h2 class="section-title" id="sec-h">'+sectionTitleHtml("ח","sec_h_title","פטור או זיכוי ממס")+'</h2><div class="panel">'+cards+'</div>';
}

/* ---------- ט. תיאום מס ---------- */
function renderForm101SectionI(c){
  const tco = c.employee.taxCoordination;
  const e = (k)=>ui.errors[k] ? " err" : "";
  const opts = [
    {id:"noIncomeYet",name:tr("taxCoordOption_noIncomeYet","לא הייתה לי הכנסה מתחילת שנת המס ועד תחילת העבודה אצל המעסיק.")},
    {id:"hasOtherIncome",name:tr("taxCoordOption_hasOtherIncome","יש לי הכנסות נוספות.")},
    {id:"approved",name:tr("taxCoordOption_approved","פקיד השומה אישר תיאום מס לפי אישור מצורף.")}
  ];
  let sourcesHtml = "";
  if(tco.option==="hasOtherIncome"){
    sourcesHtml = '<div class="kids-list" style="margin-top:12px;">' + tco.sources.map((s,idx)=>{
      return '<div class="kid-card">' +
        '<div class="kid-card-head"><b>'+tr("income_source_prefix","מקור הכנסה")+' '+(idx+1)+'</b><button class="btn-icon-danger" onclick="removeIncomeSource('+idx+')">&minus;</button></div>' +
        '<div class="form-grid cols-3">' +
          f101FieldWrap("f101_ts_"+idx+"_employerName","שם המעסיק או משלם ההכנסה",true,'<input type="text" id="f101_ts_'+idx+'_employerName" class="'+e("f101_ts_"+idx+"_employerName")+'" value="'+escapeHtml(s.employerName)+'" oninput="updateEmp(\'taxCoordination.sources.'+idx+'.employerName\',this.value)">') +
          f101FieldWrap("f101_ts_"+idx+"_address","כתובת",true,'<input type="text" id="f101_ts_'+idx+'_address" class="'+e("f101_ts_"+idx+"_address")+'" value="'+escapeHtml(s.address)+'" oninput="updateEmp(\'taxCoordination.sources.'+idx+'.address\',this.value)">') +
          f101FieldWrap("f101_ts_"+idx+"_taxFileNum","מספר תיק ניכויים",true,'<input type="text" id="f101_ts_'+idx+'_taxFileNum" class="'+e("f101_ts_"+idx+"_taxFileNum")+'" value="'+escapeHtml(s.taxFileNum)+'" oninput="updateEmp(\'taxCoordination.sources.'+idx+'.taxFileNum\',this.value)">') +
          f101FieldWrap("f101_ts_"+idx+"_incomeType","סוג הכנסה",true,'<select id="f101_ts_'+idx+'_incomeType" class="'+e("f101_ts_"+idx+"_incomeType")+'" onchange="updateEmp(\'taxCoordination.sources.'+idx+'.incomeType\',this.value)"><option value="">'+trPlain("select_placeholder","בחר/י...")+'</option>'+CODE_TABLES.otherIncomeTypes.map(t=>'<option value="'+t.id+'" '+(s.incomeType===t.id?"selected":"")+'>'+codeName("otherIncomeType",t,true)+'</option>').join("")+'</select>') +
          f101FieldWrap("f101_ts_"+idx+"_monthlyIncome","הכנסה חודשית",true,'<input type="number" id="f101_ts_'+idx+'_monthlyIncome" class="'+e("f101_ts_"+idx+"_monthlyIncome")+'" value="'+s.monthlyIncome+'" oninput="updateEmp(\'taxCoordination.sources.'+idx+'.monthlyIncome\',this.value)">') +
          f101FieldWrap("f101_ts_"+idx+"_taxWithheld","מס שנוכה לפי תלושים",true,'<input type="number" id="f101_ts_'+idx+'_taxWithheld" class="'+e("f101_ts_"+idx+"_taxWithheld")+'" value="'+s.taxWithheld+'" oninput="updateEmp(\'taxCoordination.sources.'+idx+'.taxWithheld\',this.value)">') +
        '</div>' +
      '</div>';
    }).join("") + '</div>' +
    '<div style="margin-top:10px;"><button class="btn-add-green" onclick="addIncomeSource()">+ '+tr("add_income_source_btn","הוסף מקור הכנסה")+'</button></div>' +
    (ui.errors["f101_taxCoordSources"]?'<div class="field-error">'+tr(ui.errors["f101_taxCoordSources"],ui.errors["f101_taxCoordSources"])+'</div>':'') +
    '<div class="card-hint" style="margin-top:10px;display:flex;align-items:flex-start;gap:8px;">'+WARNING_ICON+'<b>'+tr("document_required_prefix","מסמך נדרש:")+' '+tr("sec_i_sourcesDocument","תלוש שכר או אסמכתא רלוונטית לכל מקור הכנסה.")+'</b></div>';
  }
  if(tco.option==="approved"){
    sourcesHtml = '<div class="card-hint" style="margin-top:10px;display:flex;align-items:flex-start;gap:8px;">'+WARNING_ICON+'<b>'+tr("document_required_prefix","מסמך נדרש:")+' '+tr("sec_i_approvedDocument","אישור תיאום מס מפקיד השומה.")+'</b></div>';
  }
  return '' +
  '<h2 class="section-title" id="sec-i">'+sectionTitleHtml("ט","sec_i_title","תיאום מס")+'</h2>' +
  '<div class="panel">' +
    '<label class="check-row"><input type="checkbox" id="f101_taxCoordRequested" '+(tco.requested?"checked":"")+' onchange="toggleTaxCoordRequested(this.checked)"> '+tr("sec_i_requestLabel","אני מבקש/ת תיאום מס")+'</label>' +
    (tco.requested ? ('' +
      '<div class="field" id="f101_taxCoordOption_wrap" style="margin-top:14px;"><label>'+tr("sec_i_reasonLabel","סיבת הבקשה")+' <span class="req-star">*</span></label>' +
        '<div class="radio-group" style="flex-direction:column;align-items:flex-start;gap:10px;">' +
          opts.map(o=>'<label><input type="radio" name="taxCoordOption" value="'+o.id+'" '+(tco.option===o.id?"checked":"")+' onchange="updateEmp(\'taxCoordination.option\',\''+o.id+'\')"> '+o.name+'</label>').join("") +
        '</div>' +
        (ui.errors["f101_taxCoordOption"]?'<div class="field-error">'+tr(ui.errors["f101_taxCoordOption"],ui.errors["f101_taxCoordOption"])+'</div>':'') +
      '</div>' +
      sourcesHtml
    ) : '') +
  '</div>';
}

/* ---------- מקטע פרטי חשבון בנק (חלק מתהליך הקליטה הדיגיטלי בלבד - אינו סעיף בטופס 101 הרשמי) ---------- */
function renderForm101BankSection(c){
  const b = c.bank;
  const e = (k)=>ui.errors[k] ? " err" : "";
  if(b.deferred){
    return '' +
    '<h2 class="section-title" id="sec-bank">פרטי חשבון בנק להעברת משכורת</h2>' +
    '<div class="panel">' +
      '<div class="card disabled">' +
        '<div class="card-title">מילוי פרטי חשבון הבנק נדחה למועד אחר</div>' +
        '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-secondary" onclick="reopenBankSection()">ערוך ומלא עכשיו</button></div>' +
      '</div>' +
    '</div>';
  }
  return '' +
  '<h2 class="section-title" id="sec-bank">פרטי חשבון בנק להעברת משכורת</h2>' +
  '<div class="panel">' +
    '<div class="alert alert-info" style="margin-top:0;"><b>שימו לב:</b>מקטע זה אינו חלק מטופס 101 הרשמי. הוא חלק מתהליך הקליטה הדיגיטלי בלבד, ומיועד להפקת טופס נפרד של פרטי חשבון בנק להעברת המשכורת.</div>' +
    '<div class="form-grid cols-2">' +
      f101FieldWrap("bank_bankCode","בנק",true,comboFieldHtml("bank",b.bankCode,"בחר/י בנק, או הקלידו שם/קוד בנק...",false)) +
      f101FieldWrap("bank_branchCode","סניף",true,comboFieldHtml("branch",b.branchCode,"בחר/י סניף, או הקלידו שם/קוד סניף...",!b.bankCode),null, b.bankCode?"":"יש לבחור בנק תחילה.") +
    '</div>' +
    f101FieldWrap("bank_accountNumber","מספר חשבון",true,'<input type="text" id="bank_accountNumber" class="'+e("bank_accountNumber")+'" value="'+escapeHtml(b.accountNumber)+'" onchange="updateBank(\'accountNumber\',this.value.trim())" style="max-width:260px;">',null,"אין צורך להוסיף אפסים בתחילת המספר.") +
    '<hr class="divider">' +
    '<label class="check-row"><input type="checkbox" id="bank_confirmed" '+(b.confirmed?"checked":"")+' onchange="updateBank(\'confirmed\',this.checked)"> אני מאשר/ת כי פרטי החשבון שמסרתי נכונים.</label>' +
    (ui.errors["bank_confirmed"]?'<div class="field-error">'+ui.errors["bank_confirmed"]+'</div>':'') +
    '<div class="btn-row">' +
      '<button class="btn btn-secondary" onclick="deferBankDetails()">אשלים פרטי בנק במועד אחר</button>' +
    '</div>' +
  '</div>';
}

/* ---------- י. הצהרה וסיום ---------- */
function renderForm101SectionJ(c){
  const emp = c.employee;
  const done = emp.form101Status === "completed";
  return '' +
  '<h2 class="section-title" id="sec-j">'+sectionTitleHtml("י","sec_j_title","הצהרה וסיום")+'</h2>' +
  '<div class="panel">' +
    '<label class="check-row"><input type="checkbox" id="f101_declaration" '+(emp.declarationAccepted?"checked":"")+' onchange="updateEmp(\'declarationAccepted\',this.checked)"> '+tr("sec_j_declarationLabel","אני מצהיר/ה כי הפרטים שמסרתי בטופס מלאים ונכונים.")+'</label>' +
    (ui.errors["f101_declaration"]?'<div class="field-error">'+tr(ui.errors["f101_declaration"],ui.errors["f101_declaration"])+'</div>':'') +
    (done ? '<div class="alert alert-info">'+tr("sec_j_alreadyCompleted","טופס זה כבר סומן כהושלם. יש לבטל את תיבת ההצהרה כדי לערוך ולסמן מחדש.")+'</div>' : '') +
    '<div class="btn-row">' +
      '<button class="btn btn-secondary" onclick="printForm(\''+c.id+'\',\'form101\')">'+tr("preview_btn","תצוגה מקדימה")+'</button>' +
      '<button class="btn btn-primary" '+(done?"disabled":"")+' onclick="submitForm101()">'+tr("finish_btn","סיימתי")+'</button>' +
    '</div>' +
    '<div class="field-hint-static" style="margin-top:10px;">'+tr("sec_j_noDigitalSignatureHint","אין חתימה דיגיטלית — הטופס יודפס ויחתם פיזית על ידי העובד/ת.")+'</div>' +
  '</div>';
}

/* ============================================================
   11. טופס פרטי חשבון בנק
   ============================================================ */
function updateBank(path,value){
  const c = currentCase();
  setPath(c.bank,path,value);
  // כלל עסקי: אם משתמש/ת מחליפ/ה בנק לאחר שכבר נבחר סניף, יש לנקות מיד
  // את בחירת הסניף הקודמת (השדה חוזר להיות ריק) - כי רשימת הסניפים
  // תלויה בבנק שנבחר, ואין להשאיר קוד סניף שלא שייך לבנק החדש.
  // המשתמש/ת חייב/ת לבחור מחדש סניף מתוך רשימת הסניפים של הבנק החדש.
  if(path==="bankCode") c.bank.branchCode="";
  // ביטול תיבת "אני מאשר/ת..." הוא בעצם החתימה הדיגיטלית של טופס הבנק - ביטולה
  // (uncheck) לאחר שהטופס כבר סומן כהושלם שקול ללחיצה על "נקה" בטפסי החתימה:
  // מבטל את סימון "הושלם" כך שהלחצן "סיימתי" ננעל שוב עד לאישור מחדש (ר' renderBankForm).
  if(path==="confirmed" && !value && c.bank.status==="completed"){
    c.bank.status = "pending";
    c.bank.completedAt = null;
    c.bank.date = "";
  }
  render();
}
/* --- שדה בנק/סניף: רשימה נפתחת אחת שניתן גם להקליד בתוכה (ללא שדה חיפוש נפרד) ---
   רכיב combobox נגיש (ARIA) עם תמיכה מלאה במקלדת בנוסף לבחירה בעכבר:
   חץ למטה/למעלה לניווט בין האפשרויות המסוננות, Enter לבחירה, Escape
   לסגירת הרשימה בלי לשנות ערך, Tab למעבר לשדה הבא בלי בחירה אוטומטית.
   מצב הניווט (הרשימה המסוננת הנוכחית והאפשרות המודגשת) נשמר ב-comboNav,
   מחוץ ל-render() הראשי, כדי לא לאבד פוקוס/סמן בכל הקלדה. --- */
const comboNav = { bank:{list:[],activeIndex:-1}, branch:{list:[],activeIndex:-1} };
function comboFieldId(kind){ return kind==="bank" ? "bank_bankCode" : "bank_branchCode"; }
function comboSetList(kind,query){
  const c = currentCase();
  const list = kind==="bank"
    ? BankBranchesService.listBanks(query)
    : (c.bank.bankCode ? BankBranchesService.listBranches(c.bank.bankCode,query) : []);
  comboNav[kind].list = list;
  comboNav[kind].activeIndex = -1;
  return list;
}
function comboItemsHtml(kind){
  const nav = comboNav[kind];
  if(!nav.list.length) return '<div class="combo-empty">לא נמצאו תוצאות</div>';
  const id = comboFieldId(kind);
  // תצוגה: שורת טקסט רגילה אחת "שם | קוד", ללא תג/רקע נפרד לקוד.
  // קוד הסניף/הבנק (o.code) הוא תמיד מחרוזת טקסט ומוצג כפי שהוא, כולל
  // אפסים מובילים (למשל "027") - ראו הכלל העסקי ליד BANK_BRANCHES_DATA.
  return nav.list.map((o,idx)=>
    '<div class="combo-item'+(idx===nav.activeIndex?" active":"")+'" id="'+id+'_opt_'+idx+'" role="option" aria-selected="'+(idx===nav.activeIndex?"true":"false")+'" onmousedown="comboMouseSelect(\''+kind+'\','+idx+')">'+
      escapeHtml(o.name)+' | '+escapeHtml(o.code)+
    '</div>'
  ).join("");
}
function comboRenderDropdown(kind){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  const inp = document.getElementById(comboFieldId(kind));
  if(!dd) return;
  dd.innerHTML = comboItemsHtml(kind);
  if(inp){
    const nav = comboNav[kind];
    if(nav.activeIndex>=0 && nav.list[nav.activeIndex]) inp.setAttribute("aria-activedescendant",comboFieldId(kind)+"_opt_"+nav.activeIndex);
    else inp.removeAttribute("aria-activedescendant");
  }
}
function comboScrollActiveIntoView(kind){
  const nav = comboNav[kind];
  if(nav.activeIndex<0) return;
  const el = document.getElementById(comboFieldId(kind)+"_opt_"+nav.activeIndex);
  if(el && el.scrollIntoView) el.scrollIntoView({block:"nearest"});
}
function comboOpenDropdown(kind){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  const inp = document.getElementById(comboFieldId(kind));
  if(dd) dd.classList.add("open");
  if(inp) inp.setAttribute("aria-expanded","true");
}
function comboCloseDropdown(kind){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  const inp = document.getElementById(comboFieldId(kind));
  if(dd) dd.classList.remove("open");
  comboNav[kind].activeIndex = -1;
  if(inp){ inp.setAttribute("aria-expanded","false"); inp.removeAttribute("aria-activedescendant"); }
}
function comboFocus(kind){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  const inp = document.getElementById(comboFieldId(kind));
  if(!dd || !inp) return;
  comboSetList(kind,"");
  comboOpenDropdown(kind);
  comboRenderDropdown(kind);
}
function comboFilter(kind,query){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  if(!dd) return;
  comboSetList(kind,query);
  comboOpenDropdown(kind);
  comboRenderDropdown(kind);
}
function comboMouseSelect(kind,idx){
  const item = comboNav[kind].list[idx];
  if(!item) return;
  comboCommit(kind,item.code);
}
/* בחירת ערך (מקלדת Enter או קליק עכבר) - סוגרת את הרשימה, שומרת את הקוד
   כמחרוזת טקסט במודל, ומרעננת את התצוגה. אם נבחר בנק, השדה סניף נפתח
   ומקבל פוקוס אוטומטית (כלל 8), כדי לאפשר המשך בחירה במקלדת ללא עכבר. */
function comboCommit(kind,code){
  comboCloseDropdown(kind);
  updateBank(kind==="bank"?"bankCode":"branchCode",code);
  if(kind==="bank"){
    setTimeout(()=>{
      const branchInput = document.getElementById(comboFieldId("branch"));
      if(branchInput){ branchInput.focus(); comboFocus("branch"); }
    },60);
  }
}
function comboBlur(kind){
  setTimeout(()=>{
    comboCloseDropdown(kind);
    const c = currentCase();
    const inp = document.getElementById(comboFieldId(kind));
    if(!c || !inp) return;
    const code = kind==="bank" ? c.bank.bankCode : c.bank.branchCode;
    const expected = code ? (kind==="bank" ? bankName(code) : branchName(c.bank.bankCode,code))+" | "+code : "";
    if(inp.value !== expected) render();
  },150);
}
/* Escape: סוגר את הרשימה ומחזיר את הטקסט המוצג לערך השמור במודל,
   בלי לשנות את הערך ובלי לבחור אפשרות (כלל 5). */
function comboResetDisplay(kind){
  const c = currentCase();
  const inp = document.getElementById(comboFieldId(kind));
  if(!c || !inp) return;
  const code = kind==="bank" ? c.bank.bankCode : c.bank.branchCode;
  const expected = code ? (kind==="bank" ? bankName(code) : branchName(c.bank.bankCode,code))+" | "+code : "";
  inp.value = expected;
}
/* מחזיר את שאילתת הסינון האפקטיבית: אם הטקסט בשדה עדיין זהה לערך השמור
   (המשתמש לא הקליד דבר חדש מאז הבחירה האחרונה) - מחזיר מחרוזת ריקה,
   כדי שהרשימה המלאה תוצג ("אם לא הוקלד טקסט, יש לסמן את האפשרות הראשונה
   ברשימה" - כלל 7). אחרת מחזיר את מה שהמשתמש הקליד בפועל. */
function comboEffectiveQuery(kind,inp){
  const c = currentCase();
  if(!c || !inp) return "";
  const code = kind==="bank" ? c.bank.bankCode : c.bank.branchCode;
  const label = code ? (kind==="bank" ? bankName(code) : branchName(c.bank.bankCode,code))+" | "+code : "";
  return inp.value===label ? "" : inp.value;
}
function comboKeyDown(e,kind){
  const dd = document.getElementById(comboFieldId(kind)+"_dd");
  const inp = document.getElementById(comboFieldId(kind));
  const nav = comboNav[kind];
  const isOpen = !!(dd && dd.classList.contains("open"));
  if(e.key==="ArrowDown"){
    e.preventDefault();
    if(!isOpen){
      // כלל 7: אם הרשימה סגורה, פתח אותה וסמן את האפשרות הראשונה
      // המתאימה לטקסט שהוקלד (או הראשונה ברשימה אם לא הוקלד טקסט).
      comboSetList(kind, comboEffectiveQuery(kind,inp));
      comboOpenDropdown(kind);
      nav.activeIndex = nav.list.length ? 0 : -1;
    } else if(nav.list.length){
      nav.activeIndex = nav.activeIndex < nav.list.length-1 ? nav.activeIndex+1 : nav.list.length-1;
    }
    comboRenderDropdown(kind);
    comboScrollActiveIntoView(kind);
  } else if(e.key==="ArrowUp"){
    e.preventDefault();
    if(isOpen && nav.list.length){
      nav.activeIndex = nav.activeIndex>0 ? nav.activeIndex-1 : 0;
      comboRenderDropdown(kind);
      comboScrollActiveIntoView(kind);
    }
  } else if(e.key==="Enter"){
    if(isOpen && nav.activeIndex>=0 && nav.list[nav.activeIndex]){
      e.preventDefault();
      comboCommit(kind,nav.list[nav.activeIndex].code);
    }
  } else if(e.key==="Escape"){
    if(isOpen){
      e.preventDefault();
      comboCloseDropdown(kind);
      comboResetDisplay(kind);
    }
  } else if(e.key==="Tab"){
    if(isOpen) comboCloseDropdown(kind);
    // לא מבצעים preventDefault - הפוקוס עובר כרגיל לשדה הבא, בלי בחירה אוטומטית (כלל 6).
  }
}
function comboFieldHtml(kind,code,placeholder,disabled){
  const id = comboFieldId(kind);
  const label = code ? (kind==="bank" ? bankName(code) : branchName(currentCase().bank.bankCode,code))+" | "+code : "";
  const err = ui.errors[id] ? " err" : "";
  return '' +
    '<div class="combo-wrap">' +
      '<input type="text" id="'+id+'" class="combo-input'+err+'" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-haspopup="listbox" aria-controls="'+id+'_dd" placeholder="'+placeholder+'" value="'+escapeHtml(label)+'" '+(disabled?"disabled":"")+
        ' oninput="comboFilter(\''+kind+'\',this.value)" onfocus="comboFocus(\''+kind+'\')" onblur="comboBlur(\''+kind+'\')" onkeydown="comboKeyDown(event,\''+kind+'\')">' +
      '<div class="combo-dropdown" id="'+id+'_dd" role="listbox"></div>' +
    '</div>';
}
function validateBankForm(c){
  const b = c.bank, errs={};
  if(!b.bankCode) errs["bank_bankCode"]="שדה חובה.";
  if(!b.branchCode) errs["bank_branchCode"]="שדה חובה.";
  if(!b.accountNumber) errs["bank_accountNumber"]="שדה חובה.";
  else if(!/^\d{1,15}$/.test(b.accountNumber.trim())) errs["bank_accountNumber"]="יש להזין מספרים בלבד.";
  if(!b.confirmed) errs["bank_confirmed"]="יש לאשר שהפרטים נכונים כדי לסיים.";
  return errs;
}
function submitBankForm(){
  const c = currentCase();
  const errs = validateBankForm(c);
  ui.errors = errs;
  if(Object.keys(errs).length){
    render();
    setTimeout(()=>{ scrollToField(Object.keys(errs)[0]); },60);
    return;
  }
  // התאריך ננעל אוטומטית למועד הסיום בפועל - אינו ניתן לעריכה ידנית (ר' renderBankForm),
  // בדיוק כמו בטפסי החתימה הדיגיטלית האחרים.
  c.bank.date = todayIso();
  c.bank.status="completed";
  c.bank.completedAt=new Date().toISOString();
  c.documents = buildDocuments(c);
  showToast('הטופס "פרטי חשבון בנק להעברת משכורת" סומן כהושלם.');
  backToFormsHome();
}
function renderBankForm(isHr){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  const emp = c.employee, b = c.bank;
  const e = (k)=>ui.errors[k]?" err":"";
  // labelKey מפורש (במקום גזירה אוטומטית מ-id) כדי לשתף את אותו תרגום עם
  // השדות המקבילים בטופס 101 (ר' f101FieldWrap/FORM101_I18N) - אין טעם
  // לתרגם את אותו "שם פרטי"/"מספר זהות" פעמיים במילון.
  const idLabelKey = emp.idType==="id" ? "id_number_label" : "passport_number_label";
  const idLabel = emp.idType==="id" ? "מספר זהות" : "מספר דרכון";
  const idValue = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  const dir = FORM_LANG_DIR[ui.formLanguage] || "rtl";
  const backBtn = '<button class="btn-back" onmousedown="backToFormsHome()">'+(dir==="ltr"?"&larr; ":"&rarr; ")+(isHr?tr("back_to_case","חזרה לתיק הקליטה"):tr("back_to_forms_list","חזרה לרשימת הטפסים"))+'</button>';
  const idOk = emp.idType==="id" ? !!(emp.idNumber||"").trim() : !!(emp.passportNumber||"").trim();
  const employeeOk = !!(emp.firstName && emp.lastName && idOk);
  const bankFieldsOk = !!(b.bankCode && b.branchCode && b.accountNumber && /^\d{1,15}$/.test((b.accountNumber||"").trim()));
  const done = b.status === "completed";
  // כמו בטפסי החתימה הדיגיטלית - לאחר שהטופס סומן כהושלם, "סיימתי" ננעל
  // שוב עד לביטול תיבת האישור (ר' updateBank) ואישור מחדש.
  const canSubmit = employeeOk && bankFieldsOk && b.confirmed && !done;
  // התאריך אינו ניתן לעריכה ידנית - ננעל אוטומטית למועד האישור בפועל (ר' submitBankForm/updateBank)
  const displayDate = b.date || todayIso();
  return '' +
  langSwitcherHtml() +
  '<div dir="'+dir+'" class="form-dir'+(BOTH_LANG_OF[ui.formLanguage]?" lang-bi":"")+'">' +
  '<div class="btn-row" style="margin:16px 0;">'+backBtn+'</div>' +
  '<h1 style="margin-top:14px;">'+tr("bank_form_title","טופס פרטי חשבון בנק להעברת משכורת")+'</h1>' +
  '<div class="page-desc">'+tr("bank_form_pageDesc","מסך זה משמש להשלמת פרטי חשבון הבנק במועד מאוחר, עבור עובד/ת שכבר השלים/ה את טופס 101 ובחר/ה לדחות את מילוי פרטי הבנק. אין כתובת דוא\"ל בטופס זה.")+'</div>' +
  '<h2 class="section-title">'+tr("bank_employeeSection_title","פרטי העובד/ת (מוזנים אוטומטית מפתיחת תיק הקליטה, לקריאה בלבד)")+'</h2>' +
  '<div class="panel">' +
  '<div class="form-grid">' +
    f101FieldWrap("bank_firstName_ro","שם פרטי",true,'<input type="text" value="'+escapeHtml(emp.firstName)+'" readonly disabled>',null,null,null,"f101_firstName_ro_label") +
    f101FieldWrap("bank_lastName_ro","שם משפחה",true,'<input type="text" value="'+escapeHtml(emp.lastName)+'" readonly disabled>',null,null,null,"f101_lastName_ro_label") +
    f101FieldWrap("bank_idType_ro","זיהוי לפי",true,
      '<div class="radio-group"><label><input type="radio" '+(emp.idType==="id"?"checked":"")+' disabled> '+tr("id_type_id","תעודת זהות")+'</label>'+
      '<label><input type="radio" '+(emp.idType==="passport"?"checked":"")+' disabled> '+tr("id_type_passport","דרכון (עבור אזרח זר)")+'</label></div>',null,null,null,"f101_idType_ro_label") +
    f101FieldWrap("bank_idNumber_ro",idLabel,true,'<input type="text" value="'+escapeHtml(idValue)+'" readonly disabled>',null,null,null,idLabelKey) +
    f101FieldWrap("bank_mobilePhone_ro","מספר טלפון נייד",false,'<input type="tel" value="'+escapeHtml(emp.mobilePhone)+'" readonly disabled>',null,null,null,"f101_mobilePhone_label") +
  '</div>' +
  '<div class="field-hint-static">'+tr("sec_b_idHint","שם, סוג הזיהוי ומספר הזהות/דרכון נמסרו בעת פתיחת תיק הקליטה ואינם ניתנים לעריכה כאן.")+'</div>' +
  '</div>' +
  '<h2 class="section-title">'+tr("bank_details_title","פרטי חשבון בנק")+'</h2>' +
  '<div class="panel">' +
  '<div class="form-grid cols-2">' +
    f101FieldWrap("bank_bankCode","בנק",true,comboFieldHtml("bank",b.bankCode,trAttrOnly("bank_bankCode_placeholder","בחר/י בנק, או הקלידו שם/קוד בנק..."),false)) +
    f101FieldWrap("bank_branchCode","סניף",true,comboFieldHtml("branch",b.branchCode,trAttrOnly("bank_branchCode_placeholder","בחר/י סניף, או הקלידו שם/קוד סניף..."),!b.bankCode),null, b.bankCode?"":"יש לבחור בנק תחילה.") +
  '</div>' +
  f101FieldWrap("bank_accountNumber","מספר חשבון",true,'<input type="text" id="bank_accountNumber" class="'+e("bank_accountNumber")+'" value="'+escapeHtml(b.accountNumber)+'" onchange="updateBank(\'accountNumber\',this.value.trim())" style="max-width:260px;">',null,"אין צורך להוסיף אפסים בתחילת המספר.") +
  '<hr class="divider">' +
  '<label class="check-row"><input type="checkbox" id="bank_confirmed" '+(b.confirmed?"checked":"")+' onchange="updateBank(\'confirmed\',this.checked)"> '+tr("bank_confirmed_label","אני מאשר/ת כי פרטי החשבון שמסרתי נכונים.")+'</label>' +
  (ui.errors["bank_confirmed"]?'<div class="field-error">'+tr(ui.errors["bank_confirmed"],ui.errors["bank_confirmed"])+'</div>':'') +
  '<div style="margin-top:14px;font-size:14px;"><b>'+tr("bank_date_label","תאריך:")+'</b> '+escapeHtml(formatDateHe(displayDate))+'</div>' +
  (done ? '<div class="alert alert-info">'+tr("bank_alreadyCompleted","טופס זה כבר סומן כהושלם. יש לבטל את תיבת האישור כדי לערוך ולסמן מחדש.")+'</div>' : '') +
  '<div class="btn-row">' +
    '<button class="btn btn-secondary" onclick="printForm(\''+c.id+'\',\'bank\')">'+tr("preview_btn","תצוגה מקדימה")+'</button>' +
    '<button class="btn btn-primary" '+(canSubmit?"":"disabled")+' onclick="submitBankForm()">'+tr("finish_btn","סיימתי")+'</button>' +
  '</div>' +
  '</div>' +
  '</div>';
}
/* ============================================================
   12. מסך מסמכים
   ============================================================ */
function setDocStatus(idx,status){
  const c = currentCase();
  c.documents[idx].status = status;
  render();
}
function renderDocumentsScreen(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  if(!c.documents.length) c.documents = buildDocuments(c);
  const docs = c.documents;
  const rows = docs.length ? docs.map((d,idx)=>{
    return '<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;">' +
      '<div>'+escapeHtml(d.label)+'</div>' +
      '<div class="row-actions">' +
        '<button class="btn btn-sm '+(d.status==="missing"?"btn-danger":"btn-secondary")+'" onclick="setDocStatus('+idx+',\'missing\')">חסר</button>' +
        '<button class="btn btn-sm '+(d.status==="delivered"?"btn-primary":"btn-secondary")+'" onclick="setDocStatus('+idx+',\'delivered\')">נמסר פיזית</button>' +
      '</div>' +
    '</div>';
  }).join("") : '<div class="empty-state">אין מסמכים נדרשים לתיק זה בשלב זה.</div>';
  const missing = docs.filter(d=>d.status==="missing").length;
  return '' +
  '<button class="btn-link" onclick="openCase(\''+c.id+'\',\'case-home\')">&rarr; חזרה למסך התיק</button>' +
  '<h1 style="margin-top:14px;">מסמכים נדרשים — '+escapeHtml(c.employee.firstName+" "+c.employee.lastName)+'</h1>' +
  '<div class="page-desc">הרשימה נגזרת אוטומטית מתשובות העובד/ת בטופס 101. אין אפשרות להעלות קבצים למערכת — יש לסמן ידנית האם המסמך נמסר פיזית.</div>' +
  (missing?'<div class="alert alert-warning-yellow">קיימים '+missing+' מסמכים שטרם נמסרו.</div>':'<div class="alert alert-info">כל המסמכים הנדרשים נמסרו.</div>') +
  rows;
}

/* ============================================================
   13. מסך יצוא
   ============================================================ */
function toggleExportSelect(caseId,checked){
  if(checked){ if(!ui.exportSelection.includes(caseId)) ui.exportSelection.push(caseId); }
  else { ui.exportSelection = ui.exportSelection.filter(id=>id!==caseId); }
  render();
}
// תיבת הסימון בכותרת הטבלה (renderExportScreen) - מסמנת/מבטלת סימון של כל
// השורות המוצגות (כל העובדים הזכאים ליצוא) בבת אחת.
function toggleExportSelectAll(checked,ids){
  ui.exportSelection = checked ? ids.slice() : [];
  render();
}
function setExportTarget(t){ ui.exportTarget=t; ui.pendingExportConfirm=false; render(); }
function requestCreateBatch(){
  if(!ui.exportSelection.length){ showToast("יש לבחור לפחות עובד/ת אחד/ת ליצוא."); return; }
  if(!ui.exportTarget){ showToast("יש לבחור יעד יצוא (שיקלולית או מערכת כחולה)."); return; }
  if(ui.exportTarget==="shikulit"){
    const missingBank = ui.exportSelection.some(id=>{ const c=getCase(id); return c && c.needsBankForm && c.bank.status!=="completed"; });
    if(missingBank){ ui.pendingExportConfirm=true; render(); return; }
  }
  createBatchNow();
}
function confirmExportAnyway(){ ui.pendingExportConfirm=false; createBatchNow(); }
function cancelExportForBank(){ ui.pendingExportConfirm=false; render(); }
function createBatchNow(){
  // הערה לפיתוח האמיתי: אצווה זו מדמה יצירת קובץ Excel בלבד (ראו שורה
  // הבאה - אין כאן קובץ אמיתי). כאשר ייכתב קוד ייצוא Excel אמיתי, יש
  // לכתוב את קוד הסניף (וקוד הבנק) לתא מסוג טקסט (Text/String) ולא תא
  // מסוג מספר, אחרת אפס מוביל בקוד הסניף (למשל "027") ייעלם.
  const ids = ui.exportSelection.slice();
  const firstCase = getCase(ids[0]);
  const batch = {
    id:nextId("batch"), target:ui.exportTarget, companyId: firstCase?firstCase.companyId:"",
    employeeIds:ids, createdAt:new Date().toISOString(), createdBy:DB.currentUser,
    sendStatus:"קובץ נוצר", importStatus:"טרם נוצר"
  };
  DB.batches.push(batch);
  const targetName = ui.exportTarget==="shikulit"?"שיקלולית":"המערכת הכחולה";
  showToast("נוצר קובץ Excel ל"+targetName+" עבור "+ids.length+" עובדים.");
  ui.exportSelection=[]; ui.exportTarget=""; ui.pendingExportConfirm=false;
  setScreen("batches");
}
/* טבלת בחירת עובדים ליצוא (סימון + יעד יצוא + כפתור יצירה) - משותפת בין
   מסך "יצוא טפסים" (רק עובדים שהשלימו טופס 101) ומסך "ארכיון עובדים" (כל
   העובדים שנקלטו, מסונן) כדי לא לשכפל את מנגנון היצוא פעמיים. שתי המסכים
   כותבים לאותו מצב משותף (ui.exportSelection/ui.exportTarget וכו') - ר'
   toggleExportSelect/setExportTarget/requestCreateBatch למעלה. */
function exportSelectionPanelHtml(casesList, emptyMessage){
  const allSelected = casesList.length>0 && casesList.every(c=>ui.exportSelection.includes(c.id));
  const idsJson = escapeHtml(JSON.stringify(casesList.map(c=>c.id)));
  const rows = casesList.map(c=>{
    const emp=c.employee;
    const bankOk = !c.needsBankForm || c.bank.status==="completed";
    const name = (emp.firstName||emp.lastName) ? (emp.firstName+" "+emp.lastName) : "(טרם הוזן שם)";
    return '<tr>' +
      '<td><input type="checkbox" '+(ui.exportSelection.includes(c.id)?"checked":"")+' onchange="toggleExportSelect(\''+c.id+'\',this.checked)"></td>' +
      '<td>'+escapeHtml(name)+'</td>' +
      '<td>'+escapeHtml(companyName(c.companyId))+'</td>' +
      '<td>'+escapeHtml(worksiteName(c.worksiteId))+'</td>' +
      '<td>'+escapeHtml(formatDateHe((c.createdAt||"").slice(0,10)))+'</td>' +
      '<td>'+(bankOk?'<span class="status-pill pill-green">פרטי בנק מלאים</span>':'<span class="status-pill pill-yellow">פרטי בנק חסרים</span>')+'</td>' +
    '</tr>';
  }).join("");
  return '' +
  '<div class="panel">' +
    '<div class="field" style="margin-bottom:16px;"><label>יעד יצוא</label>' +
      '<div class="radio-group">' +
        '<label><input type="radio" name="exportTarget" value="shikulit" '+(ui.exportTarget==="shikulit"?"checked":"")+' onchange="setExportTarget(\'shikulit\')"> שיקלולית</label>' +
        '<label><input type="radio" name="exportTarget" value="blue" '+(ui.exportTarget==="blue"?"checked":"")+' onchange="setExportTarget(\'blue\')"> המערכת הכחולה</label>' +
      '</div>' +
    '</div>' +
    (ui.pendingExportConfirm ? ('' +
      '<div class="alert alert-warning-pink"><b>אזהרה</b>פרטי חשבון הבנק טרם מולאו עבור אחד או יותר מהעובדים שנבחרו. האם ליצור ולשלוח את הקובץ ללא פרטי בנק?' +
        '<div class="alert-actions"><button class="btn btn-primary btn-sm" onclick="confirmExportAnyway()">המשך ביצוא</button><button class="btn btn-secondary btn-sm" onclick="cancelExportForBank()">ביטול והשלמת פרטי בנק</button></div>' +
      '</div>'
    ) : '') +
    (casesList.length ? ('<div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" '+(allSelected?"checked":"")+' onchange="toggleExportSelectAll(this.checked,'+idsJson+')"></th><th>שם עובד</th><th>חברה</th><th>אתר עבודה</th><th>תאריך פתיחת תיק</th><th>סטטוס פרטי בנק</th></tr></thead><tbody>'+rows+'</tbody></table></div>') : '<div class="empty-state">'+emptyMessage+'</div>') +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="requestCreateBatch()">צור קובץ Excel</button>' +
    '</div>' +
  '</div>';
}
function renderExportScreen(){
  const eligible = DB.cases.filter(caseReadyForExport);
  return '' +
  '<h1>יצוא קבצים</h1>' +
  '<div class="page-desc">ניתן לבחור עובד/ת אחד/ת או יותר שהשלימו טופס 101, וליצור עבורם אצווה מדומה לשיקלולית או למערכת הכחולה.</div>' +
  exportSelectionPanelHtml(eligible, "אין עובדים שהשלימו טופס 101 וזמינים ליצוא.");
}
/* מסך "ארכיון עובדים" - כמו מסך היצוא, אבל מציג את כל העובדים שנקלטו אי
   פעם (לא רק מי שהשלים/ה טופס 101), עם סרגל סינון/חיפוש כמו ב-hr-list
   ובנוסף סינון לפי טווח תאריך קליטה (c.createdAt). */
function passesArchiveFilters(c){
  const f = ui.archiveFilters;
  if(f.company && c.companyId!==f.company) return false;
  if(f.worksite && c.worksiteId!==f.worksite) return false;
  if(f.search){
    const s = f.search.trim();
    const name = (c.employee.firstName+" "+c.employee.lastName).trim();
    const idv = c.employee.idType==="id"?c.employee.idNumber:c.employee.passportNumber;
    if(!name.includes(s) && !(idv||"").includes(s)) return false;
  }
  if(f.dateRange && f.dateRange!=="all"){
    const months = {"3m":3,"6m":6,"1y":12}[f.dateRange];
    if(months){
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth()-months);
      if(new Date(c.createdAt) < cutoff) return false;
    }
  }
  return true;
}
function resetArchiveFilters(){ ui.archiveFilters={company:"",worksite:"",search:"",dateRange:"3m"}; render(); }
function renderArchiveScreen(){
  const filtered = DB.cases.filter(passesArchiveFilters);
  const options = (arr,valKey,labelKey)=>arr.map(x=>'<option value="'+x[valKey]+'">'+escapeHtml(x[labelKey])+'</option>').join("");
  const f = ui.archiveFilters;
  return '' +
  '<h1>ארכיון עובדים</h1>' +
  '<div class="page-desc">כל העובדים שנקלטו עד כה במערכת. ניתן לסנן, לחפש, ולבחור עובד/ת אחד/ת או יותר ליצוא לשיקלולית או למערכת הכחולה.</div>' +
  '<div class="filters-bar">' +
    '<div class="field"><label>חברה</label><select onchange="ui.archiveFilters.company=this.value;render()"><option value="">הכל</option>'+options(CODE_TABLES.companies,"id","name")+'</select></div>' +
    '<div class="field"><label>אתר עבודה</label><select onchange="ui.archiveFilters.worksite=this.value;render()"><option value="">הכל</option>'+options(CODE_TABLES.worksites,"id","name")+'</select></div>' +
    '<div class="field"><label>נקלטו ב</label><select onchange="ui.archiveFilters.dateRange=this.value;render()">' +
      '<option value="all" '+(f.dateRange==="all"?"selected":"")+'>כולם</option>' +
      '<option value="3m" '+(f.dateRange==="3m"?"selected":"")+'>3 חודשים אחרונים</option>' +
      '<option value="6m" '+(f.dateRange==="6m"?"selected":"")+'>6 חודשים אחרונים</option>' +
      '<option value="1y" '+(f.dateRange==="1y"?"selected":"")+'>שנה אחרונה</option>' +
    '</select></div>' +
    '<div class="field"><label>חיפוש לפי שם / ת.ז</label><input type="text" value="'+escapeHtml(f.search)+'" oninput="ui.archiveFilters.search=this.value;render()" placeholder="הקלד/י לחיפוש..."></div>' +
    '<div class="field"><button class="btn btn-secondary btn-sm" onclick="resetArchiveFilters()">איפוס סינונים</button></div>' +
  '</div>' +
  exportSelectionPanelHtml(filtered, "לא נמצאו עובדים התואמים את הסינון.");
}

/* ============================================================
   14. מסך היסטוריית אצוות
   ============================================================ */
function batchStatusPill(text){
  const map={"קובץ נוצר":"pill-blue","נשלח":"pill-green","שליחה נכשלה":"pill-red","טרם נוצר":"pill-gray","אושר יבוא":"pill-green","נדרש יצוא מחדש":"pill-red"};
  return '<span class="status-pill '+(map[text]||"pill-gray")+'">'+escapeHtml(text)+'</span>';
}
function downloadSampleFile(batchId){
  showToast("הורדת קובץ לדוגמה (הדמיה בלבד — אין קובץ Excel אמיתי באב הטיפוס).");
}
function viewBatch(batchId){
  ui.viewingBatchId = batchId;
  render();
}
function closeBatchModal(){ ui.viewingBatchId=null; render(); }
function clearBatchFilter(){ ui.batchFilterCaseId=""; render(); }
function renderBatchesScreen(){
  let list = DB.batches.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(ui.batchFilterCaseId) list = list.filter(b=>b.employeeIds.includes(ui.batchFilterCaseId));
  const rows = list.map(b=>{
    const emp0 = getCase(b.employeeIds[0]);
    return '<tr>' +
      '<td>'+b.id+'</td>' +
      '<td>'+(b.target==="shikulit"?"שיקלולית":"מערכת כחולה")+'</td>' +
      '<td>'+b.employeeIds.length+'</td>' +
      '<td>'+formatDateTimeHe(b.createdAt)+'</td>' +
      '<td class="row-actions">' +
        '<button class="btn-icon" title="צפייה" onclick="viewBatch(\''+b.id+'\')">👁</button>' +
        '<button class="btn-icon" title="הורד קובץ לדוגמה" onclick="downloadSampleFile(\''+b.id+'\')">⬇</button>' +
      '</td>' +
    '</tr>';
  }).join("");
  const modal = ui.viewingBatchId ? renderBatchModal(ui.viewingBatchId) : "";
  return '' +
  '<h1>היסטוריית יצוא קבצים</h1>' +
  (ui.batchFilterCaseId ? '<div class="alert alert-info">מוצגת היסטוריה עבור עובד/ת נבחר/ת בלבד. <button class="btn-link" onclick="clearBatchFilter()">הצג את כל האצוות</button></div>' : '') +
  (list.length ? ('<div class="table-wrap"><table class="data-table"><thead><tr>'+
    '<th>מספר אצווה</th><th>יעד</th><th>מספר עובדים</th><th>תאריך ושעת יצירה</th><th>פעולות</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div>') : '<div class="empty-state">לא נוצרו אצוות עדיין.</div>') +
  modal;
}
function renderBatchModal(batchId){
  const b = DB.batches.find(x=>x.id===batchId);
  if(!b) return "";
  const names = b.employeeIds.map(id=>{ const c=getCase(id); return c ? (c.employee.firstName+" "+c.employee.lastName) : "(לא נמצא)"; });
  return '<div class="modal-overlay" onclick="if(event.target===this) closeBatchModal()"><div class="modal-box">' +
    '<h2 class="section-title" style="margin-top:0;">פרטי אצווה '+b.id+'</h2>' +
    '<div class="kv">' +
      '<div class="k">יעד</div><div>'+(b.target==="shikulit"?"שיקלולית":"מערכת כחולה")+'</div>' +
      '<div class="k">חברה</div><div>'+escapeHtml(companyName(b.companyId))+'</div>' +
      '<div class="k">נוצרה</div><div>'+formatDateTimeHe(b.createdAt)+'</div>' +
      '<div class="k">יוצר/ת</div><div>'+escapeHtml(b.createdBy)+'</div>' +
      '<div class="k">סטטוס שליחה</div><div>'+batchStatusPill(b.sendStatus)+'</div>' +
      '<div class="k">סטטוס יבוא</div><div>'+batchStatusPill(b.importStatus)+'</div>' +
    '</div>' +
    '<hr class="divider">' +
    '<div class="k" style="margin-bottom:6px;color:#5c7d8c;font-weight:600;">עובדים באצווה ('+names.length+')</div>' +
    '<ul>'+names.map(n=>'<li>'+escapeHtml(n)+'</li>').join("")+'</ul>' +
    '<div class="btn-row"><button class="btn btn-secondary" onclick="closeBatchModal()">סגור</button></div>' +
  '</div></div>';
}

/* ============================================================
   15. מסכי הגדרות מערכת (אדמין) — הדגמה בלבד
   ============================================================ */
function setAdminTab(tab){ ui.adminTab=tab; render(); }
/* מזהה חדש עבור רשומת קוד (חברה/אתר עבודה) בהמשך לתבנית המזהים הקיימת
   בנתוני הדמה (c1..c6) - סורק את המזהים הקיימים עם אותה קידומת ומחזיר
   את המספר הבא הפנוי, כדי לא להתנגש בהם. */
function nextCodeId(prefix, arr){
  let max = 0;
  arr.forEach(x=>{
    const m = /^([A-Za-z]+)(\d+)$/.exec(x.id||"");
    if(m && m[1]===prefix){ const n = parseInt(m[2],10); if(n>max) max = n; }
  });
  return prefix + (max+1);
}
/* ---------- הוספת חברה חדשה - חלון Modal פנימי (לא prompt/alert) ----------
   ui.companyModalDraft: אובייקט הטיוטה בעת עריכה, או null כשהחלון סגור.
   ui.companyModalErrors: שגיאות ולידציה לפי שם שדה, באותו מנגנון (מחלקת
   err + field-error) שכבר קיים בשאר הטופס.
   ui.companyModalLeaveConfirm: true כאשר מוצג אישור "לצאת בלי לשמור".
   ui.highlightCompanyId: מזהה החברה שנוספה לאחרונה, להדגשה זמנית בטבלה. */
function openAddCompanyModal(){
  ui.companyModalDraft = {name:"",companyRegNum:"",address:"",phone:"",deductionFileNum:""};
  ui.companyModalOriginal = null;
  ui.companyModalEditId = null;
  ui.companyModalErrors = {};
  ui.companyModalLeaveConfirm = false;
  render();
}
function openEditCompanyModal(id){
  const c = CODE_TABLES.companies.find(x=>x.id===id);
  if(!c) return;
  ui.companyModalDraft = {name:c.name, companyRegNum:c.companyRegNum, address:c.address, phone:c.phone, deductionFileNum:c.deductionFileNum};
  ui.companyModalOriginal = {name:c.name, companyRegNum:c.companyRegNum, address:c.address, phone:c.phone, deductionFileNum:c.deductionFileNum};
  ui.companyModalEditId = id;
  ui.companyModalErrors = {};
  ui.companyModalLeaveConfirm = false;
  render();
}
function updateCompanyModalField(field,value){
  const d = ui.companyModalDraft;
  if(!d) return;
  d[field] = value;
  /* חשוב: קוראים ל-render() *רק* כשמשהו שנראה על המסך (הודעת שגיאה)
     באמת משתנה - לא בכל הקשה. הערך עצמו כבר מוצג נכון בשדה על ידי
     הדפדפן (זה input רגיל), כך שאין צורך לצייר את כל העץ מחדש רק כדי
     "לשמור" את הערך בזיכרון. סיבה: render() מחליף את כל ה-DOM
     (innerHTML) בצורה דחויה (setTimeout), וקריאה לזה בכל הקשה משאירה
     רינדור "תלוי ועומד" שעלול לקרות בדיוק בין mousedown ל-click על
     כפתור אחר (כמו "שמור") - מה שהורס ומחליף את כפתור ה-DOM ממש
     ברגע הלחיצה, וגורם ללחיצה הראשונה "להיבלע" בלי להפעיל את
     onclick (זו הייתה תקלת "צריך ללחוץ פעמיים על שמור"). צמצום
     קריאות render() המיותרות מסיר את הבעיה מהשורש. */
  if(field==="deductionFileNum" || field==="companyRegNum"){
    /* בדיקת פורמט חיה (תוך כדי הקלדה) - ספרות בלבד. שאר הבדיקות (חובה,
       אורך, ייחודיות שם/מספר) הן בדיקות "השלמה" ורצות רק ב-blur/בשליחה,
       כדי לא להציג שגיאה מוקדם מדי - עקרון זהה לשאר הטופס. */
    const hadErr = !!ui.companyModalErrors[field];
    if(value && !/^\d*$/.test(value)) ui.companyModalErrors[field] = "נא להשתמש בספרות בלבד.";
    else delete ui.companyModalErrors[field];
    if(hadErr || ui.companyModalErrors[field]) render();
  } else if(ui.companyModalErrors[field] && value && value.trim()){
    /* מסירים שגיאה קודמת מיד כשמתחילים להזין תוכן תקין - כדי שהודעת
       השגיאה תיעלם תוך כדי הקלדה ולא תישאר עד לעזיבת השדה. רק אם
       הייתה בכלל שגיאה מוצגת קודם לכן נדרש רינדור. */
    delete ui.companyModalErrors[field];
    render();
  }
}
function validateCompanyModalField(field){
  const d = ui.companyModalDraft;
  const v = (d[field]||"").trim();
  if(field==="name"){
    if(!v){ ui.companyModalErrors.name = "יש למלא שם חברה."; return false; }
    if(CODE_TABLES.companies.some(c=>c.name.trim()===v && c.id!==ui.companyModalEditId)){ ui.companyModalErrors.name = "קיימת כבר חברה בשם זה."; return false; }
    delete ui.companyModalErrors.name; return true;
  }
  if(field==="companyRegNum"){
    if(!v){ ui.companyModalErrors.companyRegNum = "יש למלא מספר ח.פ."; return false; }
    if(!/^\d+$/.test(v)){ ui.companyModalErrors.companyRegNum = "נא להשתמש בספרות בלבד."; return false; }
    if(v.length!==9){ ui.companyModalErrors.companyRegNum = "מספר ח.פ צריך לכלול 9 ספרות."; return false; }
    if(CODE_TABLES.companies.some(c=>c.companyRegNum===v && c.id!==ui.companyModalEditId)){ ui.companyModalErrors.companyRegNum = "מספר ח.פ זה כבר משויך לחברה אחרת."; return false; }
    delete ui.companyModalErrors.companyRegNum; return true;
  }
  if(field==="address"){
    if(!v){ ui.companyModalErrors.address = "יש למלא כתובת."; return false; }
    delete ui.companyModalErrors.address; return true;
  }
  if(field==="phone"){
    if(!v){ ui.companyModalErrors.phone = "יש למלא מספר טלפון."; return false; }
    delete ui.companyModalErrors.phone; return true;
  }
  if(field==="deductionFileNum"){
    if(!v){ ui.companyModalErrors.deductionFileNum = "יש למלא מספר תיק ניכויים."; return false; }
    if(!/^\d+$/.test(v)){ ui.companyModalErrors.deductionFileNum = "נא להשתמש בספרות בלבד."; return false; }
    if(CODE_TABLES.companies.some(c=>c.deductionFileNum===v && c.id!==ui.companyModalEditId)){ ui.companyModalErrors.deductionFileNum = "מספר תיק ניכויים זה כבר משויך לחברה אחרת."; return false; }
    delete ui.companyModalErrors.deductionFileNum; return true;
  }
  return true;
}
function finalizeCompanyModalField(field){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו - לא פעולת יציאה אמיתית
  if(!ui.companyModalDraft) return;
  /* חשוב: blur קורה על "מספר תיק ניכויים"/שדה אחר בדיוק ב-mousedown של
     לחיצה על כפתור אחר (למשל "שמור") - הרבה לפני mouseup/click של אותה
     לחיצה פיזית. אם נקרא ל-render() כאן ללא תנאי, נוצר רינדור דחוי
     שכמעט תמיד מספיק זמן לרוץ *before* ה-click, מחליף את ה-DOM (כולל
     את כפתור "שמור" עצמו) ברגע הלא נכון, וכך "בולע" את הלחיצה
     הראשונה (זו הייתה הסיבה האמיתית לתקלת "צריך ללחוץ פעמיים").
     הפתרון: רינדור מתבצע רק אם הבדיקה בפועל שינתה משהו שנראה על
     המסך (הודעת שגיאה שהופיעה/נעלמה) - לא בכל blur. */
  const before = JSON.stringify(ui.companyModalErrors);
  validateCompanyModalField(field);
  const after = JSON.stringify(ui.companyModalErrors);
  if(before!==after) render();
}
function saveCompanyModal(){
  flushPendingRender();
  const fields = ["name","companyRegNum","address","phone","deductionFileNum"];
  let firstInvalid = null;
  fields.forEach(f=>{
    const ok = validateCompanyModalField(f);
    if(!ok && !firstInvalid) firstInvalid = f;
  });
  if(firstInvalid){
    render();
    setTimeout(()=>scrollToField("companyModal_"+firstInvalid), 0);
    return;
  }
  const d = ui.companyModalDraft;
  const isEdit = !!ui.companyModalEditId;
  let id;
  if(isEdit){
    id = ui.companyModalEditId;
    const c = CODE_TABLES.companies.find(x=>x.id===id);
    if(c){ c.name=d.name.trim(); c.companyRegNum=d.companyRegNum.trim(); c.address=d.address.trim(); c.phone=d.phone.trim(); c.deductionFileNum=d.deductionFileNum.trim(); }
  } else {
    id = nextCodeId("c", CODE_TABLES.companies);
    CODE_TABLES.companies.push({id, name:d.name.trim(), companyRegNum:d.companyRegNum.trim(), address:d.address.trim(), phone:d.phone.trim(), deductionFileNum:d.deductionFileNum.trim()});
  }
  CODE_TABLES.companies.sort((a,b)=>a.name.localeCompare(b.name,"he"));
  saveDB();
  ui.companyModalDraft = null;
  ui.companyModalOriginal = null;
  ui.companyModalEditId = null;
  ui.companyModalErrors = {};
  ui.companyModalLeaveConfirm = false;
  ui.highlightCompanyId = id;
  showToast(isEdit ? "החברה עודכנה בהצלחה." : "החברה נוספה בהצלחה.");
  render();
  setTimeout(()=>{ ui.highlightCompanyId=null; render(); }, 2600);
}
function closeCompanyModalRequest(){
  flushPendingRender();
  const d = ui.companyModalDraft;
  if(!d) return;
  let touched;
  if(ui.companyModalEditId){
    const o = ui.companyModalOriginal || {};
    touched = d.name!==o.name || d.companyRegNum!==o.companyRegNum || d.address!==o.address || d.phone!==o.phone || d.deductionFileNum!==o.deductionFileNum;
  } else {
    touched = (d.name&&d.name.trim()) || (d.companyRegNum&&d.companyRegNum.trim()) || (d.address&&d.address.trim()) || (d.phone&&d.phone.trim()) || (d.deductionFileNum&&d.deductionFileNum.trim());
  }
  if(!touched){ ui.companyModalDraft=null; ui.companyModalOriginal=null; ui.companyModalEditId=null; ui.companyModalErrors={}; render(); return; }
  ui.companyModalLeaveConfirm = true;
  render();
}
function confirmDiscardCompanyModal(){
  ui.companyModalDraft = null;
  ui.companyModalOriginal = null;
  ui.companyModalEditId = null;
  ui.companyModalErrors = {};
  ui.companyModalLeaveConfirm = false;
  render();
}
function cancelDiscardCompanyModal(){
  ui.companyModalLeaveConfirm = false;
  render();
}
/* ---------- מחיקת חברה - חלון Modal פנימי (לא confirm של הדפדפן) ----------
   ui.companyDeleteId: מזהה החברה שבתהליך מחיקה (מוצג חלון אישור/חסימה
   עבורה), או null כשאין חלון פתוח. כל הנתונים המוצגים בחלון (שם החברה,
   אתרי העבודה המקושרים, תיקי הקליטה שחוסמים מחיקה) מחושבים מחדש בכל
   render מתוך CODE_TABLES/DB.cases - כדי שהמידע תמיד יהיה עדכני. */
function requestDeleteCompany(id){
  ui.companyDeleteId = id;
  render();
}
function cancelDeleteCompany(){
  ui.companyDeleteId = null;
  render();
}
function confirmDeleteCompany(){
  const id = ui.companyDeleteId;
  if(!id) return;
  const c = CODE_TABLES.companies.find(x=>x.id===id);
  CODE_TABLES.worksites = CODE_TABLES.worksites.filter(w=>w.companyId!==id);
  CODE_TABLES.companies = CODE_TABLES.companies.filter(x=>x.id!==id);
  saveDB();
  ui.companyDeleteId = null;
  showToast(c ? "החברה \""+c.name+"\" ואתרי העבודה המקושרים אליה נמחקו בהצלחה." : "החברה נמחקה בהצלחה.");
  render();
}
function renderDeleteCompanyModal(){
  const id = ui.companyDeleteId;
  if(!id) return "";
  const c = CODE_TABLES.companies.find(x=>x.id===id);
  if(!c) return "";
  const linkedWorksites = CODE_TABLES.worksites.filter(w=>w.companyId===id);
  const linkedWorksiteIds = linkedWorksites.map(w=>w.id);
  const blockingCases = DB.cases.filter(cs=>cs.companyId===id || linkedWorksiteIds.includes(cs.worksiteId));
  if(blockingCases.length){
    return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteCompany()"><div class="modal-box" style="max-width:480px;">' +
      '<h1 style="margin:0 0 14px;">לא ניתן למחוק</h1>' +
      '<div style="margin-bottom:18px;">לא ניתן למחוק את החברה "'+escapeHtml(c.name)+'" מכיוון שקיימים '+blockingCases.length+' תיקי קליטה המשויכים אליה או לאחד מאתרי העבודה שלה. יש להעביר את התיקים האלה לחברה אחרת או לבטל אותם לפני מחיקת החברה.</div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="cancelDeleteCompany()">הבנתי</button></div>' +
    '</div></div>';
  }
  const warn = linkedWorksites.length ?
    ('<div class="alert alert-warning-pink" style="margin-bottom:16px;">שימו לב: לחברה זו יש '+linkedWorksites.length+' אתר'+(linkedWorksites.length>1?"י":"")+' עבודה מקושר'+(linkedWorksites.length>1?"ים":"")+' ('+linkedWorksites.map(w=>escapeHtml(w.name)).join(', ')+'). מחיקת החברה תמחק גם אותם.</div>') : '';
  return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteCompany()"><div class="modal-box" style="max-width:480px;">' +
    '<h1 style="margin:0 0 14px;">מחיקת חברה</h1>' +
    warn +
    '<div style="margin-bottom:18px;">האם אתה בטוח שברצונך למחוק את החברה "'+escapeHtml(c.name)+'"?</div>' +
    '<div class="btn-row"><button class="btn btn-danger" onclick="confirmDeleteCompany()">מחק</button><button class="btn btn-secondary" onclick="cancelDeleteCompany()">ביטול</button></div>' +
  '</div></div>';
}
function renderCompaniesTable(){
  if(!CODE_TABLES.companies.length) return '<div class="empty-state">אין רשומות.</div>';
  return '<div class="table-wrap" style="margin-bottom:20px;"><table class="data-table zebra-table"><thead><tr>'+
    '<th>שם חברה</th><th>ח.פ</th><th>כתובת</th><th>טלפון</th><th>מספר תיק ניכויים</th><th>פעולות</th>'+
  '</tr></thead><tbody>'+
    CODE_TABLES.companies.map(c=>'<tr'+(ui.highlightCompanyId===c.id?' class="row-highlight"':'')+' ondblclick="if(!event.target.closest(\'.row-actions\')) openEditCompanyModal(\''+c.id+'\')" style="cursor:pointer;">'+
      '<td><b>'+escapeHtml(c.name)+'</b></td>'+
      '<td>'+escapeHtml(c.companyRegNum)+'</td>'+
      '<td>'+escapeHtml(c.address)+'</td>'+
      '<td>'+escapeHtml(c.phone)+'</td>'+
      '<td>'+escapeHtml(c.deductionFileNum)+'</td>'+
      '<td class="row-actions">'+ICON_BTN("pencil","ערוך",'openEditCompanyModal(\''+c.id+'\')',"edit")+ICON_BTN("trash","מחק",'requestDeleteCompany(\''+c.id+'\')',"delete")+'</td>'+
    '</tr>').join("")+
  '</tbody></table></div>';
}
function renderAddCompanyModal(){
  const d = ui.companyModalDraft;
  if(!d) return "";
  const errs = ui.companyModalErrors || {};
  const fld = (key,label,inputHtml)=>'<div class="field"><label>'+label+' <span class="req-star">*</span></label>'+inputHtml+(errs[key]?'<div class="field-error">'+escapeHtml(errs[key])+'</div>':'')+'</div>';
  const cls = k => errs[k] ? "err" : "";
  const isEdit = !!ui.companyModalEditId;
  const modal = '<div class="modal-overlay" onclick="if(event.target===this) closeCompanyModalRequest()">' +
    '<div class="modal-box" style="max-width:640px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<h1 style="margin:0;">'+(isEdit?"עריכת חברה":"הוספת חברה")+'</h1>' +
        '<button onclick="closeCompanyModalRequest()" title="סגור" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--header-text);">&times;</button>' +
      '</div>' +
      '<div class="form-grid cols-2" style="margin-top:16px;">' +
        fld("name","שם החברה",'<input type="text" id="companyModal_name" class="'+cls("name")+'" value="'+escapeHtml(d.name)+'" oninput="updateCompanyModalField(\'name\',this.value)" onblur="finalizeCompanyModalField(\'name\')">') +
        fld("companyRegNum","ח.פ",'<input type="text" id="companyModal_companyRegNum" class="'+cls("companyRegNum")+'" value="'+escapeHtml(d.companyRegNum)+'" maxlength="9" oninput="updateCompanyModalField(\'companyRegNum\',this.value)" onblur="finalizeCompanyModalField(\'companyRegNum\')">') +
        fld("address","כתובת",'<input type="text" id="companyModal_address" class="'+cls("address")+'" value="'+escapeHtml(d.address)+'" oninput="updateCompanyModalField(\'address\',this.value)" onblur="finalizeCompanyModalField(\'address\')">') +
        fld("phone","טלפון",'<input type="text" id="companyModal_phone" class="'+cls("phone")+'" value="'+escapeHtml(d.phone)+'" oninput="updateCompanyModalField(\'phone\',this.value)" onblur="finalizeCompanyModalField(\'phone\')">') +
        fld("deductionFileNum","מספר תיק ניכויים",'<input type="text" id="companyModal_deductionFileNum" class="'+cls("deductionFileNum")+'" value="'+escapeHtml(d.deductionFileNum)+'" oninput="updateCompanyModalField(\'deductionFileNum\',this.value)" onblur="finalizeCompanyModalField(\'deductionFileNum\')">') +
      '</div>' +
      '<div class="btn-row" style="margin-top:20px;">' +
        '<button class="btn btn-primary" onclick="saveCompanyModal()">שמור</button>' +
        '<button class="btn btn-secondary" onclick="closeCompanyModalRequest()">ביטול</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  return modal + (ui.companyModalLeaveConfirm ? renderCompanyModalLeaveConfirm() : "");
}
function renderCompanyModalLeaveConfirm(){
  return '<div class="modal-overlay" style="z-index:110;" onclick="if(event.target===this) cancelDiscardCompanyModal()"><div class="modal-box" style="max-width:420px;">' +
    '<div style="margin-bottom:18px;">קיימים שינויים שלא נשמרו. האם לצאת בלי לשמור?</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="cancelDiscardCompanyModal()">המשך עריכה</button>' +
      '<button class="btn btn-secondary" onclick="confirmDiscardCompanyModal()">צא בלי לשמור</button>' +
    '</div>' +
  '</div></div>';
}
/* ---------- הוספת אתר עבודה חדש - אותו מנגנון בדיוק כמו הוספת חברה ---------- */
function openAddWorksiteModal(){
  ui.worksiteModalDraft = {name:"",companyId:""};
  ui.worksiteModalOriginal = null;
  ui.worksiteModalEditId = null;
  ui.worksiteModalErrors = {};
  ui.worksiteModalLeaveConfirm = false;
  render();
}
function openEditWorksiteModal(id){
  const w = CODE_TABLES.worksites.find(x=>x.id===id);
  if(!w) return;
  ui.worksiteModalDraft = {name:w.name, companyId:w.companyId};
  ui.worksiteModalOriginal = {name:w.name, companyId:w.companyId};
  ui.worksiteModalEditId = id;
  ui.worksiteModalErrors = {};
  ui.worksiteModalLeaveConfirm = false;
  render();
}
function updateWorksiteModalField(field,value){
  const d = ui.worksiteModalDraft;
  if(!d) return;
  d[field] = value;
  /* כמו ב-updateCompanyModalField: render() נקרא רק כשהודעת שגיאה
     שמוצגת בפועל משתנה, לא בכל הקשה - כדי לא להשאיר רינדור דחוי
     "תלוי ועומד" שעלול "לבלוע" את הלחיצה על כפתור "שמור" (ר' הערה
     המפורטת ליד updateCompanyModalField). */
  if(field==="companyId"){
    // שדה מסוג select - הבחירה עצמה היא כבר פעולת "סיום", ולכן תמיד
    // מריצים ולידציה מיידית ומרנדרים (זה אירוע בודד, לא הקלדה רציפה).
    validateWorksiteModalField("companyId");
    render();
  } else if(ui.worksiteModalErrors[field] && value && value.trim()){
    delete ui.worksiteModalErrors[field];
    render();
  }
}
function validateWorksiteModalField(field){
  const d = ui.worksiteModalDraft;
  if(field==="name"){
    const v = (d.name||"").trim();
    if(!v){ ui.worksiteModalErrors.name = "יש למלא שם אתר עבודה."; return false; }
    delete ui.worksiteModalErrors.name; return true;
  }
  if(field==="companyId"){
    if(!d.companyId){ ui.worksiteModalErrors.companyId = "יש לבחור חברה."; return false; }
    delete ui.worksiteModalErrors.companyId; return true;
  }
  return true;
}
function finalizeWorksiteModalField(field){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו - לא פעולת יציאה אמיתית
  if(!ui.worksiteModalDraft) return;
  // ר' ההערה המפורטת ב-finalizeCompanyModalField: רינדור רק אם השגיאה
  // בפועל השתנתה, כדי לא "לבלוע" את הלחיצה על "שמור" שמגיעה מיד אחרי.
  const before = JSON.stringify(ui.worksiteModalErrors);
  validateWorksiteModalField(field);
  const after = JSON.stringify(ui.worksiteModalErrors);
  if(before!==after) render();
}
function saveWorksiteModal(){
  flushPendingRender();
  const fields = ["name","companyId"];
  let firstInvalid = null;
  fields.forEach(f=>{
    const ok = validateWorksiteModalField(f);
    if(!ok && !firstInvalid) firstInvalid = f;
  });
  if(firstInvalid){
    render();
    setTimeout(()=>scrollToField("worksiteModal_"+firstInvalid), 0);
    return;
  }
  const d = ui.worksiteModalDraft;
  const isEdit = !!ui.worksiteModalEditId;
  let id;
  if(isEdit){
    id = ui.worksiteModalEditId;
    const w = CODE_TABLES.worksites.find(x=>x.id===id);
    if(w){ w.name=d.name.trim(); w.companyId=d.companyId; }
  } else {
    id = nextCodeId("w", CODE_TABLES.worksites);
    CODE_TABLES.worksites.push({id, name:d.name.trim(), companyId:d.companyId});
  }
  CODE_TABLES.worksites.sort((a,b)=>a.name.localeCompare(b.name,"he"));
  saveDB();
  ui.worksiteModalDraft = null;
  ui.worksiteModalOriginal = null;
  ui.worksiteModalEditId = null;
  ui.worksiteModalErrors = {};
  ui.worksiteModalLeaveConfirm = false;
  ui.highlightWorksiteId = id;
  showToast(isEdit ? "אתר העבודה עודכן בהצלחה." : "אתר העבודה נוסף בהצלחה.");
  render();
  setTimeout(()=>{ ui.highlightWorksiteId=null; render(); }, 2600);
}
function closeWorksiteModalRequest(){
  flushPendingRender();
  const d = ui.worksiteModalDraft;
  if(!d) return;
  let touched;
  if(ui.worksiteModalEditId){
    const o = ui.worksiteModalOriginal || {};
    touched = d.name!==o.name || d.companyId!==o.companyId;
  } else {
    touched = (d.name&&d.name.trim()) || d.companyId;
  }
  if(!touched){ ui.worksiteModalDraft=null; ui.worksiteModalOriginal=null; ui.worksiteModalEditId=null; ui.worksiteModalErrors={}; render(); return; }
  ui.worksiteModalLeaveConfirm = true;
  render();
}
function confirmDiscardWorksiteModal(){
  ui.worksiteModalDraft = null;
  ui.worksiteModalOriginal = null;
  ui.worksiteModalEditId = null;
  ui.worksiteModalErrors = {};
  ui.worksiteModalLeaveConfirm = false;
  render();
}
function cancelDiscardWorksiteModal(){
  ui.worksiteModalLeaveConfirm = false;
  render();
}
/* ---------- מחיקת אתר עבודה - אותו מנגנון בדיוק כמו מחיקת חברה, ---------
   אלא שאין כאן "מחיקה מדורגת" (אתר עבודה לא מכיל רשומות תלויות משלו,
   רק תיקי קליטה - שחוסמים מחיקה לגמרי, בדיוק כמו אצל חברה). */
function requestDeleteWorksite(id){
  ui.worksiteDeleteId = id;
  render();
}
function cancelDeleteWorksite(){
  ui.worksiteDeleteId = null;
  render();
}
function confirmDeleteWorksite(){
  const id = ui.worksiteDeleteId;
  if(!id) return;
  const w = CODE_TABLES.worksites.find(x=>x.id===id);
  CODE_TABLES.worksites = CODE_TABLES.worksites.filter(x=>x.id!==id);
  saveDB();
  ui.worksiteDeleteId = null;
  showToast(w ? "אתר העבודה \""+w.name+"\" נמחק בהצלחה." : "אתר העבודה נמחק בהצלחה.");
  render();
}
function renderDeleteWorksiteModal(){
  const id = ui.worksiteDeleteId;
  if(!id) return "";
  const w = CODE_TABLES.worksites.find(x=>x.id===id);
  if(!w) return "";
  const blockingCases = DB.cases.filter(cs=>cs.worksiteId===id);
  if(blockingCases.length){
    return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteWorksite()"><div class="modal-box" style="max-width:480px;">' +
      '<h1 style="margin:0 0 14px;">לא ניתן למחוק</h1>' +
      '<div style="margin-bottom:18px;">לא ניתן למחוק את אתר העבודה "'+escapeHtml(w.name)+'" מכיוון שקיימים '+blockingCases.length+' תיקי קליטה המשויכים אליו. יש להעביר את התיקים האלה לאתר עבודה אחר או לבטל אותם לפני מחיקת אתר העבודה.</div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="cancelDeleteWorksite()">הבנתי</button></div>' +
    '</div></div>';
  }
  return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteWorksite()"><div class="modal-box" style="max-width:480px;">' +
    '<h1 style="margin:0 0 14px;">מחיקת אתר עבודה</h1>' +
    '<div style="margin-bottom:18px;">האם אתה בטוח שברצונך למחוק את אתר העבודה "'+escapeHtml(w.name)+'"?</div>' +
    '<div class="btn-row"><button class="btn btn-danger" onclick="confirmDeleteWorksite()">מחק</button><button class="btn btn-secondary" onclick="cancelDeleteWorksite()">ביטול</button></div>' +
  '</div></div>';
}
function renderWorksitesTable(){
  if(!CODE_TABLES.worksites.length) return '<div class="empty-state">אין רשומות.</div>';
  const sorted = CODE_TABLES.worksites.slice().sort((a,b)=>companyName(a.companyId).localeCompare(companyName(b.companyId),'he'));
  return '<div class="table-wrap" style="margin-bottom:20px;"><table class="data-table zebra-table"><thead><tr>'+
    '<th>חברה</th><th>אתר עבודה</th><th>פעולות</th>'+
  '</tr></thead><tbody>'+
    sorted.map(w=>'<tr'+(ui.highlightWorksiteId===w.id?' class="row-highlight"':'')+' ondblclick="if(!event.target.closest(\'.row-actions\')) openEditWorksiteModal(\''+w.id+'\')" style="cursor:pointer;">'+
      '<td>'+escapeHtml(companyName(w.companyId))+'</td>'+
      '<td><b>'+escapeHtml(w.name)+'</b></td>'+
      '<td class="row-actions">'+ICON_BTN("pencil","ערוך",'openEditWorksiteModal(\''+w.id+'\')',"edit")+ICON_BTN("trash","מחק",'requestDeleteWorksite(\''+w.id+'\')',"delete")+'</td>'+
    '</tr>').join("")+
  '</tbody></table></div>';
}
function renderAddWorksiteModal(){
  const d = ui.worksiteModalDraft;
  if(!d) return "";
  const errs = ui.worksiteModalErrors || {};
  const fld = (key,label,inputHtml)=>'<div class="field"><label>'+label+' <span class="req-star">*</span></label>'+inputHtml+(errs[key]?'<div class="field-error">'+escapeHtml(errs[key])+'</div>':'')+'</div>';
  const cls = k => errs[k] ? "err" : "";
  const isEdit = !!ui.worksiteModalEditId;
  const companyOptions = '<option value=""></option>'+CODE_TABLES.companies.map(co=>'<option value="'+co.id+'" '+(d.companyId===co.id?"selected":"")+'>'+escapeHtml(co.name)+'</option>').join("");
  const modal = '<div class="modal-overlay" onclick="if(event.target===this) closeWorksiteModalRequest()">' +
    '<div class="modal-box" style="max-width:640px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<h1 style="margin:0;">'+(isEdit?"עריכת אתר עבודה":"הוספת אתר עבודה")+'</h1>' +
        '<button onclick="closeWorksiteModalRequest()" title="סגור" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--header-text);">&times;</button>' +
      '</div>' +
      '<div class="form-grid cols-2" style="margin-top:16px;">' +
        fld("companyId","שם חברה",'<select id="worksiteModal_companyId" class="'+cls("companyId")+'" onchange="updateWorksiteModalField(\'companyId\',this.value)">'+companyOptions+'</select>') +
        fld("name","שם אתר העבודה",'<input type="text" id="worksiteModal_name" class="'+cls("name")+'" value="'+escapeHtml(d.name)+'" oninput="updateWorksiteModalField(\'name\',this.value)" onblur="finalizeWorksiteModalField(\'name\')">') +
      '</div>' +
      '<div class="btn-row" style="margin-top:20px;">' +
        '<button class="btn btn-primary" onclick="saveWorksiteModal()">שמור</button>' +
        '<button class="btn btn-secondary" onclick="closeWorksiteModalRequest()">ביטול</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  return modal + (ui.worksiteModalLeaveConfirm ? renderWorksiteModalLeaveConfirm() : "");
}
function renderWorksiteModalLeaveConfirm(){
  return '<div class="modal-overlay" style="z-index:110;" onclick="if(event.target===this) cancelDiscardWorksiteModal()"><div class="modal-box" style="max-width:420px;">' +
    '<div style="margin-bottom:18px;">קיימים שינויים שלא נשמרו. האם לצאת בלי לשמור?</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="cancelDiscardWorksiteModal()">המשך עריכה</button>' +
      '<button class="btn btn-secondary" onclick="confirmDiscardWorksiteModal()">צא בלי לשמור</button>' +
    '</div>' +
  '</div></div>';
}
/* ---------- רשימות קוד "פשוטות" (מחלקה/דירוג/דרגה): כל רשומה היא סתם
   {id,name} ללא תלות ברשומה אחרת, ולכן מנוהלות במנגנון גנרי אחד
   (מסך אחד לפי kind) במקום לשכפל את מנגנון "הוספת/עריכת חברה" פעם
   לכל רשימה. תת-מחלקה כן תלויה במחלקה, ולכן יש לה מנגנון ייעודי
   משלה בהמשך (אותו מנגנון בדיוק כמו אתר עבודה/חברה). ---------- */
const SIMPLE_LISTS = {
  departments:{label:"מחלקה", idPrefix:"dep"},
  ranks:{label:"דירוג", idPrefix:"rnk"},
  grades:{label:"דרגה", idPrefix:"grd"}
};
function openAddSimpleItem(kind){
  ui.slModal = {kind, draft:{name:""}, original:null, editId:null, errors:{}, leaveConfirm:false};
  render();
}
function openEditSimpleItem(kind,id){
  const item = CODE_TABLES[kind].find(x=>x.id===id);
  if(!item) return;
  ui.slModal = {kind, draft:{name:item.name}, original:{name:item.name}, editId:id, errors:{}, leaveConfirm:false};
  render();
}
function updateSimpleItemField(value){
  const m = ui.slModal;
  if(!m) return;
  m.draft.name = value;
  if(m.errors.name && value && value.trim()){ delete m.errors.name; render(); }
}
function validateSimpleItemField(){
  const m = ui.slModal;
  const v = (m.draft.name||"").trim();
  const label = SIMPLE_LISTS[m.kind].label;
  if(!v){ m.errors.name = "יש למלא שם "+label+"."; return false; }
  if(CODE_TABLES[m.kind].some(x=>x.name.trim()===v && x.id!==m.editId)){ m.errors.name = "קיים/ת כבר "+label+" בשם זה."; return false; }
  delete m.errors.name; return true;
}
function finalizeSimpleItemField(){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו - לא פעולת יציאה אמיתית
  const m = ui.slModal;
  if(!m) return;
  const before = JSON.stringify(m.errors);
  validateSimpleItemField();
  const after = JSON.stringify(m.errors);
  if(before!==after) render();
}
function saveSimpleItemModal(){
  flushPendingRender();
  const m = ui.slModal;
  if(!m) return;
  if(!validateSimpleItemField()){
    render();
    setTimeout(()=>scrollToField("slModal_name"),0);
    return;
  }
  const arr = CODE_TABLES[m.kind];
  const isEdit = !!m.editId;
  let id;
  if(isEdit){
    id = m.editId;
    const item = arr.find(x=>x.id===id);
    if(item) item.name = m.draft.name.trim();
  } else {
    id = nextCodeId(SIMPLE_LISTS[m.kind].idPrefix, arr);
    arr.push({id, name:m.draft.name.trim()});
  }
  arr.sort((a,b)=>a.name.localeCompare(b.name,"he"));
  saveDB();
  const label = SIMPLE_LISTS[m.kind].label;
  const kind = m.kind;
  ui.slModal = null;
  ui.slHighlight = {kind, id};
  showToast(isEdit ? label+" עודכן/ה בהצלחה." : label+" נוסף/ה בהצלחה.");
  render();
  setTimeout(()=>{ ui.slHighlight=null; render(); }, 2600);
}
function closeSimpleItemModalRequest(){
  flushPendingRender();
  const m = ui.slModal;
  if(!m) return;
  let touched;
  if(m.editId){
    touched = m.draft.name !== (m.original?m.original.name:"");
  } else {
    touched = m.draft.name && m.draft.name.trim();
  }
  if(!touched){ ui.slModal=null; render(); return; }
  m.leaveConfirm = true;
  render();
}
function confirmDiscardSimpleItemModal(){ ui.slModal=null; render(); }
function cancelDiscardSimpleItemModal(){ if(ui.slModal) ui.slModal.leaveConfirm=false; render(); }
function requestDeleteSimpleItem(kind,id){ ui.slDeleteId={kind,id}; render(); }
function cancelDeleteSimpleItem(){ ui.slDeleteId=null; render(); }
function confirmDeleteSimpleItem(){
  const d = ui.slDeleteId;
  if(!d) return;
  const arr = CODE_TABLES[d.kind];
  const item = arr.find(x=>x.id===d.id);
  const label = SIMPLE_LISTS[d.kind].label;
  if(d.kind==="departments"){
    // מחיקת מחלקה מוחקת גם את תתי-המחלקות המקושרות אליה (בדיוק כמו חברה/אתרי עבודה)
    CODE_TABLES.subDepartments = CODE_TABLES.subDepartments.filter(sd=>sd.departmentId!==d.id);
  }
  CODE_TABLES[d.kind] = arr.filter(x=>x.id!==d.id);
  saveDB();
  ui.slDeleteId = null;
  showToast(item ? label+" \""+item.name+"\" נמחק/ה בהצלחה." : label+" נמחק/ה בהצלחה.");
  render();
}
function renderDeleteSimpleItemModal(){
  const d = ui.slDeleteId;
  if(!d) return "";
  const item = CODE_TABLES[d.kind].find(x=>x.id===d.id);
  if(!item) return "";
  const label = SIMPLE_LISTS[d.kind].label;
  let blockingCases;
  if(d.kind==="departments") blockingCases = DB.cases.filter(cs=>cs.departmentId===d.id || CODE_TABLES.subDepartments.some(sd=>sd.id===cs.subDepartmentId && sd.departmentId===d.id));
  else if(d.kind==="ranks") blockingCases = DB.cases.filter(cs=>cs.rankId===d.id);
  else blockingCases = DB.cases.filter(cs=>cs.gradeId===d.id);
  if(blockingCases.length){
    return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteSimpleItem()"><div class="modal-box" style="max-width:480px;">' +
      '<h1 style="margin:0 0 14px;">לא ניתן למחוק</h1>' +
      '<div style="margin-bottom:18px;">לא ניתן למחוק את ה'+label+' "'+escapeHtml(item.name)+'" מכיוון שקיימים '+blockingCases.length+' תיקי קליטה המשויכים אליו. יש לעדכן את התיקים האלה לפני המחיקה.</div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="cancelDeleteSimpleItem()">הבנתי</button></div>' +
    '</div></div>';
  }
  const warn = (d.kind==="departments" && CODE_TABLES.subDepartments.some(sd=>sd.departmentId===d.id)) ?
    '<div class="alert alert-warning-pink" style="margin-bottom:16px;">שימו לב: למחלקה זו יש תתי-מחלקות מקושרות. מחיקת המחלקה תמחק גם אותן.</div>' : '';
  return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteSimpleItem()"><div class="modal-box" style="max-width:480px;">' +
    '<h1 style="margin:0 0 14px;">מחיקת '+label+'</h1>' +
    warn +
    '<div style="margin-bottom:18px;">האם אתה בטוח שברצונך למחוק את ה'+label+' "'+escapeHtml(item.name)+'"?</div>' +
    '<div class="btn-row"><button class="btn btn-danger" onclick="confirmDeleteSimpleItem()">מחק</button><button class="btn btn-secondary" onclick="cancelDeleteSimpleItem()">ביטול</button></div>' +
  '</div></div>';
}
function renderSimpleListTable(kind){
  const arr = CODE_TABLES[kind];
  if(!arr.length) return '<div class="empty-state">אין רשומות.</div>';
  const label = SIMPLE_LISTS[kind].label;
  const hl = ui.slHighlight;
  return '<div class="table-wrap" style="margin-bottom:20px;"><table class="data-table zebra-table"><thead><tr>'+
    '<th>'+label+'</th><th>פעולות</th>'+
  '</tr></thead><tbody>'+
    arr.map(x=>'<tr'+((hl&&hl.kind===kind&&hl.id===x.id)?' class="row-highlight"':'')+' ondblclick="if(!event.target.closest(\'.row-actions\')) openEditSimpleItem(\''+kind+'\',\''+x.id+'\')" style="cursor:pointer;">'+
      '<td><b>'+escapeHtml(x.name)+'</b></td>'+
      '<td class="row-actions">'+ICON_BTN("pencil","ערוך",'openEditSimpleItem(\''+kind+'\',\''+x.id+'\')',"edit")+ICON_BTN("trash","מחק",'requestDeleteSimpleItem(\''+kind+'\',\''+x.id+'\')',"delete")+'</td>'+
    '</tr>').join("")+
  '</tbody></table></div>';
}
function renderAddSimpleItemModal(){
  const m = ui.slModal;
  if(!m) return "";
  const errs = m.errors || {};
  const label = SIMPLE_LISTS[m.kind].label;
  const isEdit = !!m.editId;
  const modal = '<div class="modal-overlay" onclick="if(event.target===this) closeSimpleItemModalRequest()">' +
    '<div class="modal-box" style="max-width:480px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<h1 style="margin:0;">'+(isEdit?("עריכת "+label):("הוספת "+label))+'</h1>' +
        '<button onclick="closeSimpleItemModalRequest()" title="סגור" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--header-text);">&times;</button>' +
      '</div>' +
      '<div class="form-grid cols-2" style="margin-top:16px;">' +
        '<div class="field"><label>שם ה'+label+' <span class="req-star">*</span></label>'+
          '<input type="text" id="slModal_name" class="'+(errs.name?"err":"")+'" value="'+escapeHtml(m.draft.name)+'" oninput="updateSimpleItemField(this.value)" onblur="finalizeSimpleItemField()">'+
          (errs.name?'<div class="field-error">'+escapeHtml(errs.name)+'</div>':'')+
        '</div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:20px;">' +
        '<button class="btn btn-primary" onclick="saveSimpleItemModal()">שמור</button>' +
        '<button class="btn btn-secondary" onclick="closeSimpleItemModalRequest()">ביטול</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  return modal + (m.leaveConfirm ? renderSimpleItemModalLeaveConfirm() : "");
}
function renderSimpleItemModalLeaveConfirm(){
  return '<div class="modal-overlay" style="z-index:110;" onclick="if(event.target===this) cancelDiscardSimpleItemModal()"><div class="modal-box" style="max-width:420px;">' +
    '<div style="margin-bottom:18px;">קיימים שינויים שלא נשמרו. האם לצאת בלי לשמור?</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="cancelDiscardSimpleItemModal()">המשך עריכה</button>' +
      '<button class="btn btn-secondary" onclick="confirmDiscardSimpleItemModal()">צא בלי לשמור</button>' +
    '</div>' +
  '</div></div>';
}
/* ---------- הוספת/עריכת תת-מחלקה - אותו מנגנון בדיוק כמו אתר עבודה
   (תלויה במחלקה, בדיוק כמו שאתר עבודה תלוי בחברה). ---------- */
function openAddSubDepartmentModal(){
  ui.subDepartmentModalDraft = {name:"",departmentId:""};
  ui.subDepartmentModalOriginal = null;
  ui.subDepartmentModalEditId = null;
  ui.subDepartmentModalErrors = {};
  ui.subDepartmentModalLeaveConfirm = false;
  render();
}
function openEditSubDepartmentModal(id){
  const sd = CODE_TABLES.subDepartments.find(x=>x.id===id);
  if(!sd) return;
  ui.subDepartmentModalDraft = {name:sd.name, departmentId:sd.departmentId};
  ui.subDepartmentModalOriginal = {name:sd.name, departmentId:sd.departmentId};
  ui.subDepartmentModalEditId = id;
  ui.subDepartmentModalErrors = {};
  ui.subDepartmentModalLeaveConfirm = false;
  render();
}
function updateSubDepartmentModalField(field,value){
  const d = ui.subDepartmentModalDraft;
  if(!d) return;
  d[field] = value;
  if(field==="departmentId"){
    validateSubDepartmentModalField("departmentId");
    render();
  } else if(ui.subDepartmentModalErrors[field] && value && value.trim()){
    delete ui.subDepartmentModalErrors[field];
    render();
  }
}
function validateSubDepartmentModalField(field){
  const d = ui.subDepartmentModalDraft;
  if(field==="name"){
    const v = (d.name||"").trim();
    if(!v){ ui.subDepartmentModalErrors.name = "יש למלא שם תת-מחלקה."; return false; }
    delete ui.subDepartmentModalErrors.name; return true;
  }
  if(field==="departmentId"){
    if(!d.departmentId){ ui.subDepartmentModalErrors.departmentId = "יש לבחור מחלקה."; return false; }
    delete ui.subDepartmentModalErrors.departmentId; return true;
  }
  return true;
}
function finalizeSubDepartmentModalField(field){
  if(isRerendering) return; // blur מלאכותי שנגרם מהרינדור עצמו - לא פעולת יציאה אמיתית
  if(!ui.subDepartmentModalDraft) return;
  const before = JSON.stringify(ui.subDepartmentModalErrors);
  validateSubDepartmentModalField(field);
  const after = JSON.stringify(ui.subDepartmentModalErrors);
  if(before!==after) render();
}
function saveSubDepartmentModal(){
  flushPendingRender();
  const fields = ["name","departmentId"];
  let firstInvalid = null;
  fields.forEach(f=>{
    const ok = validateSubDepartmentModalField(f);
    if(!ok && !firstInvalid) firstInvalid = f;
  });
  if(firstInvalid){
    render();
    setTimeout(()=>scrollToField("subDepartmentModal_"+firstInvalid), 0);
    return;
  }
  const d = ui.subDepartmentModalDraft;
  const isEdit = !!ui.subDepartmentModalEditId;
  let id;
  if(isEdit){
    id = ui.subDepartmentModalEditId;
    const sd = CODE_TABLES.subDepartments.find(x=>x.id===id);
    if(sd){ sd.name=d.name.trim(); sd.departmentId=d.departmentId; }
  } else {
    id = nextCodeId("sdp", CODE_TABLES.subDepartments);
    CODE_TABLES.subDepartments.push({id, name:d.name.trim(), departmentId:d.departmentId});
  }
  CODE_TABLES.subDepartments.sort((a,b)=>a.name.localeCompare(b.name,"he"));
  saveDB();
  ui.subDepartmentModalDraft = null;
  ui.subDepartmentModalOriginal = null;
  ui.subDepartmentModalEditId = null;
  ui.subDepartmentModalErrors = {};
  ui.subDepartmentModalLeaveConfirm = false;
  ui.highlightSubDepartmentId = id;
  showToast(isEdit ? "תת-המחלקה עודכנה בהצלחה." : "תת-המחלקה נוספה בהצלחה.");
  render();
  setTimeout(()=>{ ui.highlightSubDepartmentId=null; render(); }, 2600);
}
function closeSubDepartmentModalRequest(){
  flushPendingRender();
  const d = ui.subDepartmentModalDraft;
  if(!d) return;
  let touched;
  if(ui.subDepartmentModalEditId){
    const o = ui.subDepartmentModalOriginal || {};
    touched = d.name!==o.name || d.departmentId!==o.departmentId;
  } else {
    touched = (d.name&&d.name.trim()) || d.departmentId;
  }
  if(!touched){ ui.subDepartmentModalDraft=null; ui.subDepartmentModalOriginal=null; ui.subDepartmentModalEditId=null; ui.subDepartmentModalErrors={}; render(); return; }
  ui.subDepartmentModalLeaveConfirm = true;
  render();
}
function confirmDiscardSubDepartmentModal(){
  ui.subDepartmentModalDraft = null;
  ui.subDepartmentModalOriginal = null;
  ui.subDepartmentModalEditId = null;
  ui.subDepartmentModalErrors = {};
  ui.subDepartmentModalLeaveConfirm = false;
  render();
}
function cancelDiscardSubDepartmentModal(){
  ui.subDepartmentModalLeaveConfirm = false;
  render();
}
function requestDeleteSubDepartment(id){ ui.subDepartmentDeleteId = id; render(); }
function cancelDeleteSubDepartment(){ ui.subDepartmentDeleteId = null; render(); }
function confirmDeleteSubDepartment(){
  const id = ui.subDepartmentDeleteId;
  if(!id) return;
  const sd = CODE_TABLES.subDepartments.find(x=>x.id===id);
  CODE_TABLES.subDepartments = CODE_TABLES.subDepartments.filter(x=>x.id!==id);
  saveDB();
  ui.subDepartmentDeleteId = null;
  showToast(sd ? "תת-המחלקה \""+sd.name+"\" נמחקה בהצלחה." : "תת-המחלקה נמחקה בהצלחה.");
  render();
}
function renderDeleteSubDepartmentModal(){
  const id = ui.subDepartmentDeleteId;
  if(!id) return "";
  const sd = CODE_TABLES.subDepartments.find(x=>x.id===id);
  if(!sd) return "";
  const blockingCases = DB.cases.filter(cs=>cs.subDepartmentId===id);
  if(blockingCases.length){
    return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteSubDepartment()"><div class="modal-box" style="max-width:480px;">' +
      '<h1 style="margin:0 0 14px;">לא ניתן למחוק</h1>' +
      '<div style="margin-bottom:18px;">לא ניתן למחוק את תת-המחלקה "'+escapeHtml(sd.name)+'" מכיוון שקיימים '+blockingCases.length+' תיקי קליטה המשויכים אליה. יש לעדכן את התיקים האלה לפני המחיקה.</div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="cancelDeleteSubDepartment()">הבנתי</button></div>' +
    '</div></div>';
  }
  return '<div class="modal-overlay" onclick="if(event.target===this) cancelDeleteSubDepartment()"><div class="modal-box" style="max-width:480px;">' +
    '<h1 style="margin:0 0 14px;">מחיקת תת-מחלקה</h1>' +
    '<div style="margin-bottom:18px;">האם אתה בטוח שברצונך למחוק את תת-המחלקה "'+escapeHtml(sd.name)+'"?</div>' +
    '<div class="btn-row"><button class="btn btn-danger" onclick="confirmDeleteSubDepartment()">מחק</button><button class="btn btn-secondary" onclick="cancelDeleteSubDepartment()">ביטול</button></div>' +
  '</div></div>';
}
function renderSubDepartmentsTable(){
  if(!CODE_TABLES.subDepartments.length) return '<div class="empty-state">אין רשומות.</div>';
  const sorted = CODE_TABLES.subDepartments.slice().sort((a,b)=>departmentName(a.departmentId).localeCompare(departmentName(b.departmentId),'he'));
  return '<div class="table-wrap" style="margin-bottom:20px;"><table class="data-table zebra-table"><thead><tr>'+
    '<th>מחלקה</th><th>תת-מחלקה</th><th>פעולות</th>'+
  '</tr></thead><tbody>'+
    sorted.map(sd=>'<tr'+(ui.highlightSubDepartmentId===sd.id?' class="row-highlight"':'')+' ondblclick="if(!event.target.closest(\'.row-actions\')) openEditSubDepartmentModal(\''+sd.id+'\')" style="cursor:pointer;">'+
      '<td>'+escapeHtml(departmentName(sd.departmentId))+'</td>'+
      '<td><b>'+escapeHtml(sd.name)+'</b></td>'+
      '<td class="row-actions">'+ICON_BTN("pencil","ערוך",'openEditSubDepartmentModal(\''+sd.id+'\')',"edit")+ICON_BTN("trash","מחק",'requestDeleteSubDepartment(\''+sd.id+'\')',"delete")+'</td>'+
    '</tr>').join("")+
  '</tbody></table></div>';
}
function renderAddSubDepartmentModal(){
  const d = ui.subDepartmentModalDraft;
  if(!d) return "";
  const errs = ui.subDepartmentModalErrors || {};
  const fld = (key,label,inputHtml)=>'<div class="field"><label>'+label+' <span class="req-star">*</span></label>'+inputHtml+(errs[key]?'<div class="field-error">'+escapeHtml(errs[key])+'</div>':'')+'</div>';
  const cls = k => errs[k] ? "err" : "";
  const isEdit = !!ui.subDepartmentModalEditId;
  const departmentOptions = '<option value=""></option>'+CODE_TABLES.departments.map(dep=>'<option value="'+dep.id+'" '+(d.departmentId===dep.id?"selected":"")+'>'+escapeHtml(dep.name)+'</option>').join("");
  const modal = '<div class="modal-overlay" onclick="if(event.target===this) closeSubDepartmentModalRequest()">' +
    '<div class="modal-box" style="max-width:640px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<h1 style="margin:0;">'+(isEdit?"עריכת תת-מחלקה":"הוספת תת-מחלקה")+'</h1>' +
        '<button onclick="closeSubDepartmentModalRequest()" title="סגור" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--header-text);">&times;</button>' +
      '</div>' +
      '<div class="form-grid cols-2" style="margin-top:16px;">' +
        fld("departmentId","מחלקה",'<select id="subDepartmentModal_departmentId" class="'+cls("departmentId")+'" onchange="updateSubDepartmentModalField(\'departmentId\',this.value)">'+departmentOptions+'</select>') +
        fld("name","שם תת-המחלקה",'<input type="text" id="subDepartmentModal_name" class="'+cls("name")+'" value="'+escapeHtml(d.name)+'" oninput="updateSubDepartmentModalField(\'name\',this.value)" onblur="finalizeSubDepartmentModalField(\'name\')">') +
      '</div>' +
      '<div class="btn-row" style="margin-top:20px;">' +
        '<button class="btn btn-primary" onclick="saveSubDepartmentModal()">שמור</button>' +
        '<button class="btn btn-secondary" onclick="closeSubDepartmentModalRequest()">ביטול</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  return modal + (ui.subDepartmentModalLeaveConfirm ? renderSubDepartmentModalLeaveConfirm() : "");
}
function renderSubDepartmentModalLeaveConfirm(){
  return '<div class="modal-overlay" style="z-index:110;" onclick="if(event.target===this) cancelDiscardSubDepartmentModal()"><div class="modal-box" style="max-width:420px;">' +
    '<div style="margin-bottom:18px;">קיימים שינויים שלא נשמרו. האם לצאת בלי לשמור?</div>' +
    '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="cancelDiscardSubDepartmentModal()">המשך עריכה</button>' +
      '<button class="btn btn-secondary" onclick="confirmDiscardSubDepartmentModal()">צא בלי לשמור</button>' +
    '</div>' +
  '</div></div>';
}
function renderAdminScreen(){
  const tab = ui.adminTab || "companies";
  const tabs = [
    ["companies","חברות"],["worksites","אתרי עבודה"],
    ["departments","מחלקה"],["subDepartments","תת-מחלקה"],
    ["ranks","דירוג"],["grades","דרגה"],
    ["misc","טבלאות קוד"]
  ];
  let body="";
  if(tab==="companies"){
    body = renderCompaniesTable();
  } else if(tab==="worksites"){
    body = renderWorksitesTable();
  } else if(tab==="departments"){
    body = renderSimpleListTable("departments");
  } else if(tab==="subDepartments"){
    body = renderSubDepartmentsTable();
  } else if(tab==="ranks"){
    body = renderSimpleListTable("ranks");
  } else if(tab==="grades"){
    body = renderSimpleListTable("grades");
  } else if(tab==="misc"){
    body = renderCodeTablesTab();
  }
  const addBtn = tab==="companies" ?
    '<button class="btn-add-green" onclick="openAddCompanyModal()">+ הוסף חברה</button>' :
    tab==="worksites" ?
    '<button class="btn-add-green" onclick="openAddWorksiteModal()">+ הוסף אתר עבודה</button>' :
    tab==="departments" ?
    '<button class="btn-add-green" onclick="openAddSimpleItem(\'departments\')">+ הוסף מחלקה</button>' :
    tab==="subDepartments" ?
    '<button class="btn-add-green" onclick="openAddSubDepartmentModal()">+ הוסף תת-מחלקה</button>' :
    tab==="ranks" ?
    '<button class="btn-add-green" onclick="openAddSimpleItem(\'ranks\')">+ הוסף דירוג</button>' :
    tab==="grades" ?
    '<button class="btn-add-green" onclick="openAddSimpleItem(\'grades\')">+ הוסף דרגה</button>' :
    '';
  const pageDesc = tab==="misc" ?
    'עבור כל ערך, יש להזין את הקוד המתאים לו במערכת שנבחרה למטה. הקוד הזה הוא שיישלח בפועל בקובץ האקסל (במקום שם הערך עצמו).' :
    'מסכי הדגמה בלבד. באב הטיפוס אין ניהול מלא (הוספה/עריכה/מחיקה אמיתית) או שמירה קבועה של רשימות אלו.';
  return '' +
  '<h1>הגדרות מערכת</h1>' +
  '<div class="page-desc">'+pageDesc+'</div>' +
  '<div class="tabs" style="margin-bottom:18px;">' +
    tabs.map(t=>'<button class="tab-btn '+(tab===t[0]?"active":"")+'" onclick="setAdminTab(\''+t[0]+'\')">'+t[1]+'</button>').join("") +
  '</div>' +
  (addBtn ? '<div class="btn-row" style="margin-bottom:14px;">'+addBtn+'</div>' : '') +
  body +
  (tab==="companies" ? renderAddCompanyModal() : "") +
  (tab==="companies" ? renderDeleteCompanyModal() : "") +
  (tab==="worksites" ? renderAddWorksiteModal() : "") +
  (tab==="worksites" ? renderDeleteWorksiteModal() : "") +
  ((tab==="departments"||tab==="ranks"||tab==="grades") ? renderAddSimpleItemModal() : "") +
  ((tab==="departments"||tab==="ranks"||tab==="grades") ? renderDeleteSimpleItemModal() : "") +
  (tab==="subDepartments" ? renderAddSubDepartmentModal() : "") +
  (tab==="subDepartments" ? renderDeleteSubDepartmentModal() : "");
}
function adminTable(headers,rows){
  if(!rows.length) return '<div class="empty-state">אין רשומות.</div>';
  return '<div class="table-wrap" style="margin-bottom:20px;"><table class="data-table zebra-table"><thead><tr>'+
    headers.map(h=>'<th>'+escapeHtml(h)+'</th>').join("")+'</tr></thead><tbody>'+
    rows.map(r=>'<tr>'+r.map(c=>'<td>'+escapeHtml(c)+'</td>').join("")+'</tr>').join("")+
  '</tbody></table></div>';
}
/* ============================================================
   15-א. מסך "טבלאות קוד" (הגדרות מערכת)
   טבלה אחת רציפה לכל השדות הרשומים ב-CODED_FIELDS, עם כותרת
   "ערך"/"קוד" יחידה (לא חוזרת לכל שדה), וסרגל עליון קבוע (sticky)
   הכולל בחירת מערכת יעד (שיקלולית/כחולה) וקישורי עוגן לקפיצה ישירה
   לכל שדה בתוך הטבלה - כך שהמסך נשאר שמיש גם כשיתווספו עוד ועוד שדות.
   ============================================================ */
function setCodeSystem(sys){ ui.codeSystem = sys; render(); }
function updateCodeValue(fieldKey, itemId, sys, value){
  const item = CODE_TABLES[fieldKey].find(x=>x.id===itemId);
  if(!item) return;
  if(sys==="shikulit") item.shikulitCode = value; else item.blueCode = value;
  render();
}
function renderCodeTablesTab(){
  const sys = ui.codeSystem || "shikulit";
  const navLinks = CODED_FIELDS.map(f=>'<a href="#fld-'+f.key+'">'+escapeHtml(f.label)+'</a>').join("");
  const sysBar = '' +
    '<div class="code-sys-bar no-print">' +
      '<div class="radio-group" style="padding-top:0;margin-bottom:8px;">' +
        '<label><input type="radio" name="codeSystem" value="shikulit" '+(sys==="shikulit"?"checked":"")+' onchange="setCodeSystem(\'shikulit\')"> קודים למערכת שיקלולית</label>' +
        '<label><input type="radio" name="codeSystem" value="blue" '+(sys==="blue"?"checked":"")+' onchange="setCodeSystem(\'blue\')"> קודים למערכת הכחולה (הפנימית)</label>' +
      '</div>' +
      '<div class="anchor-nav" style="position:static;box-shadow:none;border-bottom:none;padding:0;">'+navLinks+'</div>' +
    '</div>';
  const rowsHtml = CODED_FIELDS.map(f=>{
    const items = CODE_TABLES[f.key];
    const groupHeaderRow = '<tr id="fld-'+f.key+'"><td colspan="2" class="code-group-row">'+escapeHtml(f.label)+'</td></tr>';
    const dataRows = items.map(item=>{
      const val = sys==="shikulit" ? (item.shikulitCode||"") : (item.blueCode||"");
      const inputId = "ct_code_"+f.key+"_"+item.id;
      return '<tr><td>'+escapeHtml(item.name)+'</td><td><input type="text" id="'+inputId+'" value="'+escapeHtml(val)+'" placeholder="קוד..." class="code-input" oninput="updateCodeValue(\''+f.key+'\',\''+item.id+'\',\''+sys+'\',this.value)"></td></tr>';
    }).join("");
    return groupHeaderRow + dataRows;
  }).join("");
  return sysBar +
    '<div class="table-wrap" style="margin-bottom:20px;width:-moz-fit-content;width:fit-content;max-width:100%;">' +
      '<table class="data-table code-table"><thead><tr><th>ערך</th><th>קוד</th></tr></thead><tbody>'+rowsHtml+'</tbody></table>' +
    '</div>';
}
