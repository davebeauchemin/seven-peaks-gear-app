export interface Product {
  id: string;
  name: string;
  description: string;
  content: string;
  slug: string;
  status: string;
  image_url: string | null;
  metrics: {
    min_price_amount: number;
    max_price_amount: number;
    currency: string;
  };
  metadata: Record<string, string>;
  featured: boolean;
  badge?: string;
  created_at?: number;
  updated_at?: number;
}

export interface CollectionOption {
  id: string;
  label: string;
}

export interface SortOption {
  value: string;
  label: string;
}
