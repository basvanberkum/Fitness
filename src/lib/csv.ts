export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  delimiter: string
}

function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r\n|\n/, 1)[0] ?? ''
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  const tabCount = (firstLine.match(/\t/g) ?? []).length
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
  if (semicolonCount > commaCount) return ';'
  return ','
}

/** Kleine, robuuste CSV-parser: ondersteunt aanhalingstekens, ingesloten scheidingstekens/nieuwe regels, en komma/puntkomma/tab. */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, '') // BOM
  const delimiter = detectDelimiter(text)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.length > 0) || row.length > 1) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [headerRow, ...dataRows] = rows
  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: dataRows.filter((r) => r.some((f) => f.trim().length > 0)),
    delimiter,
  }
}
