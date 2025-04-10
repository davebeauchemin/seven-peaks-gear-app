import { fetchCSVData } from "@/lib/csv-helpers";
import {
  createSureCartProduct,
  createSureCartProductPrice,
  deleteAllProducts,
  deleteAllProductVariants,
  formatProductsForSureCart,
  isValidImageUrl,
  ProductCSVItem,
  getSureCartHappyFilesId,
} from "@/lib/surecart/surecart-helpers";
import { NextRequest, NextResponse } from "next/server";
import {
  createSureCartMedia,
  createSureCartProductMedia,
} from "@/lib/surecart/surecart-core-modules";

export async function POST(req: NextRequest) {
  try {
    console.log("Sync product request received...");

    // First delete all existing products, media, and variants
    console.log("Deleting existing data...");
    await deleteAllProducts();
    await deleteAllProductVariants();
    console.log("Existing data deleted successfully");

    const productData = (await fetchCSVData(
      process.env.PRODUCTS_FILE_URL!
    )) as ProductCSVItem[];

    // Format the products for SureCart
    const formattedProducts = formatProductsForSureCart(productData);

    // STEP 1: Get all existing media in the SureCart HappyFiles folder
    console.log("Step 1: Fetching all existing media in SureCart folder...");
    const existingMediaMap = await fetchAllExistingMedia();
    console.log(
      `Found ${existingMediaMap.size} existing media items in SureCart folder`
    );

    // STEP 2: Collect all unique image URLs needed across all products
    console.log(
      "Step 2: Collecting all unique image URLs across all products..."
    );
    const allImageUrls = new Set<string>();
    const productImageData: Array<{
      product: any;
      variantsWithImages: Array<{ variant: any; imageUrl: string }>;
    }> = [];

    // Collect all unique image URLs and track which variants use them
    for (const { product } of formattedProducts) {
      const variantsWithImages: Array<{ variant: any; imageUrl: string }> = [];

      for (const variant of product.variants) {
        if (variant.image) {
          allImageUrls.add(variant.image);
          variantsWithImages.push({ variant, imageUrl: variant.image });
        }
      }

      if (variantsWithImages.length > 0) {
        productImageData.push({ product, variantsWithImages });
      }
    }

    console.log(
      `Found ${allImageUrls.size} unique images to process across all products`
    );

    // STEP 3: Determine which images need to be uploaded (not in existing media)
    console.log("Step 3: Determining which images need to be uploaded...");
    const imageUrlsToUpload: string[] = [];
    const imageUrlToMediaData = new Map<
      string,
      { id: number; source_url: string }
    >();

    // First map all existing images to their media data
    for (const imageUrl of Array.from(allImageUrls)) {
      const fileName = imageUrl.split("/").pop() || "";
      if (existingMediaMap.has(fileName)) {
        // Image already exists, use existing media data
        imageUrlToMediaData.set(imageUrl, existingMediaMap.get(fileName)!);
        console.log(`Image already exists in WordPress: ${fileName}`);
      } else {
        // Image doesn't exist, need to upload
        imageUrlsToUpload.push(imageUrl);
      }
    }

    console.log(
      `${imageUrlsToUpload.length} images need to be uploaded, ${allImageUrls.size - imageUrlsToUpload.length} already exist`
    );

    // STEP 4: Upload all new images in parallel
    if (imageUrlsToUpload.length > 0) {
      console.log("Step 4: Uploading new images in parallel...");

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
      console.log("Step 4: No new images to upload, skipping upload step");
    }

    // STEP 5: Now process all products with the prepared images
    console.log("Step 5: Creating products with processed images...");
    const productCreationResults = [];

    for (const { product, variantsWithImages } of productImageData) {
      console.log(`Processing product: ${product.name}`);

      // Track gallery images for this product
      const galleryImageIds: string[] = [];

      // Process all variants with their images
      const variantMetadataUpdates = [];

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

      try {
        // Create the product in SureCart
        const createProductResponse = await createSureCartProduct(product);
        console.log(`Product created: ${createProductResponse.id}`);

        // Calculate the lowest price from all variants
        const lowestPrice = findLowestPriceInCents(product.variants);
        console.log(`Lowest price for ${product.name}: ${lowestPrice} cents`);

        // Create the product price (needed for cart functionality)
        if (lowestPrice > 0) {
          try {
            const priceResponse = await createSureCartProductPrice(
              createProductResponse.id,
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
          productId: createProductResponse.id,
          success: true,
        });
      } catch (productError: any) {
        console.error(
          `Failed to create product ${product.name}:`,
          productError.message,
          productError.status,
          productError.details ? JSON.stringify(productError.details) : ""
        );
        productCreationResults.push({
          productName: product.name,
          success: false,
          error: productError.message,
        });
      }
    }

    // Ensure everything is complete before returning
    console.log("Product sync completed");
    console.log(
      `Created ${productCreationResults.filter((r) => r.success).length}/${productCreationResults.length} products successfully`
    );

    // Only now return the response
    return NextResponse.json({
      success: true,
      message: "Product sync completed",
      summary: {
        totalProducts: productCreationResults.length,
        successfulProducts: productCreationResults.filter((r) => r.success)
          .length,
        totalImages: allImageUrls.size,
        uploadedImages: imageUrlsToUpload.length,
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
function findLowestPriceInCents(variants: Array<{ amount: number }>): number {
  if (!variants || variants.length === 0) {
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

  try {
    // Get the SureCart HappyFiles category ID
    const categoryId = await getSureCartHappyFilesId();
    console.log(`Using SureCart HappyFiles category ID: ${categoryId}`);

    // Fetch all media in the category
    let page = 1;
    let hasMoreItems = true;

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

      // Map each media item by its filename
      for (const item of media) {
        const filename = item.source_url.split("/").pop() || "";
        mediaMap.set(filename, {
          id: item.id,
          source_url: item.source_url,
        });
      }

      console.log(`Fetched ${media.length} media items from page ${page}`);
      page++;
    }
  } catch (error) {
    console.error("Error fetching existing media:", error);
  }

  return mediaMap;
}

export async function DELETE(req: NextRequest) {
  await deleteAllProducts();
  await deleteAllProductVariants();
  return NextResponse.json({ success: true, message: "Products deleted" });
}
