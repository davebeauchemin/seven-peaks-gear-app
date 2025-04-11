import { fetchSureCart } from "./surecart-helpers";
import {
  SureCartProductCollectionResponse,
  SureCartProductCollection,
} from "../../types";

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
