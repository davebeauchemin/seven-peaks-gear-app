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
