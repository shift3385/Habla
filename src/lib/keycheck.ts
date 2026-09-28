import { CapacitorHttp } from '@capacitor/core'
import { describeError } from './claude'

// Comprobación gratuita de las claves: listar modelos no consume créditos.

export async function checkAnthropicKey(key: string): Promise<string | null> {
  try {
    const res = await CapacitorHttp.get({
      url: 'https://api.anthropic.com/v1/models?limit=1',
      headers: {
        'x-api-key': key.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    })
    return res.status === 200 ? null : describeError('Anthropic', res.status, res.data)
  } catch {
    return 'Sin conexión con Anthropic.'
  }
}

export async function checkOpenAIKey(key: string): Promise<string | null> {
  try {
    const res = await CapacitorHttp.get({
      url: 'https://api.openai.com/v1/models/whisper-1',
      headers: { Authorization: `Bearer ${key.trim()}` },
    })
    return res.status === 200 ? null : describeError('OpenAI', res.status, res.data)
  } catch {
    return 'Sin conexión con OpenAI.'
  }
}
