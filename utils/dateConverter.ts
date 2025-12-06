// utils/dateConverter.ts

function div(a: number, b: number) {
  return Math.floor(a / b);
}

export function gregorianToJalali(gy: number, gm: number, gd: number) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + (div(gy2 + 3, 4)) - (div(gy2 + 99, 100)) + (div(gy2 + 399, 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (div(days, 12053));
    days %= 12053;
    jy += 4 * (div(days, 1461));
    days %= 1461;
    jy += div(days - 1, 365);
    if (days > 365) days = (days - 1) % 365;
    
    let jm, jd;
    if (days < 186) {
        jm = 1 + div(days, 31);
        jd = 1 + (days % 31);
    } else {
        jm = 7 + div(days - 186, 30);
        jd = 1 + ((days - 186) % 30);
    }
    return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (div(jy, 33) * 8) + (div(((jy % 33) + 3), 4)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * (div(days, 146097));
    days %= 146097;
    if (days > 36524) {
        days--;
        gy += 100 * (div(days, 36524));
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * (div(days, 1461));
    days %= 1461;
    gy += div(days - 1, 365);
    if (days > 365) days = (days - 1) % 365;
    
    let gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
}