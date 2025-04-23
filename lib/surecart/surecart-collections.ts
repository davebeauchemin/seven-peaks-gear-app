"use server";

import { fetchSureCart } from "./surecart-helpers";
import {
  SureCartProductCollectionResponse,
  SureCartProductCollection,
} from "../../types/types";

export async function getProductCollections(
  query: Record<string, string | number | boolean | undefined> = {}
): Promise<{ data: SureCartProductCollectionResponse[] }> {
  return fetchSureCart<{ data: SureCartProductCollectionResponse[] }>({
    endpoint: "product_collections",
    method: "GET",
    query,
  });
}

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

export async function deleteProductCollection(
  id: string
): Promise<{ id: string; object: string; deleted: boolean }> {
  console.log("Deleting product collection:", id);

  return fetchSureCart<{ id: string; object: string; deleted: boolean }>({
    endpoint: `product_collections/${id}`,
    method: "DELETE",
  });
}

export async function deleteAllProductCollections() {
  try {
    console.log("Starting product collection deletion process...");

    // Fetch all collections
    const { data: collections } = await getProductCollections({ limit: 100 });

    if (!collections || collections.length === 0) {
      console.log("No product collections found to delete");
      return { success: true, count: 0 };
    }

    console.log(`Found ${collections.length} product collections to delete`);

    // Delete each collection with a small delay between requests
    let successCount = 0;
    let failureCount = 0;

    for (const collection of collections) {
      try {
        console.log(
          `Deleting collection: ${collection.name} (${collection.id})`
        );
        await deleteProductCollection(collection.id);
        successCount++;

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to delete collection ${collection.id}:`, error);
        failureCount++;
      }
    }

    console.log(
      `Product collection deletion completed: ${successCount} deleted, ${failureCount} failed`
    );
    return {
      success: failureCount === 0,
      count: successCount,
      failedCount: failureCount,
    };
  } catch (error) {
    console.error("Error in product collection deletion process:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
