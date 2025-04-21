import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import { sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import { generateProductDescription } from "@/lib/openai/openai-utils";

// Helper function to parse CSV data
async function parseCSV(csvContent: string) {
  return new Promise<any[]>((resolve, reject) => {
    parse(
      csvContent,
      {
        columns: true,
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
}

// Fetch the CSV data from the provided URL
async function fetchCSVData(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSV: ${response.status} ${response.statusText}`
      );
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching CSV:", error);
    throw error;
  }
}

// Build Google Sheets CSV export URL from sheetId and gid
function buildSheetsUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// Group products by Handle
function groupProductsByHandle(products: any[]): Map<string, any[]> {
  const productGroups = new Map<string, any[]>();

  products.forEach((item) => {
    const handle = item.Handle;
    if (!handle) return; // Skip items without a handle

    if (!productGroups.has(handle)) {
      productGroups.set(handle, []);
    }
    productGroups.get(handle)!.push(item);
  });

  return productGroups;
}

// Initialize Google Sheets API client
function getGoogleSheetsClient() {
  try {
    // Create a JWT client
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return new sheets_v4.Sheets({ auth });
  } catch (error) {
    console.error("Error initializing Google Sheets client:", error);
    throw error;
  }
}

// Get sheet names for spreadsheet
async function getSheetNames(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });

    const sheetNames = response.data.sheets?.map((sheet) => ({
      title: sheet.properties?.title || "Unknown",
      sheetId: sheet.properties?.sheetId || 0,
    }));

    return sheetNames || [];
  } catch (error) {
    console.error("Error getting sheet names:", error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get sheetId and gid from the request or use defaults
    const {
      sheetId = "1sYH_v8JMNmLkcQYtpHpjxJ19E4wz1gp1hiIkaF5fAWQ",
      gid = "403190572",
      csvUrl,
      forceUpdate = false,
    } = await req.json();

    // Use provided CSV URL or build one from sheetId and gid
    const targetCsvUrl = csvUrl || buildSheetsUrl(sheetId, gid);

    console.log("Fetching CSV data from:", targetCsvUrl);

    // Fetch and parse CSV data
    const csvContent = await fetchCSVData(targetCsvUrl);
    const products = await parseCSV(csvContent);

    // Group products by Handle to avoid generating descriptions for each variant
    const productGroups = groupProductsByHandle(products);
    console.log(
      `Found ${products.length} product rows (${productGroups.size} unique products)`
    );

    // Store updated descriptions with handle as key for easier spreadsheet updating
    const productDescriptions = new Map<string, string>();

    // Get the available headers to find the description column
    const headers = Object.keys(products[0]);
    const descriptionHeaders = [
      "Description",
      "Body HTML",
      "description",
      "body_html",
    ];
    let descColumnName = "";

    for (const header of descriptionHeaders) {
      if (headers.indexOf(header) !== -1) {
        descColumnName = header;
        break;
      }
    }

    // Generate descriptions for each unique product (not each variant)
    let processedCount = 0;
    let generatedCount = 0;

    // Use Array.from to convert Map entries to array for iteration
    for (const [handle, variants] of Array.from(productGroups.entries())) {
      try {
        // Use the first variant for product details
        const product = variants[0];

        // Check if this product already has a description
        const existingDescription = product[descColumnName]?.trim();

        // Skip description generation if product already has one and we're not forcing updates
        if (existingDescription && !forceUpdate) {
          processedCount++;
          console.log(
            `Skipping description for ${product.Title} (already exists)`
          );
          continue;
        }

        // Extract metadata fields for more detailed descriptions
        const metadata: Record<string, any> = {};

        // Add relevant metadata fields if they exist
        Object.keys(product).forEach((key) => {
          if (key.startsWith("Metafield:") && product[key]) {
            const metadataKey = key.replace("Metafield:", "").trim();
            metadata[metadataKey] = product[key];
          }
        });

        console.log(
          `Generating description for "${product.Title}" (${handle})`
        );

        // Generate enhanced description
        const enhancedDescription = await generateProductDescription({
          title: product.Title || "",
          category: product["Category - Name"] || "",
          metadata,
        });

        // Store the enhanced description with handle as key
        productDescriptions.set(handle, enhancedDescription);

        processedCount++;
        generatedCount++;
        console.log(
          `Generated description for ${product.Title} (${generatedCount} generated)`
        );
      } catch (error) {
        console.error(`Error processing product ${handle}:`, error);
      }
    }

    console.log(
      `Processed ${processedCount} products, generated ${generatedCount} descriptions`
    );

    // If no descriptions were generated, return early
    if (productDescriptions.size === 0) {
      return NextResponse.json({
        success: true,
        message: "No new descriptions needed to be generated",
        totalProducts: products.length,
        uniqueProducts: productGroups.size,
        generatedDescriptions: 0,
      });
    }

    // Update all products in the original array with their enhanced descriptions
    const updatedProducts = products.map((product) => {
      const handle = product.Handle;
      const enhancedDescription = productDescriptions.get(handle);

      if (enhancedDescription) {
        return {
          ...product,
          [descColumnName]: enhancedDescription,
        };
      }

      return product;
    });

    // If Google Sheets credentials are provided, update the spreadsheet
    if (
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    ) {
      try {
        const sheets = getGoogleSheetsClient();

        if (!sheetId) {
          throw new Error("Could not determine spreadsheet ID");
        }

        // Get information about the spreadsheet
        const sheetNames = await getSheetNames(sheets, sheetId);

        // Find the sheet with the matching GID
        const targetSheet = sheetNames.find(
          (sheet) => sheet.sheetId === parseInt(gid)
        );
        const sheetName = targetSheet?.title || "Sheet1";

        // Find the description column index
        const descColumnIndex = headers.indexOf(descColumnName);

        if (descColumnIndex === -1) {
          throw new Error(
            "Could not find a suitable description column in the CSV"
          );
        }

        // Find the handle column index
        const handleColumnIndex = headers.indexOf("Handle");

        if (handleColumnIndex === -1) {
          throw new Error("Handle column not found in the CSV");
        }

        // Prepare handle-to-row mapping for efficient updating
        const handleToRowMap = new Map<string, number>();
        products.forEach((product, index) => {
          const handle = product.Handle;
          if (handle && !handleToRowMap.has(handle)) {
            // +2 because: 1 for 0-based to 1-based, and 1 for header row
            handleToRowMap.set(handle, index + 2);
          }
        });

        // Create update requests only for products that have descriptions
        const updateRequests = [];

        // Use Array.from to convert Map entries to array for iteration
        for (const [handle, description] of Array.from(
          productDescriptions.entries()
        )) {
          const rowIndex = handleToRowMap.get(handle);

          if (rowIndex) {
            // Convert column index to A1 notation (A, B, C, etc.)
            const column = String.fromCharCode(65 + descColumnIndex);

            // Format the range explicitly including the sheet name
            const range = `'${sheetName}'!${column}${rowIndex}`;

            updateRequests.push({
              range,
              values: [[description]],
            });
          }
        }

        if (updateRequests.length > 0) {
          console.log(
            `Updating ${updateRequests.length} descriptions in spreadsheet`
          );

          // Update in batches of 10
          const BATCH_SIZE = 10;
          let successCount = 0;

          for (let i = 0; i < updateRequests.length; i += BATCH_SIZE) {
            const batch = updateRequests.slice(i, i + BATCH_SIZE);

            try {
              // Batch update values
              const updateResponse =
                await sheets.spreadsheets.values.batchUpdate({
                  spreadsheetId: sheetId,
                  requestBody: {
                    valueInputOption: "RAW",
                    data: batch,
                  },
                });

              // Count updated cells
              if (updateResponse.data.totalUpdatedCells) {
                successCount += parseInt(
                  updateResponse.data.totalUpdatedCells.toString()
                );
              }
            } catch (error) {
              console.error("Error updating batch:", error);
            }
          }

          console.log(`Updated spreadsheet with ${successCount} descriptions`);
        }
      } catch (error) {
        console.error("Error updating Google Sheet:", error);
      }
    } else {
      console.log(
        "Google Sheets credentials not provided, skipping sheet update"
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product descriptions generated and updated successfully",
      totalProducts: products.length,
      uniqueProducts: productGroups.size,
      generatedDescriptions: productDescriptions.size,
      updatedProducts: Array.from(productDescriptions.entries()).map(
        ([handle, description]) => {
          const product = products.find((p) => p.Handle === handle);
          return {
            handle,
            title: product?.Title || handle,
            description,
          };
        }
      ),
    });
  } catch (error: any) {
    console.error("Error in generate products description API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate product descriptions",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
