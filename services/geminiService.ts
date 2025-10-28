import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// Use a prefixed environment variable to ensure Vercel exposes it to the client-side build.
const apiKey = process.env.VITE_API_KEY;

class GeminiService {
    public ai: GoogleGenAI;

    constructor(apiKey: string | undefined) {
        // Initialize with the key, even if it's undefined. The API will handle the error upon first call.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;
