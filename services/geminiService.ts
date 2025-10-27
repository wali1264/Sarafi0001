import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// TODO: For production, this key should be moved to a secure environment variable (e.g., Vercel Environment Variables)
// and accessed via `process.env.API_KEY`. Hardcoding is for temporary experimental deployment only.
const apiKey = 'AIzaSyDja-PjvYDlcBaRV3g0dNxJU0LEonda2As';

class GeminiService {
    public ai: GoogleGenAI;

    constructor(apiKey: string | undefined) {
        // Initialize with the key, even if it's undefined. The API will handle the error upon first call.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;