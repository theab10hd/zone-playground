import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { UsageWindow, UsageWindows } from '../types'

const windows = atom(
  { plugin: 'zmod', key: 'windows' } as const,
  { fiveHour: null, weekly: null },
)

const CLAUDE_ORANGE = '#D97757'
const BAR_WIDTH_PX = 180
const BAR_HEIGHT_PX = 8
// Terminal has no Svg, so it falls back to a continuous line of this many cells.
const TERMINAL_BAR_CELLS = 20

// A rounded track with a rounded fill; the track is translucent so it reads on light and dark themes.
const buildBarSvg = (percentUsed: number) => {
  const radius = BAR_HEIGHT_PX / 2
  const clampedPercent = Math.max(0, Math.min(100, percentUsed))
  // Keep any non-zero fill at least as wide as its rounded caps so it never draws as a sliver.
  const fillWidth = clampedPercent === 0 ? 0 : Math.max(BAR_HEIGHT_PX, (clampedPercent / 100) * BAR_WIDTH_PX)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH_PX}" height="${BAR_HEIGHT_PX}" viewBox="0 0 ${BAR_WIDTH_PX} ${BAR_HEIGHT_PX}">` +
    `<rect width="${BAR_WIDTH_PX}" height="${BAR_HEIGHT_PX}" rx="${radius}" fill="rgba(128,128,128,0.28)"/>` +
    (fillWidth > 0 ? `<rect width="${fillWidth}" height="${BAR_HEIGHT_PX}" rx="${radius}" fill="${CLAUDE_ORANGE}"/>` : '') +
    `</svg>`
  )
}

const pickWindow = (rateLimits: SessionRateLimit[], kind: string): UsageWindow | null => {
  const window = rateLimits.find(limit => limit.kind === kind)
  return window ? { percentUsed: window.percentUsed, resetsAt: window.resetsAt } : null
}

const pickWindows = (rateLimits: SessionRateLimit[]): UsageWindows => ({
  fiveHour: pickWindow(rateLimits, 'five_hour'),
  weekly: pickWindow(rateLimits, 'seven_day'),
})

const formatReset = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const minutesLeft = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  const days = Math.floor(minutesLeft / 1440)
  const hours = Math.floor((minutesLeft % 1440) / 60)
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutesLeft % 60}m`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    await update($, windows, () => pickWindows(usage.rateLimits))
    return result
  })

  // Pushed after each turn and whenever a window moves a whole point.
  on('session.measure', async ($, e, next) => {
    await update($, windows, () => pickWindows(e.rateLimits))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { fiveHour, weekly } = await read($, windows)
    if (e.props.hasSurvey || (fiveHour === null && weekly === null)) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const now = await $.clock.now()

    const usageBar = (label: string, window: UsageWindow) => {
      const reset = formatReset(window.resetsAt, now)
      const filledCells = Math.min(TERMINAL_BAR_CELLS, Math.round((window.percentUsed / 100) * TERMINAL_BAR_CELLS))
      return (
        <Box key={label} flexDirection="row" alignItems="center" width="50%">
          <Box marginRight={2}>
            <Text dimColor>{label}</Text>
          </Box>
          {'Svg' in elements ? (
            <elements.Svg
              source={buildBarSvg(window.percentUsed)}
              alt={`${label} ${window.percentUsed}% used`}
              width={BAR_WIDTH_PX}
              height={BAR_HEIGHT_PX}
            />
          ) : (
            <Box flexDirection="row">
              <Text color="claude">{'━'.repeat(filledCells)}</Text>
              <Text dimColor>{'━'.repeat(TERMINAL_BAR_CELLS - filledCells)}</Text>
            </Box>
          )}
          <Box marginLeft={2}>
            <Text bold>{window.percentUsed}%</Text>
            <Text dimColor>{reset ? ` · resets in ${reset}` : ''}</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="row" width="100%">
        {fiveHour && usageBar('5h', fiveHour)}
        {weekly && usageBar('Weekly', weekly)}
      </Box>
    )
  })
}
