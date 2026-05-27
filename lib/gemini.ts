const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''

export interface FoodAnalysisResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
  servingSize: string
  confidence: number
}

export const isGeminiEnabled = !!GEMINI_API_KEY

export async function analyzeFoodImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<FoodAnalysisResult> {
  if (!isGeminiEnabled) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return {
      name: 'Home-cooked Meal',
      calories: 420,
      protein: 28,
      carbs: 35,
      fat: 18,
      description: 'AI analysis simulation enabled when Gemini API key is configured.',
      servingSize: '1 plate (~300g)',
      confidence: 0.7,
    }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are a professional nutritionist AI. Analyze the food in this photo and return precise nutritional estimates.

CRITICAL: Return ONLY valid JSON matching this exact schema:
{
  "name": "Name of the dish/meal",
  "calories": total estimated calories (number),
  "protein": protein in grams (number),
  "carbs": carbohydrates in grams (number),
  "fat": fat in grams (number),
  "description": "Brief description of ingredients and preparation method",
  "servingSize": "Estimated serving size (e.g., '1 bowl ~250g')",
  "confidence": confidence level 0-1 (number, based on how clearly the food is visible)
}

Guidelines for accuracy:
- Be conservative with portion size estimates - default to 1 standard serving
- If the image is unclear or has multiple items, estimate the main dish only
- Use standard nutritional databases (USDA) for reference values
- Round values to nearest 5 for calories, nearest gram for macros
- If you cannot identify any food, set confidence to 0.1 and use name "Unknown Food"`
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                },
              },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            topP: 0.95,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`)
    }

    const json = await response.json()
    const textResult = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textResult) {
      throw new Error('Gemini API did not return text candidate.')
    }

    const parsed: FoodAnalysisResult = JSON.parse(textResult.trim())
    return {
      name: parsed.name ?? 'Unknown Meal',
      calories: typeof parsed.calories === 'number' ? Math.round(parsed.calories / 5) * 5 : 0,
      protein: typeof parsed.protein === 'number' ? Math.round(parsed.protein) : 0,
      carbs: typeof parsed.carbs === 'number' ? Math.round(parsed.carbs) : 0,
      fat: typeof parsed.fat === 'number' ? Math.round(parsed.fat) : 0,
      description: parsed.description ?? 'AI analysis completed.',
      servingSize: parsed.servingSize ?? '1 serving',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    }
  } catch (error) {
    console.error('[Gemini AI] Error during food image analysis:', error)
    return {
      name: 'Unknown Food',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: `AI analysis failed: ${error instanceof Error ? error.message : String(error)}.`,
      servingSize: 'N/A',
      confidence: 0,
    }
  }
}
