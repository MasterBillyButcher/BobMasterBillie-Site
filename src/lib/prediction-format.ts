// Twitch prediction copy-paste format - ready to start a prediction, nothing extra.
// The block mirrors Twitch's prediction setup fields: command, title, options, duration.
import type { Prediction } from '@/lib/types'

// Twitch limits for the native "Predict with Channel Points" form
export const TWITCH_TITLE_MAX = 45
export const TWITCH_OPTION_MAX = 25

// Twitch chat command used to start the prediction
export const PREDICTION_COMMAND = '/prediction'

export function predictionSetupText(p: Prediction): string {
  const options: string[] = JSON.parse(p.options)
  return [
    PREDICTION_COMMAND,
    `Title: ${p.title}`,
    ...options.map((o, i) => `Option ${i + 1}: ${o}`),
    `Duration: ${p.duration}`,
  ].join('\n')
}

export function optionLines(optionsJson: string): string[] {
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
