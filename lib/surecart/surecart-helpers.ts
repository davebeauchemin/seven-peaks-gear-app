import { z } from "zod";

/**
 * Base URL and API key for SureCart API
 */
const SURECART_API_URL = process.env.SURECART_API_URL || "";
const SURECART_API_KEY = process.env.SURECART_API_KEY || "";

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

/**
 * Core function to make requests to the SureCart API
 */
export const fetchSureCart = async <T>({
  endpoint,
  method = "GET",
  query = {},
  body,
}: SureCartApiParams): Promise<T> => {
  // Build URL with query parameters
  const url = new URL(`${SURECART_API_URL}/v1/${endpoint}`);

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
      console.log("SureCart API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method,
        errorData: JSON.stringify(errorData, null, 2),
      });

      throw new SureCartApiError(
        errorData.message ||
          `SureCart API error: ${response.status} ${response.statusText}`,
        response.status,
        errorData
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

export async function updateSureCartProduct(
  id: string,
  product: any
): Promise<SureCartProductResponse> {
  console.log("Updating product:", product.name || id);
  const updatedProduct = await fetchSureCart<SureCartProductResponse>({
    endpoint: `products/${id}?expand[]=variants`,
    method: "PATCH",
    body: { product },
  });
  return updatedProduct;
}

export async function createSureCartProduct(
  product: any
): Promise<SureCartProductResponse> {
  console.log("Creating product:", product.name);
  const createProduct = await fetchSureCart<SureCartProductResponse>({
    endpoint: "products?expand[]=variants",
    method: "POST",
    body: { product },
  });
  return createProduct;
}

export async function deleteAllProducts() {
  try {
    const { data }: any = await fetchSureCart({
      endpoint: "products",
      method: "GET",
      query: {
        limit: 100,
      },
    });
    data.forEach(
      async (product: any) =>
        await fetchSureCart({
          endpoint: "products/" + product.id,
          method: "DELETE",
        })
    );
    return { success: true };
  } catch (error) {
    console.error("Error deleting products:", error);
    return { success: false };
  }
}

export async function deleteAllProductVariants() {
  try {
    console.log("Starting product variant deletion process...");

    // Track all product variant IDs
    let allVariantIds: string[] = [];
    let hasMorePages = true;
    let page = 1;
    const limit = 100; // Fetch more items per page to reduce pagination requests

    // Fetch all product variant IDs first, with pagination
    while (hasMorePages) {
      console.log(`Fetching product variants page ${page}...`);

      const response: any = await fetchSureCart({
        endpoint: "variants",
        method: "GET",
        query: {
          limit: limit,
          page: page,
        },
      });

      // Add small delay after each API request
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!response.data || response.data.length === 0) {
        hasMorePages = false;
        break;
      }

      // Extract IDs from the current page
      const pageIds = response.data.map((variant: any) => variant.id);
      allVariantIds = [...allVariantIds, ...pageIds];

      console.log(`Collected ${pageIds.length} variant IDs from page ${page}`);

      // Check if we have more pages
      if (
        !response.pagination ||
        response.pagination.page * limit >= response.pagination.count
      ) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    console.log(`Total product variants to delete: ${allVariantIds.length}`);

    // Process deletion in batches of 20 with 3-second delay between batches
    let successCount = 0;
    let failureCount = 0;
    const batchSize = 20;

    // Split into batches of 20
    for (let i = 0; i < allVariantIds.length; i += batchSize) {
      const batch = allVariantIds.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allVariantIds.length / batchSize)} (${batch.length} items)`
      );

      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (variantId, batchIndex) => {
          try {
            console.log(
              `Deleting product variant ${i + batchIndex + 1}/${allVariantIds.length}: ${variantId}`
            );
            await fetchSureCart({
              endpoint: "variants/" + variantId,
              method: "DELETE",
            });
            return { success: true };
          } catch (deleteError: any) {
            console.error(
              `Error deleting product variant ${variantId}:`,
              deleteError.message
            );
            return { success: false };
          }
        })
      );

      // Count successes and failures
      const batchSuccesses = batchResults.filter(
        (result) => result.success
      ).length;
      successCount += batchSuccesses;
      failureCount += batch.length - batchSuccesses;

      console.log(
        `Batch complete: ${batchSuccesses}/${batch.length} successful. Overall progress: ${i + batch.length}/${allVariantIds.length}`
      );

      // Wait 3 seconds before processing the next batch
      if (i + batchSize < allVariantIds.length) {
        console.log("Waiting 3 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    console.log(
      `Product variant deletion completed. Total: ${allVariantIds.length}, Success: ${successCount}, Failed: ${failureCount}`
    );
    return { success: true };
  } catch (error) {
    console.error("Error in product variant deletion process:", error);
    return { success: false };
  }
}

export type ProductCSVItem = {
  ID: string;
  Order: string;
  Handle: string;
  Title: string;
  "Category - Name": string;
  "Category - Slug": string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Option3 Name": string;
  "Option3 Value": string;
  "Variant Price": string;
  Images: string;
  Gender: string;
  Weight: string;
  [key: string]: string; // For metadata fields and any other dynamic fields
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
    variant_options: SureCartVariantOption[];
    variants: SureCartVariant[];
    weight: number;
    weight_unit: string;
    shipping_enabled: boolean;
  };
};

/**
 * Format CSV product data to SureCart format
 */
export function formatProductsForSureCart(
  productData: ProductCSVItem[]
): SureCartProduct[] {
  // Group products by Handle (which should uniquely identify a product)
  const productGroups = new Map<string, ProductCSVItem[]>();

  // Group all variants by product handle
  productData.forEach((item) => {
    const productHandle = item.Handle;
    if (!productGroups.has(productHandle)) {
      productGroups.set(productHandle, []);
    }
    productGroups.get(productHandle)!.push(item);
  });

  // Convert each product group to a SureCart product
  return Array.from(productGroups.entries()).map(([handle, items]) => {
    // Use the first item for product details
    const firstItem = items[0];

    // Collect metadata from all fields that start with 'Metadata:' (using first item)
    const metadata: SureCartMetadata = {};
    Object.keys(firstItem).forEach((key) => {
      if (key.startsWith("Metadata:")) {
        const metadataKey = key
          .replace("Metadata: ", "")
          .toLowerCase()
          .replace(/\s+/g, "_");
        if (firstItem[key]) {
          metadata[metadataKey] = firstItem[key];
        }
      }
    });

    // Create variant options based on available Option fields from first item
    const variantOptions: SureCartVariantOption[] = [];
    if (firstItem["Option1 Name"]) {
      variantOptions.push({
        name: firstItem["Option1 Name"],
        position: 1,
      });
    }
    if (firstItem["Option2 Name"]) {
      variantOptions.push({
        name: firstItem["Option2 Name"],
        position: 2,
      });
    }
    if (firstItem["Option3 Name"]) {
      variantOptions.push({
        name: firstItem["Option3 Name"],
        position: 3,
      });
    }

    // Parse weight if available (using first item)
    let weight = 0;
    if (firstItem.Weight) {
      weight = parseFloat(firstItem.Weight) || 0;
    }

    // Create variants array from all items in the group
    const variants: SureCartVariant[] = items.map((item, index) => {
      const priceString = item["Variant Price"] || "0";
      const priceInCents = Math.round(
        parseFloat(priceString.replace(/[$,]/g, "")) * 100
      );

      const variant: SureCartVariant = {
        amount: priceInCents,
        position: parseInt(item["Order"] || (index + 1).toString(), 10),
        sku: item["ID"] || "",
        image: item["Images"] || "",
      };

      // Only add option fields that have values
      if (item["Option1 Value"]) {
        variant.option_1 = item["Option1 Value"];
      }

      if (item["Option2 Value"]) {
        variant.option_2 = item["Option2 Value"];
      }

      if (item["Option3 Value"]) {
        variant.option_3 = item["Option3 Value"];
      }

      return variant;
    });

    // Convert to SureCart product format with all variants
    return {
      product: {
        recurring: false,
        metadata,
        content: `${firstItem["Category - Name"]} - ${firstItem["Title"]}`,
        description: `${firstItem["Title"]} ${firstItem["Category - Name"]}`,
        featured: false,
        name: firstItem["Title"],
        status: "published",
        slug: firstItem["Handle"],
        tax_category: "tangible",
        tax_enabled: true,
        variant_options: variantOptions,
        variants: variants,
        weight: weight,
        weight_unit: "lb",
        shipping_enabled: true,
      },
    };
  });
}

// Add this helper function at the top
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    // Only allow http/https URLs for security
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.log(`Invalid URL protocol: ${url}`);
      return false;
    }

    // Try to do a HEAD request to check if the URL exists
    const response = await fetch(url, { method: "HEAD" });

    // Check if response is OK and content type is an image
    if (!response.ok) {
      console.log(`URL returned non-OK status: ${response.status} - ${url}`);
      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.log(`URL does not point to an image: ${contentType} - ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error validating image URL ${url}:`, error);
    return false;
  }
}

/**
 * Fetch the HappyFiles category ID for SureCart
 * This uses a cache to avoid repeated API calls
 */
let sureCartHappyFilesId: number | null = null;

export async function getSureCartHappyFilesId(): Promise<number> {
  // Return cached value if available
  if (sureCartHappyFilesId !== null) {
    return sureCartHappyFilesId;
  }

  try {
    console.log("Fetching SureCart HappyFiles category...");

    // Use a simpler search query to find the SureCart folder directly
    const response = await fetch(
      `${process.env.WP_URL!}/wp-json/wp/v2/happyfiles_category?search=SureCart`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch HappyFiles categories: ${response.status}`
      );
    }

    const categories = await response.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error(
        "SureCart HappyFiles category not found. You MUST create this folder manually in WordPress before continuing."
      );
    }

    // Get the first matching category (should be the SureCart folder)
    const sureCartCategory = categories[0];

    console.log(
      `Found SureCart HappyFiles category with ID: ${sureCartCategory.id}`
    );
    sureCartHappyFilesId = sureCartCategory.id;
    return sureCartCategory.id;
  } catch (error) {
    console.error("Error finding SureCart HappyFiles category:", error);
    throw new Error(
      "SureCart HappyFiles category not found. You MUST create this folder manually in WordPress before continuing."
    );
  }
}

/**
 * Check if an image with the same filename already exists in the SureCart HappyFiles category
 * @param filename The filename to check
 * @returns The existing media object if found, null otherwise
 */
export async function checkExistingMediaByFilename(
  filename: string
): Promise<{ id: number; source_url: string } | null> {
  try {
    console.log(`Checking if image with filename "${filename}" already exists`);

    // Get the SureCart HappyFiles category ID
    let categoryId: number;
    try {
      categoryId = await getSureCartHappyFilesId();
      console.log(`Using SureCart HappyFiles category ID: ${categoryId}`);
    } catch (error) {
      // This is a critical error - we need the SureCart folder
      console.error("Failed to get SureCart HappyFiles category:", error);
      throw error; // Re-throw to stop the process
    }

    // Search WordPress media library for the filename within the SureCart category
    const mediaUrl = new URL(`${process.env.WP_URL!}/wp-json/wp/v2/media`);
    mediaUrl.searchParams.append("happyfiles_category", categoryId.toString());
    mediaUrl.searchParams.append("per_page", "100");

    // Fetch all media in the SureCart category
    const response = await fetch(mediaUrl.toString(), {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
          ).toString("base64"),
      },
    });

    if (!response.ok) {
      console.error(`Error searching media: ${response.status}`);
      return null;
    }

    const media = await response.json();

    // Check if we found a matching media item by comparing filenames
    if (Array.isArray(media) && media.length > 0) {
      // Look for an exact filename match
      const matchingMedia = media.find((item) => {
        const itemFilename = item.source_url.split("/").pop();
        return itemFilename === filename;
      });

      if (matchingMedia) {
        console.log(
          `Found existing media with ID ${matchingMedia.id} for filename "${filename}" in SureCart category`
        );
        return {
          id: matchingMedia.id,
          source_url: matchingMedia.source_url,
        };
      }
    }

    console.log(
      `No existing media found for filename "${filename}" in SureCart category`
    );
    return null;
  } catch (error) {
    console.error(`Error checking existing media for "${filename}":`, error);
    throw error; // Re-throw the error to stop the process
  }
}

/**
 * Combined function to delete all product data in sequence:
 * 1. Delete all products
 * 2. Delete all product variants
 * 3. Delete all product media (SureCart product media items)
 */
export async function deleteAllProductData() {
  console.log("Starting complete product data deletion process...");

  try {
    // Step 1: Delete all products
    console.log("Step 1: Deleting all products...");
    const productsResult = await deleteAllProducts();

    if (!productsResult.success) {
      console.warn(
        "Warning: Product deletion encountered issues. Continuing with variant deletion..."
      );
    } else {
      console.log("Products deletion completed successfully.");
    }

    // Add delay between steps
    console.log("Waiting 2 seconds before proceeding to variant deletion...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Delete all product variants
    console.log("Step 2: Deleting all product variants...");
    const variantsResult = await deleteAllProductVariants();

    if (!variantsResult.success) {
      console.warn(
        "Warning: Variant deletion encountered issues. Continuing with media deletion..."
      );
    } else {
      console.log("Variants deletion completed successfully.");
    }

    // Add delay between steps
    console.log("Waiting 2 seconds before proceeding to media deletion...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Determine overall success
    const allSuccessful = productsResult.success && variantsResult.success;

    console.log(
      `Complete product data deletion process ${allSuccessful ? "completed successfully" : "completed with some issues"}.`
    );

    return {
      success: allSuccessful,
      details: {
        products: productsResult.success,
        variants: variantsResult.success,
      },
    };
  } catch (error) {
    console.error("Error in complete product data deletion process:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createSureCartProductPrice(
  productId: string,
  amount: number,
  name: string = "Fallback Pricing"
): Promise<any> {
  console.log(
    `Creating fallback price for product ${productId} with amount ${amount} cents`
  );

  const price = await fetchSureCart<{
    id: string;
    object: string;
    [key: string]: any;
  }>({
    endpoint: "prices",
    method: "POST",
    body: {
      price: {
        ad_hoc: false,
        amount: amount,
        name: name,
        product: productId,
      },
    },
  });

  console.log(`Created price with ID: ${price.id}`);
  return price;
}

export type SureCartProductCollectionResponse = {
  id: string;
  object: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description?: string;
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
  position?: number;
  metadata?: {
    parent_collection?: string;
    [key: string]: any;
  };
};

/**
 * Creates a product collection in SureCart
 * @param collection The collection data to create
 * @returns The created collection
 */
export async function createProductCollection(
  collection: SureCartProductCollection
): Promise<SureCartProductCollectionResponse> {
  console.log("Creating product collection:", collection.name);

  const createdCollection =
    await fetchSureCart<SureCartProductCollectionResponse>({
      endpoint: "product_collections",
      method: "POST",
      body: { product_collection: collection },
    });

  return createdCollection;
}

/**
 * Updates an existing product collection in SureCart
 * @param id The ID of the collection to update
 * @param collection The collection data to update
 * @returns The updated collection
 */
export async function updateProductCollection(
  id: string,
  collection: Partial<SureCartProductCollection>
): Promise<SureCartProductCollectionResponse> {
  console.log("Updating product collection:", collection.name || id);

  const updatedCollection =
    await fetchSureCart<SureCartProductCollectionResponse>({
      endpoint: `product_collections/${id}`,
      method: "PATCH",
      body: { product_collection: collection },
    });

  return updatedCollection;
}

/**
 * Gets all product collections from SureCart
 * @param query Optional query parameters
 * @returns List of product collections
 */
export async function getProductCollections(
  query: Record<string, string | number | boolean | undefined> = {}
): Promise<{ data: SureCartProductCollectionResponse[] }> {
  return fetchSureCart<{ data: SureCartProductCollectionResponse[] }>({
    endpoint: "product_collections",
    method: "GET",
    query,
  });
}

/**
 * Deletes a product collection from SureCart
 * @param id The ID of the collection to delete
 * @returns The deletion response
 */
export async function deleteProductCollection(
  id: string
): Promise<{ id: string; object: string; deleted: boolean }> {
  console.log("Deleting product collection:", id);

  return fetchSureCart<{ id: string; object: string; deleted: boolean }>({
    endpoint: `product_collections/${id}`,
    method: "DELETE",
  });
}
