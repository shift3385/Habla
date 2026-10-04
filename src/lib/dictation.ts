import { askGemini, withRetry, type JsonSchema, type Models } from './gemini'

// Dictado por voz (NC-05): el alumno dice el tema de Tema libre o Debate y Gemini lo pasa a texto.

const SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string' } },
}

/** Transcribe una frase corta en español o en inglés, tal como se dijo (sin traducir). */
export async function dictate(apiKey: string, models: Models, audio: { base64: string; mimeType: string }): Promise<string> {
  const raw = await withRetry({ ...models, timeoutMs: 30_000 }, (model) =>
    askGemini<{ text: string }>(apiKey, model, {
      system: 'You are an accurate speech transcriber.',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: audio.mimeType, data: audio.base64 } },
            {
              text: 'Transcribe exactly what the speaker says, in the language they speak (Spanish or English); do not translate. It is a short topic for a conversation class. Add normal punctuation. If there is no speech, return an empty string.',
            },
          ],
        },
      ],
      schema: SCHEMA,
      temperature: 0,
      maxTokens: 300,
    }),
  )
  return (raw.text ?? '').trim()
}
