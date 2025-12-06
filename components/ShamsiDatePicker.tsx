
import React, { useState, useEffect } from 'react';
import { gregorianToJalali, jalaliToGregorian } from '../utils/dateConverter';
import { AFGHAN_MONTHS } from '../constants';

interface ShamsiDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    label?: string;
}

const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({ value, onChange, label }) => {
    const [shamsi, setShamsi] = useState({ y: '', m: '', d: '' });

    useEffect(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [gy, gm, gd] = value.split('-').map(Number);
            if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
                const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
                setShamsi({ y: String(jy), m: String(jm), d: String(jd) });
            }
        } else {
             // If the value is cleared or invalid, default to today
             const today = new Date();
             const [jy, jm, jd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
             setShamsi({ y: String(jy), m: String(jm), d: String(jd) });
        }
    }, [value]);

    const handleChange = (part: 'y' | 'm' | 'd', val: string) => {
        const newShamsi = { ...shamsi, [part]: val };
        setShamsi(newShamsi);

        const jy = parseInt(newShamsi.y, 10);
        const jm = parseInt(newShamsi.m, 10);
        const jd = parseInt(newShamsi.d, 10);

        // Validate basic ranges (Year > 1000, Month 1-12, Day 1-31)
        if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd) && jy > 1000 && jm > 0 && jm < 13 && jd > 0 && jd < 32) {
            try {
                const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
                // Construct standard ISO string YYYY-MM-DD
                const gDateString = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
                onChange(gDateString);
            } catch (e) {
                // Ignore invalid date combinations (e.g. 32nd of a month) until user corrects input
            }
        }
    };

    return (
        <div className="flex flex-col">
            {label && <label className="text-sm font-medium text-cyan-300 mb-2 block">{label}</label>}
            <div className="flex items-center gap-2" style={{ direction: 'rtl' }}>
                <input
                    type="number"
                    placeholder="روز"
                    value={shamsi.d}
                    onChange={e => handleChange('d', e.target.value)}
                    className="w-16 text-center text-lg px-1 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors"
                    min={1}
                    max={31}
                />
                <select
                    value={shamsi.m}
                    onChange={e => handleChange('m', e.target.value)}
                    className="flex-grow text-lg px-2 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors appearance-none text-center cursor-pointer"
                >
                    {AFGHAN_MONTHS.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                    ))}
                </select>
                <input
                    type="number"
                    placeholder="سال"
                    value={shamsi.y}
                    onChange={e => handleChange('y', e.target.value)}
                    className="w-24 text-center text-lg px-1 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:border-cyan-400 focus:outline-none transition-colors"
                />
            </div>
        </div>
    );
};

export default ShamsiDatePicker;
