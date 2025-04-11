import {
  ProductCSVItem,
  SureCartApiError,
  SureCartApiParams,
  SureCartMetadata,
  SureCartProduct,
  SureCartVariant,
  SureCartVariantOption,
} from "../../types";

/**
 * Base URL and API key for SureCart API
 */
const SURECART_API_URL = process.env.SURECART_API_URL || "";
const SURECART_API_KEY = process.env.SURECART_API_KEY || "";

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
