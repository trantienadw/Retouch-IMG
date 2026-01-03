
import { GoogleGenAI, Type } from "@google/genai";
import { Adjustments } from "../types";

// Helper to check for key selection
async function ensureApiKey() {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
  }
}

export async function analyzeImageWithAI(imageBase64: string): Promise<{ 
  adjustments: Partial<Adjustments>, 
  reasoning: string 
}> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Corrected model name
      contents: [
        {
          parts: [
            {
              text: `Analyze this image and suggest the optimal adjustment values to professionally enhance it. 
              Return ONLY a JSON object with the following fields:
              {
                "exposure": number (-50 to 50),
                "contrast": number (-50 to 50),
                "saturation": number (-50 to 50),
                "brightness": number (-50 to 50),
                "highlights": number (-50 to 50),
                "shadows": number (-50 to 50),
                "temperature": number (-50 to 50),
                "sharpness": number (0 to 100),
                "reasoning": string (short Vietnamese explanation)
              }`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned no content");
    
    const parsed = JSON.parse(text);
    return {
      adjustments: parsed,
      reasoning: parsed.reasoning || "Tối ưu hóa hình ảnh hoàn tất."
    };
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found.")) {
      await (window as any).aistudio?.openSelectKey();
    }
    throw error;
  }
}

export async function applyAIStyle(imageBase64: string, style: string): Promise<string> {
  await ensureApiKey();
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey! });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Using Pro for high quality
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.split(',')[1],
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `Transform this image into the style of a ${style}. Make it look artistic, professional, and high resolution.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI failed to generate stylized image");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found.")) {
      await (window as any).aistudio?.openSelectKey();
    }
    throw error;
  }
}
