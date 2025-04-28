/**
 * Error thrown when SureCart API calls fail
 */
export class SureCartApiError extends Error {
  status: number;
  details: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "SureCartApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Generic type for SureCart API parameters
 */
export type SureCartApiParams = {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  query?: Record<string, string | number | boolean | undefined>;
  body?: any;
};

export type SureCartProductResponse = {
  id: string;
  object: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  status: string;
  [key: string]: any;
};

export type ProductCSVItem = {
  ID: string;
  Order: string;
  Slug: string;
  Name: string;
  "Category - Slug"?: string;
  "Category - Slugs"?: string;
  Description: string;
  Quantity: string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Option3 Name": string;
  "Option3 Value": string;
  Price: string;
  Images: string;
  Weight: string;
  "Weight Unit": string;
  Length: string;
  Width: string;
  Height: string;
  "Size Unit": string;
  Featured?: string;
  [key: string]: string | undefined;
};

export type SureCartMetadata = {
  [key: string]: string;
};

export type SureCartVariantOption = {
  name: string;
  position: number;
};

export type SureCartVariant = {
  amount: number;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  position: number;
  sku: string;
  image?: string;
  image_id?: string;
  stock?: number;
  stock_enabled?: boolean;
  stock_adjustment?: number;
  metadata?: {
    [key: string]: string;
  };
};

export type SureCartProduct = {
  product: {
    recurring: boolean;
    metadata: SureCartMetadata;
    content: string;
    description: string;
    featured: boolean;
    name: string;
    sku?: string;
    status: string;
    slug: string;
    tax_category: string;
    tax_enabled: boolean;
    variant_options?: SureCartVariantOption[];
    variants?: SureCartVariant[];
    price?: number;
    weight: number;
    weight_unit: string;
    shipping_enabled: boolean;
    stock_enabled?: boolean;
    stock?: number;
    stock_adjustment?: number;
    allow_out_of_stock_purchases?: boolean;
    product_collections?: string[];
  };
};

export type SureCartProductCollectionResponse = {
  id: string;
  object: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  images?: string[];
  position?: number;
  metadata?: {
    parent_collection?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

export type SureCartProductCollection = {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  images?: string[];
  position?: number;
  metadata?: {
    parent_collection?: string;
    [key: string]: any;
  };
};
