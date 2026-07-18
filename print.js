"use strict";

/* ============================================================
   16. הפקת טופס 101 ממולא — תצוגת הדפסה (2 עמודי A4)
   ============================================================ */
function pfCell(label,value){
  return '<div class="pf-cell"><span class="pf-lbl">'+escapeHtml(label)+'</span><span class="pf-val">'+escapeHtml(value||"—")+'</span></div>';
}
function idTypeLabelHe(idType){ return idType==="id"?"תעודת זהות":"דרכון"; }
function maritalLabel(id){ const m=CODE_TABLES.maritalStatuses.find(x=>x.id===id); return m?m.name:"—"; }
function incomeTypeLabel(id){ const t=CODE_TABLES.incomeTypes.find(x=>x.id===id); return t?t.name:"—"; }
function spouseIncomeLabel(id){ const o=CODE_TABLES.spouseIncomeOptions.find(x=>x.id===id); return o?o.name:"—"; }
function kibbutzLabel(v){ return v==="yes_transferred"?"חבר/ה — הכנסות מועברות לקיבוץ":(v==="yes_not_transferred"?"חבר/ה — הכנסות אינן מועברות לקיבוץ":(v==="no"?"לא":"—")); }

function printToolbar(caseId,backScreen,title){
  const isEmp = ui.mode==="employee";
  // ההדפסה (טופס 101 / בנק) היא כעת רק אחד מ-11 הטפסים ברשימה, ולכן
  // "חזרה" מהדפסה אינה סוגרת יותר את הטאב אוטומטית - חוזרים לרשימת
  // הטפסים כדי שאפשר יהיה להמשיך למלא את שאר הטפסים באותה ישיבה.
  const backOnclick = isEmp ? "ui.screen='checklist';render()" : ("openCase('"+caseId+"','"+backScreen+"')");
  const backLabel = isEmp ? "חזרה לרשימת הטפסים" : "חזרה למסך התיק";
  return '<div class="print-toolbar no-print">' +
    '<button class="btn-link" onclick="'+backOnclick+'">&rarr; '+backLabel+'</button>' +
    '<div style="font-weight:700;color:var(--header-text);">'+title+'</div>' +
    '<button class="btn btn-primary btn-sm" onclick="window.print()">הדפס / שמור כ-PDF</button>' +
  '</div>';
}
/* העובד/ת ממלא/ת את הטופס בטאב נפרד (ר' openEmployeeFillTab), ולכן
   "סיום" כאן פירושו פשוט סגירת אותו טאב - ולא "החזרת מחשב" כמו
   בגרסה הקודמת שהניחה שהעובד/ת ומשאבי אנוש חולקים אותו מחשב. */
function closeEmployeeTab(){
  saveDB();
  window.close();
  // אם הדפדפן מנע את הסגירה (למשל הטאב לא נפתח ע"י סקריפט) - לפחות מציגים אישור.
  showToast("הנתונים נשמרו. ניתן לסגור את החלון.");
}

function renderPrintForm101(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  return printToolbar(c.id,"case-home","טופס 101 — תצוגת הדפסה") + renderForm101OfficialPage(c);
}

/* ============================================================
   16-א. תצוגת הדפסה רשמית של טופס 101 - שכבת HTML שקופה מעל תמונת
   הרקע של הטופס הרשמי עצמו (ר' form101FieldMap.js למיפוי הקואורדינטות
   המלא, ולהערה שם על שלב 1 מול שלבים הבאים). כל שדה בעל type:
   "text"/"digits"/"checkbox" מטופל כאן לפי אותו type - ר' renderF101OField.
   ============================================================ */
/* פורמט תאריך ל-8 ספרות רצופות (יום-חודש-שנה) לתיבות בודדות - הספרה
   הראשונה (יום) מוצגת בתיבה הימנית ביותר, בהתאם לכיוון הכתיבה בטופס
   הרשמי (מספרים נכתבים משמאל לימין בתוך אזור מוקצה מימין לשמאל). */
function form101DateDigits8(iso){
  if(!iso) return "";
  const parts = String(iso).split("-");
  if(parts.length!==3) return "";
  const [y,m,d] = parts;
  return (d||"")+(m||"")+(y||"");
}
function form101PadDigits(val,n){
  const s = String(val||"").replace(/\D/g,"");
  // אם לא הוזן ערך בפועל - יש להשאיר את התיבות ריקות, לא למלא באפסים
  // (ר' התיקון על שדה המיקוד בשיחה עם המשתמשת: "0000000" מטעה כאילו הוזן מיקוד).
  if(!s) return "";
  return s.slice(-n).padStart(n,"0");
}
/* מפרקת מספר טלפון מאוחסן כמו "050-1234567" או "08-851-6000" לקידומת
   (עד המקף הראשון) ולמספר (כל מה שאחריו, בלי מקפים נוספים) - כדי להציג
   כל חלק בתיבה הנפרדת שלו בטופס הרשמי (ר' ההערה ב-form101FieldMap.js). */
/* מפרקת לפי מספר הספרות של הקידומת (03 - נייד, 02 - קווי), לא לפי מיקום
   מקף - כי לא כל המספרים המאוחסנים כוללים מקף (ר' התיקון בשיחה עם
   המשתמשת: "מספר טלפון" ללא מקף גרם לכל הערך ליפול לתוך שדה הקידומת). */
function form101SplitPhone(val){
  const s = String(val||"").replace(/\D/g,"");
  if(!s) return { prefix:"", number:"" };
  const prefixLen = s.slice(0,2)==="05" ? 3 : 2;
  return { prefix: s.slice(0,prefixLen), number: s.slice(prefixLen) };
}
/* ערכי כל שדות המיפוי (שלב 1 בלבד) - כל key תואם בדיוק ל-key המקביל לו
   ב-FORM101_FIELD_MAP (ר' form101FieldMap.js). type:"text"/"digits" מקבלים
   value; type:"checkbox" מקבל checked בלבד. */
function form101OfficialValues(c){
  const emp = c.employee, co = CODE_TABLES.companies.find(x=>x.id===c.companyId) || {};
  const idVal = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  return {
    employerName:         { value: co.name },
    employerAddress:      { value: co.address },
    employerPhone:         { value: co.phone },
    // הספרה הראשונה ("9") מודפסת מראש על גבי הטופס - יש להציג רק את 8
    // הספרות שאחריה (ר' ההערה ליד employerDeductionFile ב-form101FieldMap.js).
    employerDeductionFile: { value: co.deductionFileNum ? co.deductionFileNum.slice(1) : "" },

    employeeIdNumber:  { value: form101PadDigits(idVal,9) },
    employeeLastName:  { value: emp.lastName },
    employeeFirstName: { value: emp.firstName },
    employeeBirthDate: { value: form101DateDigits8(emp.birthDate) },
    employeeAliyaDate: { value: form101DateDigits8(emp.aliyaDate) },
    genderMaleCheckbox:   { checked: emp.gender==="male" },
    genderFemaleCheckbox: { checked: emp.gender==="female" },

    // בגרסת הטופס הנוכחית "מספר" (בית) הוא תיבה נפרדת מ"רחוב/שכונה" - ר'
    // ההערה למעלה ב-form101FieldMap.js על השינוי במבנה סעיף ב'.
    employeeStreet:      { value: emp.street },
    employeeHouseNumber: { value: emp.houseNumber },
    employeeCity:         { value: emp.city },
    employeeZip:           { value: form101PadDigits(emp.zip,7) },
    employeePhonePrefix:       { value: form101SplitPhone(emp.phone2).prefix },
    employeePhoneNumber:       { value: form101SplitPhone(emp.phone2).number },
    employeeMobilePhonePrefix: { value: form101SplitPhone(emp.mobilePhone).prefix },
    employeeMobilePhoneNumber: { value: form101SplitPhone(emp.mobilePhone).number },
    employeeEmail:              { value: emp.email },

    residentYesCheckbox: { checked: emp.isIsraeliResident==="yes" },
    residentNoCheckbox:  { checked: emp.isIsraeliResident==="no" },

    maritalSingleCheckbox:    { checked: emp.maritalStatus==="single" },
    maritalMarriedCheckbox:   { checked: emp.maritalStatus==="married" },
    maritalDivorcedCheckbox:  { checked: emp.maritalStatus==="divorced" },
    maritalWidowedCheckbox:   { checked: emp.maritalStatus==="widowed" },
    maritalSeparatedCheckbox: { checked: emp.maritalStatus==="separated" },

    employmentStartDate: { value: form101DateDigits8(c.startDate) },
    incomeTypeMonthlyCheckbox:     { checked: emp.incomeType==="monthly" },
    incomeTypeAdditionalCheckbox:  { checked: emp.incomeType==="additional" },
    incomeTypePartialCheckbox:     { checked: emp.incomeType==="partial" },
    incomeTypeDailyCheckbox:       { checked: emp.incomeType==="daily" },
    incomeTypePensionCheckbox:     { checked: emp.incomeType==="pension" },
    incomeTypeScholarshipCheckbox: { checked: emp.incomeType==="scholarship" },

    otherIncomeHasNoCheckbox:  { checked: emp.otherIncome.has==="no" },
    otherIncomeHasYesCheckbox: { checked: emp.otherIncome.has==="yes" },
    otherIncomeMonthlyCheckbox:     { checked: emp.otherIncome.types.includes("monthly") },
    otherIncomeAdditionalCheckbox:  { checked: emp.otherIncome.types.includes("additional") },
    otherIncomePartialCheckbox:     { checked: emp.otherIncome.types.includes("partial") },
    otherIncomeDailyCheckbox:       { checked: emp.otherIncome.types.includes("daily") },
    otherIncomePensionCheckbox:     { checked: emp.otherIncome.types.includes("pension") },
    otherIncomeScholarshipCheckbox: { checked: emp.otherIncome.types.includes("scholarship") },
    otherIncomeCreditHereCheckbox:  { checked: emp.otherIncome.creditPointsLocation==="here" },
    otherIncomeCreditOtherCheckbox: { checked: emp.otherIncome.creditPointsLocation==="other" },
    otherIncomeNoHishtalmutCheckbox: { checked: !!emp.otherIncome.noHishtalmutDeposits },
    otherIncomeNoPensionCheckbox:    { checked: !!emp.otherIncome.noPensionDeposits },

    // הערה: אין במודל הנתונים פירוט בין "עבודה/קצבה/עסק" ל"הכנסה אחרת"
    // עבור הכנסת בן/בת הזוג (emp.spouse.incomeStatus הוא רק "has"/"none") -
    // לכן spouseIncomeWorkPensionBusinessCheckbox/spouseIncomeOtherCheckbox
    // ממופים בטופס לצורך מיקום בלבד ואינם מסומנים אוטומטית.
    spouseIdNumber:      { value: form101PadDigits(emp.spouse.idType==="id" ? emp.spouse.idNumber : "",9) },
    spouseLastName:      { value: emp.spouse.lastName },
    spouseFirstName:     { value: emp.spouse.firstName },
    spouseBirthDate:     { value: form101DateDigits8(emp.spouse.birthDate) },
    spouseAliyaDate:     { value: form101DateDigits8(emp.spouse.aliyaDate) },
    spousePassportNumber: { value: emp.spouse.idType==="passport" ? emp.spouse.passportNumber : "" },
    spouseHasNoIncomeCheckbox: { checked: emp.spouse.incomeStatus==="none" },
    spouseHasIncomeCheckbox:   { checked: emp.spouse.incomeStatus==="has" },

    // ---------- עמוד 2, ח. פטור או זיכוי ממס (17 תיבות סימון בלבד -
    // תת-שדות כמו יישוב/תאריכים/מספר ילדים לכל סעיף עדיין לא ממופים,
    // ר' ההערה מעל FORM101_FIELD_MAP בעמוד 2 ב-form101FieldMap.js) ----------
    ...Object.fromEntries(TAX_CREDIT_META.map(function(meta){
      const val = emp.taxCredits[meta.key];
      const checked = (typeof val==="object") ? !!(val && val.checked) : !!val;
      return ["taxCredit"+meta.key.charAt(0).toUpperCase()+meta.key.slice(1)+"Checkbox", { checked: checked }];
    }))
  };
}
function renderF101ODigitBoxes(def,value){
  // boxCount = מספר התיבות המודפסות בסך הכל (ר' employerDeductionFile ב-
  // form101FieldMap.js); digits = כמה מהן אנחנו בפועל ממלאים. skip = כמה
  // תיבות מודפסות-מראש יש לדלג עליהן בצד הימני (0 כברירת מחדל - כלומר
  // התיבות המודפסות-מראש, אם יש, נמצאות בצד השמאלי/הרחוק של הטווח ולא
  // מצריכות דילוג בתחילתו). ר' התיקון על מספר תיק הניכויים: הספרה "9"
  // המודפסת-מראש נמצאת בתיבה השמאלית ביותר (הראשונה מבחינת קריאת המספר
  // משמאל לימין), ולכן 8 התיבות הממולאות תופסות את הטווח הימני של הטופס
  // בלי כל דילוג, ופשוט אינן מגיעות לתיבה השמאלית ביותר.
  const total = def.boxCount || def.digits;
  const skip = def.skip || 0;
  const boxW = def.width / total;
  // המספרים נקראים תמיד משמאל לימין (LTR) גם בתוך טופס בעברית - הספרה
  // הראשונה של הערך צריכה לשבת בתיבה השמאלית ביותר, והאחרונה בתיבה
  // הימנית ביותר (הקרובה ל-right העוגן). i=0 הוא התיבה הימנית ביותר
  // מבין התיבות הממולאות (קרוב ביותר ל-right), ולכן צריך את הספרה
  // *האחרונה* של הערך - לכן הופכים את סדר התווים כאן (ר' התיקון על
  // תאריך הלידה/מספר זהות/מיקוד בשיחה עם המשתמשת - כל התיבות הללו הוצגו
  // הפוך, מימין לשמאל, לפני התיקון הזה).
  const chars = String(value||"").split("").reverse();
  let html = "";
  for(let i=0;i<def.digits;i++){
    const boxRight = def.right + (skip+i)*boxW;
    html += '<div class="f101o-digit" style="top:'+def.top+'%;right:'+boxRight+'%;width:'+boxW+'%;font-size:'+def.fontSize+'pt;">'+escapeHtml(chars[i]||"")+'</div>';
  }
  return html;
}
function renderF101OField(key,def,values,calibrate,editMode){
  const v = values[key] || {};
  let html;
  if(def.type==="checkbox"){
    // גודל ה-X מחושב ממש לפי גובה תיבת הסימון בפועל (height% מתורגם ל-mm
    // לפי גובה עמוד A4 = 297mm) - כדי שה-X ימלא בדיוק את הריבוע המודפס
    // ולא יהיה גדול/קטן ממנו (ר' תיקון גודל תיבות הסימון בשיחה עם המשתמשת).
    const xFontMm = (def.height/100*297).toFixed(2);
    html = v.checked ? '<div class="f101o-x" style="top:'+def.top+'%;right:'+def.right+'%;width:'+def.width+'%;height:'+def.height+'%;font-size:'+xFontMm+'mm;">✕</div>' : "";
  } else if(def.type==="digits"){
    html = renderF101ODigitBoxes(def,v.value);
  } else {
    html = '<div class="f101o-field'+(def.ltr?" ltr":"")+'" style="top:'+def.top+'%;right:'+def.right+'%;width:'+def.width+'%;font-size:'+def.fontSize+'pt;">'+escapeHtml(v.value||"")+'</div>';
  }
  if(calibrate){
    const top = def.top, right = def.right, width = def.width||4, height = def.height||(def.width?1.6:3);
    const selected = editMode && FORM101_SELECTED_KEY===key;
    const dragAttr = editMode ? ' onmousedown="form101StartDrag(event,\''+key+'\')"' : '';
    const resizeHandle = editMode ? '<div class="f101o-resize-handle" onmousedown="event.stopPropagation();form101StartResize(event,\''+key+'\')"></div>' : '';
    html += '<div class="f101o-calib-box'+(selected?" selected":"")+'" data-key="'+key+'" style="top:'+top+'%;right:'+right+'%;width:'+width+'%;height:'+height+'%;"'+dragAttr+'><span>'+key+'</span>'+resizeHandle+'</div>';
  }
  return html;
}
/* ג. פרטים על ילדיי... - טבלה חוזרת, ר' ההערה מעל FORM101_CHILDREN_ROW
   ב-form101FieldMap.js. כל שורה משתמשת באותו תבנית עמודות (FORM101_CHILDREN_ROW)
   עם top מחושב לפי מספר השורה. ניתנת לגרירה/שינוי גודל בעורך בדיוק כמו
   שדה רגיל - ר' form101ParseChildKey/form101ResolveDef למטה שמתרגמים בין
   מפתח "children[i].field" לבין FORM101_CHILDREN_ROW/FORM101_CHILDREN_TABLE.
   במצב כיול מוצגות תיבות עבור כל maxRows (גם שורות בלי ילד בפועל) כדי
   שאפשר יהיה לגרור/לראות את כל רשת הטבלה מול הרקע גם עם פחות ילדים
   בפועל בתיק הנבחר; ערכי טקסט/ספרות/X מוצגים רק עבור ילדים שקיימים בפועל. */
/* top מוחלט של שדה מסוים בשורה i: בסיס משותף לכל העמודות (firstRowTop +
   i*rowHeight) + topOffset עצמאי לעמודה הזו בלבד (ר' ההערה המורחבת מעל
   form101OnDragMove על הבעיה שזה פותר - גרירה אנכית של עמודה אחת (כמו
   טור הסימון 1/2) לא תזיז יותר טורים אחרים (מספר זהות/תאריך לידה) כי כל
   טור שומר topOffset נפרד משלו, ורק firstRowTop/rowHeight המשותפים
   (הנערכים דרך שדות ייעודיים בפאנל, לא דרך גרירה) קובעים את קצב השורות) +
   rowOffsets[i] - תיקון עדין לשורה ספציפית זו בלבד (משותף לכל העמודות
   באותה שורה), כי הרווח האמיתי בין השורות בטופס המודפס לא תמיד אחיד
   לגמרי - קבוע rowHeight יחיד לא בהכרח מתאים במדויק לכל 10 השורות (ר'
   הדיון עם המשתמשת: "כשמזיזים טור שלם יחד חלק מהשדות במקום וחלק לא" -
   בדיוק הסימפטום של סטייה קטנה שמצטברת ככל שמתרחקים מהשורה שכוילה).
   נערך אך ורק דרך שדה ייעודי בפאנל (ר' renderForm101EditPanel), לא גרירה -
   כדי לא להתנגש עם גרירת העמודה (topOffset). */
function form101ChildRowTop(field,index){
  const rowOffset = (FORM101_CHILDREN_TABLE.rowOffsets && FORM101_CHILDREN_TABLE.rowOffsets[index]) || 0;
  return +(FORM101_CHILDREN_TABLE.firstRowTop + index*FORM101_CHILDREN_TABLE.rowHeight + (FORM101_CHILDREN_ROW[field].topOffset||0) + rowOffset).toFixed(3);
}
function renderF101ChildrenTable(c,calibrate,editMode){
  const kids = c.employee.children||[];
  const rowCount = calibrate ? FORM101_CHILDREN_TABLE.maxRows : Math.min(kids.length, FORM101_CHILDREN_TABLE.maxRows);
  let html = "";
  for(let i=0;i<rowCount;i++){
    const kid = kids[i];
    const rowValueByField = kid ? {
      birthDate: { value: form101DateDigits8(kid.birthDate) },
      idNumber:  { value: form101PadDigits(kid.idNumber,9) },
      name:      { value: kid.name },
      custodyCheckbox:   { checked: !!kid.inCustody },
      allowanceCheckbox: { checked: !!kid.receivesAllowance }
    } : {};
    Object.keys(FORM101_CHILDREN_ROW).forEach(function(field){
      const def = Object.assign({}, FORM101_CHILDREN_ROW[field], {top: form101ChildRowTop(field,i)});
      const key = "children["+i+"]."+field;
      // renderF101OField מחפש את הערך תחת values[key] (המפתח המלא), ולכן
      // עוטפים כאן את הערך תחת אותו מפתח מלא ולא רק שם השדה הקצר.
      const rowValues = {};
      rowValues[key] = rowValueByField[field] || {};
      html += renderF101OField(key, def, rowValues, calibrate, editMode);
    });
  }
  return html;
}
function renderForm101OfficialPage(c){
  const values = form101OfficialValues(c);
  const editMode = !!FORM101_EDIT_MODE;
  const calibrate = !!FORM101_CALIBRATE || editMode;
  // חלוקה לפי def.page (חסר/1 = עמוד 1, 2 = עמוד 2) - ר' ההערה מעל
  // .form101-official-page.f101-page2 ב-styles.css ו-FORM101_FIELD_MAP
  // ב-form101FieldMap.js. טבלת הילדים תמיד בעמוד 1.
  const page1Keys = Object.keys(FORM101_FIELD_MAP).filter(k=>(FORM101_FIELD_MAP[k].page||1)===1);
  const page2Keys = Object.keys(FORM101_FIELD_MAP).filter(k=>FORM101_FIELD_MAP[k].page===2);
  const page1Html = page1Keys.map(key=>renderF101OField(key,FORM101_FIELD_MAP[key],values,calibrate,editMode)).join("")
    + renderF101ChildrenTable(c,calibrate,editMode);
  const page2Html = page2Keys.map(key=>renderF101OField(key,FORM101_FIELD_MAP[key],values,calibrate,editMode)).join("");
  return '' +
  '<div class="form101-official-page f101-page1'+(calibrate?" calibrate":"")+(editMode?" editing":"")+'" id="form101OfficialPage1">' +
    page1Html +
  '</div>' +
  '<div class="form101-official-page f101-page2'+(calibrate?" calibrate":"")+(editMode?" editing":"")+'" id="form101OfficialPage2">' +
    page2Html +
  '</div>' +
  (editMode ? renderForm101EditPanel() :
    '<div class="pf-note no-print" style="max-width:210mm;margin:8px auto;">טופס 101 (השדות הרשמיים), שנת מס '+c.taxYear+'. עמוד 1: פרטי מעסיק, זהות/יצירת קשר של העובד/ת, ילדים, הכנסה ממעסיק זה, הכנסות אחרות ופרטי בן/בת הזוג ממופים; שינויים במהלך השנה (חלק ז) נותר ריק בכוונה (אין לו שדה מקביל בטופס הדיגיטלי). עמוד 2: חלק ח (פטור/זיכוי ממס) ממופה ברמת תיבת הסימון הראשית בלבד; תת-שדות (יישוב, תאריכים, מספר ילדים) וחלקים ט/י עדיין לא ממופים.</div>');
}

/* ============================================================
   16-ב. עורך מיפוי אינטראקטיבי לטופס 101 (פיתוח/כיול בלבד) - מופעל דרך
   ?editform101=1. מאפשר גרירה/שינוי גודל של כל שדה בעכבר וייצוא המיפוי
   המעודכן כטקסט JS מוכן להדבקה. אף חלק מהעורך הזה אינו נטען/מוצג
   כשהדגל כבוי, ולכן אינו משפיע בשום צורה על השימוש הרגיל באפליקציה.
   ============================================================ */
function form101SelectField(key){
  FORM101_SELECTED_KEY = key || null;
  render();
}
/* עדכון בודד משדה קלט בפאנל (לא גרירה) - שינוי מיידי ורינדור מלא, כי
   אין כאן סיכון להפרעה לאיזשהו gesture פעיל (בניגוד לגרירה עצמה). */
function form101UpdateFieldProp(key,prop,value){
  const child = form101ParseChildKey(key);
  if(child){
    if(prop==="top"){
      // "top" בפאנל מציג את המיקום המוחלט; ממירים אותו כאן ל-topOffset
      // היחסי של העמודה הזו בלבד (ר' form101ChildRowTop) - לא נוגעים
      // ב-firstRowTop/rowHeight המשותפים (יש להם שדות נפרדים בפאנל).
      const v = parseFloat(value)||0;
      const base = FORM101_CHILDREN_TABLE.firstRowTop + child.index*FORM101_CHILDREN_TABLE.rowHeight;
      FORM101_CHILDREN_ROW[child.field].topOffset = +(v-base).toFixed(3);
    } else if(prop==="ltr"){
      FORM101_CHILDREN_ROW[child.field].ltr = !!value;
    } else if(prop==="digits" || prop==="boxCount"){
      FORM101_CHILDREN_ROW[child.field][prop] = parseInt(value,10)||0;
    } else {
      FORM101_CHILDREN_ROW[child.field][prop] = parseFloat(value)||0;
    }
    render();
    return;
  }
  if(key==="__childrenTable_firstRowTop__"){ FORM101_CHILDREN_TABLE.firstRowTop = parseFloat(value)||0; render(); return; }
  if(key==="__childrenTable_rowHeight__"){ FORM101_CHILDREN_TABLE.rowHeight = parseFloat(value)||0; render(); return; }
  const rowOffsetMatch = /^__childrenTable_rowOffset__(\d+)__$/.exec(key);
  if(rowOffsetMatch){
    if(!FORM101_CHILDREN_TABLE.rowOffsets) FORM101_CHILDREN_TABLE.rowOffsets = {};
    FORM101_CHILDREN_TABLE.rowOffsets[+rowOffsetMatch[1]] = parseFloat(value)||0;
    render();
    return;
  }
  const def = FORM101_FIELD_MAP[key];
  if(!def) return;
  if(prop==="ltr") def.ltr = !!value;
  else if(prop==="digits" || prop==="boxCount") def[prop] = parseInt(value,10)||0;
  else def[prop] = parseFloat(value)||0;
  render();
}
/* מפתחות שדה בטבלת הילדים החוזרת נראים כמו "children[2].idNumber" - שני
   הפונקציות הבאות מתרגמות בין המפתח הזה לבין FORM101_CHILDREN_ROW (עמודה
   משותפת לכל השורות) ו-FORM101_CHILDREN_TABLE (מיקום שורה 0 וגובה שורה),
   כדי שאותה מנגנון גרירה/שינוי גודל ישרת גם שדות רגילים וגם שדות טבלה. */
function form101ParseChildKey(key){
  const m = /^children\[(\d+)\]\.(.+)$/.exec(key);
  return m ? { index:+m[1], field:m[2] } : null;
}
function form101ResolveDef(key){
  const child = form101ParseChildKey(key);
  if(child){
    return Object.assign({}, FORM101_CHILDREN_ROW[child.field], {
      top: form101ChildRowTop(child.field, child.index)
    });
  }
  return FORM101_FIELD_MAP[key];
}
/* טבלת הילדים תמיד בעמוד 1 (ר' renderF101ChildrenTable); שדה רגיל - לפי
   def.page (חסר/1 = עמוד 1, 2 = עמוד 2) - ר' renderForm101OfficialPage. */
function form101ContainerIdForKey(key){
  const child = form101ParseChildKey(key);
  if(child) return "form101OfficialPage1";
  const def = FORM101_FIELD_MAP[key];
  return (def && def.page===2) ? "form101OfficialPage2" : "form101OfficialPage1";
}
let f101Drag = null;
function form101StartDrag(e,key){
  if(!FORM101_EDIT_MODE) return;
  e.preventDefault();
  if(FORM101_SELECTED_KEY!==key){ FORM101_SELECTED_KEY = key; render(); }
  const container = document.getElementById(form101ContainerIdForKey(key));
  const rect = container.getBoundingClientRect();
  const def = form101ResolveDef(key);
  const child = form101ParseChildKey(key);
  f101Drag = { key:key, mode:"move", startX:e.clientX, startY:e.clientY,
    startTop:def.top, startRight:def.right,
    startTopOffset: child ? (FORM101_CHILDREN_ROW[child.field].topOffset||0) : 0,
    containerW:rect.width, containerH:rect.height };
  document.addEventListener("mousemove", form101OnDragMove);
  document.addEventListener("mouseup", form101OnDragEnd);
}
function form101StartResize(e,key){
  if(!FORM101_EDIT_MODE) return;
  e.preventDefault();
  if(FORM101_SELECTED_KEY!==key){ FORM101_SELECTED_KEY = key; render(); }
  const container = document.getElementById(form101ContainerIdForKey(key));
  const rect = container.getBoundingClientRect();
  const def = form101ResolveDef(key);
  f101Drag = { key:key, mode:"resize", startX:e.clientX, startY:e.clientY,
    startWidth: def.width||4, startHeight: def.height||(def.width?1.6:3),
    containerW:rect.width, containerH:rect.height };
  document.addEventListener("mousemove", form101OnDragMove);
  document.addEventListener("mouseup", form101OnDragEnd);
}
/* בזמן גרירה בפועל מעדכנים רק את מלבן הכיול הנגרר עצמו (תזוזה חלקה, בלי
   render() מלא שהיה "בולע" את הגרירה - ר' backToFormsHome/flushPendingRender
   לדיון על אותה בעיה בהקשר אחר) ואת שדות הקלט בפאנל; את ערך השדה עצמו
   (טקסט/ספרות/X), ואת שאר תיבות הכיול שמושפעות בעקיפין (למשל שורות אחרות
   בטבלת הילדים, ששוקלות right/width משותפים) - מיישרים רק ב-mouseup,
   ר' form101OnDragEnd.

   גרירה אנכית של שדה בטבלת הילדים מעדכנת אך ורק את topOffset העצמאי של
   העמודה שלו (ר' form101ChildRowTop) - לא את firstRowTop/rowHeight
   המשותפים לכל הטבלה. זה מתקן בעיה שדווחה: גרירת טור הסימון 1/2 הזיזה
   בטעות גם את טורי מספר הזהות/תאריך הלידה, כי לפני התיקון top נכתב ישר
   ל-firstRowTop (המשותף) בשורה 0. עכשיו כל עמודה זזה אנכית לגמרי בנפרד;
   כדי לשנות את firstRowTop/rowHeight המשותפים יש שדות ייעודיים בפאנל
   (ר' renderForm101EditPanel) ולא גרירה. */
function form101OnDragMove(e){
  if(!f101Drag) return;
  const dxPct = (e.clientX-f101Drag.startX)/f101Drag.containerW*100;
  const dyPct = (e.clientY-f101Drag.startY)/f101Drag.containerH*100;
  const child = form101ParseChildKey(f101Drag.key);
  const box = document.querySelector('.f101o-calib-box[data-key="'+f101Drag.key+'"]');
  if(f101Drag.mode==="move"){
    const newRight = +(f101Drag.startRight-dxPct).toFixed(3);
    let newTop;
    if(child){
      FORM101_CHILDREN_ROW[child.field].right = newRight;
      FORM101_CHILDREN_ROW[child.field].topOffset = +(f101Drag.startTopOffset+dyPct).toFixed(3);
      newTop = form101ChildRowTop(child.field, child.index);
    } else {
      const def = FORM101_FIELD_MAP[f101Drag.key];
      newTop = +(f101Drag.startTop+dyPct).toFixed(3);
      def.top = newTop; def.right = newRight;
    }
    if(box){ box.style.top = newTop+"%"; box.style.right = newRight+"%"; }
  } else {
    const newWidth = Math.max(0.3, f101Drag.startWidth-dxPct);
    let newHeight;
    const targetDef = child ? FORM101_CHILDREN_ROW[child.field] : FORM101_FIELD_MAP[f101Drag.key];
    targetDef.width = +newWidth.toFixed(3);
    if(targetDef.type==="checkbox"){
      newHeight = Math.max(0.3, f101Drag.startHeight+dyPct);
      targetDef.height = +newHeight.toFixed(3);
    }
    if(box){ box.style.width = targetDef.width+"%"; if(newHeight!==undefined) box.style.height = targetDef.height+"%"; }
  }
  form101RefreshPanelInputs();
}
function form101OnDragEnd(){
  document.removeEventListener("mousemove", form101OnDragMove);
  document.removeEventListener("mouseup", form101OnDragEnd);
  f101Drag = null;
  render();
}
function form101RefreshPanelInputs(){
  const key = f101Drag ? f101Drag.key : FORM101_SELECTED_KEY;
  const def = key && form101ResolveDef(key);
  if(!def) return;
  ["top","right","width","height"].forEach(function(prop){
    const input = document.getElementById("f101panel_"+prop);
    if(input && def[prop]!==undefined) input.value = def[prop];
  });
}
function renderForm101EditPanel(){
  const key = FORM101_SELECTED_KEY;
  const def = key ? form101ResolveDef(key) : null;
  const keys = Object.keys(FORM101_FIELD_MAP);
  // מוסיפים לרשימת הבחירה גם את כל שדות טבלת הילדים (לכל maxRows), כדי
  // שאפשר יהיה לבחור/לכייל אותם דרך התפריט ולא רק בלחיצה על התיבה בטופס.
  for(let i=0;i<FORM101_CHILDREN_TABLE.maxRows;i++){
    Object.keys(FORM101_CHILDREN_ROW).forEach(function(field){ keys.push("children["+i+"]."+field); });
  }
  let fieldsFormHtml = '<div class="f101-edit-empty">בחר/י שדה מהרשימה או לחצ/י על תיבה אדומה בטופס</div>';
  if(def){
    const isCheckbox = def.type==="checkbox";
    const isText = def.type==="text";
    const isDigits = def.type==="digits";
    fieldsFormHtml = '' +
      '<div class="f101-edit-row"><label>top (%)</label><input type="number" step="0.01" id="f101panel_top" value="'+def.top+'" onchange="form101UpdateFieldProp(\''+key+'\',\'top\',this.value)"></div>' +
      '<div class="f101-edit-row"><label>right (%)</label><input type="number" step="0.01" id="f101panel_right" value="'+def.right+'" onchange="form101UpdateFieldProp(\''+key+'\',\'right\',this.value)"></div>' +
      '<div class="f101-edit-row"><label>width (%)</label><input type="number" step="0.01" id="f101panel_width" value="'+(def.width||"")+'" onchange="form101UpdateFieldProp(\''+key+'\',\'width\',this.value)"></div>' +
      (isCheckbox ? '<div class="f101-edit-row"><label>height (%)</label><input type="number" step="0.01" id="f101panel_height" value="'+(def.height||"")+'" onchange="form101UpdateFieldProp(\''+key+'\',\'height\',this.value)"></div>' : "") +
      ((isText||isDigits) ? '<div class="f101-edit-row"><label>fontSize (pt)</label><input type="number" step="0.1" value="'+(def.fontSize||"")+'" onchange="form101UpdateFieldProp(\''+key+'\',\'fontSize\',this.value)"></div>' : "") +
      (isText ? '<div class="f101-edit-row"><label>LTR</label><input type="checkbox" '+(def.ltr?"checked":"")+' onchange="form101UpdateFieldProp(\''+key+'\',\'ltr\',this.checked)"></div>' : "") +
      (isDigits ? '<div class="f101-edit-row"><label>digits</label><input type="number" step="1" value="'+def.digits+'" onchange="form101UpdateFieldProp(\''+key+'\',\'digits\',this.value)"></div>' : "") +
      (isDigits ? '<div class="f101-edit-row"><label>boxCount</label><input type="number" step="1" value="'+(def.boxCount||def.digits)+'" onchange="form101UpdateFieldProp(\''+key+'\',\'boxCount\',this.value)"></div>' : "");
    const childForPanel = form101ParseChildKey(key);
    if(childForPanel){
      // top כאן הוא topOffset עצמאי לעמודה הזו בלבד (ר' form101ChildRowTop) -
      // firstRowTop/rowHeight המשותפים לכל הטבלה, ותיקון rowOffset לשורה
      // הנוכחית בלבד (משותף לכל העמודות באותה שורה - לתיקון סטייה שאינה
      // אחידה בין השורות בטופס המודפס בפועל), נערכים בנפרד למטה - כדי
      // שגרירת עמודה אחת לעולם לא תזיז עמודות/שורות אחרות בטעות.
      const curRowOffset = (FORM101_CHILDREN_TABLE.rowOffsets && FORM101_CHILDREN_TABLE.rowOffsets[childForPanel.index]) || 0;
      fieldsFormHtml += '' +
        '<div class="f101-edit-subtitle">טבלת ילדים - כל השורות</div>' +
        '<div class="f101-edit-row"><label>firstRowTop (%)</label><input type="number" step="0.01" value="'+FORM101_CHILDREN_TABLE.firstRowTop+'" onchange="form101UpdateFieldProp(\'__childrenTable_firstRowTop__\',\'\',this.value)"></div>' +
        '<div class="f101-edit-row"><label>rowHeight (%)</label><input type="number" step="0.01" value="'+FORM101_CHILDREN_TABLE.rowHeight+'" onchange="form101UpdateFieldProp(\'__childrenTable_rowHeight__\',\'\',this.value)"></div>' +
        '<div class="f101-edit-subtitle">רק שורה '+childForPanel.index+' (כל העמודות)</div>' +
        '<div class="f101-edit-row"><label>rowOffset (%)</label><input type="number" step="0.01" value="'+curRowOffset+'" onchange="form101UpdateFieldProp(\'__childrenTable_rowOffset__'+childForPanel.index+'__\',\'\',this.value)"></div>';
    }
  }
  return '' +
  '<div class="f101-edit-panel no-print">' +
    '<div class="f101-edit-title">עורך מיפוי טופס 101 (מצב פיתוח בלבד)</div>' +
    '<select class="f101-edit-select" onchange="form101SelectField(this.value)">' +
      '<option value="">— בחר/י שדה —</option>' +
      keys.map(function(k){ return '<option value="'+k+'" '+(k===key?"selected":"")+'>'+k+'</option>'; }).join("") +
    '</select>' +
    fieldsFormHtml +
    '<div class="f101-edit-hint">גרירת התיבה עצמה מזיזה אותה; גרירת הריבוע הקטן בפינה משנה את הרוחב (וגם הגובה, בתיבות סימון). בטבלת הילדים כל עמודה זזה אנכית בנפרד לגמרי מהעמודות האחרות - כדי להזיז את כל הטבלה יחד יש להשתמש בשדות firstRowTop/rowHeight למטה.</div>' +
    '<button class="btn btn-secondary btn-sm" onclick="form101ExportMapping()">ייצוא מיפוי מעודכן</button>' +
    '<textarea id="f101ExportBox" class="f101-edit-export" readonly></textarea>' +
  '</div>';
}
function form101FormatFieldDef(d,includeTop){
  const props = ['type:"'+d.type+'"'];
  if(d.digits!==undefined) props.push("digits:"+d.digits);
  if(d.boxCount!==undefined) props.push("boxCount:"+d.boxCount);
  if(includeTop) props.push("top:"+d.top);
  props.push("right:"+d.right);
  if(d.width!==undefined) props.push("width:"+d.width);
  if(d.height!==undefined) props.push("height:"+d.height);
  if(d.fontSize!==undefined) props.push("fontSize:"+d.fontSize);
  if(d.ltr) props.push("ltr:true");
  if(d.topOffset) props.push("topOffset:"+d.topOffset);
  if(d.page===2) props.push("page:2");
  return props.join(", ");
}
function form101ExportMapping(){
  const fieldLines = Object.keys(FORM101_FIELD_MAP).map(function(key){
    return "  "+key+": { "+form101FormatFieldDef(FORM101_FIELD_MAP[key],true)+" },";
  });
  const fieldMapText = "const FORM101_FIELD_MAP = {\n"+fieldLines.join("\n")+"\n};";

  const rowLines = Object.keys(FORM101_CHILDREN_ROW).map(function(key){
    return "  "+key+": { "+form101FormatFieldDef(FORM101_CHILDREN_ROW[key],false)+" },";
  });
  const rowText = "const FORM101_CHILDREN_ROW = {\n"+rowLines.join("\n")+"\n};";
  const rowOffsets = FORM101_CHILDREN_TABLE.rowOffsets || {};
  const rowOffsetsText = "{"+Object.keys(rowOffsets).filter(function(k){ return rowOffsets[k]; })
    .map(function(k){ return k+":"+rowOffsets[k]; }).join(", ")+"}";
  const tableText = "const FORM101_CHILDREN_TABLE = { firstRowTop:"+FORM101_CHILDREN_TABLE.firstRowTop+
    ", rowHeight:"+FORM101_CHILDREN_TABLE.rowHeight+", maxRows:"+FORM101_CHILDREN_TABLE.maxRows+
    ", rowOffsets:"+rowOffsetsText+" };";

  const text = fieldMapText+"\n\n"+rowText+"\n"+tableText;
  const box = document.getElementById("f101ExportBox");
  box.value = text;
  box.style.display = "block";
  box.focus();
  box.select();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(
      function(){ showToast("המיפוי (כולל טבלת הילדים) הועתק ללוח - אפשר להדביק ולשלוח."); },
      function(){ showToast("לא ניתן היה להעתיק אוטומטית - יש להעתיק ידנית מהתיבה."); }
    );
  } else {
    showToast("המיפוי מוצג בתיבה למטה - יש להעתיק ידנית (Ctrl+C).");
  }
}
/* isLastDoc קובע האם עמוד 2 מסומן כ"last" (page-break-after:auto) - נדרש
   false כאשר טופס הבנק מודפס מיד אחריו כמסמך נוסף באותה תצוגת הדפסה. */
function form101PrintFramesHtml(c,isLastDoc){
  const emp = c.employee, tc = emp.taxCredits;
  const co = CODE_TABLES.companies.find(x=>x.id===c.companyId) || {};
  const idVal = emp.idType==="id" ? emp.idNumber : emp.passportNumber;

  const kidsRows = emp.children.length ? emp.children.map(k=>
    '<tr><td>'+escapeHtml(k.name)+'</td><td>'+escapeHtml(k.idNumber)+'</td><td>'+formatDateHe(k.birthDate)+'</td><td>'+(k.inCustody?"✓":"—")+'</td><td>'+(k.receivesAllowance?"✓":"—")+'</td></tr>'
  ).join("") : '<tr><td colspan="5" style="color:#888;">לא הוזנו ילדים</td></tr>';

  const creditRows = TAX_CREDIT_META.map(meta=>{
    const val = tc[meta.key];
    const checked = (typeof val==="object")?val.checked:val;
    let extra = "";
    if(checked){
      if(meta.key==="c3") extra = " — מתאריך "+formatDateHe(val.fromDate)+", יישוב: "+escapeHtml(val.settlement);
      if(meta.key==="c11") extra = " — מספר ילדים: "+escapeHtml(val.count);
      if(meta.key==="c14") extra = " — מ-"+formatDateHe(val.startDate)+" עד "+formatDateHe(val.endDate);
      if(meta.key==="c16") extra = " — "+escapeHtml(val.days)+" ימי מילואים";
    }
    return '<div class="pf-check-item"><span class="box">'+(checked?"✓":"")+'</span><span>סעיף '+meta.num+': '+escapeHtml(meta.title)+extra+'</span></div>';
  }).join("");

  let taxCoordText = "אינו מבקש/ת תיאום מס.";
  if(emp.taxCoordination.requested){
    taxCoordText = "—";
    if(emp.taxCoordination.option==="noIncomeYet") taxCoordText = "לא הייתה הכנסה מתחילת שנת המס ועד תחילת העבודה אצל המעסיק.";
    else if(emp.taxCoordination.option==="hasOtherIncome") taxCoordText = "קיימות הכנסות נוספות ("+emp.taxCoordination.sources.length+" מקורות) — פירוט מצורף בנספח פנימי.";
    else if(emp.taxCoordination.option==="approved") taxCoordText = "פקיד השומה אישר תיאום מס לפי אישור מצורף.";
  }

  return '' +
  '<div class="print-frame">' +
    '<div class="pf-header"><div><div class="pf-title">טופס 101 — כרטיס עובד</div><div class="pf-sub">בקשה להקלה ותיאום מס על ידי המעסיק · הופק ממערכת קליטת עובדים חדשים (אב טיפוס)</div></div>' +
    '<div class="pf-sub" style="text-align:left;">שנת מס: '+c.taxYear+'<br>תאריך הפקה: '+formatDateHe(todayIso())+'</div></div>' +

    '<div class="pf-section-title">א. פרטי המעסיק</div>' +
    '<div class="pf-grid">'+pfCell("שם המעסיק",co.name)+pfCell("כתובת",co.address)+pfCell("טלפון",co.phone)+pfCell("מספר תיק ניכויים",co.deductionFileNum)+'</div>' +

    '<div class="pf-section-title">ב. פרטי העובד/ת</div>' +
    '<div class="pf-grid">'+pfCell("שם פרטי",emp.firstName)+pfCell("שם משפחה",emp.lastName)+pfCell(idTypeLabelHe(emp.idType),idVal)+pfCell("תאריך לידה",formatDateHe(emp.birthDate))+'</div>' +
    '<div class="pf-grid">'+pfCell("מין",emp.gender==="male"?"זכר":(emp.gender==="female"?"נקבה":"—"))+pfCell("מצב משפחתי",maritalLabel(emp.maritalStatus))+pfCell("תושב/ת ישראל",emp.isIsraeliResident==="yes"?"כן":(emp.isIsraeliResident==="no"?"לא":"—"))+pfCell("תאריך עלייה",formatDateHe(emp.aliyaDate))+'</div>' +
    '<div class="pf-grid">'+pfCell("רחוב ומספר בית",(emp.street||"")+" "+(emp.houseNumber||""))+pfCell("עיר/יישוב",emp.city)+pfCell("מיקוד",emp.zip)+pfCell("קיבוץ/מושב שיתופי",kibbutzLabel(emp.kibbutzMember))+'</div>' +
    '<div class="pf-grid">'+pfCell("טלפון נייד",emp.mobilePhone)+pfCell("טלפון נוסף",emp.phone2)+pfCell("דוא\"ל",emp.email)+pfCell("קופת חולים",emp.healthFundMember==="yes"?emp.healthFundName:"לא")+'</div>' +

    '<div class="pf-section-title">ג. ילדים שטרם מלאו להם 19 בשנת המס</div>' +
    '<table class="pf-kids-table"><thead><tr><th>שם</th><th>מספר זהות</th><th>תאריך לידה</th><th>בחזקה</th><th>קצבת ילדים</th></tr></thead><tbody>'+kidsRows+'</tbody></table>' +

    '<div class="pf-section-title">ד. הכנסות ממעסיק זה &nbsp;|&nbsp; ה. הכנסות אחרות</div>' +
    '<div class="pf-grid c3">'+pfCell("סוג הכנסה ממעסיק זה",incomeTypeLabel(emp.incomeType))+pfCell("תאריך תחילת עבודה בשנת המס",formatDateHe(c.startDate))+pfCell("הכנסות אחרות",emp.otherIncome.has==="yes"?("יש — "+emp.otherIncome.types.map(t=>{const o=CODE_TABLES.otherIncomeTypes.find(x=>x.id===t);return o?o.name:t;}).join(", ")):"אין")+'</div>' +

    (emp.maritalStatus==="married" ? ('' +
      '<div class="pf-section-title">ו. פרטים על בן/בת הזוג</div>' +
      '<div class="pf-grid">'+pfCell("שם פרטי",emp.spouse.firstName)+pfCell("שם משפחה",emp.spouse.lastName)+pfCell(idTypeLabelHe(emp.spouse.idType),emp.spouse.idType==="id"?emp.spouse.idNumber:emp.spouse.passportNumber)+pfCell("תאריך לידה",formatDateHe(emp.spouse.birthDate))+'</div>' +
      '<div class="pf-grid c2">'+pfCell("תאריך עלייה",formatDateHe(emp.spouse.aliyaDate))+pfCell("הכנסת בן/בת הזוג",spouseIncomeLabel(emp.spouse.incomeStatus))+'</div>'
    ) : '') +
    '<div class="pf-note">עמוד 1 מתוך 2 — טופס 101, שנת מס '+c.taxYear+'. מסמך זה הוא הדמיה ויזואלית לצורכי אב טיפוס בלבד ואינו מהווה טופס רשמי של רשות המסים.</div>' +
  '</div>' +

  '<div class="print-frame'+(isLastDoc?" last":"")+'">' +
    '<div class="pf-header"><div class="pf-title">טופס 101 — המשך (עמוד 2)</div><div class="pf-sub" style="text-align:left;">שנת מס '+c.taxYear+'</div></div>' +
    '<div class="pf-section-title">ח. פטור או זיכוי ממס</div>' +
    '<div class="pf-check-list">'+creditRows+'</div>' +
    '<div class="pf-section-title">ט. תיאום מס</div>' +
    '<div class="pf-grid"><div class="pf-cell" style="grid-column:span 4;"><span class="pf-val">'+escapeHtml(taxCoordText)+'</span></div></div>' +
    '<div class="pf-section-title">י. הצהרה</div>' +
    '<div style="font-size:10.5px;padding:6px 2px;">אני מצהיר/ה כי הפרטים שמסרתי בטופס זה הינם מלאים ונכונים. ידוע לי שהשמטה או מסירת פרטים לא נכונים הינה עבירה על פקודת מס הכנסה. אני מתחייב/ת להודיע למעסיק על כל שינוי שיחול בפרטיי האישיים תוך שבוע ימים מתאריך השינוי.</div>' +
    '<div class="pf-sig-row">' +
      '<div class="pf-sig-box">חתימת העובד/ת (חתימה פיזית לאחר הדפסה)</div>' +
      '<div class="pf-sig-box">תאריך: ______________</div>' +
    '</div>' +
    '<div class="pf-note">עמוד 2 מתוך 2 — טופס 101, שנת מס '+c.taxYear+'. מסמך זה הוא הדמיה ויזואלית לצורכי אב טיפוס בלבד ואינו מהווה טופס רשמי של רשות המסים.</div>' +
  '</div>';
}

/* ============================================================
   17. הפקת טופס פרטי חשבון בנק — תצוגת הדפסה
   ============================================================ */
function renderPrintBank(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  return printToolbar(c.id,"case-home","טופס פרטי חשבון בנק — תצוגת הדפסה") + bankPrintFrameHtml(c,true);
}
function bankPrintFrameHtml(c,isLastDoc){
  const emp = c.employee, b = c.bank;
  const idVal = emp.idType==="id" ? emp.idNumber : emp.passportNumber;
  return '' +
  '<div class="print-frame'+(isLastDoc?" last":"")+'">' +
    '<div class="pf-header"><div><div class="pf-title">פרטי חשבון בנק להעברת משכורת</div>' +
    '<div class="pf-sub">הופק ממערכת קליטת עובדים חדשים (אב טיפוס)</div></div>' +
    '<div class="pf-sub" style="text-align:left;">תאריך הפקה: '+formatDateHe(todayIso())+'</div></div>' +

    '<div class="pf-section-title">פרטי העובד/ת</div>' +
    '<div class="pf-grid">'+pfCell("שם פרטי",emp.firstName)+pfCell("שם משפחה",emp.lastName)+pfCell("סוג זיהוי",idTypeLabelHe(emp.idType))+pfCell(idTypeLabelHe(emp.idType),idVal)+'</div>' +
    '<div class="pf-grid c2">'+pfCell("טלפון נייד",emp.mobilePhone)+pfCell("חברה מעסיקה",companyName(c.companyId))+'</div>' +

    '<div class="pf-section-title">פרטי חשבון הבנק</div>' +
    /* קוד בנק וקוד סניף מוצגים כאן כמחרוזת טקסט כפי שהם נשמרים במודל
       (b.bankCode / b.branchCode) - ללא כל המרה מספרית - כך שאפס מוביל
       (למשל "027") מוצג במלואו גם בתצוגת ההדפסה. */
    '<div class="pf-grid">'+pfCell("שם הבנק",bankName(b.bankCode))+pfCell("קוד בנק",b.bankCode)+pfCell("שם הסניף",branchName(b.bankCode,b.branchCode))+pfCell("קוד סניף",b.branchCode)+'</div>' +
    '<div class="pf-grid c2">'+pfCell("מספר חשבון",b.accountNumber)+pfCell("אושר על ידי העובד/ת",b.confirmed?"כן":"לא")+'</div>' +

    '<div class="pf-section-title">הצהרת העובד/ת</div>' +
    '<div style="font-size:10.5px;padding:6px 2px;display:flex;align-items:center;gap:6px;">' +
      '<input type="checkbox" '+(b.confirmed?"checked":"")+' disabled>' +
      '<span>אני מאשר/ת כי פרטי החשבון שמסרתי לעיל נכונים, ומבקש/ת להעביר אליו את תשלומי המשכורת המגיעים לי ממעסיקי.</span>' +
    '</div>' +
    '<div class="pf-note">מסמך זה אינו מהווה טופס בנקאי רשמי.</div>' +
  '</div>';
}

/* ============================================================
   17-ב. הפקה משולבת — טופס 101 (ללא פרטי בנק) + טופס פרטי חשבון בנק,
   כאשר העובד/ת בחר/ה להשלים את פרטי הבנק מיד עם טופס 101
   ============================================================ */
function renderPrintCombined(){
  const c = currentCase();
  if(!c) return '<div class="empty-state">תיק לא נמצא.</div>';
  return printToolbar(c.id,"case-home","טופס 101 ופרטי חשבון בנק — תצוגת הדפסה") +
    form101PrintFramesHtml(c,false) +
    bankPrintFrameHtml(c,true);
}

/* ============================================================
   18. אתחול
   ============================================================ */
/* עדכון בזמן אמת בין טאבים: אם טאב אחר (למשל טאב העובד/ת שנפתח בנפרד)
   שינה נתונים ושמר אותם, הטאב הזה טוען אותם מחדש ומרענן את המסך. */
window.addEventListener("storage", function(e){
  if(e.key===DB_STORAGE_KEY){
    loadDB();
    restoreSeqFromDB();
    render();
  }
});
/* Escape סוגר חלונות Modal פנימיים של המערכת (למשל "הוספת חברה") - בלי
   להשתמש בדיאלוגים של הדפדפן. אם מוצג אישור "לצאת בלי לשמור" מעל
   החלון, Escape סוגר קודם אותו (חוזר לעריכה) ולא את כל החלון בבת אחת. */
document.addEventListener("keydown", function(e){
  if(e.key!=="Escape") return;
  if(ui.companyModalDraft){
    if(ui.companyModalLeaveConfirm) cancelDiscardCompanyModal();
    else closeCompanyModalRequest();
  } else if(ui.worksiteModalDraft){
    if(ui.worksiteModalLeaveConfirm) cancelDiscardWorksiteModal();
    else closeWorksiteModalRequest();
  } else if(ui.companyDeleteId){
    cancelDeleteCompany();
  } else if(ui.worksiteDeleteId){
    cancelDeleteWorksite();
  } else if(ui.hrBulkDeleteConfirmOpen){
    cancelBulkDeleteCases();
  }
});

document.addEventListener("DOMContentLoaded", function(){
  // אם הכתובת נפתחה עם employeeCase=<מזהה תיק> (כך נפתח הטאב הנפרד
  // למילוי עצמי - ראו openEmployeeFillTab) - עולים ישירות למסך מילוי
  // העובד/ת עבור אותו תיק בלבד, ללא כל גישה למסכי משאבי אנוש.
  const params = new URLSearchParams(location.search);
  const empCaseId = params.get("employeeCase");
  if(empCaseId && getCase(empCaseId)){
    ui.mode = "employee";
    ui.currentCaseId = empCaseId;
    ui.screen = params.get("screen") || "checklist";
  }
  // מצב כיול לתצוגת ההדפסה הרשמית של טופס 101 (ר' form101FieldMap.js) -
  // מיועד לפיתוח בלבד, מופעל אך ורק דרך פרמטר URL מפורש.
  if(params.get("calibrate101")==="1") FORM101_CALIBRATE = true;
  // עורך המיפוי האינטראקטיבי (גרירה/שינוי גודל) - גם הוא לפיתוח בלבד
  // ומופעל רק דרך פרמטר URL נפרד, בלי לגעת בדגל הכיול הבסיסי עצמו.
  if(params.get("editform101")==="1") FORM101_EDIT_MODE = true;
  render();
});

