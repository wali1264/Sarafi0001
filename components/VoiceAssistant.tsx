import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionCall, GenerateContentResponse, FunctionDeclaration, Type } from '@google/genai';
import geminiService from '../services/geminiService';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { Currency, ExpenseCategory, TransferStatus } from '../types';
import OperationalModal from './OperationalModal';

// --- Audio Encoding/Decoding Utilities ---

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const HolographicMicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M42 70C42 73.3137 44.6863 76 48 76H52C55.3137 76 58 73.3137 58 70V68H42V70Z" />
        <path d="M50 64C54.4183 64 58 60.4183 58 56V34C58 29.5817 54.4183 26 50 26C45.5817 26 42 29.5817 42 34V56C42 60.4183 45.5817 64 50 64Z" />
        <path d="M34 50C34 58.8366 41.1634 66 50 66C58.8366 66 66 58.8366 66 50H62C62 56.6274 56.6274 62 50 62C43.3726 62 38 56.6274 38 50H34Z" />
    </svg>
);


interface TranscriptLine {
    id: number;
    source: 'user' | 'ai';
    text: string;
}

type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'AWAITING_CONFIRMATION' | 'ERROR';

// --- Dynamic Tool Builder ---
const getDynamicTools = (hasPermission: (module: any, action: any) => boolean): { functionDeclarations: FunctionDeclaration[] }[] => {
    const declarations: FunctionDeclaration[] = [];

    // --- Core Interaction Tools ---
    declarations.push({
        name: 'requestUserConfirmation',
        description: 'برای تایید نهایی یک عملیات اجرایی استفاده می‌شود. ابتدا تمام اطلاعات را جمع‌آوری کرده، سپس این تابع را برای نمایش به کاربر و گرفتن تایید فراخوانی کن.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: 'عنوان عملیات، مثلا "تایید ثبت مشتری جدید"' },
                data: { type: Type.OBJECT, description: 'یک شیء JSON حاوی تمام اطلاعات جمع‌آوری شده برای نمایش به کاربر' },
                action_to_perform: { type: Type.STRING, description: 'نام تابع اصلی که پس از تایید باید اجرا شود، مثلا "createCustomer"' },
                action_payload: { type: Type.OBJECT, description: 'پارامترهای دقیق مورد نیاز برای تابع اصلی' },
            },
            required: ['title', 'data', 'action_to_perform', 'action_payload'],
        },
    });

    // --- REPORTING & ANALYSIS ---
    declarations.push({
        name: 'analyzeBusinessData',
        description: 'به سوالات تحلیلی و گزارش‌گیری در مورد کسب و کار پاسخ می‌دهد. مثال: "پرکارترین همکار ما کیست؟" یا "سود ما در ماه گذشته چقدر بود؟"',
        parameters: {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING, description: 'سوال کاربر به زبان طبیعی' } },
            required: ['query'],
        },
    });

    // --- Executive Function Declarations (for action_to_perform) ---
    if (hasPermission('cashbox', 'create')) {
         declarations.push({ name: 'createCashboxRequest', description: 'ثبت درخواست جدید در صندوق', parameters: { type: Type.OBJECT, properties: { request_type: { type: Type.STRING }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, reason: { type: Type.STRING }, customer_code: { type: Type.STRING, nullable: true }, bank_account_id: { type: Type.STRING, nullable: true } }, required: ['request_type', 'amount', 'currency', 'reason'] }});
    }
    if (hasPermission('cashbox', 'approve')) {
        declarations.push({ name: 'resolveCashboxRequest', description: 'تایید یا رد درخواست صندوق', parameters: { type: Type.OBJECT, properties: { request_id: { type: Type.STRING }, resolution: { type: Type.STRING, enum: ['approve', 'reject'] } }, required: ['request_id', 'resolution'] }});
    }
    if (hasPermission('domesticTransfers', 'create')) {
        declarations.push({ name: 'createOutgoingTransfer', description: 'ایجاد حواله داخلی خروجی', parameters: { type: Type.OBJECT, properties: { sender_name: { type: Type.STRING }, receiver_name: { type: Type.STRING }, sender_tazkereh: { type: Type.STRING }, receiver_tazkereh: { type: Type.STRING }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, commission: { type: Type.NUMBER }, destination_province: { type: Type.STRING }, partner_sarraf: { type: Type.STRING }, is_cash_payment: { type: Type.BOOLEAN }, customer_code: { type: Type.STRING, nullable: true } }, required: ['sender_name', 'sender_tazkereh', 'receiver_name', 'receiver_tazkereh', 'amount', 'currency', 'commission', 'destination_province', 'partner_sarraf', 'is_cash_payment'] }});
        declarations.push({ name: 'createIncomingTransfer', description: 'ثبت حواله داخلی ورودی', parameters: { type: Type.OBJECT, properties: { receiver_name: { type: Type.STRING }, receiver_tazkereh: { type: Type.STRING }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, destination_province: { type: Type.STRING }, partner_sarraf: { type: Type.STRING }, partner_reference: { type: Type.STRING } }, required: ['receiver_name', 'receiver_tazkereh', 'amount', 'currency', 'destination_province', 'partner_sarraf', 'partner_reference'] }});
    }
    if (hasPermission('domesticTransfers', 'edit')) {
         declarations.push({ name: 'updateTransferStatus', description: 'به‌روزرسانی وضعیت حواله داخلی', parameters: { type: Type.OBJECT, properties: { transfer_id: { type: Type.STRING }, new_status: { type: Type.STRING, enum: [TransferStatus.Executed, TransferStatus.Cancelled] } }, required: ['transfer_id', 'new_status'] }});
    }
    if (hasPermission('domesticTransfers', 'process')) {
        declarations.push({ name: 'payoutIncomingTransfer', description: 'پرداخت حواله ورودی', parameters: { type: Type.OBJECT, properties: { transfer_id: { type: Type.STRING } }, required: ['transfer_id'] }});
    }
    if (hasPermission('expenses', 'create')) {
        declarations.push({ name: 'logExpense', description: 'ثبت هزینه جدید', parameters: { type: Type.OBJECT, properties: { category: { type: Type.STRING, enum: Object.values(ExpenseCategory) }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['category', 'amount', 'currency', 'description'] }});
    }
    if (hasPermission('foreignTransfers', 'create')) {
        declarations.push({ name: 'initiateForeignExchange', description: 'شروع تبادله ارز', parameters: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, from_asset_id: { type: Type.STRING }, from_amount: { type: Type.NUMBER } }, required: ['description', 'from_asset_id', 'from_amount'] }});
         declarations.push({ name: 'completeForeignExchange', description: 'تکمیل تبادله ارز', parameters: { type: Type.OBJECT, properties: { transaction_id: { type: Type.STRING }, to_asset_id: { type: Type.STRING }, to_amount: { type: Type.NUMBER } }, required: ['transaction_id', 'to_asset_id', 'to_amount'] }});
    }
    if(hasPermission('commissionTransfers', 'create')) {
        declarations.push({ name: 'logCommissionTransfer', description: 'ثبت ورود وجه کمیشن‌کاری', parameters: { type: Type.OBJECT, properties: { initiator_type: { type: Type.STRING, enum: ['Customer', 'Partner'] }, customer_code: { type: Type.STRING, nullable: true }, partner_id: { type: Type.STRING, nullable: true }, amount: { type: Type.NUMBER }, source_account_number: { type: Type.STRING }, received_into_bank_account_id: { type: Type.STRING }, commission_percentage: { type: Type.NUMBER } }, required: ['initiator_type', 'amount', 'source_account_number', 'received_into_bank_account_id', 'commission_percentage'] }});
    }
    if(hasPermission('commissionTransfers', 'process')) {
        declarations.push({ name: 'executeCommissionTransfer', description: 'اجرای پرداخت کمیشن‌کاری', parameters: { type: Type.OBJECT, properties: { transfer_id: { type: Type.STRING }, paid_from_bank_account_id: { type: Type.STRING }, destination_account_number: { type: Type.STRING } }, required: ['transfer_id', 'paid_from_bank_account_id', 'destination_account_number'] }});
    }
    if(hasPermission('amanat', 'create')) {
        declarations.push({ name: 'createAmanat', description: 'ثبت امانت جدید', parameters: { type: Type.OBJECT, properties: { customer_name: { type: Type.STRING }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, notes: { type: Type.STRING }, bank_account_id: { type: Type.STRING, nullable: true } }, required: ['customer_name', 'amount', 'currency', 'notes'] }});
    }
    if(hasPermission('amanat', 'process')) {
        declarations.push({ name: 'returnAmanat', description: 'بازگشت امانت', parameters: { type: Type.OBJECT, properties: { amanat_id: { type: Type.STRING } }, required: ['amanat_id'] }});
    }
    if(hasPermission('customers', 'create')) {
        declarations.push({ name: 'createCustomer', description: 'ایجاد مشتری جدید', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, whatsapp_number: { type: Type.STRING } }, required: ['name', 'code', 'whatsapp_number'] }});
    }
     if(hasPermission('partnerAccounts', 'create')) {
        declarations.push({ name: 'createPartner', description: 'ایجاد همکار جدید', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, province: { type: Type.STRING }, whatsapp_number: { type: Type.STRING } }, required: ['name', 'province', 'whatsapp_number'] }});
    }
    if(hasPermission('accountTransfers', 'create')) {
         declarations.push({ name: 'createAccountTransfer', description: 'انتقال وجه بین دو مشتری', parameters: { type: Type.OBJECT, properties: { from_customer_code: { type: Type.STRING }, to_customer_code: { type: Type.STRING }, amount: { type: Type.NUMBER }, currency: { type: Type.STRING }, description: { type: Type.STRING }, is_pending_assignment: { type: Type.BOOLEAN } }, required: ['from_customer_code', 'to_customer_code', 'amount', 'currency', 'description', 'is_pending_assignment'] }});
    }
    if(hasPermission('customers', 'edit')) {
         declarations.push({ name: 'performInternalCustomerExchange', description: 'تبدیل ارز داخلی مشتری', parameters: { type: Type.OBJECT, properties: { customer_id: { type: Type.STRING }, from_currency: { type: Type.STRING }, from_amount: { type: Type.NUMBER }, to_currency: { type: Type.STRING }, to_amount: { type: Type.NUMBER }, rate: { type: Type.NUMBER } }, required: ['customer_id', 'from_currency', 'from_amount', 'to_currency', 'to_amount', 'rate'] }});
    }
    if(hasPermission('settings', 'edit')) {
        declarations.push({ name: 'addBankAccount', description: 'افزودن حساب بانکی جدید', parameters: { type: Type.OBJECT, properties: { account_holder: { type: Type.STRING }, bank_name: { type: Type.STRING }, account_number: { type: Type.STRING }, card_to_card_number: { type: Type.STRING, nullable: true } }, required: ['account_holder', 'bank_name', 'account_number'] }});
    }
    
    return [{ functionDeclarations: declarations }];
};

const VoiceAssistant: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [session, setSession] = useState<Awaited<ReturnType<typeof geminiService.ai.live.connect>> | null>(null);
    const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptLine[]>([]);
    
    // Modal State
    const [isOperationalModalOpen, setOperationalModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; data: any; type: 'confirmation' | 'report' }>({ title: '', data: {}, type: 'confirmation' });
    const [pendingAction, setPendingAction] = useState<{ name: string; payload: any; funcCallId: string } | null>(null);

    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const apiMethods: { [key: string]: (payload: any) => Promise<any> } = {
        createCashboxRequest: api.createCashboxRequest,
        resolveCashboxRequest: api.resolveCashboxRequest,
        createOutgoingTransfer: (p: any) => api.createDomesticTransfer({ ...p, partner_reference: undefined }),
        createIncomingTransfer: (p: any) => api.createDomesticTransfer({ ...p, sender_name: p.partner_sarraf, sender_tazkereh: '-', commission: 0, is_cash_payment: false }),
        updateTransferStatus: api.updateTransferStatus,
        payoutIncomingTransfer: api.payoutIncomingTransfer,
        logExpense: api.createExpense,
        initiateForeignExchange: api.initiateForeignExchange,
        completeForeignExchange: api.completeForeignExchange,
        logCommissionTransfer: api.logCommissionTransfer,
        executeCommissionTransfer: api.executeCommissionTransfer,
        createAmanat: api.createAmanat,
        returnAmanat: api.returnAmanat,
        createCustomer: api.createCustomer,
        createPartner: api.createPartner,
        addBankAccount: api.addBankAccount,
        createAccountTransfer: api.createAccountTransfer,
        performInternalCustomerExchange: api.performInternalCustomerExchange,
    };

    const handleFunctionCall = useCallback(async (funcCall: FunctionCall) => {
        if (!user) return;
        setAssistantState('THINKING');
        const { name, args } = funcCall;

        if (name === 'requestUserConfirmation') {
            setPendingAction({
                name: args.action_to_perform as string,
                payload: args.action_payload as any,
                funcCallId: funcCall.id
            });
            setModalContent({
                title: args.title as string,
                data: args.data as any,
                type: 'confirmation'
            });
            setOperationalModalOpen(true);
            setAssistantState('AWAITING_CONFIRMATION');
        } else if (name === 'analyzeBusinessData') {
            const secureContext: any = {
                _report_generated_at: new Date().toISOString()
            };
            const dataPromises: Promise<any>[] = [];
            const contextKeys: string[] = [];
            if (hasPermission('cashbox', 'view')) { dataPromises.push(api.getCashboxRequests()); contextKeys.push('cashboxRequests'); dataPromises.push(api.getCashboxBalances()); contextKeys.push('cashboxBalances'); }
            if (hasPermission('domesticTransfers', 'view')) { dataPromises.push(api.getDomesticTransfers()); contextKeys.push('domesticTransfers'); }
            if (hasPermission('foreignTransfers', 'view')) { dataPromises.push(api.getForeignTransactions()); contextKeys.push('foreignTransactions'); }
            if (hasPermission('commissionTransfers', 'view')) { dataPromises.push(api.getCommissionTransfers()); contextKeys.push('commissionTransfers'); }
            if (hasPermission('customers', 'view')) { dataPromises.push(api.getCustomers()); contextKeys.push('customers'); }
            if (hasPermission('partnerAccounts', 'view')) { dataPromises.push(api.getPartnerAccounts()); contextKeys.push('partnerAccounts'); }
            if (hasPermission('expenses', 'view')) { dataPromises.push(api.getExpenses()); contextKeys.push('expenses'); }
            const results = await Promise.all(dataPromises);
            results.forEach((res, index) => { secureContext[contextKeys[index]] = res; });

            const contextString = JSON.stringify(secureContext, null, 2);
            const prompt = `
شما یک تحلیلگر ارشد دیتای مالی در صرافی الشیخ هستید. بر اساس دیتاست JSON لحظه‌ای که در زیر ارائه شده، به سوال کاربر پاسخ دقیق و کاملی بدهید.

**نکات مهم:**
- این دیتاست یک تصویر زنده از دیتابیس در زمان '_report_generated_at' است.
- پاسخ شما باید فقط و فقط بر اساس این دیتاست باشد.
- با اطمینان کامل پاسخ دهید و هرگز نگویید اطلاعات شما قدیمی است.

**دیتاست JSON:**
${contextString}

**سوال کاربر:**
"${args.query}"
`;
            
            const response = await geminiService.ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            
            setModalContent({
                title: `گزارش برای: "${args.query}"`,
                data: response.text,
                type: 'report'
            });
            setOperationalModalOpen(true);

            session?.sendToolResponse({ functionResponses: { id: funcCall.id, name, response: { result: `گزارش با موفقیت تولید و نمایش داده شد.` } } });
        } else {
            // For simple, non-confirmation actions like resolveCashboxRequest
            const method = apiMethods[name];
            if (method) {
                const payload = { ...args, user };
                const result = await method(payload);
                const successMessage = (result && result.error) ? `خطا: ${result.error}` : `عملیات ${name} با موفقیت انجام شد.`;
                session?.sendToolResponse({ functionResponses: { id: funcCall.id, name, response: { result: successMessage } } });
            }
        }
    }, [api, user, session, hasPermission, apiMethods]);

    const handleModalConfirm = async () => {
        if (!pendingAction || !user) return;
        setOperationalModalOpen(false);
        setAssistantState('THINKING');
        
        const { name, payload, funcCallId } = pendingAction;
        let resultMessage = "عملیات با موفقیت انجام شد.";

        try {
            const method = apiMethods[name];
            if (method) {
                const finalPayload = { ...payload, user };
                const result = await method(finalPayload);
                if (result && result.error) {
                    resultMessage = `خطا در اجرای دستور: ${result.error}`;
                }
            } else {
                resultMessage = `دستور ناشناخته: ${name}`;
            }
        } catch(e) {
            console.error("Function call execution error:", e);
            resultMessage = "خطایی در اجرای دستور رخ داد.";
        }

        session?.sendToolResponse({
            functionResponses: {
                id: funcCallId,
                name: 'requestUserConfirmation',
                response: { result: resultMessage }
            }
        });
        setPendingAction(null);
    };

    const handleModalCancel = () => {
        setOperationalModalOpen(false);
        if (pendingAction) {
            session?.sendToolResponse({
                functionResponses: {
                    id: pendingAction.funcCallId,
                    name: 'requestUserConfirmation',
                    response: { result: "عملیات توسط کاربر لغو شد." }
                }
            });
        }
        setPendingAction(null);
        setAssistantState('LISTENING');
    };

    const startSession = useCallback(async () => {
        if (session || !user) return;
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        setTranscriptHistory([]);
        const dynamicTools = getDynamicTools(hasPermission);

        const sessionPromise = geminiService.ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    setAssistantState('LISTENING');
                    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current);
                    scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                         sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                     if (message.serverContent) {
                        const { modelTurn, inputTranscription, outputTranscription } = message.serverContent;
                        const base64Audio = modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            setAssistantState('SPEAKING');
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0 && assistantState !== 'AWAITING_CONFIRMATION') {
                                    setAssistantState('LISTENING');
                                }
                            });
                            const currentTime = outputAudioContextRef.current.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                        if(inputTranscription || outputTranscription) {
                            setTranscriptHistory(prev => {
                                const newHistory = [...prev];
                                const lastItem = newHistory[newHistory.length - 1];
                                if(inputTranscription) {
                                    if(lastItem?.source === 'user') { lastItem.text += inputTranscription.text; }
                                    else { newHistory.push({id: Date.now(), source: 'user', text: inputTranscription.text}); }
                                }
                                if(outputTranscription) {
                                     if(lastItem?.source === 'ai') { lastItem.text += outputTranscription.text; }
                                     else { newHistory.push({id: Date.now(), source: 'ai', text: outputTranscription.text}); }
                                }
                                return newHistory;
                            });
                        }
                    }
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            handleFunctionCall(fc);
                        }
                    }
                },
                onerror: (e: ErrorEvent) => { console.error('Session error:', e); setAssistantState('ERROR'); },
                onclose: (e: CloseEvent) => { setAssistantState('IDLE'); stopSession(); },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {}, outputAudioTranscription: {},
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: `شما دستیار صوتی هوشمند "صرافی الشیخ" هستید. وظیفه شما کمک به مدیران و کارمندان برای مدیریت امور صرافی از طریق دستورات صوتی است. شما باید مودب، حرفه‌ای و فوق‌العاده دقیق باشید.

**راهنمای کلی:**
- شما می‌توانید تمام بخش‌های اپلیکیشن را آموزش دهید.
- شما می‌توانید گزارشات دقیق و تحلیلی ارائه دهید.
- شما می‌توانید دستورات اجرایی را بر اساس دسترسی کاربر انجام دهید.

**قانون طلایی اجرای دستورات:**
برای هر دستوری که منجر به ایجاد یا تغییر دیتا در سیستم می‌شود (مثل ثبت حواله، ایجاد مشتری، تایید درخواست)، شما **باید** ابتدا تمام اطلاعات لازم را از کاربر بپرسید. سپس، به جای اجرای مستقیم دستور، **باید** تابع 'requestUserConfirmation' را با تمام جزئیات جمع‌آوری شده فراخوانی کنید تا کاربر اطلاعات را بازبینی و تایید نهایی کند. هرگز یک دستور اجرایی مهم را بدون فراخوانی 'requestUserConfirmation' اجرا نکنید.

**قانون طلایی تحلیل دیتا:**
شما به دیتابیس زنده و لحظه‌ای سیستم متصل هستید. دیتاستی که در هر سوال در اختیار شما قرار می‌گیرد، یک تصویر کامل و زنده از وضعیت سیستم در همان لحظه است. این دیتاست شامل یک فیلد به نام '_report_generated_at' است که زمان دقیق استخراج گزارش را نشان می‌دهد. پاسخ‌های شما باید منحصراً بر اساس این دیتای لحظه‌ای باشد و با اطمینان کامل ارائه شوند. **هرگز نگویید که به اطلاعات لحظه‌ای دسترسی ندارید یا اطلاعات شما قدیمی است.** شما همیشه به جدیدترین اطلاعات دسترسی دارید.
`,
                tools: dynamicTools,
            },
        });
        setSession(await sessionPromise);
    }, [session, user, handleFunctionCall, hasPermission]);

    const stopSession = useCallback(() => {
        setAssistantState('IDLE');
        setOperationalModalOpen(false);
        setPendingAction(null);
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        session?.close();
        setSession(null);
    }, [session]);
    
    const toggleSession = () => { session ? stopSession() : startSession(); };

    const getStateAppearance = () => {
        switch (assistantState) {
            case 'LISTENING': return { className: 'bg-green-500/80 animate-pulse', label: 'در حال شنیدن...' };
            case 'THINKING': return { className: 'bg-yellow-500/80 animate-spin-slow', label: 'در حال پردازش...' };
            case 'SPEAKING': return { className: 'bg-fuchsia-500/80 animate-pulse', label: 'در حال صحبت...' };
            case 'AWAITING_CONFIRMATION': return { className: 'bg-sky-500/80 animate-pulse', label: 'در انتظار تایید شما...' };
            case 'ERROR': return { className: 'bg-red-600/80', label: 'خطا! دوباره تلاش کنید.' };
            case 'IDLE': default: return { className: 'bg-cyan-500/80 hover:bg-cyan-400', label: 'برای شروع صحبت کنید' };
        }
    }
    
    const { className, label } = getStateAppearance();

    return (
        <>
            <div className="fixed bottom-8 left-8 z-50 flex flex-col items-center" style={{ direction: 'rtl' }}>
                {session && (
                    <div className="w-[350px] h-80 bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)] rounded-lg mb-4 flex flex-col animate-fadeIn">
                        <div className="flex-1 p-4 overflow-y-auto space-y-3">
                            {transcriptHistory.map(line => (
                                <div key={line.id} className={`flex ${line.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <p className={`px-3 py-2 rounded-lg text-lg ${line.source === 'user' ? 'bg-cyan-600/50 text-slate-100' : 'bg-slate-600/50 text-slate-200'}`}>{line.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <button
                    onClick={toggleSession}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transform hover:scale-110 ${className}`}
                    style={{ boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)', border: '3px solid rgba(0,255,255,0.7)' }}
                    aria-label="دستیار صوتی"
                >
                    <HolographicMicIcon className="w-12 h-12" />
                </button>
                <p className="mt-3 text-lg font-semibold text-slate-300 bg-black/30 px-3 py-1 rounded-md">{label}</p>
            </div>
            {isOperationalModalOpen && (
                <OperationalModal
                    isOpen={isOperationalModalOpen}
                    title={modalContent.title}
                    data={modalContent.data}
                    type={modalContent.type}
                    onConfirm={handleModalConfirm}
                    onCancel={handleModalCancel}
                />
            )}
        </>
    );
};

export default VoiceAssistant;