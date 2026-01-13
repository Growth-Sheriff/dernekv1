/**
 * Shared Utility Functions
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('tr-TR')
}
