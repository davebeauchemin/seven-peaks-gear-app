import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import { sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import {
  generateProductDescription,
  generateShortProductDescription,
} from "@/lib/openai/openai-utils";

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

// Extract images from comma-separated string
function extractImages(imageString: string | null | undefined): string[] {
  if (!imageString) return [];

  return imageString
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

// Group products by Slug
function groupProductsBySlug(products: any[]): Map<string, any[]> {
  const productGroups = new Map<string, any[]>();

  products.forEach((item) => {
    const slug = item.Slug;
    if (!slug) return; // Skip items without a slug

    if (!productGroups.has(slug)) {
      productGroups.set(slug, []);
    }
    productGroups.get(slug)!.push(item);
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

// Helper function to update Google Sheet
async function updateGoogleSheet(
  sheets: sheets_v4.Sheets | null,
  sheetId: string,
  sheetName: string,
  slug: string,
  slugToRowMap: Map<string, number>,
  descColumnIndex: number,
  shortDescColumnIndex: number,
  fullDesc: string | null,
  shortDesc: string | null
) {
  if (!sheets || !slugToRowMap.has(slug)) return false;

  try {
    const updateRequests = [];
    const rowIndex = slugToRowMap.get(slug);

    // Add full description update if available
    if (fullDesc !== null && descColumnIndex !== -1) {
      const column = String.fromCharCode(65 + descColumnIndex);
      const range = `'${sheetName}'!${column}${rowIndex}`;

      updateRequests.push({
        range,
        values: [[fullDesc]],
      });
    }

    // Add short description update if available
    if (shortDesc !== null && shortDescColumnIndex !== -1) {
      const shortDescColumn = String.fromCharCode(65 + shortDescColumnIndex);
      const shortDescRange = `'${sheetName}'!${shortDescColumn}${rowIndex}`;

      updateRequests.push({
        range: shortDescRange,
        values: [[shortDesc]],
      });
    }

    if (updateRequests.length > 0) {
      // Update spreadsheet immediately
      const updateResponse = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updateRequests,
        },
      });

      const updatedCells = updateResponse.data.totalUpdatedCells
        ? parseInt(updateResponse.data.totalUpdatedCells.toString())
        : 0;

      console.log(`Updated ${slug} in spreadsheet with ${updatedCells} cells`);
      return updatedCells > 0;
    }

    return false;
  } catch (error) {
    console.error(`Error updating spreadsheet for ${slug}:`, error);
    return false;
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

    // Group products by Slug to avoid generating descriptions for each variant
    const productGroups = groupProductsBySlug(products);
    console.log(
      `Found ${products.length} product rows (${productGroups.size} unique products)`
    );

    // Store updated descriptions with slug as key for easier spreadsheet updating
    const productDescriptions = new Map<string, string>();
    const shortProductDescriptions = new Map<string, string>();
    const updatedSlugs = new Set<string>(); // Keep track of which products have been updated in the sheet

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

    // Find the short description column
    const shortDescriptionHeaders = [
      "Short Description",
      "short_description",
      "Short_Description",
    ];
    let shortDescColumnName = "";

    for (const header of shortDescriptionHeaders) {
      if (headers.indexOf(header) !== -1) {
        shortDescColumnName = header;
        break;
      }
    }

    // If short description column is not found, don't attempt to generate short descriptions
    const generateShortDesc = shortDescColumnName !== "";

    // Find the images column
    const imageColumnName =
      headers.find((header) =>
        ["Images", "Image", "Image Src", "image", "images"].includes(header)
      ) || "Images";

    // Set up Google Sheets client if credentials are available
    let sheets: sheets_v4.Sheets | null = null;
    let sheetName = "Sheet1";
    let slugToRowMap = new Map<string, number>();
    let descColumnIndex = -1;
    let shortDescColumnIndex = -1;

    // Prepare Google Sheets integration if credentials are available
    if (
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    ) {
      try {
        sheets = getGoogleSheetsClient();

        if (!sheetId) {
          throw new Error("Could not determine spreadsheet ID");
        }

        // Get information about the spreadsheet
        const sheetNames = await getSheetNames(sheets, sheetId);

        // Find the sheet with the matching GID
        const targetSheet = sheetNames.find(
          (sheet) => sheet.sheetId === parseInt(gid)
        );
        sheetName = targetSheet?.title || "Sheet1";

        // Find the description column index
        descColumnIndex = headers.indexOf(descColumnName);

        if (descColumnIndex === -1) {
          throw new Error(
            "Could not find a suitable description column in the CSV"
          );
        }

        // Find the short description column index
        shortDescColumnIndex = generateShortDesc
          ? headers.indexOf(shortDescColumnName)
          : -1;

        // Find the slug column index
        const slugColumnIndex = headers.indexOf("Slug");

        if (slugColumnIndex === -1) {
          throw new Error("Slug column not found in the CSV");
        }

        // Prepare slug-to-row mapping for efficient updating
        slugToRowMap = new Map<string, number>();
        products.forEach((product, index) => {
          const slug = product.Slug;
          if (slug && !slugToRowMap.has(slug)) {
            // +2 because: 1 for 0-based to 1-based, and 1 for header row
            slugToRowMap.set(slug, index + 2);
          }
        });
      } catch (error) {
        console.error("Error setting up Google Sheets:", error);
        sheets = null; // Reset sheets client on error
      }
    } else {
      console.log(
        "Google Sheets credentials not provided, will not update spreadsheet"
      );
    }

    // Generate descriptions for each unique product (not each variant)
    let processedCount = 0;
    let generatedCount = 0;
    let updatedInSheetCount = 0;

    // Use Array.from to convert Map entries to array for iteration
    const productEntries = Array.from(productGroups.entries());

    // Process all products
    for (const [slug, variants] of productEntries) {
      try {
        // Use the first variant for product details
        const product = variants[0];

        // Check if this product already has a description
        const existingDescription = product[descColumnName]?.trim();
        const existingShortDescription = generateShortDesc
          ? product[shortDescColumnName]?.trim()
          : "";

        // Extract metadata fields for more detailed descriptions
        const metadata: Record<string, any> = {};

        // Add relevant metadata fields if they exist
        Object.keys(product).forEach((key) => {
          if (key.startsWith("Metadata:") && product[key]) {
            const metadataKey = key.replace("Metadata:", "").trim();
            metadata[metadataKey] = product[key];
          }
        });

        // Collect all unique images from all variants
        const allProductImages: string[] = [];

        variants.forEach((variant) => {
          const variantImages = extractImages(variant[imageColumnName]);
          if (variantImages.length > 0) {
            // For each variant, we only take the first image if it's not already in our collection
            const firstImage = variantImages[0];
            if (!allProductImages.includes(firstImage)) {
              allProductImages.push(firstImage);
            }
          }
        });

        // Add images to metadata
        if (allProductImages.length > 0) {
          metadata.images = allProductImages;

          // Set the main image (first one) separately
          metadata.main_image = allProductImages[0];

          // Include image count
          metadata.image_count = allProductImages.length;
        }

        let enhancedDescription = existingDescription;
        let newFullDesc = null;
        let newShortDesc = null;
        let needsUpdate = false;

        // Generate description only if it doesn't exist or force update is enabled
        if (!existingDescription || forceUpdate) {
          console.log(
            `Generating description for "${product.Name}" (${slug}) with ${allProductImages.length} images`
          );

          // Generate enhanced description
          enhancedDescription = await generateProductDescription({
            title: product.Name || "",
            category: product["Category - Name"] || "",
            metadata,
          });

          // Store the enhanced description with slug as key
          productDescriptions.set(slug, enhancedDescription);
          newFullDesc = enhancedDescription;
          needsUpdate = true;
        } else {
          console.log(
            `Skipping description for ${product.Name} (already exists)`
          );
        }

        // Generate short description if the column exists and it doesn't already have a value
        if (generateShortDesc && (!existingShortDescription || forceUpdate)) {
          console.log(
            `Generating short description for "${product.Name}" (${slug})`
          );

          const shortDescription = await generateShortProductDescription(
            {
              title: product.Name || "",
              category: product["Category - Name"] || "",
              metadata,
            },
            enhancedDescription
          );

          // Store the short description with slug as key
          shortProductDescriptions.set(slug, shortDescription);
          newShortDesc = shortDescription;
          needsUpdate = true;
        } else if (generateShortDesc && existingShortDescription) {
          console.log(
            `Skipping short description for ${product.Name} (already exists)`
          );
        }

        // Update Google Sheet immediately if changes were made
        if (needsUpdate && sheets) {
          const updated = await updateGoogleSheet(
            sheets,
            sheetId,
            sheetName,
            slug,
            slugToRowMap,
            descColumnIndex,
            shortDescColumnIndex,
            newFullDesc,
            newShortDesc
          );
          if (updated) {
            updatedSlugs.add(slug);
            updatedInSheetCount++;
          }
        }

        processedCount++;
        if (needsUpdate) {
          generatedCount++;
        }
      } catch (error) {
        console.error(`Error processing product ${slug}:`, error);
      }
    }

    console.log(
      `Processed ${processedCount} products, generated ${generatedCount} descriptions, updated ${updatedInSheetCount} in spreadsheet`
    );

    // If no descriptions were generated, return early
    if (productDescriptions.size === 0 && shortProductDescriptions.size === 0) {
      return NextResponse.json({
        success: true,
        message: "No new descriptions needed to be generated",
        totalProducts: products.length,
        uniqueProducts: productGroups.size,
        generatedDescriptions: 0,
        updatedInSpreadsheet: 0,
      });
    }

    // Update all products in the original array with their enhanced descriptions
    const updatedProducts = products.map((product) => {
      const slug = product.Slug;
      const enhancedDescription = productDescriptions.get(slug);
      const shortDescription = shortProductDescriptions.get(slug);

      if (enhancedDescription || shortDescription) {
        const updatedProduct = { ...product };

        if (enhancedDescription) {
          updatedProduct[descColumnName] = enhancedDescription;
        }

        // Add short description if it exists
        if (generateShortDesc && shortDescription) {
          updatedProduct[shortDescColumnName] = shortDescription;
        }

        return updatedProduct;
      }

      return product;
    });

    return NextResponse.json({
      success: true,
      message: "Product descriptions generated and updated successfully",
      totalProducts: products.length,
      uniqueProducts: productGroups.size,
      generatedDescriptions: productDescriptions.size,
      generatedShortDescriptions: shortProductDescriptions.size,
      updatedInSpreadsheet: updatedInSheetCount,
      updatedProducts: Array.from(productDescriptions.entries()).map(
        ([slug, description]) => {
          const product = products.find((p) => p.Slug === slug);
          return {
            slug,
            name: product?.Name || slug,
            description,
            shortDescription: shortProductDescriptions.get(slug) || "",
            images: product ? extractImages(product[imageColumnName]) : [],
            updatedInSheet: updatedSlugs.has(slug),
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
