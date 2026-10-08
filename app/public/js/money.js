// Formato de precios.
const fmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
export const money = (cents) => fmt.format(cents / 100);
