export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function monthLabel(month: string) {
  const [year, value] = month.split('-')
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(
    new Date(Number(year), Number(value) - 1, 1),
  )
}
