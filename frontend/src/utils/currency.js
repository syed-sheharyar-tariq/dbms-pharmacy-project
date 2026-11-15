/**
 * Formats a numeric value or decimal string as currency.
 * Source of truth remains backend Decimal; frontend formats for display only.
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rs. 0.00';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `Rs. ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
