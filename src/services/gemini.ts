import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// Using the provided API key
const API_KEY = process.env.AI_API_KEY || "e0572ec3-d2af-4f2b-8607-7bf6d5bf561c";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateQuestion(chapter: string, difficulty: string): Promise<Partial<Question>> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate 1 NEET-level Biology MCQ from the chapter '${chapter}'. Difficulty: ${difficulty}. Provide 4 options, the correct answer, and a short NCERT-based explanation (2-3 lines).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options"
          },
          correctAnswer: { type: Type.STRING, description: "Must be one of the options" },
          explanation: { type: Type.STRING },
          chapter: { type: Type.STRING },
          difficulty: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer", "explanation", "chapter", "difficulty"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      ...data,
      createdAt: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("Failed to generate question");
  }
}
