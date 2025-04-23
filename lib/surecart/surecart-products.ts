import { fetchSureCart } from "./surecart-helpers";
import {
  SureCartProductResponse,
  ProductCSVItem,
  SureCartMetadata,
  SureCartVariantOption,
  SureCartVariant,
  SureCartProduct,
} from "../../types/types";

// Extract images from comma-separated string
function extractImages(imageString: string | null | undefined): string[] {
  if (!imageString) return [];

  return imageString
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

export async function getSureCartProducts({
  archived = false,
  featured = false,
  limit = 100,
  page = 1,
  productCollectionIds = [],
  productGroupIds = [],
  query = "",
  status = [],
  sort = "",
  expand = [],
}: {
  archived?: boolean;
  featured?: boolean;
  limit?: number;
  page?: number;
  productCollectionIds?: string[];
  productGroupIds?: string[];
  query?: string;
  status?: string[];
  sort?: string;
  expand?: string[];
} = {}) {
  try {
    const queryParams: Record<string, any> = {
      archived,
      featured,
      limit: Math.min(Math.max(1, limit), 100), // Ensure limit is between 1 and 100
      page,
    };

    // Add optional filters only if they have values
    if (productCollectionIds.length > 0) {
      queryParams["product_collection_ids[]"] = productCollectionIds;
    }

    if (productGroupIds.length > 0) {
      queryParams["product_group_ids[]"] = productGroupIds;
    }

    if (query) {
      queryParams.query = query;
    }

    if (status.length > 0) {
      queryParams["status[]"] = status;
    }

    if (sort) {
      queryParams.sort = sort;
    }

    if (expand.length > 0) {
      queryParams["expand[]"] = expand;
    }

    const response = await fetchSureCart({
      endpoint: "products",
      method: "GET",
      query: queryParams,
    });

    return response;
  } catch (error) {
    console.error("Error fetching SureCart products:", error);
    throw error;
  }
}

export async function createSureCartProduct(
  product: any
): Promise<SureCartProductResponse> {
  console.log("Creating product:", product.name);

  // Determine if this is a simple product
  const isSimpleProduct =
    product.price && (!product.variants || product.variants.length === 0);
  console.log(`Product type: ${isSimpleProduct ? "Simple" : "Variable"}`);

  if (isSimpleProduct) {
    console.log("Simple product details:", {
      name: product.name,
      price: product.price,
      sku: product.sku || "not set",
    });
  } else {
    console.log(
      `Variable product with ${product.variants?.length || 0} variants`
    );
  }

  try {
    const createProduct = await fetchSureCart<SureCartProductResponse>({
      endpoint: "products?expand[]=variants",
      method: "POST",
      body: { product },
    });
    console.log(`Product created successfully with ID: ${createProduct.id}`);
    return createProduct;
  } catch (error) {
    console.error("Error creating product:", error);
    console.error("Failed product data:", JSON.stringify(product, null, 2));
    throw error;
  }
}

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

export async function deleteAllSureCartProducts() {
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
        console.log("Waiting 2 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
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

export async function deleteAllProductData() {
  console.log("Starting complete product data deletion process...");

  try {
    // Step 1: Delete all products
    console.log("Step 1: Deleting all products...");
    const productsResult = await deleteAllSureCartProducts();

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

export function formatProductsForSureCart(
  productData: ProductCSVItem[]
): SureCartProduct[] {
  // Group products by Slug
  const productGroups = new Map<string, ProductCSVItem[]>();

  // Group all variants by product slug
  productData.forEach((item) => {
    const productSlug = item.Slug;
    if (!productGroups.has(productSlug)) {
      productGroups.set(productSlug, []);
    }
    productGroups.get(productSlug)!.push(item);
  });

  // Convert each product group to a SureCart product
  return Array.from(productGroups.entries()).map(([slug, items]) => {
    // Use the first item for product details
    const firstItem = items[0];

    // Format slug as [name]-[collection] if Category - Name is present
    let formattedSlug = slug;
    if (firstItem["Category - Name"]) {
      const nameSlug = firstItem.Name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const categorySlug = firstItem["Category - Name"]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      formattedSlug = `${nameSlug}-${categorySlug}`;
      console.log(
        `Generated slug "${formattedSlug}" from name "${firstItem.Name}" and category "${firstItem["Category - Name"]}"`
      );
    }

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

    // Add dimensions to metadata if provided
    if (firstItem.Length || firstItem.Width || firstItem.Height) {
      if (firstItem.Length) metadata.length = firstItem.Length;
      if (firstItem.Width) metadata.width = firstItem.Width;
      if (firstItem.Height) metadata.height = firstItem.Height;
      if (firstItem["Size Unit"]) metadata.size_unit = firstItem["Size Unit"];
    }

    // Parse weight if available (using first item)
    let weight = 0;
    if (firstItem.Weight) {
      weight = parseFloat(firstItem.Weight) || 0;
    }

    // Determine weight unit
    const weightUnit = firstItem["Weight Unit"]?.toLowerCase() || "lb";

    // Check if this is a simple product (no variant options)
    const isSimpleProduct =
      !firstItem["Option1 Name"] &&
      !firstItem["Option2 Name"] &&
      !firstItem["Option3 Name"];

    // For simple products, use a different approach - no variants
    if (isSimpleProduct) {
      console.log(`${firstItem.Name} is a simple product without variants`);

      // Parse price to cents for simple product
      const priceInCents = Math.round(
        parseFloat(firstItem.Price.replace(/[$,]/g, "")) * 100
      );

      // Extract images
      const imageUrls = extractImages(firstItem.Images);
      const primaryImage = imageUrls.length > 0 ? imageUrls[0] : "";

      // Handle stock for simple product
      const quantity = parseInt(firstItem.Quantity || "0", 10);
      const stockEnabled =
        firstItem.Quantity !== undefined &&
        firstItem.Quantity !== null &&
        firstItem.Quantity !== "";

      // Add image URLs to metadata if available
      if (primaryImage) {
        metadata.primary_image = primaryImage;
      }

      if (imageUrls.length > 1) {
        metadata.additional_images = imageUrls.slice(1).join(",");
      }

      // Return simple product format
      return {
        product: {
          recurring: false,
          metadata,
          content: firstItem["Category - Name"]
            ? `${firstItem["Category - Name"]} - ${firstItem.Name}`
            : `${firstItem.Name}`,
          description:
            firstItem.Description ||
            (firstItem["Category - Name"]
              ? `${firstItem.Name} ${firstItem["Category - Name"]}`
              : firstItem.Name),
          featured: false,
          name: firstItem.Name,
          status: "published",
          slug: formattedSlug,
          tax_category: "tangible",
          tax_enabled: true,
          price: priceInCents, // Use price directly on product for simple products
          sku: firstItem.ID || "",
          weight: weight,
          weight_unit: weightUnit,
          shipping_enabled: true,
          stock_enabled: stockEnabled,
          stock: !isNaN(quantity) ? quantity : 0,
          stock_adjustment: !isNaN(quantity) ? quantity : 0,
          allow_out_of_stock_purchases: true,
        },
      };
    }

    // If we get here, this is a product with variants
    console.log(`${firstItem.Name} is a product with variants`);

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

    // Check if stock should be enabled
    const stockEnabled = items.some(
      (item) =>
        item.Quantity !== undefined &&
        item.Quantity !== null &&
        item.Quantity !== ""
    );

    // Calculate total stock across all variants
    const totalStock = stockEnabled
      ? items.reduce((sum, item) => {
          const quantity = parseInt(item.Quantity || "0", 10);
          return sum + (isNaN(quantity) ? 0 : quantity);
        }, 0)
      : 0;

    // Create variants array from all items in the group
    const variants: SureCartVariant[] = items.map((item, index) => {
      // Parse price to cents
      const priceInCents = Math.round(
        parseFloat(item.Price.replace(/[$,]/g, "")) * 100
      );

      // Extract the first image URL if there are multiple
      const imageUrls = extractImages(item.Images);
      const primaryImage = imageUrls.length > 0 ? imageUrls[0] : "";

      const variant: SureCartVariant = {
        amount: priceInCents,
        position: parseInt(item.Order || (index + 1).toString(), 10),
        sku: item.ID || "",
        image: primaryImage,
      };

      // Store all images in the variant metadata for gallery use
      if (imageUrls.length > 1) {
        variant.metadata = variant.metadata || {};
        variant.metadata.additional_images = imageUrls.slice(1).join(",");
      }

      // Add stock if available
      if (item.Quantity) {
        const quantity = parseInt(item.Quantity, 10);
        if (!isNaN(quantity)) {
          variant.stock = quantity;
          variant.stock_enabled = true;
          variant.stock_adjustment = quantity;
        }
      } else {
        // If no quantity provided, set stock_adjustment to 0
        variant.stock_adjustment = 0;
      }

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
        content: firstItem["Category - Name"]
          ? `${firstItem["Category - Name"]} - ${firstItem.Name}`
          : `${firstItem.Name}`,
        description:
          firstItem.Description ||
          (firstItem["Category - Name"]
            ? `${firstItem.Name} ${firstItem["Category - Name"]}`
            : firstItem.Name),
        featured: false,
        name: firstItem.Name,
        status: "published",
        slug: formattedSlug,
        tax_category: "tangible",
        tax_enabled: true,
        variant_options: variantOptions,
        variants: variants,
        weight: weight,
        weight_unit: weightUnit,
        shipping_enabled: true,
        stock_enabled: stockEnabled,
        stock: totalStock,
        allow_out_of_stock_purchases: true,
      },
    };
  });
}

/**
 * Checks if a product exists by its slug
 * @param slug The product slug to check
 * @returns The product if found, null if not found
 */
export async function checkProductExistsBySlug(
  slug: string
): Promise<SureCartProductResponse | null> {
  try {
    console.log(`Checking if product with slug "${slug}" exists...`);
    const response: { data: SureCartProductResponse[] } = await fetchSureCart({
      endpoint: "products",
      method: "GET",
      query: {
        query: slug,
        limit: 10,
      },
    });

    if (
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      // Find exact match in returned products
      const exactMatch = response.data.find(
        (product: SureCartProductResponse) => product.slug === slug
      );

      if (exactMatch) {
        console.log(
          `Found existing product with slug "${slug}": ${exactMatch.id}`
        );
        return exactMatch;
      }
    }

    console.log(`No product found with slug "${slug}"`);
    return null;
  } catch (error) {
    console.error(
      `Error checking if product exists with slug "${slug}":`,
      error
    );
    return null;
  }
}
