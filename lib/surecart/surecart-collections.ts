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
