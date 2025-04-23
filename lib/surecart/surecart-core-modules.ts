"use server";

import { fetchSureCart } from "./surecart-helpers";
import {
  checkExistingWPMediaByFilename,
  getSureCartHappyFilesId,
} from "./surecart-media";

export type SureCartMediaResponse = {
  id: string;
  object: string;
  created_at: string;
  updated_at: string;
  alt?: string;
  title?: string;
  url?: string;
  filename?: string;
  filesize?: number;
  width?: number;
  height?: number;
  [key: string]: any;
};

/**
 * Creates a new media item in WordPress and sets up SureCart variant association
 * Return the WordPress media ID to be used in product variant metadata
 */
export async function createSureCartMedia(media: {
  alt?: string;
  title?: string;
  url: string;
  variantOption?: string;
}): Promise<{ id: number; source_url: string }> {
  try {
    console.log(`Processing media from URL: ${media.url}`);

    // Extract filename from URL
    const fileName = media.url.split("/").pop()?.split("?")[0] || "image.jpg";

    // Check if an image with this filename already exists
    // This will throw an error if the SureCart HappyFiles category doesn't exist
    const existingMedia = await checkExistingWPMediaByFilename(fileName);
    if (existingMedia) {
      console.log(
        `Using existing media with ID: ${existingMedia.id} for file: ${fileName}`
      );

      // Update the metadata if variantOption is provided
      if (media.variantOption) {
        console.log(
          `Updating metadata for existing media: ${existingMedia.id}`
        );
        try {
          // Update the attachment with variant metadata
          const updateMetadata = await fetch(
            `${process.env.WP_URL!}/wp-json/wp/v2/media/${existingMedia.id}`,
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
                  sc_variant_option: media.variantOption,
                },
              }),
            }
          );

          const updatedMedia = await updateMetadata.json();
          return {
            id: updatedMedia.id,
            source_url: updatedMedia.source_url,
          };
        } catch (metaError) {
          console.error(
            `Failed to update metadata for existing media ${existingMedia.id}:`,
            metaError
          );
          // Continue with the existing media even if metadata update fails
        }
      }

      return existingMedia;
    }

    // If no existing media found, continue with upload process
    console.log(`No existing media found for ${fileName}, uploading new file`);

    // Get the SureCart HappyFiles category ID
    // This will throw an error if the category doesn't exist
    const sureCartCategoryId = await getSureCartHappyFilesId();
    console.log(
      `Will assign uploaded media to SureCart HappyFiles category ID: ${sureCartCategoryId}`
    );

    // Download the image with retry logic
    let imageBuffer: Buffer | null = null;
    let contentType = "image/jpeg"; // Default content type
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `Downloading image from ${media.url} (attempt ${attempt}/${MAX_RETRIES})`
        );

        // Download with a timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(media.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Seven-Peaks-Gear-App/1.0",
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          );
        }

        // Get content type from response headers
        contentType = response.headers.get("content-type") || "image/jpeg";

        // Get the image data as ArrayBuffer and convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);

        console.log(
          `Successfully downloaded image (${imageBuffer.length} bytes)`
        );
        break; // Success, exit the retry loop
      } catch (downloadError: any) {
        console.error(`Download attempt ${attempt} failed:`, downloadError);
        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Failed to download image after ${MAX_RETRIES} attempts: ${downloadError.message}`
          );
        }
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }

    if (!imageBuffer) {
      throw new Error("Failed to download image: Buffer is null");
    }

    console.log(`Uploading media to WordPress (${imageBuffer.length} bytes)`);

    // Determine the correct file extension and MIME type
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    };
    const detectedMimeType = mimeMap[fileExtension] || contentType;

    // Upload directly to WordPress using the buffer
    const uploadResponse = await fetch(
      `${process.env.WP_URL!}/wp-json/wp/v2/media`,
      {
        method: "POST",
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": detectedMimeType,
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
        },
        body: imageBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `Failed to upload image to WordPress: ${uploadResponse.status} ${errorText}`
      );
    }

    const wpMediaData = await uploadResponse.json();
    let updatedMedia = wpMediaData;

    // Prepare metadata updates - combine HappyFiles category and variant option
    const metaUpdates: any = {};
    if (media.variantOption) {
      metaUpdates.sc_variant_option = media.variantOption;
    }

    // Update the attachment with HappyFiles category and other metadata
    try {
      console.log(
        `Assigning media ID ${updatedMedia.id} to HappyFiles category ${sureCartCategoryId}`
      );

      // Add retry logic for category assignment
      let categoryAssigned = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Format the HappyFiles category ID as required by the API
          // The API expects happyfiles_category to be an array of term IDs
          const updateResponse = await fetch(
            `${process.env.WP_URL!}/wp-json/wp/v2/media/${updatedMedia.id}`,
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
                happyfiles_category: [sureCartCategoryId],
                meta: metaUpdates,
              }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(
              `Failed to assign HappyFiles category: ${updateResponse.status}`
            );
          }

          updatedMedia = await updateResponse.json();
          console.log(`Successfully assigned media to HappyFiles category`);
          categoryAssigned = true;
          break;
        } catch (updateError) {
          console.error(
            `Category assignment attempt ${attempt} failed:`,
            updateError
          );
          if (attempt === 3) {
            // Use the media even without category assignment
            console.warn("Proceeding with media without category assignment");
            break;
          }
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (!categoryAssigned) {
        console.warn(
          `Failed to assign HappyFiles category after 3 attempts, but continuing with the uploaded media`
        );
      }
    } catch (categoryError) {
      console.error("Error assigning HappyFiles category:", categoryError);
      // Continue with the upload even if category assignment fails
      console.warn("Continuing with media despite category assignment failure");
    }

    console.log(
      `Successfully uploaded media to WordPress with ID: ${updatedMedia.id}`
    );

    // Return media data that can be used with SureCart product variant
    return {
      id: updatedMedia.id,
      source_url: updatedMedia.source_url,
    };
  } catch (error) {
    console.error("Media upload failed:", error);
    throw error;
  }
}

/**
 * Creates a SureCart Product Media with the given product ID and media URL
 */
export async function createSureCartProductMedia(params: {
  product_id: string;
  url: string;
  title?: string;
  alt?: string;
}): Promise<any> {
  try {
    console.log(
      `Creating SureCart Product Media for product: ${params.product_id}`
    );

    return await fetchSureCart({
      endpoint: "product_medias",
      method: "POST",
      body: {
        product_media: {
          product_id: params.product_id,
          url: params.url,
          title: params.title || "",
          alt: params.alt || "",
        },
      },
    });
  } catch (error) {
    console.error("Failed to create SureCart Product Media:", error);
    throw error;
  }
}
