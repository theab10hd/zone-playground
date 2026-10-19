import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { UsageWindow, UsageWindows } from '../types'

const windows = atom(
  { plugin: 'zmod', key: 'windows' } as const,
  { fiveHour: null, weekly: null },
)

const CLAUDE_ORANGE = '#D97757'
const BAR_HEIGHT_PX = 6
// ponytail: Svg is sized in CSS pixels while the band lays out in cells; 7px per cell keeps the bar inside its cells at the usual font size.
const PX_PER_CELL = 7
const LABEL_COLUMNS = 8
const STATS_COLUMNS = 14
const GAP_COLUMNS = 3
const MIN_BAR_COLUMNS = 8
const MAX_BAR_COLUMNS = 28
const MIN_BLOCK_COLUMNS = LABEL_COLUMNS + MIN_BAR_COLUMNS + STATS_COLUMNS

// A rounded track with a rounded fill; the track is translucent so it reads on light and dark themes.
const buildBarSvg = (percentUsed: number, barWidthPx: number) => {
  const radius = BAR_HEIGHT_PX / 2
  const clampedPercent = Math.max(0, Math.min(100, percentUsed))
  // Keep any non-zero fill at least as wide as its rounded caps so it never draws as a sliver.
  const fillWidth = clampedPercent === 0 ? 0 : Math.max(BAR_HEIGHT_PX, (clampedPercent / 100) * barWidthPx)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${barWidthPx}" height="${BAR_HEIGHT_PX}" viewBox="0 0 ${barWidthPx} ${BAR_HEIGHT_PX}">` +
    `<rect width="${barWidthPx}" height="${BAR_HEIGHT_PX}" rx="${radius}" fill="rgba(128,128,128,0.28)"/>` +
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

    // Side by side when both blocks fit at their minimum width, otherwise one per row.
    const shownCount = (fiveHour ? 1 : 0) + (weekly ? 1 : 0)
    const isSideBySide = shownCount === 2 && e.props.bodyColumns >= MIN_BLOCK_COLUMNS * 2 + GAP_COLUMNS
    const blockColumns = isSideBySide ? Math.floor((e.props.bodyColumns - GAP_COLUMNS) / 2) : e.props.bodyColumns
    const barColumns = Math.max(
      MIN_BAR_COLUMNS,
      Math.min(MAX_BAR_COLUMNS, blockColumns - LABEL_COLUMNS - STATS_COLUMNS),
    )

    const usageBar = (label: string, window: UsageWindow) => {
      const reset = formatReset(window.resetsAt, now)
      const filledCells = Math.min(barColumns, Math.round((window.percentUsed / 100) * barColumns))
      return (
        <Box key={label} flexDirection="row" alignItems="center" width={blockColumns}>
          <Box width={LABEL_COLUMNS} flexShrink={0}>
            <Text dimColor wrap="truncate">{label}</Text>
          </Box>
          <Box width={barColumns} flexShrink={0}>
            {'Svg' in elements ? (
              <elements.Svg
                source={buildBarSvg(window.percentUsed, barColumns * PX_PER_CELL)}
                alt={`${label} ${window.percentUsed}% used`}
                width={barColumns * PX_PER_CELL}
                height={BAR_HEIGHT_PX}
              />
            ) : (
              <Text>
                <Text color="claude">{'━'.repeat(filledCells)}</Text>
                <Text dimColor>{'━'.repeat(barColumns - filledCells)}</Text>
              </Text>
            )}
          </Box>
          <Box width={STATS_COLUMNS} flexShrink={0} marginLeft={1}>
            <Text wrap="truncate">
              <Text bold>{window.percentUsed}%</Text>
              <Text dimColor>{reset ? ` · ${reset}` : ''}</Text>
            </Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection={isSideBySide ? 'row' : 'column'} columnGap={GAP_COLUMNS}>
        {fiveHour && usageBar('5h', fiveHour)}
        {weekly && usageBar('Weekly', weekly)}
      </Box>
    )
  })
}
