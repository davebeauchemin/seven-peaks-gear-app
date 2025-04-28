import { fetchCSVData } from "@/lib/csv-helpers";
import {
  createProductCollection,
  deleteProductCollection,
  getProductCollections,
  updateProductCollection,
} from "@/lib/surecart/surecart-collections";
import { SureCartProductCollectionResponse } from "@/types/types";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to create a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to normalize collection slug (removed hardcoded assumptions)
const normalizeCollectionSlug = (slug: string): string => {
  // Don't make any assumptions about CSV data format
  // Just return the exact slug as provided
  return slug;
};

// Collection item type from CSV
export interface CollectionCSVItem {
  "": string;
  Slug: string; // Using Slug instead of Handle
  Command: string;
  Name: string;
  Description: string;
  "Short Description": string; // Added Short Description field
  Images: string;
  "Metadata: field_key": string;
  "Metadata: Parent": string;
  "Metadata: Related Collections": string;
}

// Helper function to find a collection by slug
async function getCollectionBySlug(
  slug: string,
  collections: SureCartProductCollectionResponse[]
): Promise<SureCartProductCollectionResponse | undefined> {
  // Search case-insensitively
  return collections.find(
    (collection) => collection.slug.toLowerCase() === slug.toLowerCase()
  );
}

// Helper function to update a collection with related collection IDs
async function updateCollectionRelatedIds(
  collectionId: string,
  collectionSlug: string,
  resolvedIds: string[],
  originalSlugs: string[]
): Promise<boolean> {
  try {
    // First get the current collection to preserve existing metadata
    const currentCollections = await getProductCollections({
      id: collectionId,
    });

    if (!currentCollections?.data?.[0]) {
      console.error(
        `Could not find collection ${collectionId} to update metadata`
      );
      return false;
    }

    const currentCollection = currentCollections.data[0];
    const currentMetadata = currentCollection.metadata || {};

    // Preserve all existing metadata and only update related collections
    const updatedMetadata = {
      ...currentMetadata,
      related_collections: originalSlugs.join(","),
      related_collection_ids: resolvedIds.join(","),
    };

    // Update the collection with preserved metadata
    await updateProductCollection(collectionId, {
      metadata: updatedMetadata,
    });

    console.log(
      `✅ Successfully updated collection ${collectionSlug} with ${resolvedIds.length}/${originalSlugs.length} related collection IDs while preserving existing metadata`
    );

    return true;
  } catch (error: any) {
    console.error(
      `❌ Failed to update collection ${collectionSlug}: ${error.message}`
    );
    return false;
  }
}

// Fetch all collections with pagination
async function fetchAllCollections(): Promise<
  SureCartProductCollectionResponse[]
> {
  console.log("Starting comprehensive collection fetch with pagination...");

  let allCollections: SureCartProductCollectionResponse[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(`Fetching collections page ${page}...`);
    const response = await getProductCollections({
      limit: 100,
      page,
    });

    if (!response.data || response.data.length === 0) {
      console.log(`No more collections found on page ${page}`);
      hasMorePages = false;
      break;
    }

    console.log(`Found ${response.data.length} collections on page ${page}`);
    allCollections = [...allCollections, ...response.data];

    // Check if we need to fetch more pages
    if (response.data.length < 100) {
      console.log("Reached last page of collections");
      hasMorePages = false;
    } else {
      page++;
    }
  }

  console.log(`Total collections fetched: ${allCollections.length}`);
  return allCollections;
}

// Helper function to process image URLs from a comma-separated string
function processImageUrls(imagesString: string): string[] {
  if (!imagesString) return [];

  return imagesString
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url && url.length > 0);
}

// Helper function to generate a short description based on the main description using AI
async function generateShortDescription(
  collectionName: string,
  mainDescription: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  try {
    console.log(`Generating short description for: ${collectionName}`);

    // If no main description, return an empty string
    if (!mainDescription || mainDescription.trim().length === 0) {
      console.log(
        `No main description available for ${collectionName}, skipping short description generation`
      );
      return "";
    }

    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        "No OpenAI API key found, using placeholder short description"
      );
      return `${collectionName} - Shop our exclusive selection featuring premium quality and performance.`.substring(
        0,
        160
      );
    }

    // Prepare the prompt for OpenAI
    const prompt = `
    You are generating a short, SEO-friendly description for a product collection.
    
    Collection Name: ${collectionName}
    
    Main Description: ${mainDescription}
    
    Additional Metadata: ${JSON.stringify(metadata)}
    
    Create a concise, compelling short description (maximum 160 characters) that captures the essence of this collection.
    Include key benefits and appeal but keep it brief.
    
    Short Description:`;

    // Use OpenAI to generate the short description
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a skilled e-commerce copywriter specializing in SEO-friendly product descriptions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    // Extract and clean the generated description
    const shortDescription =
      completion.choices[0]?.message?.content?.trim() || "";

    // Ensure it's not too long
    return shortDescription.substring(0, 160);
  } catch (error: any) {
    console.error(`Error generating short description: ${error.message}`);
    // Fallback to a generic short description on error
    return `${collectionName} - Shop our exclusive selection.`.substring(
      0,
      160
    );
  }
}

// POST: Create all collections from CSV
export async function POST(req: NextRequest) {
  try {
    console.log("Sync collections request received...");

    // Track deletion stats
    let deletedCount = 0;
    let deleteErrorCount = 0;

    // Check if we should delete existing collections first
    const { searchParams } = new URL(req.url);
    const deleteExisting = searchParams.get("deleteExisting") === "true";
    const skipUpdates = searchParams.get("skipUpdates") === "true";

    if (deleteExisting) {
      console.log("Deleting all existing collections first...");
      // Use the comprehensive collection fetch with pagination
      const existingCollections = await fetchAllCollections();

      if (existingCollections && existingCollections.length > 0) {
        console.log(
          `Found ${existingCollections.length} collections to delete.`
        );

        // Sort collections so children come before parents (to avoid constraint issues)
        const sortedCollections = [...existingCollections].sort((a, b) => {
          // If a has a parent_collection_id metadata and b doesn't, a should come first
          const aHasParent = a.metadata?.parent_collection_id;
          const bHasParent = b.metadata?.parent_collection_id;

          if (aHasParent && !bHasParent) return -1;
          if (!aHasParent && bHasParent) return 1;
          return 0;
        });

        // Delete collections in order
        for (const collection of sortedCollections) {
          try {
            console.log(
              `Deleting collection: ${collection.name} (${collection.id})`
            );
            await deleteProductCollection(collection.id);
            deletedCount++;

            // Add delay of 0.2 seconds between deletions
            await delay(200);
          } catch (error: any) {
            console.error(
              `Failed to delete collection ${collection.name}:`,
              error.message
            );
            deleteErrorCount++;
          }
        }

        console.log(
          `Deleted ${deletedCount} collections, with ${deleteErrorCount} errors.`
        );
      } else {
        console.log("No existing collections found to delete.");
      }
    }

    // STEP 1: Fetch collections data from CSV
    console.log("Step 1: Fetching collections data from CSV...");
    const collectionsUrl =
      process.env.COLLECTIONS_FILE_URL ||
      "https://docs.google.com/spreadsheets/d/1pMQWoWuj7sUHqe0kBmj3-yfzxGm3d7xkWuHoIRzQ32Y/export?format=csv&gid=1474997038";
    const collectionsData = (await fetchCSVData(
      collectionsUrl
    )) as CollectionCSVItem[];

    console.log("Collections data:", collectionsData);

    // Map to store created collections by handle
    const collectionsMap = new Map<string, SureCartProductCollectionResponse>();

    // Get existing collections to avoid duplicates - using pagination to get ALL collections
    console.log("Fetching ALL existing collections to ensure complete data...");
    const existingCollections = await fetchAllCollections();
    const existingCollectionsBySlug = new Map<
      string,
      SureCartProductCollectionResponse
    >();

    existingCollections.forEach((collection) => {
      existingCollectionsBySlug.set(collection.slug, collection);
      // Also store with lowercase key for case-insensitive matching
      existingCollectionsBySlug.set(collection.slug.toLowerCase(), collection);
    });

    console.log(`Found ${existingCollections.length} existing collections`);

    // STEP 2: Create all parent collections first
    console.log("Step 2: Creating parent collections first...");
    for (const collection of collectionsData) {
      // Skip if the collection has a parent (we'll process these in the next step)
      if (collection["Metadata: Parent"]) {
        continue;
      }

      // Skip if this is not a valid collection (missing handle or name)
      if (!collection.Slug || !collection.Name) {
        console.log(
          `Skipping invalid collection: ${collection.Slug || "unknown"}`
        );
        continue;
      }

      console.log(
        `Processing parent collection: ${collection.Name} (${collection.Slug})`
      );

      // Check if collection already exists
      if (existingCollectionsBySlug.has(collection.Slug)) {
        console.log(
          `Collection already exists: ${collection.Slug} - skipping creation`
        );
        collectionsMap.set(
          collection.Slug,
          existingCollectionsBySlug.get(collection.Slug)!
        );
        continue;
      }

      try {
        console.log(
          `Creating new parent collection: ${collection.Name} (${collection.Slug})`
        );

        // Generate a short description if not provided but main description exists
        if (!collection["Short Description"] && collection["Description"]) {
          console.log(
            `No short description provided for ${collection.Name}, generating one...`
          );

          try {
            // Extract existing metadata
            const metadataForAI: Record<string, any> = {};
            Object.entries(collection).forEach(([key, value]) => {
              if (key.startsWith("Metadata:") && value) {
                const fieldName = key.replace("Metadata:", "").trim();
                metadataForAI[fieldName] = value;
              }
            });

            // Generate short description
            const shortDescription = await generateShortDescription(
              collection.Name,
              collection["Description"],
              metadataForAI
            );

            if (shortDescription) {
              console.log(
                `Generated short description for ${collection.Name}: ${shortDescription.substring(0, 50)}...`
              );

              // Store the short description for use in creation
              collection["Short Description"] = shortDescription;
            }
          } catch (error: any) {
            console.error(
              `Failed to generate short description for ${collection.Name}: ${error.message}`
            );
          }
        }

        // Process images if available
        const imageUrls = processImageUrls(collection.Images);

        // Create the parent collection with minimal metadata
        const newCollection = await createProductCollection({
          name: collection.Name,
          slug: collection.Slug,
          description: collection["Description"] || "",
          short_description: collection["Short Description"] || "",
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });

        console.log(
          `Successfully created parent collection: ${collection.Name} (${collection.Slug})`
        );
        collectionsMap.set(collection.Slug, newCollection);
      } catch (error: any) {
        console.error(
          `Failed to create collection ${collection.Slug}:`,
          error.message
        );
      }
    }

    // STEP 3: Create all child collections
    console.log("Step 3: Creating child collections...");
    for (const collection of collectionsData) {
      const parentSlug = collection["Metadata: Parent"];

      // Skip if this is not a child collection or not a valid collection
      if (!parentSlug || !collection.Slug || !collection.Name) {
        continue;
      }

      console.log(
        `Processing child collection: ${collection.Name} (${collection.Slug})`
      );

      // Check if collection already exists
      if (existingCollectionsBySlug.has(collection.Slug)) {
        console.log(
          `Child collection already exists: ${collection.Slug} - skipping creation`
        );
        collectionsMap.set(
          collection.Slug,
          existingCollectionsBySlug.get(collection.Slug)!
        );
        continue;
      }

      // Find parent collection using case-insensitive comparison
      const parentCollection =
        collectionsMap.get(parentSlug) ||
        existingCollectionsBySlug.get(parentSlug) ||
        Array.from(collectionsMap.entries()).find(
          ([key, _]) => key.toLowerCase() === parentSlug.toLowerCase()
        )?.[1] ||
        Array.from(existingCollectionsBySlug.entries()).find(
          ([key, _]) => key.toLowerCase() === parentSlug.toLowerCase()
        )?.[1];

      if (!parentCollection) {
        console.error(
          `Parent collection not found for ${collection.Slug}: ${parentSlug}`
        );
        continue;
      }

      try {
        console.log(
          `Creating new child collection: ${collection.Name} (${collection.Slug}) with parent: ${parentSlug} (${parentCollection.id})`
        );

        // Generate a short description if not provided but main description exists
        if (!collection["Short Description"] && collection["Description"]) {
          console.log(
            `No short description provided for ${collection.Name}, generating one...`
          );

          try {
            // Extract existing metadata
            const metadataForAI: Record<string, any> = {};
            Object.entries(collection).forEach(([key, value]) => {
              if (key.startsWith("Metadata:") && value) {
                const fieldName = key.replace("Metadata:", "").trim();
                metadataForAI[fieldName] = value;
              }
            });

            // Generate short description
            const shortDescription = await generateShortDescription(
              collection.Name,
              collection["Description"],
              metadataForAI
            );

            if (shortDescription) {
              console.log(
                `Generated short description for ${collection.Name}: ${shortDescription.substring(0, 50)}...`
              );

              // Store the short description for use in creation
              collection["Short Description"] = shortDescription;
            }
          } catch (error: any) {
            console.error(
              `Failed to generate short description for ${collection.Name}: ${error.message}`
            );
          }
        }

        // Process images if available
        const imageUrls = processImageUrls(collection.Images);

        // Create basic child collection with only parent metadata
        const metadata: Record<string, string> = {
          parent_collection: parentSlug,
          parent_collection_id: parentCollection.id,
        };

        // Create the child collection
        const newCollection = await createProductCollection({
          name: collection.Name,
          slug: collection.Slug,
          description: collection["Short Description"] || "",
          short_description: collection["Short Description"] || "",
          images: imageUrls.length > 0 ? imageUrls : undefined,
          metadata,
        });

        console.log(
          `Successfully created child collection: ${collection.Name} (${collection.Slug}) with parent: ${parentSlug} (${parentCollection.id})`
        );
        collectionsMap.set(collection.Slug, newCollection);
      } catch (error: any) {
        console.error(
          `Failed to create child collection ${collection.Slug}:`,
          error.message
        );
      }
    }

    console.log(`Created ${collectionsMap.size} collections`);

    // STEP 4: If not skipped, update all collections with related collections
    let updatedCount = 0;
    let updateErrors = 0;

    if (!skipUpdates) {
      console.log(
        "Step 4: Updating collections with related collection data..."
      );

      // Get the latest collections to ensure we have accurate data
      const allCollections = await fetchAllCollections();

      for (const collection of collectionsData) {
        if (!collection.Slug) continue;

        // Find this collection in our existing collections
        const currentCollection = allCollections.find(
          (c) => c.slug.toLowerCase() === collection.Slug.toLowerCase()
        );

        if (!currentCollection) {
          console.log(`Collection not found for updates: ${collection.Slug}`);
          continue;
        }

        try {
          console.log(
            `Updating collection: ${collection.Name} (${collection.Slug})`
          );

          // Generate a short description if not provided but main description exists
          if (!collection["Short Description"] && collection["Description"]) {
            console.log(
              `No short description provided for ${collection.Name}, generating one...`
            );

            try {
              // Extract existing metadata
              const metadataForAI: Record<string, any> = {};
              Object.entries(collection).forEach(([key, value]) => {
                if (key.startsWith("Metadata:") && value) {
                  const fieldName = key.replace("Metadata:", "").trim();
                  metadataForAI[fieldName] = value;
                }
              });

              // Generate short description
              const shortDescription = await generateShortDescription(
                collection.Name,
                collection["Description"],
                metadataForAI
              );

              if (shortDescription) {
                console.log(
                  `Generated short description for ${collection.Name}: ${shortDescription.substring(0, 50)}...`
                );

                // Store the short description for use in update
                collection["Short Description"] = shortDescription;
              }
            } catch (error: any) {
              console.error(
                `Failed to generate short description for ${collection.Name}: ${error.message}`
              );
            }
          }

          // Extract metadata, preserving existing values
          const metadata: Record<string, string> = {
            ...currentCollection.metadata,
          };

          // Process related collections if they exist
          if (collection["Metadata: Related Collections"]) {
            const relatedCollectionSlugs = collection[
              "Metadata: Related Collections"
            ]
              .split(",")
              .map((slug) => slug.trim())
              .filter((slug) => slug.length > 0);

            if (relatedCollectionSlugs.length > 0) {
              console.log(
                `Processing ${relatedCollectionSlugs.length} related collections for ${collection.Slug}`
              );

              // Store the original slugs
              metadata.related_collections =
                collection["Metadata: Related Collections"];

              // Resolve collection IDs for related collections
              const relatedCollectionIds: string[] = [];
              const missedCollections: string[] = [];

              for (const relatedSlug of relatedCollectionSlugs) {
                // Find related collection using case-insensitive matching
                const relatedCollection = allCollections.find(
                  (c) => c.slug.toLowerCase() === relatedSlug.toLowerCase()
                );

                if (relatedCollection) {
                  relatedCollectionIds.push(relatedCollection.id);
                  console.log(
                    `✅ Found related collection: ${relatedSlug} (${relatedCollection.id})`
                  );
                } else {
                  missedCollections.push(relatedSlug);
                  console.log(
                    `❌ Related collection not found: ${relatedSlug}`
                  );
                }
              }

              if (relatedCollectionIds.length > 0) {
                metadata.related_collection_ids =
                  relatedCollectionIds.join(",");
                console.log(
                  `Resolved ${relatedCollectionIds.length}/${relatedCollectionSlugs.length} related collection IDs`
                );
              }

              if (missedCollections.length > 0) {
                metadata.missed_related_collections =
                  missedCollections.join(",");
                console.log(
                  `Stored ${missedCollections.length} missed collections for later resolution`
                );
              }
            }
          }

          // Add any other metadata fields
          Object.entries(collection).forEach(([key, value]) => {
            if (
              key.startsWith("Metadata:") &&
              key !== "Metadata: Parent" &&
              key !== "Metadata: Related Collections" &&
              value
            ) {
              // Extract the field name from the metafield key
              const fieldName = key
                .replace("Metadata:", "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");
              metadata[fieldName] = value;
            }
          });

          // Update the collection
          const imageUrls = processImageUrls(collection.Images);

          await updateProductCollection(currentCollection.id, {
            name: collection.Name,
            description: collection["Short Description"] || "",
            short_description: collection["Short Description"] || "",
            images: imageUrls.length > 0 ? imageUrls : undefined,
            metadata,
          });

          console.log(
            `✅ Successfully updated collection: ${collection.Name} (${collection.Slug})`
          );
          updatedCount++;

          // Add a small delay to avoid rate limiting
          await delay(100);
        } catch (error: any) {
          console.error(
            `Failed to update collection ${collection.Slug}:`,
            error.message
          );
          updateErrors++;
        }
      }

      console.log(
        `Updated ${updatedCount} collections with ${updateErrors} errors`
      );
    } else {
      console.log("Skipping collection updates as requested");
    }

    return NextResponse.json({
      success: true,
      message: "Collections sync completed",
      summary: {
        totalCollections: collectionsMap.size,
        deletedCollections: deleteExisting ? deletedCount : 0,
        deleteErrors: deleteExisting ? deleteErrorCount : 0,
        updatedCollections: updatedCount,
        updateErrors: updateErrors,
      },
      collections: Array.from(collectionsMap.entries()).map(
        ([slug, collection]) => ({
          slug,
          id: collection.id,
          name: collection.name,
        })
      ),
    });
  } catch (error: any) {
    console.error(
      "Error syncing collections:",
      error.message,
      error.status,
      error.details ? JSON.stringify(error.details) : ""
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync collections",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH: Update a specific collection with related collections
export async function PATCH(req: NextRequest) {
  try {
    // Get the collection ID from the request
    const body = await req.json();
    const { collectionId } = body;

    if (!collectionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing collection ID",
        },
        { status: 400 }
      );
    }

    // Fetch the current collection
    const currentCollections = await getProductCollections({
      id: collectionId,
    });

    if (!currentCollections?.data?.[0]) {
      return NextResponse.json(
        {
          success: false,
          message: `Collection with ID ${collectionId} not found`,
        },
        { status: 404 }
      );
    }

    const currentCollection = currentCollections.data[0];
    console.log(
      `Updating collection: ${currentCollection.name} (${currentCollection.slug})`
    );

    // STEP 1: Fetch collections data from CSV
    console.log("Step 1: Fetching collections data from CSV...");
    const collectionsUrl =
      process.env.COLLECTIONS_FILE_URL ||
      "https://docs.google.com/spreadsheets/d/1pMQWoWuj7sUHqe0kBmj3-yfzxGm3d7xkWuHoIRzQ32Y/export?format=csv&gid=1474997038";
    const collectionsData = (await fetchCSVData(
      collectionsUrl
    )) as CollectionCSVItem[];

    // Find the CSV data for this collection
    const csvCollection = collectionsData.find(
      (c) => c.Slug.toLowerCase() === currentCollection.slug.toLowerCase()
    );

    if (!csvCollection) {
      return NextResponse.json(
        {
          success: false,
          message: `Collection ${currentCollection.slug} not found in CSV data`,
        },
        { status: 404 }
      );
    }

    // STEP 2: Fetch all existing collections to resolve related collections
    const existingCollections = await fetchAllCollections();
    const existingCollectionsBySlug = new Map<
      string,
      SureCartProductCollectionResponse
    >();

    existingCollections.forEach((collection) => {
      existingCollectionsBySlug.set(collection.slug, collection);
      // Also store with lowercase key for case-insensitive matching
      existingCollectionsBySlug.set(collection.slug.toLowerCase(), collection);
    });

    // STEP 3: Update collection metadata
    // Extract base metadata
    const metadata: Record<string, string> = {
      // Preserve any existing metadata not in the CSV
      ...currentCollection.metadata,
    };

    // Process parent collection if it exists
    if (csvCollection["Metadata: Parent"]) {
      const parentSlug = csvCollection["Metadata: Parent"];

      // Find parent collection
      const parentCollection = existingCollections.find(
        (c) => c.slug.toLowerCase() === parentSlug.toLowerCase()
      );

      if (parentCollection) {
        metadata.parent_collection = parentSlug;
        metadata.parent_collection_id = parentCollection.id;
        console.log(
          `Found parent collection: ${parentSlug} (${parentCollection.id})`
        );
      } else {
        console.log(`Parent collection not found: ${parentSlug}`);
      }
    }

    // Process related collections if they exist
    if (csvCollection["Metadata: Related Collections"]) {
      const relatedCollectionSlugs = csvCollection[
        "Metadata: Related Collections"
      ]
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0);

      if (relatedCollectionSlugs.length > 0) {
        console.log(
          `Processing ${relatedCollectionSlugs.length} related collections`
        );

        // Store the original slugs
        metadata.related_collections =
          csvCollection["Metadata: Related Collections"];

        // Resolve collection IDs for related collections
        const relatedCollectionIds: string[] = [];
        const missedCollections: string[] = [];

        for (const relatedSlug of relatedCollectionSlugs) {
          // Find related collection using case-insensitive matching
          const relatedCollection = existingCollections.find(
            (c) => c.slug.toLowerCase() === relatedSlug.toLowerCase()
          );

          if (relatedCollection) {
            relatedCollectionIds.push(relatedCollection.id);
            console.log(
              `✅ Found related collection: ${relatedSlug} (${relatedCollection.id})`
            );
          } else {
            missedCollections.push(relatedSlug);
            console.log(`❌ Related collection not found: ${relatedSlug}`);
          }
        }

        if (relatedCollectionIds.length > 0) {
          metadata.related_collection_ids = relatedCollectionIds.join(",");
        }

        if (missedCollections.length > 0) {
          metadata.missed_related_collections = missedCollections.join(",");
        }
      }
    }

    // Add any other metadata fields
    Object.entries(csvCollection).forEach(([key, value]) => {
      if (
        key.startsWith("Metadata:") &&
        key !== "Metadata: Parent" &&
        key !== "Metadata: Related Collections" &&
        value
      ) {
        // Extract the field name from the metafield key
        const fieldName = key
          .replace("Metadata:", "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        metadata[fieldName] = value;
      }
    });

    // Generate a short description if not provided but main description exists
    if (!csvCollection["Short Description"] && csvCollection["Description"]) {
      console.log(
        `No short description provided for ${csvCollection.Name}, generating one...`
      );

      try {
        // Extract metadata for AI
        const metadataForAI: Record<string, any> = {};
        Object.entries(csvCollection).forEach(([key, value]) => {
          if (key.startsWith("Metadata:") && value) {
            const fieldName = key.replace("Metadata:", "").trim();
            metadataForAI[fieldName] = value;
          }
        });

        // Generate short description
        const shortDescription = await generateShortDescription(
          csvCollection.Name,
          csvCollection["Description"],
          metadataForAI
        );

        if (shortDescription) {
          console.log(
            `Generated short description for ${csvCollection.Name}: ${shortDescription.substring(0, 50)}...`
          );

          // Store the short description for the update
          csvCollection["Short Description"] = shortDescription;
        }
      } catch (error: any) {
        console.error(
          `Failed to generate short description for ${csvCollection.Name}: ${error.message}`
        );
      }
    }

    // STEP 4: Update the collection
    const imageUrls = processImageUrls(csvCollection.Images);

    await updateProductCollection(collectionId, {
      name: csvCollection.Name,
      description: csvCollection["Description"] || "",
      short_description: csvCollection["Short Description"] || "",
      images: imageUrls.length > 0 ? imageUrls : undefined,
      metadata,
    });

    console.log(
      `Successfully updated collection ${csvCollection.Name} (${csvCollection.Slug})`
    );

    return NextResponse.json({
      success: true,
      message: `Collection ${csvCollection.Name} updated successfully`,
      collection: {
        id: collectionId,
        slug: csvCollection.Slug,
        name: csvCollection.Name,
        metadata,
      },
    });
  } catch (error: any) {
    console.error(
      "Error updating collection:",
      error.message,
      error.status,
      error.details ? JSON.stringify(error.details) : ""
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update collection",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Fetch collections data from CSV and return it
    const collectionsUrl =
      process.env.COLLECTIONS_FILE_URL ||
      "https://docs.google.com/spreadsheets/d/1pMQWoWuj7sUHqe0kBmj3-yfzxGm3d7xkWuHoIRzQ32Y/export?format=csv&gid=1474997038";
    const collectionsData = (await fetchCSVData(
      collectionsUrl
    )) as CollectionCSVItem[];

    return NextResponse.json({
      success: true,
      collections: collectionsData,
    });
  } catch (error: any) {
    console.error("Error fetching collections:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch collections",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check if we should delete all collections or specific ones
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      // Get all collections using pagination to ensure complete data
      console.log("Fetching all collections for deletion with pagination...");
      const allCollections = await fetchAllCollections();

      if (!allCollections || allCollections.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No collections found to delete",
        });
      }

      console.log(`Found ${allCollections.length} collections to delete.`);

      // Delete child collections first to avoid constraints
      // Sort collections so children come before parents (to avoid constraint issues)
      const sortedCollections = [...allCollections].sort((a, b) => {
        // If a has a parent_collection metadata and b doesn't, a should come first
        const aHasParent = a.metadata?.parent_collection_id;
        const bHasParent = b.metadata?.parent_collection_id;

        if (aHasParent && !bHasParent) return -1;
        if (!aHasParent && bHasParent) return 1;
        return 0;
      });

      // Delete collections in order
      let successCount = 0;
      let errorCount = 0;

      for (const collection of sortedCollections) {
        try {
          console.log(
            `Deleting collection: ${collection.name} (${collection.id})`
          );
          await deleteProductCollection(collection.id);
          successCount++;

          // Add delay of 0.2 seconds between deletions
          await delay(200);
        } catch (error: any) {
          console.error(
            `Failed to delete collection ${collection.name}:`,
            error.message
          );
          errorCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${successCount} collections, with ${errorCount} errors.`,
        summary: {
          totalCollections: allCollections.length,
          deleted: successCount,
          failed: errorCount,
        },
      });
    } else {
      // Get specific collection IDs to delete from the request body
      let collectionsToDelete: string[] = [];

      try {
        const body = await req.json();
        collectionsToDelete = body.collectionIds || [];
      } catch (error) {
        // No body or invalid body, assume no specific collections to delete
      }

      if (!collectionsToDelete.length) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No collection IDs provided for deletion. Use 'all=true' to delete all collections.",
          },
          { status: 400 }
        );
      }

      // Delete the specified collections
      console.log(
        `Deleting ${collectionsToDelete.length} specified collections...`
      );

      let successCount = 0;
      let errorCount = 0;

      for (const collectionId of collectionsToDelete) {
        try {
          console.log(`Deleting collection ID: ${collectionId}`);
          await deleteProductCollection(collectionId);
          successCount++;

          // Add delay of 0.2 seconds between deletions
          await delay(200);
        } catch (error: any) {
          console.error(
            `Failed to delete collection ${collectionId}:`,
            error.message
          );
          errorCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${successCount} of ${collectionsToDelete.length} collections.`,
        summary: {
          requested: collectionsToDelete.length,
          deleted: successCount,
          failed: errorCount,
        },
      });
    }
  } catch (error: any) {
    console.error("Error deleting collections:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete collections",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
