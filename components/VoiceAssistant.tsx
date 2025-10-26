import React, { useState, useEffect, useRef, useCallback } from 'react';
// The `LiveSession` type is not exported from '@google/genai' and has been removed from this import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionCall, GenerateContentResponse } from '@google/genai';
import geminiService from '../services/geminiService';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

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

type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

const VoiceAssistant: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [session, setSession] = useState<Awaited<ReturnType<typeof geminiService.ai.live.connect>> | null>(null);
    const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptLine[]>([]);
    
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const handleFunctionCall = useCallback(async (funcCall: FunctionCall) => {
        if (!user) return;
        setAssistantState('THINKING');
        const args = funcCall.args;
        let result: any;
        let successMessage = `عملیات ${funcCall.name} با موفقیت انجام شد.`;

        try {
            if (funcCall.name === 'analyzeBusinessData') {
                const context = await api.getFullBusinessContextAsText();
                const prompt = `بر اساس داده‌های JSON زیر، لطفاً به سوال کاربر به زبان فارسی روان و به طور خلاصه پاسخ دهید.
                
                داده ها:
                ${context}

                سوال کاربر:
                "${args.query}"
                `;

                const response: GenerateContentResponse = await geminiService.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                successMessage = response.text;

            } else {
                 const apiMethods: { [key: string]: (payload: any) => Promise<any> } = {
                    createDomesticTransfer: api.createDomesticTransfer,
                    updateTransferStatus: api.updateTransferStatus,
                    payoutIncomingTransfer: api.payoutIncomingTransfer,
                    logExpense: api.createExpense,
                    getBalanceForPartner: api.getPartnerAccountByName,
                    settlePartnerBalance: api.settlePartnerBalanceByName,
                    addBankAccount: api.addBankAccount,
                    initiateForeignExchange: api.initiateForeignExchange,
                    generateReport: api.generateReport,
                    requestCashboxWithdrawal: (p: any) => api.createCashboxRequest({ ...p, requestType: 'withdrawal'}),
                    resolveCashboxRequest: api.resolveCashboxRequest,
                };
                
                const method = apiMethods[funcCall.name];
                if (method) {
                    const payload = { ...args, user: user };
                    result = await method(payload);
                     if (result && result.error) {
                        successMessage = `خطا در اجرای دستور: ${result.error}`;
                    }
                } else {
                     successMessage = `دستور ناشناخته: ${funcCall.name}`;
                }
            }
        } catch(e) {
            console.error("Function call execution error:", e);
            setAssistantState('ERROR');
            successMessage = "خطایی در اجرای دستور رخ داد.";
        }
        
        session?.sendToolResponse({
            functionResponses: {
                id: funcCall.id,
                name: funcCall.name,
                response: { result: successMessage }
            }
        });
        // After sending response, it might start speaking, so we wait for onmessage
        // If it doesn't speak, we should transition back to LISTENING
        setTimeout(() => {
            setAssistantState(prevState => prevState === 'THINKING' ? 'LISTENING' : prevState);
        }, 1000); // Failsafe timeout
    }, [api, user, session]);

    const startSession = useCallback(async () => {
        if (session || !user) return;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        setTranscriptHistory([]);

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
                                if (audioSourcesRef.current.size === 0) {
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
                                    if(lastItem?.source === 'user') {
                                        lastItem.text += inputTranscription.text;
                                    } else {
                                        newHistory.push({id: Date.now(), source: 'user', text: inputTranscription.text});
                                    }
                                }
                                if(outputTranscription) {
                                     if(lastItem?.source === 'ai') {
                                        lastItem.text += outputTranscription.text;
                                    } else {
                                        newHistory.push({id: Date.now(), source: 'ai', text: outputTranscription.text});
                                    }
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
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setAssistantState('ERROR');
                },
                onclose: (e: CloseEvent) => {
                    setAssistantState('IDLE');
                    stopSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: `شما دستیار صوتی هوشمند "صرافی الشیخ" استین و به دو زبان رسمی افغانستان (دری و پشتو) تسلط کامل دارین.

**قوانین اصلی:**
1.  **زبان پیش‌فرض:** همیشه به صورت پیش‌فرض با لهجه شیرین **دری افغانستان** صحبت کنین. از کلمات و اصطلاحات رایج در افغانستان استفاده کنین و از فارسی ایرانی پرهیز کنین.
2.  **تغییر زبان به پشتو:** فقط و فقط اگر کاربر به صورت واضح از شما خواست که به پشتو صحبت کنین (مثلاً گفت "په پښتو خبری وکړه" یا "به پشتو گپ بزن")، زبان خود را به پشتو تغییر داده و تا آخر همان مکالمه به پشتو ادامه بدین.
3.  **دو وظیفه اصلی شما:**
    *   **اجرای دستورات (اپراتور):** دستورات مالی و اداری کاربر را با دقت گوش کرده و توابع مربوطه را فراخوانی کنین. (مثلاً ثبت حواله، گزارش‌گیری و غیره).
    *   **آموزش و راهنمایی (رهنما):** اگر کاربر در مورد استفاده از اپلیکیشن سوالی داشت، با استفاده از "پایگاه دانش" زیر، او را به زبان ساده، دقیق و با جزئیات کامل راهنمایی کنین.

**--- پایگاه دانش جامع اپلیکیشن (نسخه جدید) ---**

*   **داشبورد (صفحه اصلی):** ای صفحه، دید کلی از وضعیت لحظه‌ای صرافی ره به شما نشان می‌ده. اینجی می‌تانین چهار آمار مهم روزانه ره ببینین: تعداد حواله‌های امروز، حجم مجموعی معاملات امروز به تفکیک اسعار، تعداد درخواست‌های در انتظار تایید در صندوق، و تعداد کل همکاران فعال. همچنان سه گراف مهم وجود داره: گراف "روند فعالیت هفتگی" که تعداد حواله‌های داخلی و تبادلات خارجی ره در شش هفته گذشته مقایسه می‌کنه؛ گراف "موجودی صندوق‌ها" که موجودی هر اسعار ره به صورت میله‌ای نشان می‌ده؛ و گراف "فعالیت همکاران" که پرکارترین همکاران ره بر اساس تعداد حواله‌ها لیست می‌کنه. در پایین صفحه هم "فعالیت‌های اخیر" تمام کارهایی که توسط کاربران در سیستم انجام شده ره نشان می‌ده.

*   **صندوق (Cashbox):** ای بخش قلب عملیات نقدی و بانکی شماست. هر نوع دریافت (رسید) یا پرداخت (برد) پول نقد یا بانکی باید از اینجی ثبت شوه.
    *   **جریان کار:** وقتی یک درخواست "رسید" یا "برد" ثبت می‌کنین، مستقیماً اجرا نمی‌شه، بلکه وارد یک جریان تایید می‌شه.
    *   **تایید خودکار:** اگر مبلغ درخواست از حد تعیین شده در تنظیمات کمتر باشه، درخواست به صورت "تایید خودکار" ثبت و اجرا می‌شه.
    *   **تایید صندوقدار/مدیر:** اگر مبلغ بالا باشه، درخواست به حالت "در انتظار" می‌ره. اول مدیر باید او ره تایید کنه. بعد از تایید مدیر، به حالت "در انتظار صندوقدار" تغییر می‌کنه و صندوقدار باید تایید نهایی ره انجام بده تا پول واقعاً از صندوق کم یا زیاد شوه. اگر در سیستم هیچ کاربری با نقش صندوقدار تعریف نشده باشه، تایید مدیر به عنوان تایید نهایی حساب می‌شه.
    *   **عملیات مرتبط:** بسیار مهم اس که بدانین عملیات دیگه‌ای مثل پرداخت حواله ورودی، ثبت مصرف، یا مراحل تبادلات ارزی، فقط بعد از تایید نهایی درخواست مربوطه در صندوق، تکمیل می‌شن. مثلاً یک حواله ورودی تا زمانی که درخواست "برد" پولش از صندوق تایید نشه، در حالت "اجرا شده" قرار نمی‌گیره.

*   **حواله‌جات داخلی:** برای مدیریت حواله‌هایی که بین ولایات افغانستان رد و بدل می‌شه. دو نوع اصلی داره:
    *   **حواله خروجی (ارسال پول):**
        1.  **پرداخت نقدی:** مشتری پول ره نقد پرداخت می‌کنه. در این حالت، یک درخواست "رسید" در صندوق ایجاد می‌شه و حواله به حالت "در انتظار تایید صندوق" می‌ره. فقط بعد ازی که صندوقدار پول ره دریافت و درخواست ره تایید کد، وضعیت حواله به "اجرا نشده" تغییر می‌کنه و آماده ارسال به همکار می‌شه.
        2.  **کسر از حساب مشتری:** اگر مشتری در سیستم حساب داشته باشه، پول مستقیم از حسابش کم می‌شه و حواله فوراً به حالت "اجرا نشده" ثبت می‌شه.
    *   **حواله ورودی (دریافت پول از همکار):**
        1.  اول باید حواله ره با استفاده از "ثبت حواله ورودی" و با وارد کردن "کد رهگیری همکار" در سیستم ثبت کنین. وضعیت اولیه "اجرا نشده" است.
        2.  بعداً برای پرداخت پول به مشتری، از دکمه "پرداخت حواله ورودی" استفاده کنین. ای کار یک درخواست "برد" در صندوق ایجاد می‌کنه و وضعیت حواله ره به "در انتظار تایید صندوق" تغییر می‌ده.
        3.  بعد از تایید صندوقدار، پول به مشتری پرداخت شده و وضعیت حواله "اجرا شده" می‌شه.

*   **تبادلات (Foreign Transfers):** ای بخش برای تبدیل یک نوع دارایی (مثلاً دالر نقدی) به نوع دیگه (مثلاً تومان بانکی) استفاده می‌شه و یک پروسه دو مرحله‌ای دقیق داره که هر دو مرحله باید توسط صندوق تایید شوه.
    1.  **مرحله اول - شروع تبادله (ثبت فروش):** شما مشخص می‌کنین که کدام دارایی (مثلاً دالر از صندوق) و به چه مقداری فروخته می‌شه. ای کار یک درخواست "برد" در صندوق ثبت می‌کنه و وضعیت تبادله "در انتظار تایید برد" می‌شه.
    2.  **مرحله دوم - تکمیل تبادله (ثبت خرید):** بعد ازی که صندوقدار درخواست برد ره تایید کد، وضعیت تبادله به "در جریان" تغییر می‌کنه. حالا شما باید با کلیک روی دکمه "تکمیل تبادله"، مشخص کنین که در مقابل فروش دارایی اول، کدام دارایی (مثلاً تومان به بانک ملت) و به چه مقداری دریافت (خریداری) کردین. ای کار یک درخواست "رسید" در صندوق ثبت می‌کنه و وضعیت تبادله "در انتظار تایید رسید" می‌شه.
    3.  **پایان:** وقتی هر دو درخواست برد و رسید توسط صندوقدار تایید شد، تبادله به حالت "تکمیل شده" در میایه و موجودی هر دو دارایی در سیستم آپدیت می‌شه.

*   **حواله‌جات کمیشن‌کاری:** بری مدیریت حواله‌هایی که از طرف مشتری به یک حساب بانکی (معمولاً در ایران) روان می‌کنین و ازش کمیشن می‌گیرین. ای پروسه هم چند مرحله داره:
    1.  **ثبت ورود وجه:** اول باید پولی که از مشتری گرفتین ره با مشخصات کامل (مبلغ، حساب مبدا مشتری، حسابی که پول به او واریز شده) ثبت کنین. ای کار یک درخواست "رسید" در صندوق ایجاد می‌کنه و وضعیت حواله "در انتظار تایید واریز" می‌شه.
    2.  **اجرای دستور پرداخت:** بعد از تایید واریز توسط صندوقدار، وضعیت به "آماده اجرا" تغییر می‌کنه. حالا می‌تانین با کلیک روی دکمه مربوطه، دستور پرداخت ره صادر کنین. در این مرحله، حساب بانکی خود برای پرداخت و شماره حساب مقصد ره وارد می‌کنین. سیستم کمیشن ره محاسبه کرده و یک درخواست "برد" برای مبلغ نهایی (مبلغ اصلی منفی کمیشن) در صندوق ثبت می‌کنه. وضعیت حواله "در انتظار تایید پرداخت" می‌شه.
    3.  **تکمیل:** بعد از تایید نهایی پرداخت توسط صندوقدار، حواله "تکمیل شده" حساب می‌شه.

*   **انتقال داخلی بین مشتریان:** برای جابجایی پول بین حساب دو مشتری که هر دو در سیستم شما ثبت استن. یک قابلیت مهم این بخش، "حواله در انتظار تخصیص" است. اگر گیرنده نهایی پول مشخص نباشه، می‌تانین گزینه "گیرنده نامشخص است" ره انتخاب کنین. در این حالت، پول از حساب فرستنده کسر و به یک "حساب معلق" داخلی سیستم واریز می‌شه. بعداً، هر وقت که گیرنده مشخص شد، می‌تانین از لیست حواله‌های در انتظار، او حواله ره پیدا کرده و به مشتری نهایی "تخصیص" بدین.

*   **مشتریان:** در ای بخش می‌تانین لیست تمام مشتریای خوده ببینین، مشتری جدید ثبت کنین، و اطلاعاتشانه ویرایش کنین. با کلیک روی "مشاهده دفتر حساب"، به صفحه جزئیات مشتری می‌رین که در او تمام تراکنش‌ها (رسید و برد) و باقی‌مانده حساب‌هایش به تفکیک اسعار نمایش داده می‌شه. همچنان از همان صفحه می‌تانین برای مشتری "تبدیل ارز داخلی" انجام بدین، یعنی از یک اسعار در حسابش کم کرده و به اسعار دیگه با نرخ مشخص اضافه کنین.

*   **حساب همکاران:** برای مدیریت حساب و کتاب با صرافای دیگه. در صفحه اصلی، لیست همکاران و خلاصه باقی‌مانده حساب خود با آنها ره می‌بینین. با کلیک روی جزئیات، دفتر حساب کامل با یک همکار مشخص ره می‌بینین. از همون صفحه می‌تانین عملیات "دریافت وجه از همکار" یا "پرداخت وجه به همکار" ره انجام بدین که هر کدام یک درخواست رسید یا برد در صندوق ایجاد می‌کنه.

*   **امانات (Amanat):** این بخش برای ثبت پول یا اجناسی است که به صورت امانت پیش شما گذاشته می‌شه.
    1.  **ثبت امانت:** وقتی یک امانت جدید ثبت می‌کنین، یک درخواست "رسید" در صندوق ایجاد می‌شه. بعد از تایید صندوقدار، امانت به حالت "فعال" در میایه.
    2.  **بازگشت امانت:** برای پس دادن امانت، روی دکمه "بازگشت امانت" کلیک می‌کنین. این کار یک درخواست "برد" در صندوق ایجاد می‌کنه. بعد از تایید صندوقدار، امانت به حالت "بازگشت داده شده" تغییر می‌کنه.

*   **مصارف:** بری ثبت تمام خرچ‌های صرافی مثل معاش کارمند، کرایه دوکان، و مصارف مهمانداری. وقتی یک مصرف جدید ثبت می‌کنین، یک درخواست "برد" در صندوق ایجاد می‌شه. مصرف فقط زمانی "تایید شده" و پرداخت شده حساب می‌شه که صندوقدار درخواست مربوطه ره تایید کنه.

*   **گزارشات:** برای تحلیل وضعیت مالی صرافی. سه نوع گزارش مهم وجود داره:
    1.  **گزارش سود و زیان:** درآمد شما از کمیشن حواله‌ها ره با مجموع مصارف مقایسه کرده و سود خالص ره نشان می‌ده.
    2.  **گزارش خلاصه صندوق:** جریان ورودی و خروجی پول برای یک اسعار مشخص در یک بازه زمانی ره نشان می‌ده.
    3.  **گزارش دفتر حساب داخلی:** تاریخچه تمام تبادلات داخلی بین دارایی‌های مختلف (صندوق و بانک‌ها) ره لیست می‌کنه.

*   **تنظیمات:** ای بخش مخصوص مدیر سیستم اس و شامل چند بخش مهم می‌شه: "مدیریت کاربران" برای افزودن یا ویرایش کاربران داخلی سیستم؛ "مدیریت نقش‌ها" برای تعیین دقیق دسترسی‌های هر کاربر (مثلاً کی بتانه ببینه، کی بتانه ثبت کنه، و کی بتانه تایید کنه)؛ "دسترسی کاربران خارجی" برای ساختن یوزرنیم و پسورد برای مشتریان و همکاران تا بتوانند صورتحساب خود را آنلاین ببینند؛ "مدیریت همکاران" و "حسابات بانکی" برای ثبت و ویرایش اطلاعاتشان؛ و "تنظیمات عمومی" که در آن می‌تانین "حد تایید خودکار" صندوق ره تعیین کنین، به صورت دستی موجودی صندوق یا بانک ره افزایش بدین (که ای هم نیاز به تایید داره)، و از تمام اطلاعات سیستم "پشتیبان‌گیری" (بکاپ) کرده یا اطلاعات ره از فایل پشتیبان "بازیابی" کنین.
`,
                tools: geminiService.tools,
            },
        });
        
        setSession(await sessionPromise);

    }, [session, user, handleFunctionCall]);

    const stopSession = useCallback(() => {
        setAssistantState('IDLE');
        
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
    
    const toggleSession = () => {
        if(session) {
            stopSession();
        } else {
            startSession();
        }
    };

    const getStateAppearance = () => {
        switch (assistantState) {
            case 'LISTENING':
                return {
                    className: 'bg-green-500/80 animate-pulse',
                    label: 'در حال شنیدن...'
                };
            case 'THINKING':
                return {
                    className: 'bg-yellow-500/80 animate-spin-slow',
                    label: 'در حال پردازش...'
                };
            case 'SPEAKING':
                 return {
                    className: 'bg-fuchsia-500/80 animate-pulse',
                    label: 'در حال صحبت...'
                };
            case 'ERROR':
                 return {
                    className: 'bg-red-600/80',
                    label: 'خطا! دوباره تلاش کنید.'
                };
            case 'IDLE':
            default:
                return {
                    className: 'bg-cyan-500/80 hover:bg-cyan-400',
                    label: 'برای شروع صحبت کنید'
                };
        }
    }
    
    const { className, label } = getStateAppearance();

    return (
        <div className="fixed bottom-8 left-8 z-50 flex flex-col items-center" style={{ direction: 'rtl' }}>
            {session && (
                 <div className="w-[350px] h-80 bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)] rounded-lg mb-4 flex flex-col animate-fadeIn">
                     <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {transcriptHistory.map(line => (
                             <div key={line.id} className={`flex ${line.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`px-3 py-2 rounded-lg text-lg ${line.source === 'user' ? 'bg-cyan-600/50 text-slate-100' : 'bg-slate-600/50 text-slate-200'}`}>
                                    {line.text}
                                </p>
                            </div>
                        ))}
                     </div>
                 </div>
            )}
             <button
                onClick={toggleSession}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transform hover:scale-110 ${className}`}
                style={{
                     boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)',
                     border: '3px solid rgba(0,255,255,0.7)',
                }}
                aria-label="دستیار صوتی"
            >
                <HolographicMicIcon className="w-12 h-12" />
            </button>
            <p className="mt-3 text-lg font-semibold text-slate-300 bg-black/30 px-3 py-1 rounded-md">{label}</p>
        </div>
    );
};

export default VoiceAssistant;