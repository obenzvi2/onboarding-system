"use strict";

/* ============================================================
   תרגומי טופס 101 - מילון שטוח בלבד, ללא מבנה מקונן. כל תרגום נופל
   בחזרה לעברית (heFallback) אם השפה הנבחרת היא עברית, או אם המפתח
   עדיין לא קיים במילון של השפה הנבחרת (כך שאפשר למלא את המילון
   בהדרגה, section אחר section, בלי לשבור את המסך באמצע העבודה).
   ר' tr() ב-render.js לפונקציית החיפוש עצמה.
   ============================================================ */
const FORM101_I18N = {
  en: {
    // --- Disclaimer (ר' form101DisclaimerHtml/renderForm101 - חוסם את
    //     שאר הטופס בכל שפה שאינה עברית עד לסימון "I understand") ---
    disclaimer_title: "Disclaimer",
    disclaimer_p1: "This English version is an informal translation provided to help you fill out the form. Everything you enter is still recorded and printed only on the original Hebrew Form 101 — that Hebrew document is the sole official version and serves as your declaration to the employer.",
    disclaimer_p2: "We've done our best to keep this translation accurate, but it may contain errors, so rely on the Hebrew form for anything unclear.",
    disclaimer_p3: "If you have questions, HR is available to help you fill out the form.",
    disclaimer_understand: "I understand",

    // --- מתג שפה / ניווט עוגן ---
    anchor_employer: "Employer",
    anchor_employee: "Employee details",
    anchor_children: "Children",
    anchor_incomeFromEmployer: "Income from this employer",
    anchor_otherIncome: "Other income",
    anchor_spouse: "Spouse",
    anchor_changesDuringYear: "Changes during the year",
    anchor_taxExemption: "Tax exemption / credit",
    anchor_taxCoordination: "Tax coordination",
    anchor_declaration: "Declaration",

    // --- כותרת עמוד / כפתורים כלליים ---
    back_to_case: "Back to case",
    back_to_forms_list: "Back to forms list",
    form101_title: "Employee Card (Form 101)",
    form101_pageDesc: "Fill in every field marked with a red asterisk. Fields with a blue question mark can be clicked for an explanation.",
    error_summary_template: "Found {n} errors to fix:",

    // --- סעיף א: פרטי המעסיק ---
    sec_a_title: "Employer Details (read-only)",
    employer_name_label: "Employer name:",
    employer_address_label: "Address:",
    employer_phone_label: "Phone number:",
    employer_deductionFile_label: "Deductions file number:",

    // --- ערכים גנריים חוזרים ---
    yes: "Yes",
    no: "No",

    // --- סעיף ב: פרטי העובד/ת ---
    sec_b_title: "Employee Details",
    f101_firstName_ro_label: "First name",
    f101_lastName_ro_label: "Last name",
    f101_idType_ro_label: "Identify by",
    id_type_id: "ID card",
    id_type_passport: "Foreign passport",
    id_number_label: "ID number",
    passport_number_label: "Passport number",
    f101_birthDate_label: "Date of birth",
    f101_aliyaDate_label: "Date of Aliyah",
    sec_b_idHint: "Name, ID type and ID/passport number were provided when the case was opened and cannot be edited here.",
    f101_city_label: "City",
    f101_street_label: "Street",
    f101_houseNumber_label: "House number",
    f101_zip_label: "Postal code",
    f101_mobilePhone_label: "Mobile number",
    f101_phone2_label: "Additional phone number",
    f101_email_label: "Email address",
    f101_gender_label: "Sex",
    gender_male: "Male",
    gender_female: "Female",
    f101_maritalStatus_label: "Marital status",
    maritalStatus_single: "Single",
    maritalStatus_married: "Married",
    maritalStatus_divorced: "Divorced",
    maritalStatus_widowed: "Widowed",
    maritalStatus_separated: "Separated",
    sec_b_separatedHint: "A tax assessor's approval must be attached.",
    f101_isIsraeliResident_label: "Israeli resident",
    f101_kibbutzMember_label: "Kibbutz / collective moshav member",
    sec_b_kibbutzTransferLabel: "My income from this employer is transferred to the kibbutz",
    sec_b_kibbutzTransferTooltip: "If the salary from this employer is paid directly to the kibbutz or collective moshav (rather than to you personally), choose \"Yes\".",
    f101_healthFundMember_label: "Health fund member",
    sec_b_healthFundNameLabel: "Health fund name",
    healthFund_clalit: "Clalit",
    healthFund_maccabi: "Maccabi",
    healthFund_meuhedet: "Meuhedet",
    healthFund_leumit: "Leumit",

    // --- סעיף ג: ילדים ---
    sec_c_title: "Children who have not yet turned 19 during the tax year",
    add_child_btn: "Add child",
    kid_card_prefix: "Child",
    remove_child_title: "Remove child",
    f101_kid_name_label: "Name",
    f101_kid_idNumber_label: "ID number (9 digits)",
    f101_kid_birthDate_label: "Date of birth",
    kid_inCustody_label: "The child is in my custody",
    kid_receivesAllowance_label: "I receive child allowance for them from the National Insurance Institute",
    max_children_reached: "You have reached the maximum of 10 children.",

    // --- סעיף ד: הכנסה ממעסיק זה ---
    sec_d_title: "Details of My Income from This Employer",
    sec_d_incomeType_label: "I receive",
    incomeType_monthly: "Monthly salary",
    incomeType_additional: "Salary for an additional position",
    incomeType_partial: "Partial salary",
    incomeType_daily: "Wages, daily worker",
    incomeType_pension: "Pension",
    incomeType_scholarship: "Scholarship",
    incomeType_monthly_tooltip: "Salary for work of no less than 18 days a month.",
    incomeType_additional_tooltip: "Salary for work of more than 5 hours a day, in addition to a salary and/or a taxable pension from another source. The employee may choose the workplace at which their salary is treated as \"salary for an additional position\".",
    incomeType_partial_tooltip: "Salary for work of 5 hours or less a day, or for work of more than 5 hours a day but less than 8 hours a week. Tax is withheld from a partial salary at the maximum rate unless it is the only income, in which case tax is withheld per the deduction tables.",
    incomeType_daily_tooltip: "Salary for work of less than 18 days a month but no less than 8 hours a week. Tax is withheld from wages per the daily table unless it is the only income, in which case tax is withheld per the deduction tables.",
    incomeType_pension_tooltip: "A pension exempt from National Insurance and a survivors' pension that is fully exempt need not be reported.",
    f101_startDate_label: "Start date of work in the tax year",
    sec_d_startDateTooltip: "The tax year is the calendar year, i.e. the year that begins on January 1st and ends on December 31st. If you have worked at the same place continuously since the previous year, your start date for the tax year is January 1st of the current year.",
    sec_d_additionalIncomeWarningTitle: "Note!",
    sec_d_additionalIncomeWarning: "Since you indicated this is an additional salary for you, you must arrange tax coordination and submit it to the employer, otherwise tax will be withheld from your pay at the maximum rate, about 48%.<br>Tax coordination can be arranged online by submitting Form 116 to the tax assessor, or in section I of this form.<br>If you already have an approval from the tax assessor, please give it to HR.<br>If you do not yet have an approval from the tax assessor, please forward it to HR before the first payroll is prepared.<br>If this is unclear to you, please contact the employer.",

    // --- סעיף ה: הכנסות אחרות ---
    sec_e_title: "Details of Other Income",
    sec_e_hasOtherIncome_label: "Do you have other income from salary?",
    sec_e_hasOtherIncome_no: "I have no other income from salary, pension, or scholarship",
    sec_e_hasOtherIncome_yes: "I have other income",
    sec_e_typesLabel: "Income details",
    otherIncomeType_monthly: "Monthly salary",
    otherIncomeType_additional: "Salary for an additional position",
    otherIncomeType_partial: "Partial salary",
    otherIncomeType_daily: "Wages",
    otherIncomeType_pension: "Pension",
    otherIncomeType_scholarship: "Scholarship",
    otherIncomeType_other: "Other income",
    sec_e_creditPointsLabel: "Credit points",
    sec_e_creditPointsHere: "I request to receive credit points and tax brackets against this income (section D). I do not receive them against other income.",
    sec_e_creditPointsOther: "I receive credit points and tax brackets against other income, and am therefore not entitled to them against this income.",
    sec_e_depositsLabel: "Deposits",
    sec_e_noHishtalmutDeposits: "No deposits are made for me to a training fund (\"keren hishtalmut\") for my other income, or all employer deposits to a training fund for my other income are included in that other income.",
    sec_e_noPensionDeposits: "No deposits are made for me to a pension / loss-of-working-capacity insurance / severance pay for my other income, or all employer deposits of this kind for my other income are included in that other income.",

    // --- סעיף ו: בן/בת זוג ---
    sec_f_title: "Spouse Details",
    sec_f_notMarriedHint: "This section is only relevant if you are married.",
    f101_spouse_firstName_label: "First name",
    f101_spouse_firstName_hint: "As it appears on the ID card.",
    f101_spouse_lastName_label: "Last name",
    f101_spouse_lastName_hint: "As it appears on the ID card.",
    f101_spouse_idType_label: "Identify by",
    f101_spouse_idNumber_label: "ID number (9 digits)",
    f101_spouse_passportNumber_label: "Passport number",
    f101_spouse_birthDate_label: "Date of birth",
    f101_spouse_aliyaDate_label: "Date of Aliyah",
    f101_spouse_incomeStatus_label: "Income",
    spouseIncome_none: "The spouse has no income",
    spouseIncome_has: "The spouse has income",

    // --- סעיף ז: שינויים במהלך השנה ---
    sec_g_title: "Changes During the Year",
    sec_g_body: "Any change in the details you filled in on this form must be reported to the employer within seven days of the date of the change, by filling out a new form in this system or by any other means the employer allows.",

    // --- סעיף ח: 16 כרטיסי פטור/זיכוי ממס ---
    sec_h_title: "Tax Exemption or Credit",
    document_required_prefix: "Document required:",

    cred_c1_title: "I am an Israeli resident",
    cred_c1_autoNote: "Automatically checked if you indicated in section B that you are an Israeli resident.",

    cred_c2a_num: "2a",
    cred_c2a_title: "I am 100% disabled / permanently blind",
    cred_c2a_document: "Approval from the Ministry of Defense / Treasury / tax assessor, or a blind person's certificate issued after 1.1.1994.",
    cred_c2a_warning: "Since you did not check in section E \"I have no other income including scholarships\", you must contact the tax assessor to arrange tax coordination. If you already have a tax coordination approval from the tax assessor, please give it to HR.",

    cred_c2b_num: "2b",
    cred_c2b_title: "I receive a monthly allowance under the relevant law",
    cred_c2b_document: "Approval of receiving a monthly allowance.",

    cred_c3_title: "I am a permanent resident of a tax-credited locality",
    cred_c3_tooltip: "Credited locality<span style=\"font-weight:400;\">: a locality to which section 11 of the Income Tax Ordinance or section 11 of the National Insurance Law applies, as relevant.</span>",
    cred_c3_document: "Approval from the local authority on Form 1312a.",
    f101_c3_fromDate_label: "From date",
    f101_c3_settlement_label: "The locality",

    cred_c4_title: "I am a new immigrant",
    cred_c4_document: "Immigrant certificate (te'udat oleh).",
    cred_c4_disabledReason: 'You must first fill in the date of Aliyah in section B. <button class="btn-link" onclick="scrollToField(\'f101_aliyaDate\')">Go to the date of Aliyah field</button>',
    f101_c4_fromDate_label: "From date",
    f101_c4_noIncomeUntilDate_label: "I had no income in Israel from the start of the current tax year until",

    cred_c5_title: "For my spouse who lives with me and has no income during the tax year",
    cred_c5_note: "Only if the employee or the spouse has reached retirement age, or is disabled or blind, per section 9(5) of the ordinance.",
    cred_c5_disabledReason: "This section is intended for married employees only.",

    cred_c6_title: "I am a single parent living apart from the other parent",
    cred_c6_tooltip: "A single parent is one of the following:<span style=\"font-weight:400;\"> unmarried, divorced, widowed, or separated, per a tax assessor's approval only.</span>",
    cred_c6_note: "To be completed only by such a parent living apart, who requests credit points for their children who are in their custody and for whom they receive child allowance from the National Insurance Institute per section 7 below, and who does not share a household with another individual.",
    cred_c6_disabledReason: "This cannot be selected because you did not indicate in section C any children for whom you receive child allowance from the National Insurance Institute.",

    cred_c7_title: "For my children in my custody, listed in section C",
    cred_c7_tooltip: "Single parent<span style=\"font-weight:400;\">: a parent in a single-parent family who has a child who has not yet turned 19 during the tax year, and whose other parent has died or is not listed in the population registry.</span>",
    cred_c7_note: "To be completed only by a single parent who receives the child allowance for them, by a married woman, or by a single parent.",
    cred_childRequired_disabledReason: "To select this option, you must add at least one child in the children section.",
    f101_c7_bornThisYear_label: "Number of children born during the tax year",
    f101_c7_age4to5_label: "Number of children who will turn 4 to 5 during the tax year",
    f101_c7_age1to2_label: "Number of children who will turn 1 to 2 during the tax year",
    f101_c7_age6to17_label: "Number of children who will turn 6 to 17 during the tax year",
    f101_c7_age3_label: "Number of children who will turn 3 during the tax year",
    f101_c7_age18_label: "Number of children who will turn 18 during the tax year",

    cred_c8_title: "For my children",
    cred_c8_note: "To be completed by a parent, except a parent who checked clause 7 above, an unmarried woman whose children are not in her custody, and a single parent.",
    cred_c8_excludesC7_disabledReason: "Cannot be checked together with clause 7 (\"except a parent who checked clause 7 above\").",
    f101_c8_bornThisYear_label: "Number of children born during the tax year",
    f101_c8_age4to5_label: "Number of children who will turn 4 to 5 during the tax year",
    f101_c8_age1to2_label: "Number of children who will turn 1 to 2 during the tax year",
    f101_c8_age6to17_label: "Number of children who will turn 6 to 17 during the tax year",
    f101_c8_age3_label: "Number of children who will turn 3 during the tax year",

    cred_c9_title: "I am a single parent of my children in my custody",
    cred_c9_tooltip: "Single parent<span style=\"font-weight:400;\">: a parent in a single-parent family who has a child who has not yet turned 19 during the tax year, and whose other parent has died or is not listed in the population registry.</span>",

    cred_c10_title: "For my children who are not in my custody and whom I financially support",
    cred_c10_note: "To be completed by a parent living apart, who is not entitled to credit points for their children, who has presented a court order obligating them to pay child support.",
    cred_c10_document: "A copy of the court order obligating payment of child support.",

    cred_c11_title: "I am a parent of children with a disability",
    cred_c11_document: "Approval of a disabled child's allowance from the National Insurance Institute for the current year.",
    f101_c11_count_label: "Number of children with a disability, not yet 19, for whom you receive a disabled child's allowance from the National Insurance Institute",

    cred_c12_title: "For alimony payments to my former spouse",
    cred_c12_note: "To be completed by someone who has remarried.",
    cred_c12_document: "A copy of the court order obligating payment of alimony.",

    cred_c13_title: "I or my spouse have turned 16 but not yet 18 during the tax year.",
    cred_c13_needSpouseBirthDate: 'To select this section you must first fill in the spouse\'s date of birth in section F. <button class="btn-link" onclick="scrollToField(\'f101_spouse_birthDate\')">Go to the spouse\'s date of birth field</button>',
    cred_c13_ageNotEligible_married: "The employee's and spouse's age does not meet the eligibility condition for this section (16 to 18 during the tax year).",
    cred_c13_ageNotEligible_single: "The employee's age does not meet the eligibility condition for this section (16 to 18 during the tax year). Eligibility can be checked based on the spouse's age if and when marital status is updated.",

    cred_c14_title: "I am a discharged soldier / I served in national service",
    cred_c14_document: "Discharge certificate / certificate of end of service.",
    f101_c14_startDate_label: "Service start date",
    f101_c14_endDate_label: "Service end date",

    cred_c15_title: "For completing studies toward an academic degree, completing a specialization, or completing professional studies",
    cred_c15_document: "A signed Form 119.",

    cred_c16_title: "I served as a reserve combatant during the previous tax year",
    cred_c16_document: "IDF approval of eligibility for reserve service as a combatant.",
    f101_c16_days_label: "Total reserve duty days in the previous tax year",

    // --- סעיף ט: תיאום מס ---
    sec_i_title: "Tax Coordination",
    sec_i_requestLabel: "I request tax coordination",
    sec_i_reasonLabel: "Reason for the request",
    taxCoordOption_noIncomeYet: "I had no income from the start of the tax year until starting work with this employer.",
    taxCoordOption_hasOtherIncome: "I have additional income.",
    taxCoordOption_approved: "The tax assessor approved tax coordination per the attached approval.",
    income_source_prefix: "Income source",
    f101_ts_employerName_label: "Name of the employer or payer of the income",
    f101_ts_address_label: "Address",
    f101_ts_taxFileNum_label: "Deductions file number",
    f101_ts_incomeType_label: "Income type",
    f101_ts_monthlyIncome_label: "Monthly income",
    f101_ts_taxWithheld_label: "Tax withheld per payslips",
    select_placeholder: "Select...",
    add_income_source_btn: "Add income source",
    sec_i_sourcesDocument: "A payslip or relevant document for each income source.",
    sec_i_approvedDocument: "Tax coordination approval from the tax assessor.",

    // --- סעיף י: הצהרה וסיום ---
    sec_j_title: "Declaration and Completion",
    sec_j_declarationLabel: "I declare that the details I provided on this form are complete and correct.",
    sec_j_alreadyCompleted: "This form has already been marked as completed. Uncheck the declaration to edit and mark it again.",
    preview_btn: "Preview",
    finish_btn: "Finished",
    sec_j_noDigitalSignatureHint: "No digital signature — the form will be printed and signed physically by the employee.",

    // --- הודעות שגיאה (מפתח = הטקסט העברי המדויק שנשמר ב-ui.errors, ר'
    //     validateForm101/liveFormatError/finalFieldError ב-render.js) ---
    "שדה חובה.": "Required field.",
    "תאריך לידה אינו יכול להיות עתידי.": "Date of birth cannot be in the future.",
    "שדה חובה כאשר חבר/ה בקופת חולים.": "Required when a health fund member.",
    "יש למלא לפחות מספר טלפון אחד תקין (לדוגמה: 050-1234567).": "Please fill in at least one valid phone number (e.g. 050-1234567).",
    "כתובת דוא\"ל אינה תקינה.": "Invalid email address.",
    "מספר זהות אינו תקין.": "Invalid ID number.",
    "שדה חובה — יש לבחור סוג הכנסה אחד ממעסיק זה.": "Required field — choose one income type from this employer.",
    "יש לסמן לפחות סוג הכנסה אחד.": "Check at least one income type.",
    "יש להוסיף לפחות מקור הכנסה אחד.": "Add at least one income source.",
    "יש להזין מספר גדול מ-0.": "Enter a number greater than 0.",
    "המספר לא יכול להיות גבוה ממספר הילדים שהוזנו בחלק ג'.": "The number cannot be higher than the number of children entered in section C.",
    "יש להזין מספר ימים גדול מ-0.": "Enter a number of days greater than 0.",
    "תאריך סיום לא יכול להיות לפני תאריך תחילה.": "The end date cannot be before the start date.",
    "יש לאשר את ההצהרה כדי לסיים.": "You must accept the declaration to finish.",
    "יש להזין ספרות בלבד.": "Digits only.",
    "יש להזין אותיות ו/או ספרות בלבד.": "Letters and/or digits only.",
    "כתובת דוא\"ל אינה יכולה להכיל רווחים.": "Email address cannot contain spaces.",
    "מספר טלפון יכול להכיל ספרות בלבד.": "Phone number can only contain digits.",
    "מספר זהות אינו תקין (בדיקת ספרת ביקורת נכשלה).": "Invalid ID number (checksum failed).",
    "יש להזין 3 עד 20 אותיות ו/או ספרות בלבד.": "Enter 3 to 20 letters and/or digits only.",
    "ניתן לסמן רק אם סימנת שהילד נמצא בחזקתך.": "Can only be checked if you indicated the child is in your custody."
  }
};
