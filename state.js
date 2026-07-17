"use strict";

/* ============================================================
   3. מודל הנתונים + נתוני דמה
   ============================================================ */
let SEQ = 1000;
function nextId(prefix){ return prefix + (SEQ++); }

function emptyChild(){
  return {id:nextId("kid"),name:"",idNumber:"",birthDate:"",inCustody:false,receivesAllowance:false};
}

function emptyEmployee(){
  return {
    firstName:"",lastName:"",
    idType:"id", idNumber:"", passportNumber:"",
    birthDate:"", gender:"", maritalStatus:"",
    isIsraeliResident:"", aliyaDate:"",
    kibbutzMember:"",
    healthFundMember:"", healthFundName:"",
    mobilePhone:"", phone2:"", email:"",
    street:"", houseNumber:"", city:"", zip:"",
    incomeType:"",
    otherIncome:{ has:"", types:[], creditPointsLocation:"", noHishtalmutDeposits:false, noPensionDeposits:false },
    spouse:{ firstName:"",lastName:"",idType:"id",idNumber:"",passportNumber:"",birthDate:"",aliyaDate:"",incomeStatus:"" },
    children:[],
    taxCredits:{
      c1:false,c2a:false,c2b:false,
      c3:{checked:false,fromDate:"",settlement:""},
      c4:{checked:false,fromDate:"",noIncomeUntilDate:""},
      c5:false,c6:false,
      c7:{checked:false,bornThisYear:"",age1to2:"",age3:"",age4to5:"",age6to17:"",age18:""},
      c8:{checked:false,bornThisYear:"",age1to2:"",age3:"",age4to5:"",age6to17:""},
      c9:false,c10:false,
      c11:{checked:false,count:""},
      c12:false,c13:false,
      c14:{checked:false,startDate:"",endDate:""},
      c15:false,
      c16:{checked:false,days:""}
    },
    taxCoordination:{ requested:false, option:"", sources:[] },
    declarationAccepted:false,
    form101Status:"pending", // pending | completed
    form101CompletedAt:null
  };
}

function emptyBank(){
  // bankCode / branchCode הם תמיד מחרוזות טקסט (ראו כלל עסקי בראש קובץ
  // הנתונים BANK_BRANCHES_DATA) - כדי שאפס מוביל בקוד סניף (כגון "027")
  // לא יאבד. אין להמיר את השדות הללו למספר בשום שלב.
  return { bankCode:"", branchCode:"", accountNumber:"", confirmed:false, status:"pending", completedAt:null, deferred:false };
}

function buildDocuments(caseObj){
  // בונה רשימת מסמכים דינמית לפי תשובות העובד
  const emp = caseObj.employee;
  const docs = [];
  if(emp.idType === "id"){
    docs.push({key:"id_copy",label:"צילום תעודת זהות וספח",status:"missing"});
  } else {
    docs.push({key:"passport_copy",label:"צילום דרכון ואישור/רישיון שהייה",status:"missing"});
  }
  docs.push({key:"form101_signed",label:"טופס 101 חתום",status: emp.form101Status==="completed" ? "missing" : "missing"});
  if(caseObj.needsBankForm){
    docs.push({key:"bank_form_signed",label:"טופס פרטי חשבון בנק חתום",status:"missing"});
  }
  const tc = emp.taxCredits;
  TAX_CREDIT_META.forEach(meta=>{
    if(!meta.document) return;
    const val = tc[meta.key];
    const checked = (typeof val === "object") ? val.checked : val;
    if(checked){
      docs.push({key:"doc_"+meta.key,label:meta.document + " (סעיף "+meta.num+")",status:"missing"});
    }
  });
  if(emp.taxCoordination && emp.taxCoordination.option==="hasOtherIncome" && emp.taxCoordination.sources.length){
    docs.push({key:"doc_taxcoord_slip",label:"תלוש שכר או אסמכתא רלוונטית (הכנסות נוספות)",status:"missing"});
  }
  if(emp.taxCoordination && emp.taxCoordination.option==="approved"){
    docs.push({key:"doc_taxcoord_approval",label:"אישור תיאום מס מפקיד השומה",status:"missing"});
  }
  return docs;
}

function emptyCase(){
  return {
    id:nextId("case"),
    taxYear:2026, companyId:"", worksiteId:"",
    departmentId:"", subDepartmentId:"", rankId:"", gradeId:"",
    startDate:"", formLanguage:"he",
    needsForm101:true, needsBankForm:true,
    formSelection: defaultFormSelection(),
    checklist: defaultChecklistState(),
    checklistData: {emailAccess:{date:""}}, // אחסון שדות ספציפיים לטופסי צ'ק-ליסט בודדים שקיבלו תוכן אמיתי (ר' renderEmailAccessForm)
    createdAt:new Date().toISOString(),
    employee:emptyEmployee(),
    bank:emptyBank(),
    documents:[],
    exportHistory:[] // batchIds
  };
}

const DB = {
  cases:[],
  batches:[],
  currentUser:"אורלי בן צבי"
};

/* ============================================================
   שמירה מתמשכת (localStorage) — כדי שנתוני התיקים ישרדו רענון דף,
   ויהיו משותפים בין הטאב של משאבי אנוש לטאב הנפרד שנפתח לעובד/ת
   למילוי טופס 101 (ראו openEmployeeFillTab).
   ============================================================ */
const DB_STORAGE_KEY = "hr_onboarding_app_db_v1";
/* קידוד הקודים (שיקלולית/מערכת כחולה) של שדות טבלת הקוד (ר' CODED_FIELDS) -
   רק {id, shikulitCode, blueCode} לכל ערך, כדי לא לשמור עותק כפול של כל
   הרשומה (שם, tooltip וכו') שממילא מוגדרים בקוד עצמו. */
function collectCodedFieldsSnapshot(){
  const out = {};
  CODED_FIELDS.forEach(f=>{
    out[f.key] = CODE_TABLES[f.key].map(item=>({id:item.id, shikulitCode:item.shikulitCode||"", blueCode:item.blueCode||""}));
  });
  return out;
}
function applyCodedFieldsSnapshot(snapshot){
  if(!snapshot) return;
  CODED_FIELDS.forEach(f=>{
    const saved = snapshot[f.key];
    if(!saved) return;
    saved.forEach(s=>{
      const item = CODE_TABLES[f.key].find(x=>x.id===s.id);
      if(item){ item.shikulitCode = s.shikulitCode||""; item.blueCode = s.blueCode||""; }
    });
  });
}
function saveDB(){
  try{
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify({cases:DB.cases,batches:DB.batches,currentUser:DB.currentUser,companies:CODE_TABLES.companies,worksites:CODE_TABLES.worksites,codedFields:collectCodedFieldsSnapshot()}));
  }catch(e){ /* אם localStorage חסום (למשל דפדפן בפרטיות מלאה) - ממשיכים בלי שמירה */ }
}
function loadDB(){
  try{
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);
    DB.cases = parsed.cases||[];
    DB.batches = parsed.batches||[];
    if(parsed.currentUser) DB.currentUser = parsed.currentUser;
    if(parsed.companies) CODE_TABLES.companies = parsed.companies;
    if(parsed.worksites) CODE_TABLES.worksites = parsed.worksites;
    applyCodedFieldsSnapshot(parsed.codedFields);
    DB.cases.forEach(migrateCaseTaxCredits);
    DB.cases.forEach(migrateCaseChecklist);
    return true;
  }catch(e){ return false; }
}
/* מיגרציה: תיקים שנשמרו לפני שנוסף צ'ק ליסט 11 הטפסים לא מחזיקים בכלל
   formSelection/checklist, או שנשמרו כשהרשימה הכילה פחות טפסים ממה
   שקיים כרגע ב-FORM_CHECKLIST_DEFS. משלימים ברירת מחדל (רלוונטי/לא
   הושלם) כדי שהתיק הישן ימשיך לעבוד עם המסכים החדשים בלי לאבד מידע. */
function migrateCaseChecklist(caseObj){
  if(!caseObj) return;
  if(!caseObj.formSelection){
    caseObj.formSelection = Object.assign(defaultFormSelection(), {form101:!!caseObj.needsForm101, bank:!!caseObj.needsBankForm});
  } else {
    FORM_CHECKLIST_DEFS.forEach(d=>{ if(!(d.key in caseObj.formSelection)) caseObj.formSelection[d.key]=true; });
  }
  if(!caseObj.checklist) caseObj.checklist = defaultChecklistState();
  else FORM_CHECKLIST_DEFS.forEach(d=>{ if(d.kind==="generic" && !(d.key in caseObj.checklist)) caseObj.checklist[d.key]=false; });
  if(!caseObj.checklistData) caseObj.checklistData = {};
  if(!caseObj.checklistData.emailAccess) caseObj.checklistData.emailAccess = {date:""};
  /* מיגרציה: תיקים שנשמרו לפני שנאכף האינווריאנט "הושלם רק אם יש
     חתימה בפועל" (למשל תיקי הדמו הישנים, שסימנו את כל הצ'ק-ליסט כ-true
     גורף) - מבטלת סימון "הושלם" בטופסי חתימה דיגיטלית שאין להם בפועל
     תאריך+חתימה שמורים, כדי שהמצב המוצג יתאים למציאות (ר' SIGNED_CHECKLIST_KEYS). */
  SIGNED_CHECKLIST_KEYS.forEach(key=>{
    if(!caseObj.checklist[key]) return;
    const data = caseObj.checklistData[key];
    if(!data || !data.date || !data.signature) caseObj.checklist[key] = false;
  });
}
/* מיגרציה: תיקים שנשמרו לפני שסעיף 4 (עולה חדש/ה) קיבל שדות תאריך
   נוספים החזיקו בו ערך בוליאני (true/false) בלבד. יש להמיר אותו למבנה
   אובייקט {checked,fromDate,noIncomeUntilDate} כדי שלא "ייתקע" מסומן
   כלא מסומן ולא ניתן לשינוי. */
function migrateCaseTaxCredits(caseObj){
  const tc = caseObj && caseObj.employee && caseObj.employee.taxCredits;
  if(!tc) return;
  if(typeof tc.c4 !== "object" || tc.c4===null){
    tc.c4 = {checked: !!tc.c4, fromDate:"", noIncomeUntilDate:""};
  }
  if(typeof tc.c7 !== "object" || tc.c7===null){
    tc.c7 = {checked: !!tc.c7, bornThisYear:"", age1to2:"", age3:"", age4to5:"", age6to17:"", age18:""};
  }
  if(typeof tc.c8 !== "object" || tc.c8===null){
    tc.c8 = {checked: !!tc.c8, bornThisYear:"", age1to2:"", age3:"", age4to5:"", age6to17:""};
  }
}

/* מפתחות הצ'ק-ליסט שדורשים חתימה דיגיטלית ממשית (ר' signaturePadHtml
   ב-render.js) - עבור אלה יש לשמור על האינווריאנט: checklist[key]===true
   רק אם checklistData[key] מכיל date+signature בפועל (זו בדיוק הבדיקה
   שמבצע כפתור "סיימתי" בכל טופס כזה - ר' canFinish בכל renderXxxForm).
   אחרת נוצר מצב מטעה שבו הטופס מוצג כ"הושלם" למרות שדה החתימה ריק - ר'
   migrateSignedChecklistItems למטה, שמתקנת תיקים קיימים שנשמרו לפני
   שהאינווריאנט הזה נאכף (וכן דואגת שנתוני הדמו למטה לא יפרו אותו). */
const SIGNED_CHECKLIST_KEYS = ["pensionConfirm","safety","lockerCheck","emailAccess","dataConsent","polygraph"];
function seedData(){
  // תיק 1: הושלם במלואו, מוכן ליצוא
  const c1 = emptyCase();
  c1.taxYear=2026; c1.companyId="c1"; c1.worksiteId="w1";
  c1.startDate="2026-06-01";
  Object.assign(c1.employee,{
    firstName:"נועה",lastName:"כהן-אביב",idType:"id",idNumber:"203456793",
    birthDate:"1994-03-11",gender:"female",maritalStatus:"married",
    isIsraeliResident:"yes",kibbutzMember:"no",
    healthFundMember:"yes",healthFundName:"כללית",
    mobilePhone:"050-1234567",email:"noa.example@mail.com",
    street:"הרצל",houseNumber:"14",city:"חיפה",zip:"3200011",
    incomeType:"monthly",
    declarationAccepted:true, form101Status:"completed", form101CompletedAt:new Date().toISOString()
  });
  c1.employee.otherIncome.has="no";
  c1.employee.spouse = {firstName:"איתי",lastName:"כהן-אביב",idType:"id",idNumber:"301234571",passportNumber:"",birthDate:"1991-07-02",aliyaDate:"",incomeStatus:"has"};
  c1.employee.children=[{id:nextId("kid"),name:"עדן",idNumber:"405678913",birthDate:"2019-05-01",inCustody:true,receivesAllowance:true}];
  c1.employee.taxCredits.c1=true;
  c1.employee.taxCredits.c7={checked:true,bornThisYear:"0",age1to2:"0",age3:"0",age4to5:"0",age6to17:"1",age18:"0"};
  c1.bank = {bankCode:"12",branchCode:"600",accountNumber:"123456",confirmed:true,status:"completed",completedAt:new Date().toISOString()};
  // טפסי חתימה דיגיטלית (SIGNED_CHECKLIST_KEYS) לא מסומנים כאן כ"הושלמו" -
  // ר' הערה מעל SIGNED_CHECKLIST_KEYS: אסור לסמן טופס כהושלם בלי חתימה
  // בפועל, ולכן גם בתיק דמו זה יש לחתום עליהם דרך המסך כדי לסמנם.
  Object.keys(c1.checklist).forEach(k=>{ if(!SIGNED_CHECKLIST_KEYS.includes(k)) c1.checklist[k]=true; });
  c1.documents = buildDocuments(c1);
  c1.documents.forEach(d=>d.status="delivered");
  DB.cases.push(c1);

  // תיק 2: ממתין למילוי טופס 101 ע"י העובד
  const c2 = emptyCase();
  c2.taxYear=2026; c2.companyId="c2"; c2.worksiteId="w3";
  c2.startDate="2026-07-06";
  Object.assign(c2.employee,{firstName:"דניאל",lastName:"לוי",idType:"id",idNumber:""});
  c2.documents = buildDocuments(c2);
  DB.cases.push(c2);

  // תיק 3: טופס 101 הושלם, טופס בנק חסר
  const c3 = emptyCase();
  c3.taxYear=2026; c3.companyId="c1"; c3.worksiteId="w2";
  c3.startDate="2026-06-15";
  Object.assign(c3.employee,{
    firstName:"מיכאל",lastName:"פרץ",idType:"id",idNumber:"111222345",
    birthDate:"1988-01-20",gender:"male",maritalStatus:"single",
    isIsraeliResident:"yes",kibbutzMember:"no",healthFundMember:"yes",healthFundName:"מכבי",
    mobilePhone:"052-9988776",email:"michael.p@mail.com",
    street:"ויצמן",houseNumber:"5",city:"קריית ים",zip:"",
    incomeType:"monthly",declarationAccepted:true,form101Status:"completed",form101CompletedAt:new Date().toISOString()
  });
  c3.employee.otherIncome.has="no";
  c3.employee.taxCredits.c1=true;
  Object.assign(c3.checklist,{terms:true,insurance:true});
  c3.documents = buildDocuments(c3);
  c3.documents[0].status="delivered";
  DB.cases.push(c3);

  // תיק 4: הושלם והוצא לשיקלולית, נדרש יצוא מחדש
  const c4 = emptyCase();
  c4.taxYear=2026; c4.companyId="c3"; c4.worksiteId="w5";
  c4.startDate="2026-05-20";
  Object.assign(c4.employee,{
    firstName:"שרה",lastName:"מזרחי",idType:"id",idNumber:"305678138",
    birthDate:"1979-09-09",gender:"female",maritalStatus:"divorced",
    isIsraeliResident:"yes",kibbutzMember:"no",healthFundMember:"yes",healthFundName:"לאומית",
    mobilePhone:"054-3322110",email:"sara.m@mail.com",
    street:"הנמל",houseNumber:"2",city:"אשדוד",zip:"",
    incomeType:"monthly",declarationAccepted:true,form101Status:"completed",form101CompletedAt:new Date().toISOString()
  });
  c4.employee.otherIncome.has="no";
  c4.employee.children=[{id:nextId("kid"),name:"תום",idNumber:"411112238",birthDate:"2015-02-10",inCustody:true,receivesAllowance:true}];
  c4.employee.taxCredits.c1=true; c4.employee.taxCredits.c6=true;
  c4.employee.taxCredits.c7={checked:true,bornThisYear:"0",age1to2:"0",age3:"0",age4to5:"0",age6to17:"1",age18:"0"};
  c4.bank={bankCode:"10",branchCode:"800",accountNumber:"998877",confirmed:true,status:"completed",completedAt:new Date().toISOString()};
  Object.keys(c4.checklist).forEach(k=>{ if(!SIGNED_CHECKLIST_KEYS.includes(k)) c4.checklist[k]=true; });
  c4.documents = buildDocuments(c4);
  c4.documents.forEach(d=>d.status="delivered");
  DB.cases.push(c4);

  // אצווה קיימת לדוגמה
  DB.batches.push({
    id:nextId("batch"), target:"shikulit", companyId:"c3",
    employeeIds:[c4.id], createdAt:"2026-06-25T09:14:00", createdBy:"אורלי בן צבי",
    sendStatus:"נשלח", importStatus:"נדרש יצוא מחדש"
  });
}
/* לאחר טעינת נתונים שמורים מ-localStorage, יש לוודא ש-SEQ (מונה
   המזהים החדשים) ממשיך מהמספר הגבוה ביותר שכבר קיים בנתונים -
   אחרת SEQ מתחיל תמיד מ-1000 מחדש בכל טעינת דף, ומזהה של תיק חדש
   (case1000) מתנגש עם המזהה של תיק הדוגמה הראשון (נועה), וגורם
   ל-getCase להחזיר בטעות את התיק הישן במקום את התיק החדש. */
function restoreSeqFromDB(){
  let maxNum = SEQ - 1;
  function scan(val){
    if(val==null) return;
    if(typeof val === "string"){
      const m = val.match(/^[a-zA-Z]+(\d+)$/);
      if(m){
        const n = parseInt(m[1],10);
        if(n > maxNum) maxNum = n;
      }
    } else if(Array.isArray(val)){
      val.forEach(scan);
    } else if(typeof val === "object"){
      Object.keys(val).forEach(k=>scan(val[k]));
    }
  }
  scan(DB.cases);
  scan(DB.batches);
  SEQ = maxNum + 1;
}
if(!loadDB()){
  seedData();
  saveDB();
} else {
  restoreSeqFromDB();
}
function getCase(id){ return DB.cases.find(c=>c.id===id); }
function currentCase(){ return getCase(ui.currentCaseId); }
function companyName(id){ const c=CODE_TABLES.companies.find(x=>x.id===id); return c?c.name:""; }
function worksiteName(id){ const w=CODE_TABLES.worksites.find(x=>x.id===id); return w?w.name:""; }
function departmentName(id){ const d=CODE_TABLES.departments.find(x=>x.id===id); return d?d.name:""; }
function subDepartmentName(id){ const s=CODE_TABLES.subDepartments.find(x=>x.id===id); return s?s.name:""; }
function rankName(id){ const r=CODE_TABLES.ranks.find(x=>x.id===id); return r?r.name:""; }
function gradeName(id){ const g=CODE_TABLES.grades.find(x=>x.id===id); return g?g.name:""; }
function bankName(code){ return BankBranchesService.getBankName(code); }
function branchName(bankCode,branchCode){ return BankBranchesService.getBranchName(bankCode,branchCode); }
