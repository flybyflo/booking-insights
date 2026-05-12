export type DebitCredit = "D" | "C"

export type JournalLine = {
  company_code: string
  posting_date: string
  document_id: string
  line_id: number
  gl_account: string
  gl_account_name?: string
  cost_center?: string
  amount: number
  currency: string
  debit_credit: DebitCredit
  booking_text: string
  vendor_id?: string
  customer_id?: string
  tax_code?: string
}

export type JournalDocument = {
  document_id: string
  posting_date: string
  booking_text: string
  partner: string
  cost_centers: string[]
  accounts: string[]
  tax_codes: string[]
  currency: string
  line_count: number
  gross_amount: number
  balance: number
  lines: JournalLine[]
}
