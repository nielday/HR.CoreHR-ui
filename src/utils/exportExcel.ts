// Helper xuất Excel (.xlsx) dùng chung, có style "bảng đẹp".
// exceljs được nạp ĐỘNG (lazy-load) trong hàm — chỉ tải khi người dùng bấm xuất,
// nên KHÔNG nằm trong bundle chính, không ảnh hưởng tốc độ tải trang.

export interface ExcelColumn {
  header: string
  width?: number
  /** Căn lề nội dung cột: trái (mặc định), phải (số tiền), giữa */
  align?: 'left' | 'right' | 'center'
}

export interface ExportExcelOptions {
  filename: string // nên kết thúc bằng .xlsx
  sheetName?: string
  title?: string // dòng tiêu đề lớn phía trên bảng (tuỳ chọn)
  columns: ExcelColumn[]
  rows: (string | number | null | undefined)[][]
}

const ACCENT = 'FF0052FF' // xanh chủ đạo cho header
const BORDER = 'FFE2E8F0' // xám nhạt cho viền
const STRIPE = 'FFF8FAFC' // nền dòng chẵn (zebra)

export async function exportToExcel(opts: ExportExcelOptions): Promise<void> {
  // Nạp động: tách thành chunk riêng, không vào bundle chính.
  const mod: any = await import('exceljs')
  const ExcelJS = mod.default ?? mod

  const wb = new ExcelJS.Workbook()
  wb.creator = 'HR Core'
  const ws = wb.addWorksheet(opts.sheetName || 'Sheet1', {
    views: [{ state: 'frozen', ySplit: opts.title ? 2 : 1 }], // giữ header khi cuộn
  })

  const colCount = opts.columns.length
  let headerRowIndex = 1

  // Dòng tiêu đề lớn (gộp ô) nếu có
  if (opts.title) {
    ws.mergeCells(1, 1, 1, colCount)
    const titleCell = ws.getCell(1, 1)
    titleCell.value = opts.title
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(1).height = 26
    headerRowIndex = 2
  }

  // Cấu hình cột (độ rộng)
  ws.columns = opts.columns.map((c) => ({ width: c.width || 20 }))

  // Hàng header
  const headerRow = ws.getRow(headerRowIndex)
  opts.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = c.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: ACCENT } },
      bottom: { style: 'thin', color: { argb: ACCENT } },
      left: { style: 'thin', color: { argb: ACCENT } },
      right: { style: 'thin', color: { argb: ACCENT } },
    }
  })
  headerRow.height = 24

  // Các hàng dữ liệu
  opts.rows.forEach((r, ri) => {
    const row = ws.getRow(headerRowIndex + 1 + ri)
    opts.columns.forEach((c, ci) => {
      const cell = row.getCell(ci + 1)
      cell.value = r[ci] ?? ''
      cell.alignment = { vertical: 'middle', horizontal: c.align || 'left' }
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      }
      // Zebra: tô nền dòng chẵn cho dễ đọc
      if (ri % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } }
      }
    })
  })

  // Bộ lọc trên hàng header
  ws.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: colCount },
  }

  // Xuất & tải về
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
