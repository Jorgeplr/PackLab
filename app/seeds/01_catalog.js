// Catálogo base: categorías y plantillas de empaque (idempotente).
const categories = [
  { name: 'Cajas', slug: 'cajas', sort_order: 1 },
  { name: 'Bolsas', slug: 'bolsas', sort_order: 2 },
  { name: 'Etiquetas', slug: 'etiquetas', sort_order: 3 },
  { name: 'Frascos', slug: 'frascos', sort_order: 4 },
  { name: 'Alimentos', slug: 'alimentos', sort_order: 5 },
  { name: 'Otros', slug: 'otros', sort_order: 6 },
];

const templates = [
  { cat: 'cajas', name: 'Caja rectangular', slug: 'caja-rectangular', shape: 'box', width: 20, height: 14, depth: 10, base_color: '#DDB48C', description: 'Caja clásica de cartón para productos en general.' },
  { cat: 'cajas', name: 'Caja tipo maletín', slug: 'caja-maletin', shape: 'case', width: 18, height: 14, depth: 9, base_color: '#F6E1C8', description: 'Caja con asa, ideal para regalos y llevar.' },
  { cat: 'cajas', name: 'Caja de regalo', slug: 'caja-regalo', shape: 'gift', width: 15, height: 12, depth: 15, base_color: '#E9A99B', description: 'Caja cuadrada con lazo para ocasiones especiales.' },
  { cat: 'bolsas', name: 'Bolsa de papel', slug: 'bolsa-papel', shape: 'bag', width: 22, height: 28, depth: 10, base_color: '#C99A6B', description: 'Bolsa kraft con asas para tiendas y ferias.' },
  { cat: 'alimentos', name: 'Caja de alimentos', slug: 'caja-alimentos', shape: 'food', width: 22, height: 9, depth: 16, base_color: '#F0BE88', description: 'Caja con tapa para comida, postres o snacks.' },
  { cat: 'frascos', name: 'Frasco', slug: 'frasco', shape: 'jar', width: 9, height: 12, depth: 9, base_color: '#F3ECE4', description: 'Frasco con etiqueta envolvente para conservas o cosmética.' },
  { cat: 'etiquetas', name: 'Etiqueta rectangular', slug: 'etiqueta-rectangular', shape: 'label', width: 10, height: 6, depth: 0.2, base_color: '#FFFFFF', description: 'Etiqueta adhesiva para botellas, frascos o bolsas.' },
  { cat: 'otros', name: 'Caja alta (botella)', slug: 'caja-alta', shape: 'box', width: 9, height: 26, depth: 9, base_color: '#F6E1C8', description: 'Caja vertical para botellas, velas o perfumes.' },
];

exports.seed = async (knex) => {
  for (const c of categories) {
    await knex('categories').insert(c).onConflict('slug').merge();
  }
  const cats = await knex('categories').select('id', 'slug');
  const idBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  for (const { cat, ...t } of templates) {
    await knex('templates').insert({ ...t, category_id: idBySlug[cat] }).onConflict('slug').merge();
  }
};
