import { fetchCSVData } from "@/lib/csv-helpers";
import {
  createProductCollection,
  deleteProductCollection,
  getProductCollections,
} from "@/lib/surecart/surecart-collections";
import { SureCartProductCollectionResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

// Collection item type from CSV
export interface CollectionCSVItem {
  "": string;
  Slug: string; // Using Slug instead of Handle
  Command: string;
  Name: string;
  Parent: string;
  "Metafield: custom.sub_collection_ids [list.single_line_text_field]": string;
  "Body HTML": string;
  "Sort Order": string;
  "Template Suffix": string;
  "Updated At": string;
  Published: string;
  "Published At": string;
  "Published Scope": string;
  "Row #": string;
  "Top Row": string;
  "Image Src": string;
  "Metafield: field_key": string;
}

export async function POST(req: NextRequest) {
  try {
    console.log("Sync collections request received...");

    // STEP 1: Fetch collections data from CSV
    console.log("Step 1: Fetching collections data from CSV...");
    const collectionsUrl =
      process.env.COLLECTIONS_FILE_URL ||
      "https://docs.google.com/spreadsheets/d/1pMQWoWuj7sUHqe0kBmj3-yfzxGm3d7xkWuHoIRzQ32Y/export?format=csv&gid=1474997038";
    const collectionsData = (await fetchCSVData(
      collectionsUrl
    )) as CollectionCSVItem[];

    console.log("Collections data:", collectionsData);

    // STEP 2: Create all parent collections first, then sub-collections
    console.log("Step 2: Creating collections...");

    // Map to store created collections by handle
    const collectionsMap = new Map<string, SureCartProductCollectionResponse>();

    // Get existing collections to avoid duplicates
    const { data: existingCollections } = await getProductCollections();
    const existingCollectionsBySlug = new Map<
      string,
      SureCartProductCollectionResponse
    >();

    existingCollections.forEach((collection) => {
      existingCollectionsBySlug.set(collection.slug, collection);
    });

    console.log(`Found ${existingCollections.length} existing collections`);

    // First, create all parent collections
    for (const collection of collectionsData) {
      // Skip if the collection has a parent (we'll process these in the next step)
      if (collection["Parent"]) {
        continue;
      }

      // Skip if this is not a valid collection (missing handle or name)
      if (!collection.Slug || !collection.Name) {
        console.log(
          `Skipping invalid collection: ${collection.Slug || "unknown"}`
        );
        continue;
      }

      // Check if collection already exists
      if (existingCollectionsBySlug.has(collection.Slug)) {
        console.log(`Collection already exists: ${collection.Slug}`);
        collectionsMap.set(
          collection.Slug,
          existingCollectionsBySlug.get(collection.Slug)!
        );
        continue;
      }

      try {
        // Extract metadata from collection fields
        const metadata: Record<string, string> = {};

        // Add sub-collections if available
        if (
          collection[
            "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
          ]
        ) {
          metadata.sub_collection_ids =
            collection[
              "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
            ];
        }

        // Add any other metadata fields
        Object.entries(collection).forEach(([key, value]) => {
          if (
            key.startsWith("Metafield:") &&
            value &&
            key !==
              "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
          ) {
            // Extract the field name from the metafield key
            const fieldName = key
              .replace("Metafield:", "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_");
            metadata[fieldName] = value;
          }
        });

        // Create the parent collection
        const newCollection = await createProductCollection({
          name: collection.Name,
          slug: collection.Slug,
          description: collection["Body HTML"] || "",
          metadata,
        });

        console.log(`Created parent collection: ${collection.Slug}`);
        collectionsMap.set(collection.Slug, newCollection);
      } catch (error: any) {
        console.error(
          `Failed to create collection ${collection.Slug}:`,
          error.message
        );
      }
    }

    // Next, create all child collections
    for (const collection of collectionsData) {
      const parentSlug = collection["Parent"];

      // Skip if this is not a child collection or not a valid collection
      if (!parentSlug || !collection.Slug || !collection.Name) {
        continue;
      }

      // Check if collection already exists
      if (existingCollectionsBySlug.has(collection.Slug)) {
        console.log(`Child collection already exists: ${collection.Slug}`);
        collectionsMap.set(
          collection.Slug,
          existingCollectionsBySlug.get(collection.Slug)!
        );
        continue;
      }

      // Ensure parent collection exists
      const parentCollection =
        collectionsMap.get(parentSlug) ||
        existingCollectionsBySlug.get(parentSlug);

      if (!parentCollection) {
        console.error(
          `Parent collection not found for ${collection.Slug}: ${parentSlug}`
        );
        continue;
      }

      try {
        // Extract metadata from collection fields
        const metadata: Record<string, string> = {
          parent_collection: parentCollection.id,
        };

        // Add sub-collections if available
        if (
          collection[
            "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
          ]
        ) {
          metadata.sub_collection_ids =
            collection[
              "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
            ];
        }

        // Add any other metadata fields
        Object.entries(collection).forEach(([key, value]) => {
          if (
            key.startsWith("Metafield:") &&
            value &&
            key !==
              "Metafield: custom.sub_collection_ids [list.single_line_text_field]"
          ) {
            // Extract the field name from the metafield key
            const fieldName = key
              .replace("Metafield:", "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_");
            metadata[fieldName] = value;
          }
        });

        // Create the child collection
        const newCollection = await createProductCollection({
          name: collection.Name,
          slug: collection.Slug,
          description: collection["Body HTML"] || "",
          metadata,
        });

        console.log(
          `Created child collection: ${collection.Slug} (parent: ${parentSlug})`
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

    return NextResponse.json({
      success: true,
      message: "Collections sync completed",
      summary: {
        totalCollections: collectionsMap.size,
      },
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
      // Get all collections
      console.log("Fetching all collections for deletion...");
      const { data: allCollections } = await getProductCollections();

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
        const aHasParent = a.metadata?.parent_collection;
        const bHasParent = b.metadata?.parent_collection;

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
