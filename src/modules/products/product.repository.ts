export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  stock: number;
  category: string;
  isActive: boolean;
  createdAt: Date;
}

export class ProductRepository {
  private products: Map<string, Product> = new Map();

  constructor() {
    this.seedDefaultProducts();
  }

  private seedDefaultProducts(): void {
    const defaultItems: Product[] = [
      {
        id: 'prod-001',
        name: 'Wireless Noise-Canceling Headphones',
        description: 'Premium over-ear acoustic headphones',
        price: 19999,
        stock: 50,
        category: 'electronics',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'prod-002',
        name: 'Mechanical Ergonomic Keyboard',
        description: 'Hot-swappable RGB mechanical keyboard',
        price: 12950,
        stock: 25,
        category: 'electronics',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 'prod-003',
        name: 'Stainless Steel Water Bottle',
        description: 'Double-walled vacuum insulated flask',
        price: 2499,
        stock: 120,
        category: 'lifestyle',
        isActive: true,
        createdAt: new Date(),
      },
    ];

    for (const item of defaultItems) {
      this.products.set(item.id, item);
    }
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async list(category?: string): Promise<Product[]> {
    const all = Array.from(this.products.values()).filter((p) => p.isActive);
    if (!category) return all;
    return all.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  async updateStock(id: string, newStock: number): Promise<boolean> {
    const prod = this.products.get(id);
    if (!prod) return false;
    prod.stock = newStock;
    return true;
  }
}

export const productRepository = new ProductRepository();
