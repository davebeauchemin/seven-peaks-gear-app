import { fetchSureCart } from "./surecart-helpers";
import {
  SureCartProductResponse,
  ProductCSVItem,
  SureCartMetadata,
  SureCartVariantOption,
  SureCartVariant,
  SureCartProduct,
} from "../../types";

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
