import { fetchCSVData } from "@/lib/csv-helpers";
import { NextRequest, NextResponse } from "next/server";
import { createSureCartMedia } from "@/lib/surecart/surecart-core-modules";
import {
  ProductCSVItem,
  SureCartProductCollectionResponse,
  SureCartProductResponse,
  SureCartVariant,
} from "@/types/types";
import {
  createSureCartProduct,
  createSureCartProductPrice,
  deleteAllSureCartProducts,
  deleteAllProductVariants,
  formatProductsForSureCart,
  getSureCartProducts,
  updateSureCartProduct,
  checkProductExistsBySlug,
} from "@/lib/surecart/surecart-products";
import {
  createProductCollection,
  getProductCollections,
  deleteAllProductCollections,
} from "@/lib/surecart/surecart-collections";
import { getSureCartHappyFilesId } from "@/lib/surecart/surecart-media";
import { isValidImageUrl } from "@/lib/media-utility";
import fs from "fs";
import path from "path";

// Build Google Sheets CSV export URL from sheetId and gid
function buildSheetsUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// Collection item type from CSV
export interface CollectionCSVItem {
  "": string;
  Slug: string;
  Command: string;
  Title: string;
  "Metafield: custom.parent_collection_id [single_line_text_field]": string;
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

// Extract images from comma-separated string
function extractImages(imageString: string | null | undefined): string[] {
  if (!imageString) return [];

  return imageString
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

// Extract category slugs from comma-separated string
function extractCategorySlugs(
  categoryString: string | null | undefined
): string[] {
  if (!categoryString) return [];

  console.log(`Extracting category slugs from: "${categoryString}"`);
  const slugs = categoryString
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0);

  console.log(`Found ${slugs.length} slugs: ${slugs.join(", ")}`);
  return slugs;
}

// Format a readable name from a slug (e.g., "bike-helmets" → "Bike Helmets")
function formatNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Normalize a category string to a slug format (e.g., "BIKE HYBRID BIKE" → "bike-hybrid-bike")
function normalizeToSlug(categoryString: string): string {
  return categoryString
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Save errors to a log file
async function saveErrorsToFile(errors: any[]) {
  if (errors.length === 0) return null;

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 12);
  const filename = `error-session-${timestamp}.txt`;
  const filePath = path.join(process.cwd(), "logs", filename);

  // Ensure logs directory exists
  try {
    await fs.promises.mkdir(path.join(process.cwd(), "logs"), {
      recursive: true,
    });
  } catch (err) {
    console.error("Failed to create logs directory:", err);
  }

  // Write errors to file
  try {
    const content = errors
      .map((err) => JSON.stringify(err, null, 2))
      .join("\n\n");
    await fs.promises.writeFile(filePath, content);
    console.log(`Errors saved to ${filePath}`);
    return filename;
  } catch (err) {
    console.error("Failed to write error log:", err);
    return null;
  }
}

// Find collection by slug with minimal normalization
function findCollectionBySlug(
  collectionsMap: Map<string, SureCartProductCollectionResponse>,
  categorySlug: string
): SureCartProductCollectionResponse | undefined {
  console.log(`Looking for collection: "${categorySlug}"`);

  // Try exact match first
  if (collectionsMap.has(categorySlug)) {
    console.log(`✅ Found exact match for collection: ${categorySlug}`);
    return collectionsMap.get(categorySlug);
  }

  // Try normalized slug only for case and spaces
  const normalizedSlug = normalizeToSlug(categorySlug);
  if (normalizedSlug !== categorySlug) {
    console.log(`Trying normalized slug: ${normalizedSlug}`);
    if (collectionsMap.has(normalizedSlug)) {
      console.log(`✅ Found match after normalization: ${normalizedSlug}`);
      return collectionsMap.get(normalizedSlug);
    }
  }

  // If no match found, log available collections for debugging
  console.log(
    `❌ No match found for "${categorySlug}" (normalized: "${normalizedSlug}")`
  );

  // Log closest matches for troubleshooting
  const closestMatches = Array.from(collectionsMap.keys())
    .filter(
      (slug) =>
        slug.includes(normalizedSlug) ||
        normalizedSlug.includes(slug) ||
        slug.toLowerCase() === normalizedSlug.toLowerCase()
    )
    .slice(0, 5);

  if (closestMatches.length > 0) {
    console.log(`Closest matches in available collections:`);
    closestMatches.forEach((slug) => console.log(`  - ${slug}`));
  }

  return undefined;
}

// Log collection assignments for a product
function logCollectionAssignment(
  productName: string,
  collectionIds: string[],
  collectionsMap: Map<string, SureCartProductCollectionResponse>
) {
  if (collectionIds.length === 0) {
    console.log(`⚠️ Product "${productName}" not assigned to any collections`);
    return;
  }

  const collectionNames = collectionIds.map((id) => {
    const collection = Array.from(collectionsMap.values()).find(
      (c) => c.id === id
    );
    return collection
      ? `${collection.name} (${collection.slug})`
      : `Unknown (${id})`;
  });

  console.log(
    `✅ Product "${productName}" assigned to ${collectionIds.length} collections:`
  );
  collectionNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
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

export async function POST(req: NextRequest) {
  try {
    console.log("Sync product request received...");

    // Get parameters from request body or use defaults
    const {
      sheetId,
      gid,
      csvUrl,
      deleteExisting = false,
    } = await req.json().catch(() => ({}));

    // Only delete existing products if deleteExisting is true
    if (deleteExisting) {
      console.log("Deleting existing data as requested...");
      await deleteAllSureCartProducts();
      await deleteAllProductVariants();
      console.log("Existing data deleted successfully");
    } else {
      console.log(
        "Skipping deletion of existing products (deleteExisting=false)"
      );
    }

    // Determine the CSV source - prefer provided CSV URL, then built URL from sheetId/gid, then env variable
    let dataSourceUrl: string;

    if (csvUrl) {
      dataSourceUrl = csvUrl;
      console.log(`Using provided CSV URL: ${dataSourceUrl}`);
    } else if (sheetId && gid) {
      dataSourceUrl = buildSheetsUrl(sheetId, gid);
      console.log(`Using Google Sheet: ${dataSourceUrl}`);
    } else {
      dataSourceUrl = process.env.PRODUCTS_FILE_URL!;
      console.log(
        `Using default products URL from environment: ${dataSourceUrl}`
      );
    }

    // CRITICAL: Fetch ALL collections first with pagination to ensure we have everything
    console.log("Fetching ALL collections for product association...");
    const allCollections = await fetchAllCollections();

    // Create a map for quick collection lookup by slug
    const collectionsMap = new Map<string, SureCartProductCollectionResponse>();
    allCollections.forEach((collection) => {
      collectionsMap.set(collection.slug, collection);
      // Also store lowercase version for case-insensitive matching
      collectionsMap.set(collection.slug.toLowerCase(), collection);
    });

    console.log(
      `Found ${allCollections.length} collections for product mapping`
    );
    console.log("Collection slugs available:");
    Array.from(new Set(allCollections.map((c) => c.slug)))
      .sort()
      .forEach((slug) => {
        console.log(`  - ${slug}`);
      });

    // Fetch and process product data
    console.log("Fetching and processing product data...");
    const productData = (await fetchCSVData(dataSourceUrl)) as ProductCSVItem[];
    console.log(`Loaded ${productData.length} product variants from CSV`);

    // Debug: Log unique category slugs from CSV
    const uniqueCategorySlugs = new Set<string>();
    console.log("Raw CSV data sample:");
    console.log(JSON.stringify(productData[0], null, 2)); // Log first item to see structure

    // Log all keys to debug
    const allKeys = new Set<string>();
    productData.forEach((item) => {
      Object.keys(item).forEach((key) => allKeys.add(key));
    });
    console.log("Available CSV columns:", Array.from(allKeys).join(", "));

    // Now process category slugs
    productData.forEach((item) => {
      if (item["Category - Slugs"]) {
        console.log(
          `Found Category - Slugs for ${item.Name}: "${item["Category - Slugs"]}"`
        );
        const slugs = extractCategorySlugs(item["Category - Slugs"]);
        slugs.forEach((slug) => uniqueCategorySlugs.add(slug));
      } else {
        // Check if the item has the slug in its own slug
        const productSlug = item.Slug || "";
        if (productSlug) {
          // Extract potential category from product slug
          // Format: most product slugs follow pattern like "product-name-bike-category-subcategory"
          const slugParts = productSlug.split("-");
          for (let i = 0; i < slugParts.length - 1; i++) {
            // Check common patterns like "bike-mountain-bike", "bike-road-bike", etc.
            if (slugParts[i] === "bike" && i < slugParts.length - 1) {
              // Try to construct potential category slugs
              const possibleSlugs = [];

              // Try "bike-category"
              if (i + 1 < slugParts.length) {
                possibleSlugs.push(`bike-${slugParts[i + 1]}`);
              }

              // Try "bike-category-subcategory"
              if (i + 2 < slugParts.length) {
                possibleSlugs.push(
                  `bike-${slugParts[i + 1]}-${slugParts[i + 2]}`
                );
              }

              // Try more specific patterns
              if (slugParts.includes("mountain")) {
                possibleSlugs.push("bike-mountain-bike");
              } else if (slugParts.includes("road")) {
                possibleSlugs.push("bike-road-bike");
              } else if (slugParts.includes("hybrid")) {
                possibleSlugs.push("bike-hybrid-bike");
              } else if (slugParts.includes("electric")) {
                if (slugParts.includes("mountain")) {
                  possibleSlugs.push("bike-electric-mountain-bike");
                } else if (slugParts.includes("road")) {
                  possibleSlugs.push("bike-electric-road-bike");
                } else if (slugParts.includes("city")) {
                  possibleSlugs.push("bike-electric-city-bike");
                } else {
                  possibleSlugs.push("bike-electric-road-bike");
                }
              } else if (slugParts.includes("junior")) {
                if (slugParts.includes("mountain")) {
                  possibleSlugs.push("bike-junior-mountain-bike");
                } else if (slugParts.includes("hybrid")) {
                  possibleSlugs.push("bike-junior-hybrid-bike");
                }
              } else if (slugParts.includes("kids")) {
                possibleSlugs.push("bike-kids-bike");
              } else if (slugParts.includes("bmx")) {
                possibleSlugs.push("bike-bmx");
              }

              if (possibleSlugs.length > 0) {
                console.log(
                  `Extracted possible categories from slug ${productSlug}: ${possibleSlugs.join(", ")}`
                );
                possibleSlugs.forEach((slug) => uniqueCategorySlugs.add(slug));
              }

              // No need to continue checking this product
              break;
            }
          }
        }
      }
    });

    console.log("Category slugs in CSV data:");
    Array.from(uniqueCategorySlugs)
      .sort()
      .forEach((slug) => {
        const exists =
          collectionsMap.has(slug) || collectionsMap.has(slug.toLowerCase());
        console.log(`  - ${slug} (${exists ? "FOUND" : "NOT FOUND"})`);
      });

    // Pre-process the product data to assign collections before formatting
    console.log("Pre-processing products to assign collections...");
    const productCollectionMap = new Map<string, string[]>();

    // First pass: extract all collection slugs for each product
    productData.forEach((item) => {
      const collectionIds: string[] = [];

      // First try to get from Category - Slugs
      if (item["Category - Slugs"]) {
        console.log(
          `Using Category - Slugs for ${item.Name}: "${item["Category - Slugs"]}"`
        );
        const slugs = extractCategorySlugs(item["Category - Slugs"]);

        // Map slugs to collection IDs
        slugs.forEach((slug) => {
          // Try direct match
          let collection = collectionsMap.get(slug);

          // Try lowercase match if direct match fails
          if (!collection) {
            collection = collectionsMap.get(slug.toLowerCase());
          }

          if (collection) {
            collectionIds.push(collection.id);
            console.log(
              `✅ Mapped slug '${slug}' to collection ID ${collection.id} (${collection.name})`
            );
          } else {
            console.warn(`❌ No collection found for slug: ${slug}`);
          }
        });
      } else {
        // Extract from the product slug as fallback
        const productSlug = item.Slug || "";
        if (productSlug) {
          // Extract potential category from product slug
          const slugParts = productSlug.split("-");
          for (let i = 0; i < slugParts.length - 1; i++) {
            // Check common patterns
            if (slugParts[i] === "bike" && i < slugParts.length - 1) {
              // Try to construct potential category slugs
              const possibleSlugs = [];

              // Similar logic as above to extract potential category slugs
              // Try "bike-category"
              if (i + 1 < slugParts.length) {
                possibleSlugs.push(`bike-${slugParts[i + 1]}`);
              }

              // Try "bike-category-subcategory"
              if (i + 2 < slugParts.length) {
                possibleSlugs.push(
                  `bike-${slugParts[i + 1]}-${slugParts[i + 2]}`
                );
              }

              // Try specific category patterns
              if (slugParts.includes("mountain")) {
                possibleSlugs.push("bike-mountain-bike");
              } else if (slugParts.includes("road")) {
                possibleSlugs.push("bike-road-bike");
              } else if (slugParts.includes("hybrid")) {
                possibleSlugs.push("bike-hybrid-bike");
              } else if (slugParts.includes("electric")) {
                if (slugParts.includes("mountain")) {
                  possibleSlugs.push("bike-electric-mountain-bike");
                } else if (slugParts.includes("road")) {
                  possibleSlugs.push("bike-electric-road-bike");
                } else if (slugParts.includes("city")) {
                  possibleSlugs.push("bike-electric-city-bike");
                } else {
                  possibleSlugs.push("bike-electric-road-bike");
                }
              } else if (slugParts.includes("junior")) {
                if (slugParts.includes("mountain")) {
                  possibleSlugs.push("bike-junior-mountain-bike");
                } else if (slugParts.includes("hybrid")) {
                  possibleSlugs.push("bike-junior-hybrid-bike");
                }
              } else if (slugParts.includes("kids")) {
                possibleSlugs.push("bike-kids-bike");
              } else if (slugParts.includes("bmx")) {
                possibleSlugs.push("bike-bmx");
              }

              // Try to find collection IDs for possible slugs
              for (const slug of possibleSlugs) {
                // Try direct match
                let collection = collectionsMap.get(slug);

                // Try lowercase match if direct match fails
                if (!collection) {
                  collection = collectionsMap.get(slug.toLowerCase());
                }

                if (collection) {
                  collectionIds.push(collection.id);
                  console.log(
                    `✅ Inferred collection '${slug}' for ${item.Name} from product slug, ID: ${collection.id} (${collection.name})`
                  );

                  // Once we found a valid collection, we can stop
                  break;
                }
              }

              // No need to continue checking this product
              break;
            }
          }
        }
      }

      if (collectionIds.length > 0) {
        productCollectionMap.set(item.Slug, collectionIds);
        console.log(
          `Product ${item.Name} (${item.Slug}) will be assigned to ${collectionIds.length} collections`
        );
      } else {
        console.warn(
          `No collections found for product ${item.Name} (${item.Slug})`
        );
      }
    });

    // Summary of collection mapping
    console.log(
      `Successfully mapped ${productCollectionMap.size} products to collections`
    );

    // Format the products for SureCart
    const formattedProducts = formatProductsForSureCart(productData);

    // Second pass: add collection IDs to formatted products
    formattedProducts.forEach(({ product }) => {
      const collectionIds = productCollectionMap.get(product.slug);
      if (collectionIds && collectionIds.length > 0) {
        // Clone the array to avoid any reference issues
        product.product_collections = [...collectionIds];
        console.log(
          `Assigned product ${product.name} to ${collectionIds.length} collections: [${collectionIds.join(", ")}]`
        );
      } else {
        console.warn(
          `No collections assigned to product ${product.name} (${product.slug})`
        );
      }
    });

    // Keep track of collection assignment errors
    const collectionErrors: Array<{
      productName: string;
      productSlug: string;
      categorySlug: string;
      normalizedSlug: string;
      message: string;
    }> = [];

    // STEP 2: Get all existing media in the SureCart HappyFiles folder
    console.log("Step 2: Fetching all existing media in SureCart folder...");
    const existingMediaMap = await fetchAllExistingMedia();
    console.log(
      `Found ${existingMediaMap.size} existing media items in SureCart folder`
    );

    // STEP 3: Collect all unique image URLs needed across all products
    console.log(
      "Step 3: Collecting all unique image URLs across all products..."
    );
    const allImageUrls = new Set<string>();
    const productImageData: Array<{
      product: any;
      variantsWithImages: Array<{ variant: any; imageUrl: string }>;
    }> = [];

    // Collect all unique image URLs and track which variants use them
    for (const { product } of formattedProducts) {
      const variantsWithImages: Array<{ variant: any; imageUrl: string }> = [];

      // Check if this product has variants (for simple products it won't)
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.image) {
            // Split comma-separated image URLs
            const imageUrls = extractImages(variant.image);

            // Use the first image for each variant
            if (imageUrls.length > 0) {
              const primaryImage = imageUrls[0];
              allImageUrls.add(primaryImage);
              variantsWithImages.push({ variant, imageUrl: primaryImage });

              // Add any additional images to the product gallery
              for (let i = 1; i < imageUrls.length; i++) {
                allImageUrls.add(imageUrls[i]);
              }
            }
          }
        }
      }
      // For simple products, check if there's a primary image in metadata
      else if (product.metadata && product.metadata.primary_image) {
        const primaryImage = product.metadata.primary_image;
        allImageUrls.add(primaryImage);

        // Create a dummy variant entry for the primary image to ensure the product is processed
        variantsWithImages.push({
          variant: { metadata: {} },
          imageUrl: primaryImage,
        });

        // Add additional images from metadata if available
        if (product.metadata.additional_images) {
          const additionalImages = extractImages(
            product.metadata.additional_images
          );
          for (const imageUrl of additionalImages) {
            allImageUrls.add(imageUrl);
          }
        }
      }

      if (variantsWithImages.length > 0) {
        productImageData.push({ product, variantsWithImages });
      } else if (
        product.price &&
        (!product.variants || !product.variants.length)
      ) {
        // If this is a simple product with no images, still include it for processing
        console.log(`Adding simple product with no images: ${product.name}`);
        productImageData.push({
          product,
          variantsWithImages: [],
        });
      }
    }

    console.log(
      `Found ${allImageUrls.size} unique images to process across all products`
    );

    // STEP 4: Determine which images need to be uploaded (not in existing media)
    console.log("Step 4: Determining which images need to be uploaded...");
    const imageUrlsToUpload: string[] = [];
    const imageUrlToMediaData = new Map<
      string,
      { id: number; source_url: string }
    >();

    // First map all existing images to their media data
    for (const imageUrl of Array.from(allImageUrls)) {
      // Extract just the filename without any URL parameters
      let fileName = imageUrl.split("/").pop() || "";
      // Remove any URL parameters if present (e.g., ?v=123)
      fileName = fileName.split("?")[0];

      console.log(`Checking for existing image: ${fileName}`);

      // Try to find an exact match first
      if (existingMediaMap.has(fileName)) {
        // Image already exists, use existing media data
        imageUrlToMediaData.set(imageUrl, existingMediaMap.get(fileName)!);
        console.log(`Image already exists in WordPress: ${fileName}`);
        continue;
      }

      // If no exact match, try advanced matching techniques
      const parts = fileName.split(".");
      const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : "";
      const basename = parts.join(".");

      // Create alternative patterns to match against
      const possiblePatterns = [
        fileName.toLowerCase(), // Lowercase: Image.jpg → image.jpg
        basename.toLowerCase() + "." + extension, // Lowercase base+ext
        basename.replace(/-\d+x\d+$/, "") + "." + extension, // Without dimensions
        basename.replace(/-scaled$/, "") + "." + extension, // Without -scaled suffix
      ];

      // Check for WordPress numeric suffixes (image-1.jpg, image-2.jpg)
      const numericSuffixMatch = basename.match(/^(.+)-(\d+)$/);
      if (numericSuffixMatch) {
        const baseWithoutNumber = numericSuffixMatch[1];
        possiblePatterns.push(baseWithoutNumber + "." + extension);
        possiblePatterns.push(
          baseWithoutNumber.toLowerCase() + "." + extension
        );
      }

      // Try all patterns
      let found = false;
      for (const pattern of possiblePatterns) {
        if (existingMediaMap.has(pattern)) {
          imageUrlToMediaData.set(imageUrl, existingMediaMap.get(pattern)!);
          console.log(
            `Image already exists in WordPress (pattern match: ${pattern}): ${fileName}`
          );
          found = true;
          break;
        }
      }

      // If still not found, try case-insensitive matching as fallback
      if (!found) {
        const lowerFileName = fileName.toLowerCase();
        // Convert Map entries to array for iteration (fixes TypeScript error)
        const existingMediaEntries = Array.from(existingMediaMap.entries());
        for (const [existingFileName, mediaData] of existingMediaEntries) {
          if (existingFileName.toLowerCase() === lowerFileName) {
            imageUrlToMediaData.set(imageUrl, mediaData);
            console.log(
              `Image already exists in WordPress (case-insensitive match): ${existingFileName}`
            );
            found = true;
            break;
          }
        }
      }

      // If still not found, it needs to be uploaded
      if (!found) {
        console.log(`Image needs to be uploaded: ${fileName}`);
        imageUrlsToUpload.push(imageUrl);
      }
    }

    console.log(
      `${imageUrlsToUpload.length} images need to be uploaded, ${allImageUrls.size - imageUrlsToUpload.length} already exist`
    );

    // STEP 5: Upload all new images in parallel
    if (imageUrlsToUpload.length > 0) {
      console.log("Step 5: Uploading new images in parallel...");

      // Create upload tasks for all new images
      const uploadTasks = imageUrlsToUpload.map(async (imageUrl) => {
        try {
          // Validate the URL
          const isValidImage = await isValidImageUrl(imageUrl);
          if (!isValidImage) {
            console.error(`Invalid image URL: ${imageUrl}`);
            return { imageUrl, success: false, error: "Invalid image URL" };
          }

          // Upload the image
          const uploadResponse = await createSureCartMedia({
            alt: "Product Image",
            title: "Product Image",
            url: imageUrl,
            variantOption: "", // Will update with specific variant data later
          });

          if (uploadResponse && uploadResponse.id) {
            // Store the media data
            imageUrlToMediaData.set(imageUrl, uploadResponse);
            return { imageUrl, success: true, mediaData: uploadResponse };
          } else {
            return {
              imageUrl,
              success: false,
              error: "Invalid upload response",
            };
          }
        } catch (error) {
          console.error(`Failed to upload image ${imageUrl}:`, error);
          return { imageUrl, success: false, error: String(error) };
        }
      });

      // Execute all uploads in parallel
      const uploadResults = await Promise.all(uploadTasks);

      // Log results
      const successCount = uploadResults.filter((r) => r.success).length;
      console.log(
        `Completed ${successCount}/${imageUrlsToUpload.length} image uploads`
      );
    } else {
      console.log("Step 5: No new images to upload, skipping upload step");
    }

    // STEP 6: Now process all products with the prepared images and collection assignments
    console.log(
      "Step 6: Creating or updating products with processed images and collection assignments..."
    );
    const productCreationResults = [];
    const skippedProducts = [];

    for (const { product, variantsWithImages } of productImageData) {
      console.log(
        `\n===== Processing product: ${product.name} (${product.slug}) =====`
      );

      // Check if product already exists using direct slug query
      let existingProduct = await checkProductExistsBySlug(product.slug);

      if (existingProduct && !deleteExisting) {
        console.log(
          `Product ${product.name} (${product.slug}) already exists with ID ${existingProduct.id}, skipping`
        );
        skippedProducts.push({
          productName: product.name,
          productId: existingProduct.id,
          slug: product.slug,
          skipped: true,
        });
        continue;
      }

      // Track gallery images for this product
      const galleryImageIds: string[] = [];

      // Process all variants with their images
      const variantMetadataUpdates = [];

      // For simple products, handle image assignment
      const isSimpleProduct =
        product.price &&
        (!product.variants ||
          !Array.isArray(product.variants) ||
          product.variants.length === 0);

      if (isSimpleProduct && product.metadata) {
        console.log(`Processing images for simple product: ${product.name}`);

        // Process primary image
        if (product.metadata.primary_image) {
          const primaryImage = product.metadata.primary_image;
          const mediaData = imageUrlToMediaData.get(primaryImage);

          if (mediaData) {
            // Store media data in product metadata
            product.metadata.wp_media_url = mediaData.source_url;
            product.metadata.wp_media = mediaData.id.toString();

            // Add to gallery
            if (!galleryImageIds.includes(mediaData.id.toString())) {
              galleryImageIds.push(mediaData.id.toString());
            }

            // Remove original URL to prevent it from being sent to the API
            delete product.metadata.primary_image;
          }
        }

        // Process additional images
        if (product.metadata.additional_images) {
          const additionalUrls = extractImages(
            product.metadata.additional_images
          );
          for (const additionalUrl of additionalUrls) {
            const additionalMediaData = imageUrlToMediaData.get(additionalUrl);
            if (
              additionalMediaData &&
              !galleryImageIds.includes(additionalMediaData.id.toString())
            ) {
              galleryImageIds.push(additionalMediaData.id.toString());
            }
          }
          // Remove the temporary metadata field
          delete product.metadata.additional_images;
        }
      }

      // Process variant images (for regular products)
      for (const { variant, imageUrl } of variantsWithImages) {
        const mediaData = imageUrlToMediaData.get(imageUrl);

        if (mediaData) {
          // Update the variant metadata
          variant.metadata = variant.metadata || {};
          variant.metadata.wp_media_url = mediaData.source_url;
          variant.metadata.wp_media = mediaData.id.toString();

          // Add to gallery if not already added
          if (!galleryImageIds.includes(mediaData.id.toString())) {
            galleryImageIds.push(mediaData.id.toString());
          }

          // Process additional images if stored in metadata
          if (variant.metadata.additional_images) {
            const additionalUrls = extractImages(
              variant.metadata.additional_images
            );
            for (const additionalUrl of additionalUrls) {
              const additionalMediaData =
                imageUrlToMediaData.get(additionalUrl);
              if (
                additionalMediaData &&
                !galleryImageIds.includes(additionalMediaData.id.toString())
              ) {
                galleryImageIds.push(additionalMediaData.id.toString());
              }
            }
            // Remove the temporary metadata field
            delete variant.metadata.additional_images;
          }

          // Update variant-specific metadata if needed
          if (variant.option_1) {
            // We'll collect these updates to do them in parallel later
            variantMetadataUpdates.push({
              mediaId: mediaData.id,
              variantOption: variant.option_1,
            });
          }
        }

        // Always remove the image URL as we don't need to send it to SureCart
        delete variant.image;
        delete variant.image_id;
      }

      // Update variant-specific metadata in parallel
      if (variantMetadataUpdates.length > 0) {
        await Promise.all(
          variantMetadataUpdates.map(async ({ mediaId, variantOption }) => {
            try {
              await fetch(
                `${process.env.WP_URL!}/wp-json/wp/v2/media/${mediaId}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization:
                      "Basic " +
                      Buffer.from(
                        `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
                      ).toString("base64"),
                  },
                  body: JSON.stringify({
                    meta: {
                      sc_variant_option: variantOption,
                    },
                  }),
                }
              );
            } catch (error) {
              console.error(
                `Failed to update variant metadata for media ${mediaId}:`,
                error
              );
            }
          })
        );
      }

      // Add gallery image IDs to product metadata
      if (galleryImageIds.length > 0) {
        product.metadata = product.metadata || {};
        // Convert string IDs to numbers and format as "[id1,id2,...]"
        const numericIds = galleryImageIds.map((id) => parseInt(id));
        product.metadata.gallery_ids = `[${numericIds.join(",")}]`;
        console.log(
          `Added ${galleryImageIds.length} images to product gallery`
        );
      }

      // Find the product's category slugs from the original data
      // First try to find by name which is more reliable with the new slug format
      const originalProductData =
        productData.find((p) => p.Name === product.name) ||
        productData.find(
          (p) => p.Slug === product.slug // Fallback to slug if name doesn't match
        );

      // Will hold all collection IDs to assign to the product
      const collectionIds: string[] = [];

      // Handle collection assignments from Category - Slugs
      if (originalProductData && originalProductData["Category - Slugs"]) {
        console.log(
          `Found Category - Slugs: "${originalProductData["Category - Slugs"]}"`
        );
        const categorySlugs = extractCategorySlugs(
          originalProductData["Category - Slugs"]
        );

        if (categorySlugs.length > 0) {
          console.log(
            `Processing ${categorySlugs.length} category slugs for "${product.name}"`
          );

          // Process each category slug
          for (const categorySlug of categorySlugs) {
            // Check if we have this collection in our map by slug
            let collection = findCollectionBySlug(collectionsMap, categorySlug);

            if (!collection) {
              // If collection not found, log error
              const errorMessage = `Collection not found for "${categorySlug}". Product will not be assigned to this collection.`;
              console.warn(errorMessage);

              // Record the error for logging
              collectionErrors.push({
                productName: product.name,
                productSlug: product.slug,
                categorySlug,
                normalizedSlug: normalizeToSlug(categorySlug),
                message: `Collection with slug "${categorySlug}" or normalized slug "${normalizeToSlug(categorySlug)}" does not exist`,
              });

              // Continue to next category
              continue;
            }

            // If we have a collection, add it to our collection IDs (if not already added)
            if (!collectionIds.includes(collection.id)) {
              collectionIds.push(collection.id);
              console.log(
                `Will assign product "${product.name}" to collection "${collection.name}" (${collection.slug})`
              );
            }
          }
        } else {
          console.warn(`No category slugs found for product "${product.name}"`);
        }
      } else {
        console.warn(`No Category - Slugs found for product "${product.name}"`);
      }

      // If we found at least one collection, assign all collections to the product
      if (collectionIds.length > 0) {
        product.product_collections = collectionIds;
        logCollectionAssignment(product.name, collectionIds, collectionsMap);
      } else {
        console.warn(`No collections found for product "${product.name}"`);
      }

      try {
        // Create or update the product in SureCart
        let productResponse;

        if (existingProduct) {
          // For existing products, ensure all variants have stock_adjustment set
          if (product.variants && Array.isArray(product.variants)) {
            product.variants = product.variants.map(
              (variant: SureCartVariant) => {
                // If stock is enabled, ensure stock_adjustment is set
                if (variant.stock_enabled && variant.stock !== undefined) {
                  return {
                    ...variant,
                    stock_adjustment: variant.stock, // Set stock_adjustment to match the stock quantity
                  };
                } else {
                  // If no stock data, ensure stock_adjustment is 0
                  return {
                    ...variant,
                    stock_adjustment: 0,
                  };
                }
              }
            );
          }

          // Now update the product
          productResponse = await updateSureCartProduct(
            existingProduct.id,
            product
          );
          console.log(`Product updated: ${productResponse.id}`);
        } else {
          // Otherwise create a new product
          console.log(
            `Creating ${isSimpleProduct ? "simple" : "variable"} product: ${product.name}`
          );
          console.log(
            isSimpleProduct
              ? `Simple product with price: ${product.price} cents`
              : `Variable product with ${product.variants?.length || 0} variants`
          );

          if (isSimpleProduct) {
            // For simple products, show exactly what we're sending to the API
            console.log("Simple product data:", {
              name: product.name,
              slug: product.slug,
              price: product.price,
              hasVariants: !!product.variants,
              variantsLength: product.variants?.length || 0,
            });
          }

          productResponse = await createSureCartProduct(product);
          console.log(`Product created: ${productResponse.id}`);
        }

        // Calculate the lowest price from all variants
        let lowestPrice = 0;
        if (product.price) {
          // For simple products, use the product price directly
          lowestPrice = product.price;
          console.log(
            `Simple product price for ${product.name}: ${lowestPrice} cents`
          );
        } else {
          // For variable products, find the lowest price from variants
          lowestPrice = findLowestPriceInCents(product.variants);
          console.log(
            `Lowest variant price for ${product.name}: ${lowestPrice} cents`
          );
        }

        // Create the product price (needed for cart functionality)
        if (lowestPrice > 0) {
          try {
            const priceResponse = await createSureCartProductPrice(
              productResponse.id,
              lowestPrice
            );
            console.log(
              `Created fallback price for product: ${priceResponse.id}`
            );
          } catch (priceError: any) {
            console.error(
              `Failed to create fallback price for product ${product.name}:`,
              priceError.message
            );
          }
        } else {
          console.warn(
            `Product ${product.name} has no valid price. Skipping fallback price creation.`
          );
        }

        productCreationResults.push({
          productName: product.name,
          productId: productResponse.id,
          success: true,
          action: existingProduct ? "updated" : "created",
        });
      } catch (productError: any) {
        console.error(
          `Failed to ${existingProduct ? "update" : "create"} product ${product.name}:`,
          productError.message,
          productError.status,
          productError.details ? JSON.stringify(productError.details) : ""
        );
        productCreationResults.push({
          productName: product.name,
          success: false,
          error: productError.message,
          action: existingProduct ? "update" : "create",
        });
      }
    }

    // Save collection errors to a file if any occurred
    let errorLogFile = null;
    if (collectionErrors.length > 0) {
      errorLogFile = await saveErrorsToFile(collectionErrors);
    }

    // Ensure everything is complete before returning
    console.log("Product sync completed");
    console.log(
      `Created/Updated ${productCreationResults.filter((r) => r.success).length}/${productCreationResults.length} products successfully`
    );
    console.log(`Skipped ${skippedProducts.length} existing products`);

    // Only now return the response
    return NextResponse.json({
      success: true,
      message: "Product sync completed",
      summary: {
        totalProducts: productCreationResults.length + skippedProducts.length,
        successfulProducts: productCreationResults.filter((r) => r.success)
          .length,
        skippedProducts: skippedProducts.length,
        totalImages: allImageUrls.size,
        uploadedImages: imageUrlsToUpload.length,
        dataSource: csvUrl
          ? "custom_csv_url"
          : sheetId && gid
            ? `google_sheet_${sheetId}`
            : "default_env_config",
        deleteExisting,
        collectionErrors: collectionErrors.length,
        errorLogFile,
      },
    });
  } catch (error: any) {
    console.error(
      "Error syncing product:",
      error.message,
      error.status,
      error.details ? JSON.stringify(error.details) : ""
    );
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync product",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Find the lowest price in cents from an array of variants
 */
function findLowestPriceInCents(
  variants: Array<{ amount: number }> | null | undefined
): number {
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    return 0;
  }

  // Filter out variants with invalid or zero prices
  const validPrices = variants
    .map((variant) => variant.amount)
    .filter((amount) => typeof amount === "number" && amount > 0);

  if (validPrices.length === 0) {
    return 0;
  }

  // Find the minimum price
  return Math.min(...validPrices);
}

/**
 * Fetch all existing media in the SureCart HappyFiles folder
 * @returns Map of filename to media data
 */
async function fetchAllExistingMedia(): Promise<
  Map<string, { id: number; source_url: string }>
> {
  const mediaMap = new Map<string, { id: number; source_url: string }>();
  const debugActive = true; // Set to true to enable detailed debug logs

  try {
    // Get the SureCart HappyFiles category ID
    const categoryId = await getSureCartHappyFilesId();
    console.log(`Using SureCart HappyFiles category ID: ${categoryId}`);

    // Fetch all media in the category
    let page = 1;
    let hasMoreItems = true;
    const allMedia = []; // Store all media items for secondary processing

    // First pass: Collect all media items
    while (hasMoreItems) {
      const mediaUrl = new URL(`${process.env.WP_URL!}/wp-json/wp/v2/media`);
      mediaUrl.searchParams.append(
        "happyfiles_category",
        categoryId.toString()
      );
      mediaUrl.searchParams.append("per_page", "100");
      mediaUrl.searchParams.append("page", page.toString());

      const response = await fetch(mediaUrl.toString(), {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
        },
      });

      if (!response.ok) {
        if (response.status === 400 && page > 1) {
          // This is expected when we exceed available pages
          break;
        }
        console.error(`Error fetching media: ${response.status}`);
        break;
      }

      const media = await response.json();

      if (!Array.isArray(media) || media.length === 0) {
        hasMoreItems = false;
        break;
      }

      // Add items to our collection
      allMedia.push(...media);
      console.log(`Fetched ${media.length} media items from page ${page}`);
      page++;
    }

    console.log(`Total media items fetched: ${allMedia.length}`);

    // Second pass: Process all media items and create lookup maps
    for (const item of allMedia) {
      try {
        // Get and clean the full filename
        let fullFilename = item.source_url.split("/").pop() || "";

        // Store full filename (without URL parameters)
        const fullFilenameClean = fullFilename.split("?")[0];

        // Extract basename (name without extension) and extension
        const parts = fullFilenameClean.split(".");
        const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : "";
        const basename = parts.join(".");

        // WordPress often adds -scaled, -300x200, etc to filenames
        // These patterns help us identify variations of the same image
        const patterns = [
          fullFilenameClean, // Original: image.jpg
          fullFilenameClean.toLowerCase(), // Lowercase: image.jpg → image.jpg
          basename.toLowerCase() + "." + extension, // Lowercase base+ext: Image.JPG → image.jpg
          basename.replace(/-\d+x\d+$/, "") + "." + extension, // Remove dimensions: image-300x200.jpg → image.jpg
          basename.replace(/-scaled$/, "") + "." + extension, // Remove -scaled: image-scaled.jpg → image.jpg
        ];

        // WordPress might add a numeric suffix for duplicates
        // Try to match patterns like: image-1.jpg, image-2.jpg, etc.
        const numericSuffixMatch = basename.match(/^(.+)-(\d+)$/);
        if (numericSuffixMatch) {
          const baseWithoutNumber = numericSuffixMatch[1];
          patterns.push(baseWithoutNumber + "." + extension);
          patterns.push(baseWithoutNumber.toLowerCase() + "." + extension);
        }

        // Additional debug info
        if (debugActive) {
          console.log(`Processing media item: ${item.id}`);
          console.log(`  URL: ${item.source_url}`);
          console.log(`  Filename: ${fullFilenameClean}`);
          console.log(`  Base: ${basename}, Extension: ${extension}`);
          console.log(`  Patterns: ${patterns.join(", ")}`);
        }

        // Store all variants in the map for lookup
        const uniquePatterns = Array.from(new Set(patterns)); // Convert to array first to avoid TypeScript error
        for (const pattern of uniquePatterns) {
          if (!mediaMap.has(pattern)) {
            mediaMap.set(pattern, {
              id: item.id,
              source_url: item.source_url,
            });
          } else if (debugActive) {
            console.log(`  Pattern already exists in map: ${pattern}`);
          }
        }
      } catch (itemError) {
        console.error(`Error processing media item ${item.id}:`, itemError);
        // Continue with next item
      }
    }

    console.log(`Mapped ${mediaMap.size} media filename patterns`);
  } catch (error) {
    console.error("Error fetching existing media:", error);
  }

  return mediaMap;
}

export async function DELETE(req: NextRequest) {
  console.log("Starting complete product data deletion process...");

  // Delete all products
  console.log("Deleting all products...");
  const productsResult = await deleteAllSureCartProducts();

  // Delete all product variants
  console.log("Deleting all product variants...");
  const variantsResult = await deleteAllProductVariants();

  // Delete all product collections
  console.log("Deleting all product collections...");
  const collectionsResult = await deleteAllProductCollections();

  return NextResponse.json({
    success: true,
    message: "Products and collections deleted",
    details: {
      products: productsResult.success,
      variants: variantsResult.success,
      collections: collectionsResult.success,
      collectionsDeleted: collectionsResult.count || 0,
    },
  });
}
