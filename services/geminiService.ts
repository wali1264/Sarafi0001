import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// Use the environment variable for the API key as per security best practices.
const apiKey = process.env.API_KEY;

class GeminiService {
    public ai: GoogleGenAI;

    constructor(apiKey: string | undefined) {
        // Initialize with the key, even if it's undefined. The API will handle the error upon first call.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;