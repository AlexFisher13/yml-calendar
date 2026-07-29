import type { CalendarData } from './model'

type ParsedYaml = {
  holidays: string[]
  working_weekends: string[]
  events: Record<string, string[]>
}

function parseYamlScalar(value: string): string {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed
      .slice(1, -1)
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
  }

  return trimmed
}

function buildDateFromParts(year: string, partialDate: string): string {
  return `${year.trim()}-${partialDate.trim()}`
}

export function parseCalendarYaml(yamlText: string): CalendarData {
  const parsed: ParsedYaml = {
    holidays: [],
    working_weekends: [],
    events: {},
  }
  const lines = yamlText.split(/\r?\n/)
  let currentSection: keyof ParsedYaml | null = null
  let currentYear: string | null = null
  let currentDate: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '    ')
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const sectionMatch = trimmed.match(
      /^(holidays|working_weekends|events):\s*(?:\[\])?$/,
    )
    if (sectionMatch) {
      currentSection = sectionMatch[1] as keyof ParsedYaml
      currentYear = null
      currentDate = null
      continue
    }

    if (!currentSection) {
      continue
    }

    if (currentSection === 'holidays' || currentSection === 'working_weekends') {
      const yearMatch = line.match(/^\s{2}([0-9]{4}):\s*$/)
      if (yearMatch) {
        currentYear = yearMatch[1]
        currentDate = null
        continue
      }

      const fullDateMatch = line.match(/^\s{2}-\s+(.+)\s*$/)
      if (fullDateMatch) {
        parsed[currentSection].push(parseYamlScalar(fullDateMatch[1]))
        currentYear = null
        continue
      }

      const partialDateMatch = line.match(/^\s{4}-\s+([0-9]{2}-[0-9]{2})\s*$/)
      if (partialDateMatch && currentYear) {
        parsed[currentSection].push(
          buildDateFromParts(currentYear, partialDateMatch[1]),
        )
      }
      continue
    }

    const yearMatch = line.match(/^\s{2}([0-9]{4}):\s*$/)
    if (yearMatch) {
      currentYear = yearMatch[1]
      currentDate = null
      continue
    }

    const fullDateMatch = line.match(
      /^\s{2}([0-9]{4}-[0-9]{2}-[0-9]{2}):\s*$/,
    )
    if (fullDateMatch) {
      currentDate = fullDateMatch[1]
      parsed.events[currentDate] ??= []
      currentYear = null
      continue
    }

    const fullDateWithTitleMatch = line.match(
      /^\s{2}([0-9]{4}-[0-9]{2}-[0-9]{2}):\s+(.+)\s*$/,
    )
    if (fullDateWithTitleMatch) {
      currentDate = fullDateWithTitleMatch[1]
      parsed.events[currentDate] ??= []
      parsed.events[currentDate].push(parseYamlScalar(fullDateWithTitleMatch[2]))
      currentYear = null
      continue
    }

    const partialDateMatch = line.match(/^\s{4}([0-9]{2}-[0-9]{2}):\s*$/)
    if (partialDateMatch && currentYear) {
      currentDate = buildDateFromParts(currentYear, partialDateMatch[1])
      parsed.events[currentDate] ??= []
      continue
    }

    const partialDateWithTitleMatch = line.match(
      /^\s{4}([0-9]{2}-[0-9]{2}):\s+(.+)\s*$/,
    )
    if (partialDateWithTitleMatch && currentYear) {
      currentDate = buildDateFromParts(currentYear, partialDateWithTitleMatch[1])
      parsed.events[currentDate] ??= []
      parsed.events[currentDate].push(
        parseYamlScalar(partialDateWithTitleMatch[2]),
      )
      continue
    }

    const titleMatch = line.match(/^\s{4}-\s+(.+)\s*$/)
    if (titleMatch && currentDate && !currentYear) {
      parsed.events[currentDate].push(parseYamlScalar(titleMatch[1]))
      continue
    }

    const nestedTitleMatch = line.match(/^\s{6}-\s+(.+)\s*$/)
    if (nestedTitleMatch && currentDate && currentYear) {
      parsed.events[currentDate].push(parseYamlScalar(nestedTitleMatch[1]))
    }
  }

  return {
    holidays: parsed.holidays.sort((a, b) => a.localeCompare(b)),
    workingWeekends: parsed.working_weekends.sort((a, b) => a.localeCompare(b)),
    events: Object.entries(parsed.events)
      .flatMap(([date, titles]) =>
        titles.map((title) => ({
          date,
          title: title.trim() || 'Событие',
        })),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}
