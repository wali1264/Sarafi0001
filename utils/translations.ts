import { TransferStatus, ExpenseCategory, ReportType, CashboxRequestStatus, PermissionModule, AmanatStatus, ForeignTransactionStatus, CommissionTransferStatus, ExpenseStatus } from '../types';

export const permissionModuleTranslations: Record<PermissionModule, string> = {
    dashboard: 'داشبورد',
    cashbox: 'صندوق',
    domesticTransfers: 'حواله جات داخلی',
    foreignTransfers: 'تبادلات',
    commissionTransfers: 'حواله جات کمیشن‌کاری',
    rentedAccounts: 'حسابات کرایی',
    // FIX: Add translation for the new 'dedicatedAccounts' module.
    dedicatedAccounts: 'حسابات اختصاصی',
    accountTransfers: 'انتقال داخلی بین مشتریان',
    customers: 'مشتریان',
    partnerAccounts: 'حساب همکاران',
    expenses: 'مصارف',
    reports: 'گزارشات',
    settings: 'تنظیمات',
    amanat: 'امانات',
    accounting: 'حسابداری',
};

export const permissionActionTranslations: Record<string, string> = {
    view: 'مشاهده',
    create: 'ایجاد',
    edit: 'ویرایش',
    delete: 'حذف',
    approve: 'تایید نهایی / ملاحظه',
    process: 'پردازش / پرداخت',
};

export const statusTranslations: Record<TransferStatus, string> = {
    [TransferStatus.Unexecuted]: 'اجرا نشده',
    [TransferStatus.PendingCashbox]: 'در انتظار تایید صندوق',
    [TransferStatus.Executed]: 'اجرا شده',
    [TransferStatus.Cancelled]: 'لغو شده',
    [TransferStatus.RejectedByCashbox]: 'رد توسط صندوق',
};

export const foreignTransactionStatusTranslations: Record<ForeignTransactionStatus, string> = {
    [ForeignTransactionStatus.PendingWithdrawalApproval]: 'در انتظار تایید برد',
    [ForeignTransactionStatus.PendingDeposit]: 'در جریان تبادله',
    [ForeignTransactionStatus.PendingDepositApproval]: 'در انتظار تایید رسید',
    [ForeignTransactionStatus.Completed]: 'تکمیل شده',
    [ForeignTransactionStatus.Rejected]: 'رد شده',
};

export const commissionTransferStatusTranslations: Record<CommissionTransferStatus, string> = {
    [CommissionTransferStatus.PendingDepositApproval]: 'در انتظار تایید واریز',
    [CommissionTransferStatus.PendingExecution]: 'آماده اجرا',
    [CommissionTransferStatus.PendingWithdrawalApproval]: 'در انتظار تایید پرداخت',
    [CommissionTransferStatus.Completed]: 'تکمیل شده',
    [CommissionTransferStatus.Rejected]: 'رد شده',
};

export const expenseStatusTranslations: Record<ExpenseStatus, string> = {
    [ExpenseStatus.PendingApproval]: 'در انتظار تایید',
    [ExpenseStatus.Approved]: 'تایید شده',
    [ExpenseStatus.Rejected]: 'رد شده',
};


export const expenseCategoryTranslations: Record<ExpenseCategory, string> = {
    [ExpenseCategory.Salary]: 'حقوق',
    [ExpenseCategory.Rent]: 'کرایه',
    [ExpenseCategory.Utilities]: 'خدمات رفاهی',
    [ExpenseCategory.Hospitality]: 'پذیرایی',
    [ExpenseCategory.Other]: 'متفرقه',
};

export const reportTypeTranslations: Record<ReportType, string> = {
    [ReportType.ProfitAndLoss]: 'گزارش سود و زیان',
    [ReportType.CashboxSummary]: 'گزارش خلاصه صندوق',
    [ReportType.InternalLedger]: 'گزارش دفتر حساب داخلی',
}

export const cashboxRequestStatusTranslations: Record<CashboxRequestStatus, string> = {
    [CashboxRequestStatus.Pending]: 'در انتظار مدیر',
    [CashboxRequestStatus.PendingCashboxApproval]: 'در انتظار صندوقدار',
    [CashboxRequestStatus.Approved]: 'تایید شده',
    [CashboxRequestStatus.Rejected]: 'رد شده',
    [CashboxRequestStatus.AutoApproved]: 'تایید خودکار',
};

// FIX: Add translations for Amanat feature
export const amanatStatusTranslations: Record<AmanatStatus, string> = {
    [AmanatStatus.Active]: 'فعال',
    [AmanatStatus.Returned]: 'بازگشت داده شده',
};

/**
 * Converts Persian (and Arabic) numerals to English numerals.
 * @param str The string containing Persian numerals.
 * @returns A string with English numerals.
 */
export const persianToEnglishNumber = (str: string): string => {
    if (str === null || str === undefined) return '';
    return str
        .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
        .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString());
};
