export type Category = { id: string; name: string; slug: string };
export type Product = { id: string; slug: string; name: string; description: string; price: number; stock: number; imageUrl: string; categoryId: string; featured: boolean };
