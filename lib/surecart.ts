import { z } from "zod";

/**
 * Base URL and API key for SureCart API
 */
const SURECART_BACKOFFICE_URL = process.env.SURECART_BACKOFFICE_URL || "";
const SURECART_API_KEY = process.env.SURECART_API_KEY || "";

/**
 * Error thrown when SureCart API calls fail
 */
export class SureCartApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SureCartApiError";
    this.status = status;
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

/**
 * Core function to make requests to the SureCart API
 */
export const fetchFromSureCart = async <T>({
  endpoint,
  method = "GET",
  query = {},
  body,
}: SureCartApiParams): Promise<T> => {
  // Build URL with query parameters
  const url = new URL(`${SURECART_BACKOFFICE_URL}/api/v1/${endpoint}`);

  // Add query parameters if they exist
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  // Set up request options
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${SURECART_API_KEY}`,
      "Content-Type": "application/json",
    },
  };

  // Add body for non-GET requests
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SureCartApiError(
        errorData.message ||
          `SureCart API error: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SureCartApiError) {
      throw error;
    }
    throw new SureCartApiError(
      error instanceof Error ? error.message : "Unknown error occurred",
      500
    );
  }
};

/**
 * Product type definition
 */
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().optional(),
  // Add more fields as needed based on SureCart API response
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * Function to fetch products from SureCart
 */
export const getProducts = async (params?: {
  page?: number;
  per_page?: number;
  search?: string;
}) => {
  return fetchFromSureCart<{ data: Product[] }>({
    endpoint: "products",
    query: params,
  });
};

/**
 * Function to fetch a single product by ID
 */
export const getProduct = async (id: string) => {
  return fetchFromSureCart<Product>({
    endpoint: `products/${id}`,
  });
};

/**
 * Function to create a product
 */
export const createProduct = async (productData: Omit<Product, "id">) => {
  return fetchFromSureCart<Product>({
    endpoint: "products",
    method: "POST",
    body: productData,
  });
};

/**
 * Function to update a product
 */
export const updateProduct = async (
  id: string,
  productData: Partial<Omit<Product, "id">>
) => {
  return fetchFromSureCart<Product>({
    endpoint: `products/${id}`,
    method: "PATCH",
    body: productData,
  });
};

/**
 * Function to delete a product
 */
export const deleteProduct = async (id: string) => {
  return fetchFromSureCart<{ deleted: boolean }>({
    endpoint: `products/${id}`,
    method: "DELETE",
  });
};
