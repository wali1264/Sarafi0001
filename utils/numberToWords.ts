const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const tens = ["", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const thousands = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

function convertThreeDigits(num: number): string {
    if (num === 0) return "";
    let str = "";
    if (num >= 100) {
        str += hundreds[Math.floor(num / 100)];
        num %= 100;
        if (num > 0) str += " و ";
    }
    if (num >= 20) {
        str += tens[Math.floor(num / 10)];
        num %= 10;
        if (num > 0) str += " و ";
    } else if (num >= 10) {
        str += teens[num - 10];
        num = 0;
    }
    if (num > 0) {
        str += units[num];
    }
    return str.trim();
}

export function numberToWords(num: number): string {
    if (num === 0) return "صفر";
    if (num < 0) return "منفی " + numberToWords(Math.abs(num));
    
    // Handle decimals
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let str = "";
    let i = 0;
    let tempNum = integerPart;
    if (tempNum === 0 && decimalPart > 0) {
        // No integer part, only decimal
    } else {
        while (tempNum > 0) {
            const chunk = tempNum % 1000;
            if (chunk > 0) {
                let chunkStr = convertThreeDigits(chunk);
                if (i > 0) {
                    // Special case for 1000, don't say "یک هزار"
                    if (chunk === 1 && i === 1) {
                         chunkStr = "";
                    }
                    chunkStr += " " + thousands[i];
                }
                str = chunkStr + (str ? " و " + str : "");
            }
            tempNum = Math.floor(tempNum / 1000);
            i++;
        }
    }


    if (decimalPart > 0) {
        if (str) {
            str += " ممیز ";
        }
        str += convertThreeDigits(decimalPart);
    }

    return str.trim().replace(/\s+/g, ' '); 
}
