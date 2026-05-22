const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''

export interface FoodAnalysisResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
}

export const isGeminiEnabled = !!GEMINI_API_KEY

// A list of realistic mock items for simulated fallback
const mockFoods: FoodAnalysisResult[] = [
  {
    name: 'Grilled Salmon & Quinoa Bowl',
    calories: 520,
    protein: 38,
    carbs: 42,
    fat: 22,
    description: 'Fresh grilled salmon fillet over red quinoa with steamed broccoli, avocado slices, and lemon vinaigrette.',
  },
  {
    name: 'Avocado Egg Toast',
    calories: 340,
    protein: 14,
    carbs: 24,
    fat: 18,
    description: 'Sourdough toast topped with mashed avocado, two soft-boiled eggs, cherry tomatoes, and chili flakes.',
  },
  {
    name: 'Grilled Chicken & Rice',
    calories: 460,
    protein: 42,
    carbs: 52,
    fat: 8,
    description: 'Lean chicken breast grilled with herbs, served with brown rice and mixed roasted bell peppers.',
  },
  {
    name: 'Protein Berry Smoothie Bowl',
    calories: 290,
    protein: 18,
    carbs: 45,
    fat: 5,
    description: 'Blended banana and mixed berries with vanilla protein powder, topped with chia seeds, granola, and honey.',
  },
  {
    name: 'Double Cheeseburger & Fries',
    calories: 890,
    protein: 36,
    carbs: 88,
    fat: 44,
    description: 'Indulgent double beef patty cheeseburger on a brioche bun, served with a side of salted french fries.',
  },
  {
    name: 'Greek Yogurt Parfait',
    calories: 210,
    protein: 17,
    carbs: 28,
    fat: 3,
    description: 'Non-fat Greek yogurt layered with organic blueberries, strawberries, and a sprinkle of raw walnuts.',
  },
  {
    name: 'Garden Salad with Vinaigrette',
    calories: 150,
    protein: 3,
    carbs: 12,
    fat: 10,
    description: 'Mixed greens, cucumber, carrots, red onion, and olive oil balsamic dressing.',
  },
]

/**
 * Analyzes a base64 encoded food image using Gemini 1.5 Flash (if API key is present)
 * or returns a simulated classification result after a brief delay.
 */
export async function analyzeFoodImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<FoodAnalysisResult> {
  if (!isGeminiEnabled) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))
    // Return a random food from mock list
    const randomIndex = Math.floor(Math.random() * mockFoods.length)
    return mockFoods[randomIndex]
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Identify the food item(s) in this photo and estimate its nutritional content. Return ONLY a JSON object matching this schema:\n{\n  "name": "string (e.g., Avocado Toast with Egg)",\n  "calories": number (in kcal),\n  "protein": number (in grams),\n  "carbs": number (in grams),\n  "fat": number (in grams),\n  "description": "string (brief description of estimation and ingredients)"\n}'
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
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
      calories: typeof parsed.calories === 'number' ? Math.round(parsed.calories) : 0,
      protein: typeof parsed.protein === 'number' ? Math.round(parsed.protein) : 0,
      carbs: typeof parsed.carbs === 'number' ? Math.round(parsed.carbs) : 0,
      fat: typeof parsed.fat === 'number' ? Math.round(parsed.fat) : 0,
      description: parsed.description ?? 'AI analysis completed.',
    }
  } catch (error) {
    console.error('[Gemini AI] Error during food image analysis:', error)
    // Fallback to local mock on failure
    const fallback = mockFoods[0]
    return {
      ...fallback,
      description: `[AI Fallback Mode] Analysis failed: ${error instanceof Error ? error.message : String(error)}. Showing simulated breakdown.`,
    }
  }
}
