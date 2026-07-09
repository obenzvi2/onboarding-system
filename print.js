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
  return printToolbar(c.id,"case-home","טופס 101 — תצוגת הדפסה") + form101PrintFramesHtml(c,true);
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
    '<div style="font-size:10.5px;padding:6px 2px;">אני מאשר/ת כי פרטי החשבון שמסרתי לעיל נכונים, ומבקש/ת להעביר אליו את תשלומי המשכורת המגיעים לי ממעסיקי.</div>' +

    '<div class="pf-sig-row">' +
      '<div class="pf-sig-box">חתימת העובד/ת (חתימה פיזית לאחר הדפסה)</div>' +
      '<div class="pf-sig-box">תאריך חתימה: ______________</div>' +
    '</div>' +
    '<div class="pf-note">מסמך זה הוא הדמיה ויזואלית לצורכי אב טיפוס בלבד ואינו מהווה טופס בנקאי רשמי.</div>' +
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
  render();
});

