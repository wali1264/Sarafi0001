import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// TODO: For production, this key should be moved to a secure environment variable (e.g., Vercel Environment Variables)
// and accessed via `process.env.API_KEY`. Hardcoding is for temporary experimental deployment only.
const apiKey = 'AIzaSyDja-PjvYDlcBaRV3g0dNxJU0LEonda2As';

class GeminiService {
    public ai: GoogleGenAI;
    public tools: { functionDeclarations: FunctionDeclaration[] }[];

    constructor(apiKey: string | undefined) {
        // Initialize with the key, even if it's undefined. The API will handle the error upon first call.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
        this.tools = [{ functionDeclarations: this.getFunctionDeclarations() }];
    }

    private getFunctionDeclarations(): FunctionDeclaration[] {
        return [
            {
                name: 'createAccountTransfer',
                description: 'انتقال مبلغ بین حساب دو مشتری ثبت شده در سیستم. اگر گیرنده نامشخص بود، از is_pending_assignment استفاده کنید.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        from_customer_code: { type: Type.STRING, description: 'کد مشتری که پول از حساب او کسر می‌شود' },
                        to_customer_code: { type: Type.STRING, description: 'کد مشتری که پول به حساب او اضافه می‌شود. اگر نامشخص بود، از کد "_SUSPENSE_" استفاده کنید.' },
                        amount: { type: Type.NUMBER, description: 'مبلغ انتقال' },
                        currency: { type: Type.STRING, description: 'واحد پولی انتقال', enum: Object.values(Currency) },
                        description: { type: Type.STRING, description: 'توضیحات مربوط به انتقال' },
                        is_pending_assignment: { type: Type.BOOLEAN, description: 'اگر گیرنده نهایی مشخص نیست و باید به حساب معلق واریز شود، این را true قرار دهید. در این صورت to_customer_code باید "_SUSPENSE_" باشد.', nullable: true }
                    },
                    required: ['from_customer_code', 'to_customer_code', 'amount', 'currency', 'description'],
                },
            },
            {
                name: 'createCustomer',
                description: 'ثبت یک مشتری جدید در سیستم با موجودی‌های اولیه',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'نام کامل مشتری' },
                        code: { type: Type.STRING, description: 'کد منحصر به فرد مشتری' },
                        whatsapp_number: { type: Type.STRING, description: 'شماره واتس‌اپ مشتری' },
                        balances: {
                            type: Type.OBJECT,
                            description: 'موجودی‌های اولیه برای هر ارز. برای بدهکاری از مقادیر منفی استفاده کنید.',
                            properties: {
                                AFN: { type: Type.NUMBER, description: 'موجودی اولیه به افغانی', nullable: true },
                                USD: { type: Type.NUMBER, description: 'موجودی اولیه به دالر آمریکا', nullable: true },
                                PKR: { type: Type.NUMBER, description: 'موجودی اولیه به روپیه پاکستان', nullable: true },
                                EUR: { type: Type.NUMBER, description: 'موجودی اولیه به یورو', nullable: true },
                                IRT_BANK: { type: Type.NUMBER, description: 'موجودی اولیه به تومان بانکی', nullable: true },
                                IRT_CASH: { type: Type.NUMBER, description: 'موجودی اولیه به تومان نقدی', nullable: true },
                            }
                        }
                    },
                    required: ['name', 'code', 'whatsapp_number'],
                },
            },
            {
                name: 'createDomesticTransfer',
                description: 'ایجاد یک حواله داخلی جدید. میتواند به صورت پرداخت نقدی یا کسر از حساب مشتری باشد.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        sender_name: { type: Type.STRING, description: 'نام کامل فرستنده' },
                        sender_tazkereh: { type: Type.STRING, description: 'شماره تذکره فرستنده' },
                        receiver_name: { type: Type.STRING, description: 'نام کامل گیرنده' },
                        receiver_tazkereh: { type: Type.STRING, description: 'شماره تذکره گیرنده' },
                        amount: { type: Type.NUMBER, description: 'مبلغ حواله' },
                        currency: { type: Type.STRING, description: 'واحد پولی حواله', enum: Object.values(Currency) },
                        commission: { type: Type.NUMBER, description: 'کارمزد حواله' },
                        destination_province: { type: Type.STRING, description: 'ولایت مقصد' },
                        partner_sarraf: { type: Type.STRING, description: 'نام صراف همکار در مقصد' },
                        is_cash_payment: { type: Type.BOOLEAN, description: 'مشخص میکند که آیا پرداخت نقدی است یا از حساب مشتری کسر میشود. اگر true باشد، نقدی است.' },
                        customer_code: { type: Type.STRING, description: 'اگر is_cash_payment برابر false باشد، کد مشتری که پول از حساب او کسر میشود باید اینجا وارد شود.', nullable: true }
                    },
                    required: ['sender_name', 'sender_tazkereh', 'receiver_name', 'receiver_tazkereh', 'amount', 'currency', 'commission', 'destination_province', 'partner_sarraf', 'is_cash_payment'],
                },
            },
            {
                name: 'createPartner',
                description: 'ثبت یک صراف همکار جدید با موجودی‌های اولیه برای ارزهای مختلف',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'نام کامل صراف همکار' },
                        balances: {
                            type: Type.OBJECT,
                            description: 'موجودی‌های اولیه برای هر ارز. برای بدهکاری از مقادیر منفی استفاده کنید.',
                            properties: {
                                AFN: { type: Type.NUMBER, description: 'موجودی اولیه به افغانی', nullable: true },
                                USD: { type: Type.NUMBER, description: 'موجودی اولیه به دالر آمریکا', nullable: true },
                                PKR: { type: Type.NUMBER, description: 'موجودی اولیه به روپیه پاکستان', nullable: true },
                                EUR: { type: Type.NUMBER, description: 'موجودی اولیه به یورو', nullable: true },
                                IRT_BANK: { type: Type.NUMBER, description: 'موجودی اولیه به تومان بانکی', nullable: true },
                                IRT_CASH: { type: Type.NUMBER, description: 'موجودی اولیه به تومان نقدی', nullable: true },
                            }
                        }
                    },
                    required: ['name', 'balances'],
                },
            },
             {
                name: 'updatePartner',
                description: 'ویرایش نام یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID همکار مورد نظر' },
                        name: { type: Type.STRING, description: 'نام جدید برای همکار' },
                    },
                    required: ['id', 'name'],
                },
            },
            {
                name: 'deletePartner',
                description: 'غیرفعال کردن (حذف ایمن) یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID همکاری که باید غیرفعال شود' },
                    },
                    required: ['id'],
                },
            },
             {
                name: 'updateBankAccount',
                description: 'ویرایش اطلاعات یک حساب بانکی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID حساب بانکی' },
                        account_holder: { type: Type.STRING, description: 'نام جدید صاحب حساب' },
                        bank_name: { type: Type.STRING, description: 'نام جدید بانک' },
                        account_number: { type: Type.STRING, description: 'شماره حساب جدید' },
                        card_to_card_number: { type: Type.STRING, description: 'شماره کارت جدید (اختیاری)' },
                    },
                    required: ['id', 'account_holder', 'bank_name', 'account_number'],
                },
            },
            {
                name: 'deleteBankAccount',
                description: 'غیرفعال کردن (حذف ایمن) یک حساب بانکی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID حساب بانکی که باید غیرفعال شود' },
                    },
                    required: ['id'],
                },
            },
            {
                name: 'updateTransferStatus',
                description: 'به‌روزرسانی وضعیت یک حواله داخلی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        transfer_id: { type: Type.STRING, description: 'کد رهگیری حواله، مثلا DT-12345' },
                        new_status: { type: Type.STRING, description: 'وضعیت جدید حواله', enum: [TransferStatus.Executed, TransferStatus.Cancelled] },
                    },
                    required: ['transfer_id', 'new_status'],
                },
            },
            {
                name: 'payoutIncomingTransfer',
                description: 'پرداخت یک حواله ورودی به مشتری (که وضعیت آن را "اجرا شده" می‌کند)',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        transfer_id: { type: Type.STRING, description: 'کد رهگیری حواله ورودی' },
                    },
                    required: ['transfer_id'],
                },
            },
            {
                name: 'logExpense',
                description: 'ثبت یک هزینه یا مصرف جدید برای صرافی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, description: 'دسته‌بندی هزینه', enum: Object.values(ExpenseCategory) },
                        amount: { type: Type.NUMBER, description: 'مبلغ هزینه' },
                        currency: { type: Type.STRING, description: 'واحد پولی هزینه', enum: Object.values(Currency) },
                        description: { type: Type.STRING, description: 'توضیحات مربوط به هزینه' },
                    },
                    required: ['category', 'amount', 'currency', 'description'],
                },
            },
             {
                name: 'initiateForeignExchange',
                description: 'شروع یک معامله تبادله ارز با ثبت درخواست برداشت از یک دارایی (صندوق یا بانک).',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: 'شرح تبادله' },
                        from_asset_id: { type: Type.STRING, description: 'کد دارایی مبدا (مانند cashbox_USD یا bank_ba-1). مبلغ از این دارایی کسر می‌شود.' },
                        from_amount: { type: Type.NUMBER, description: 'مبلغ برداشتی از مبدا' },
                    },
                    required: ['description', 'from_asset_id', 'from_amount'],
                },
            },
            {
                name: 'getBalanceForPartner',
                description: 'دریافت موجودی حساب یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        partner_name: { type: Type.STRING, description: 'نام صراف همکار' },
                    },
                    required: ['partner_name'],
                },
            },
            // FIX: Added function declaration for 'settlePartnerBalance' to enable the voice assistant feature.
            {
                name: 'settlePartnerBalance',
                description: 'تسویه حساب با یک همکار صراف، شامل پرداخت به او یا دریافت وجه از او.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        partner_name: { type: Type.STRING, description: 'نام کامل صراف همکار' },
                        amount: { type: Type.NUMBER, description: 'مبلغی که پرداخت یا دریافت می‌شود' },
                        currency: { type: Type.STRING, description: 'واحد پولی مبلغ', enum: Object.values(Currency) },
                        type: { type: Type.STRING, description: 'نوع عملیات: "pay" برای پرداخت به همکار، "receive" برای دریافت از همکار', enum: ['pay', 'receive'] },
                    },
                    required: ['partner_name', 'amount', 'currency', 'type'],
                },
            },
            {
                name: 'requestCashboxWithdrawal',
                description: 'ثبت درخواست برداشت پول از صندوق',
                 parameters: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER, description: 'مبلغ درخواستی' },
                        currency: { type: Type.STRING, description: 'واحد پولی', enum: Object.values(Currency) },
                        reason: { type: Type.STRING, description: 'دلیل درخواست' },
                    },
                    required: ['amount', 'currency', 'reason'],
                },
            },
            {
                name: 'analyzeBusinessData',
                description: 'به سوالات تحلیلی و گزارش‌گیری در مورد کسب و کار پاسخ می‌دهد. مثال: "پرکارترین همکار ما کیست؟" یا "سود ما در ماه گذشته چقدر بود؟"',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        query: { type: Type.STRING, description: 'سوال کاربر به زبان طبیعی' },
                    },
                    required: ['query'],
                },
            }
        ];
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;