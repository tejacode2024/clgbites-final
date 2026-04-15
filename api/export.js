import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDT(iso) {
  const d = new Date(iso)
  const dd  = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  let h = d.getHours()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${dd} ${mon} | ${String(h).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${ap}`
}

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Fetch ascending so token #001 = first order placed
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    const now = new Date()
    const ds  = now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })

    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Orders')

    // ── Title row ──────────────────────────────────────────────────────────
    worksheet.addRow([`CLGBITES - Today's Orders | ${ds}`])
    worksheet.addRow([]) // blank row

    // ── Header row ─────────────────────────────────────────────────────────
    const headerRow = worksheet.addRow([
  'Token','Name','Phone','Item','Qty',
  'Payment Mode','Payment Status','Pending Amount','Deliver Status','Date & Time','Delivered At'
])
    headerRow.font      = { bold: true }
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF0E6' } }
    headerRow.alignment = { horizontal: 'center' }

    // ── Data rows — one row per item (multi-item orders span rows) ─────────
    orders.forEach((order, idx) => {
      const token       = `#${String(idx + 1).padStart(3, '0')}`
      const payMode     = order.payment_mode === 'cod' ? 'COD' : 'Prepaid'
      const items       = order.items ?? []
      const payStatus   = order.pay_status  ?? '-'
      const pendingAmt  = order.pending_amount ? `₹${order.pending_amount}` : ''
      const time        = fmtDT(order.created_at)

      const deliverStatus = order.deliver_status ?? 'pending'
      items.forEach((item, i) => {
        worksheet.addRow([
          i === 0 ? token         : '',
          i === 0 ? (order.customer_name  ?? '') : '',
          i === 0 ? (order.customer_phone ?? '') : '',
          item.name,
          item.qty ?? 1,
          i === 0 ? payMode       : '',
          i === 0 ? payStatus     : '',
          i === 0 ? pendingAmt    : '',
          i === 0 ? deliverStatus : '',
          i === 0 ? time          : '',
           i === 0 ? (order.delivered_at ? fmtDT(order.delivered_at) : '') : '',
        ])
      })

      // If order had no items, still add one row
      if (items.length === 0) {
       worksheet.addRow([token, order.customer_name ?? '', order.customer_phone ?? '',
          '—', 0, payMode, payStatus, pendingAmt, deliverStatus, time,
          order.delivered_at ? fmtDT(order.delivered_at) : ''])
      }
    })

    // ── Column widths ──────────────────────────────────────────────────────
worksheet.columns = [
      { key:'token',   width: 8  },
      { key:'name',    width: 20 },
      { key:'phone',   width: 14 },
      { key:'item',    width: 32 },
      { key:'qty',     width: 6  },
      { key:'paymode', width: 14 },
      { key:'paysts',  width: 16 },
      { key:'pending', width: 16 },
      { key:'dlvsts',  width: 16 },
      { key:'time',    width: 22 },
      { key:'dlvdat',  width: 22 },
    ]

    const buffer = await workbook.xlsx.writeBuffer()

    const filename = `clgbites-orders-${now.toISOString().slice(0,10)}.xlsx`

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    res.status(200).send(Buffer.from(buffer))

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}