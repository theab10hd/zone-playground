export type UsageWindow = { percentUsed: number; resetsAt?: string }
export type UsageWindows = { fiveHour: UsageWindow | null; weekly: UsageWindow | null }

declare module 'claude-code' {
  interface PluginState {
    'zmod': { windows: UsageWindows }
  }
}
