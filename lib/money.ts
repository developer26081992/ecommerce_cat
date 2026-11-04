export const money = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
