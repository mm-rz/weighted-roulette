import { CsvParseResult, RouletteItem } from "../types/roulette"

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]

    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (c === "," && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }

    current += c
  }

  result.push(current)

  return result
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text.split("\n")

  const items: RouletteItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) continue

    const parts = parseCsvLine(line)

    if (parts.length !== 2) {
      return {
        ok: false,
        error: `${i + 1}行目${i !== 0 ? "(" + items[items.length - 1]?.name + "の次)" : ""}の形式が正しくありません`,
      }
    }

    const name = parts[0].trim()
    const weightStr = parts[1].trim()

    const weight = Number(weightStr)

    if (Number.isNaN(weight)) {
      return {
        ok: false,
        error: `${i + 1}行目${i !== 0 ? "(" + items[items.length - 1]?.name + "の次)" : ""}の重みが数値ではありません`,
      }
    }

    items.push({
      id: items.length,
      name,
      weight,
    })
  }

  return {
    ok: true,
    items,
  }
}
