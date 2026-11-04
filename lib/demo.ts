import { Category, Product } from './types';
export const categories: Category[] = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Ceramics', slug: 'ceramics' },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Textiles', slug: 'textiles' },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Living', slug: 'living' },
];
export const products: Product[] = [
  { id: '20000000-0000-4000-8000-000000000001', slug: 'terra-vase', name: 'Terra vase', description: 'An earthy silhouette for a single stem or a quiet corner. This sculptural stoneware vase has a softly textured, unglazed finish. Each piece brings a little warmth to the everyday.', price: 420, stock: 8, imageUrl: '/products/vase.svg', categoryId: categories[0].id, featured: true },
  { id: '20000000-0000-4000-8000-000000000002', slug: 'everyday-mug', name: 'Everyday mug', description: 'A generous, rounded mug for slow mornings. Glazed stoneware with a comfortable handle and a natural clay foot. Holds 350 ml. Dishwasher safe.', price: 185, stock: 16, imageUrl: '/products/mug.svg', categoryId: categories[0].id, featured: true },
  { id: '20000000-0000-4000-8000-000000000003', slug: 'linen-throw', name: 'Linen throw', description: 'A soft, breathable layer in a gentle olive tone. Drape it over your favourite chair or keep it close on cooler evenings. 130 × 180 cm. Gentle cold wash.', price: 890, stock: 5, imageUrl: '/products/throw.svg', categoryId: categories[1].id, featured: true },
  { id: '20000000-0000-4000-8000-000000000004', slug: 'oak-serving-board', name: 'Oak serving board', description: 'Simple lines, a generous surface, and the warmth of natural oak. Made for bread, shared snacks, and easy gatherings. 38 × 20 cm. Hand wash and oil occasionally.', price: 365, stock: 10, imageUrl: '/products/board.svg', categoryId: categories[2].id, featured: true },
  { id: '20000000-0000-4000-8000-000000000005', slug: 'gather-bowl', name: 'Gather bowl', description: 'A low, wide bowl in a soft chalk glaze. A lovely home for seasonal fruit or a shared salad. Stoneware, 26 cm diameter. Dishwasher safe.', price: 340, stock: 7, imageUrl: '/products/bowl.svg', categoryId: categories[0].id, featured: false },
  { id: '20000000-0000-4000-8000-000000000006', slug: 'woven-cushion', name: 'Woven cushion', description: 'Rich texture, a quiet terracotta tone, and a soft cotton weave. An effortless finishing touch for your sofa. 45 × 45 cm, with removable cover.', price: 450, stock: 0, imageUrl: '/products/cushion.svg', categoryId: categories[1].id, featured: false },
];
