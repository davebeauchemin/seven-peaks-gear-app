import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse";
import { sheets_v4 } from "@googleapis/sheets";
import { JWT } from "google-auth-library";
import {
  generateCollectionDescription,
  generateShortCollectionDescription,
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
      gid = "0", // Default to first sheet for collections
      csvUrl,
      forceUpdate = false,
    } = await req.json();

    // Use provided CSV URL or build one from sheetId and gid
    const targetCsvUrl = csvUrl || buildSheetsUrl(sheetId, gid);

    console.log("Fetching CSV data from:", targetCsvUrl);

    // Fetch and parse CSV data
    const csvContent = await fetchCSVData(targetCsvUrl);
    const collections = await parseCSV(csvContent);

    console.log(`Found ${collections.length} collection rows`);

    // Store updated descriptions with slug as key for easier spreadsheet updating
    const collectionDescriptions = new Map<string, string>();
    const shortCollectionDescriptions = new Map<string, string>();
    const updatedSlugs = new Set<string>(); // Keep track of which collections have been updated in the sheet

    // Get the available headers to find the description column
    const headers = Object.keys(collections[0]);
    const descriptionHeaders = [
      "Description",
      "Body HTML",
      "description",
      "body_html",
      "Body",
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
      ) || "Image";

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
        collections.forEach((collection, index) => {
          const slug = collection.Slug;
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

    // Generate descriptions for each collection
    let processedCount = 0;
    let generatedCount = 0;
    let updatedInSheetCount = 0;

    // Process all collections
    for (const collection of collections) {
      try {
        // Check if this collection already has a description
        const slug = collection.Slug;
        if (!slug) continue; // Skip if no slug

        const title = collection.Title || collection.Name || slug;
        const existingDescription = collection[descColumnName]?.trim();
        const existingShortDescription = generateShortDesc
          ? collection[shortDescColumnName]?.trim()
          : "";

        // Extract metadata fields for more detailed descriptions
        const metadata: Record<string, any> = {};

        // Add relevant metadata fields if they exist
        Object.keys(collection).forEach((key) => {
          if (key.startsWith("Metadata:") && collection[key]) {
            const metadataKey = key.replace("Metadata:", "").trim();
            metadata[metadataKey] = collection[key];
          }
        });

        // Add product count if available
        if (collection["Product Count"]) {
          metadata.product_count = collection["Product Count"];
        }

        // Collect images
        const collectionImages = extractImages(collection[imageColumnName]);
        if (collectionImages.length > 0) {
          metadata.images = collectionImages;
          metadata.main_image = collectionImages[0];
          metadata.image_count = collectionImages.length;
        }

        let enhancedDescription = existingDescription;
        let newFullDesc = null;
        let newShortDesc = null;
        let needsUpdate = false;

        // Generate description only if it doesn't exist or force update is enabled
        if (!existingDescription || forceUpdate) {
          console.log(
            `Generating description for "${title}" (${slug}) collection`
          );

          // Generate enhanced description
          enhancedDescription = await generateCollectionDescription({
            title: title,
            productCount: metadata.product_count,
            metadata,
          });

          // Store the enhanced description with slug as key
          collectionDescriptions.set(slug, enhancedDescription);
          newFullDesc = enhancedDescription;
          needsUpdate = true;
        } else {
          console.log(
            `Skipping description for ${title} collection (already exists)`
          );
        }

        // Generate short description if the column exists and it doesn't already have a value
        if (generateShortDesc && (!existingShortDescription || forceUpdate)) {
          console.log(
            `Generating short description for "${title}" (${slug}) collection`
          );

          const shortDescription = await generateShortCollectionDescription(
            {
              title: title,
              productCount: metadata.product_count,
              metadata,
            },
            enhancedDescription
          );

          // Store the short description with slug as key
          shortCollectionDescriptions.set(slug, shortDescription);
          newShortDesc = shortDescription;
          needsUpdate = true;
        } else if (generateShortDesc && existingShortDescription) {
          console.log(
            `Skipping short description for ${title} collection (already exists)`
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
        console.error(`Error processing collection ${collection.Slug}:`, error);
      }
    }

    console.log(
      `Processed ${processedCount} collections, generated ${generatedCount} descriptions, updated ${updatedInSheetCount} in spreadsheet`
    );

    // If no descriptions were generated, return early
    if (
      collectionDescriptions.size === 0 &&
      shortCollectionDescriptions.size === 0
    ) {
      return NextResponse.json({
        success: true,
        message: "No new descriptions needed to be generated",
        totalCollections: collections.length,
        generatedDescriptions: 0,
        updatedInSpreadsheet: 0,
      });
    }

    // Update all collections in the original array with their enhanced descriptions
    const updatedCollections = collections.map((collection) => {
      const slug = collection.Slug;
      const enhancedDescription = collectionDescriptions.get(slug);
      const shortDescription = shortCollectionDescriptions.get(slug);

      if (enhancedDescription || shortDescription) {
        const updatedCollection = { ...collection };

        if (enhancedDescription) {
          updatedCollection[descColumnName] = enhancedDescription;
        }

        // Add short description if it exists
        if (generateShortDesc && shortDescription) {
          updatedCollection[shortDescColumnName] = shortDescription;
        }

        return updatedCollection;
      }

      return collection;
    });

    return NextResponse.json({
      success: true,
      message: "Collection descriptions generated and updated successfully",
      totalCollections: collections.length,
      generatedDescriptions: collectionDescriptions.size,
      generatedShortDescriptions: shortCollectionDescriptions.size,
      updatedInSpreadsheet: updatedInSheetCount,
      updatedCollections: Array.from(collectionDescriptions.entries()).map(
        ([slug, description]) => {
          const collection = collections.find((c) => c.Slug === slug);
          return {
            slug,
            title: collection?.Title || collection?.Name || slug,
            description,
            shortDescription: shortCollectionDescriptions.get(slug) || "",
            images: collection
              ? extractImages(collection[imageColumnName])
              : [],
            updatedInSheet: updatedSlugs.has(slug),
          };
        }
      ),
    });
  } catch (error: any) {
    console.error("Error in generate collections description API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate collection descriptions",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
