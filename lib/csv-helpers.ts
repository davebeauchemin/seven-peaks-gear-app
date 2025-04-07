import { parse } from "csv-parse";

/**
 * Fetches and parses a CSV file from a URL
 * @param url The URL of the CSV file to fetch
 * @param headerOptions Optional header options
 * @returns A promise that resolves to an array of objects, each representing a row in the CSV
 */
export async function fetchCSVData(
  url: string,
  headerOptions?: {
    useHeaders?: boolean;
    customHeaders?: string[];
  }
) {
  try {
    // Fetch the CSV file
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSV: ${response.status} ${response.statusText}`
      );
    }

    // Get the CSV content as text
    const csvContent = await response.text();

    // Parse the CSV content
    return new Promise((resolve, reject) => {
      parse(
        csvContent,
        {
          columns:
            headerOptions?.useHeaders !== false
              ? headerOptions?.customHeaders || true
              : false,
          skip_empty_lines: true,
          trim: true,
        },
        (error, records) => {
          if (error) {
            reject(error);
          } else {
            resolve(records);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error fetching or parsing CSV:", error);
    throw error;
  }
}
