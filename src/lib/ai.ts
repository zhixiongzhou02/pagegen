// AI Service types matching Rust backend

export type ApiProvider = 'claude' | 'openai'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface GenerateRequest {
  messages: Message[]
  systemPrompt?: string
}

export interface AiSettings {
  provider: ApiProvider
  apiKey: string
  model: string
}

// Available models for each provider
export const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
] as const

export const OPENAI_MODELS = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
] as const

// System prompt for page generation
export const DEFAULT_SYSTEM_PROMPT = `You are a professional front-end developer and UI designer.
Your task is to generate high-quality HTML/CSS/JavaScript code based on user requirements.

Requirements:
1. Use semantic HTML5 tags
2. CSS should use modern features (Flexbox/Grid)
3. Code should be well-structured with appropriate comments
4. Responsive design for mobile and desktop
5. Use inline styles or internal style sheets (<style> tags)
6. Images should use placeholder or Unsplash URLs
7. Use system font stacks or Google Fonts

Output format:
- Return ONLY the complete HTML file code
- Wrap code in \`\`\`html and \`\`\`
- Do not include markdown explanation text`

export function validateApiKey(_apiKey: string): { valid: boolean; error?: string } {
  return { valid: true }
}

export function buildPrompt(
  userInput: string,
  context?: string
): GenerateRequest {
  const content = context
    ? `${userInput}\n\nPrevious context:\n${context}`
    : userInput

  return {
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
}

export function extractCodeFromChunk(chunk: string): string | null {
  // Handle SSE format from Claude API
  if (chunk.startsWith('data: ')) {
    const jsonStr = chunk.slice(6) // Remove "data: " prefix

    if (jsonStr === '[DONE]') {
      return null
    }

    try {
      const json = JSON.parse(jsonStr)
      return json?.delta?.text ?? null
    } catch {
      return null
    }
  }
  return null
}
