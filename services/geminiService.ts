
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// Hardcoded API key as requested by the user for deployment purposes.
const apiKey = 'AIzaSyClpXrP1CNPc5ebgsdNk6U6mBFmim6qjm0';

class GeminiService {
    public ai: GoogleGenAI;

    constructor(apiKey: string | undefined) {
        // Initialize with the key.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;