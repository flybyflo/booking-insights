export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("de-AT", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value)
}
