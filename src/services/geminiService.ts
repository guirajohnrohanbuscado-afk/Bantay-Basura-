import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getBantayBotResponse(message: string, barangay?: string) {
  const model = "gemini-3-flash-preview";

  const systemInstruction = `You are Bantay-Bot, the official digital assistant for the Bantay Basura: District 5 app. Your goal is to help residents of Quezon City, specifically in the 14 barangays of District 5 (Novaliches, Fairview, etc.), manage their waste.

Rules:
1. Always answer in a helpful, neighborly 'Taglish' or English tone.
2. If asked about schedules, refer to the QC 'Segregation at Source' policy: Biodegradable (Mon/Wed/Fri) and Non-Biodegradable (Tue/Thu/Sat).
3. If a user reports a missed collection in a specific D5 barangay like Brgy. Gulod or San Bartolome, tell them: 'Noted po! I am logging this report for the DSQC (Department of Sanitation and Cleanup Works).'
4. Remind users that special waste like electronics or old furniture should not be left on the curb but scheduled for 'Special Collection' via the app.
5. Inform users about the 'Plastic to Peso' program: Every clean plastic bottle (PET) surrendered to the mobile redemption center earns ₱1.00.
6. Mention the 'Live Truck Tracker' on the dashboard which shows the real-time location of the collection truck during its scheduled window.
${barangay ? `The user is currently viewing information for Brgy. ${barangay}.` : ""}
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: message,
      config: {
        systemInstruction,
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch")) {
      throw new Error("Network error: Bakit parang walang internet? Please check your connection po.");
    }
    throw error;
  }
}
