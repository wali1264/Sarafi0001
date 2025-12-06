
import { Currency } from './types';

export const CURRENCIES: Currency[] = [Currency.AFN, Currency.USD, Currency.PKR, Currency.EUR, Currency.IRT_BANK, Currency.IRT_CASH];

export const AFGHANISTAN_PROVINCES: string[] = [
    "ارزگان", "بادغیس", "بامیان", "بدخشان", "بغلان", "بلخ", "پروان", "پکتیا",
    "پکتیکا", "پنجشیر", "تخار", "جوزجان", "خوست", "دایکندی", "زابل", "سرپل",
    "سمنگان", "غزنی", "غور", "فاریاب", "فراه", "کابل", "کاپیسا", "کندز",
    "کندهار", "کنر", "لغمان", "لوگر", "ننگرهار", "نورستان", "نیمروز", "هرات",
    "هلمند", "وردک"
].sort((a, b) => a.localeCompare(b, 'fa'));

export const AFGHAN_MONTHS: string[] = [
    "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
    "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"
];
