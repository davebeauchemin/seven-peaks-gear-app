import { Product } from "@/app/products/types";

export async function preloadProductsMedia(products: Product[]) {
  // Extract all media IDs from the products
  const mediaIds: number[] = [];

  for (const product of products) {
    if (product.metadata?.gallery_ids) {
      try {
        const galleryIds = JSON.parse(product.metadata.gallery_ids);
        if (galleryIds && galleryIds.length > 0) {
          mediaIds.push(...galleryIds);
        }
      } catch (error) {
        console.error(
          `Error parsing gallery_ids for product ${product.id}:`,
          error
        );
      }
    }
  }

  // Deduplicate IDs using Array.from instead of spread operator
  const uniqueMediaIds = Array.from(new Set(mediaIds));

  if (uniqueMediaIds.length === 0) {
    return;
  }

  try {
    // Batch fetch up to 20 media items at once
    const batchSize = 20;
    for (let i = 0; i < uniqueMediaIds.length; i += batchSize) {
      const batch = uniqueMediaIds.slice(i, i + batchSize);
      const queryParams = new URLSearchParams();
      batch.forEach((id) => queryParams.append("ids", id.toString()));

      // Pre-fetch to warm the cache
      await fetch(`/api/wordpress-media/batch?${queryParams.toString()}`);
    }
  } catch (error) {
    console.error("Error pre-loading media:", error);
  }
}
