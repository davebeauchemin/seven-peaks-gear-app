import {
  fetchSureCart,
  checkExistingMediaByFilename,
  getSureCartHappyFilesId,
} from "./surecart-helpers";

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
    const fileName = media.url.split("/").pop() || "image.jpg";

    // Check if an image with this filename already exists
    // This will throw an error if the SureCart HappyFiles category doesn't exist
    const existingMedia = await checkExistingMediaByFilename(fileName);
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

    // Fetch the image data from the URL
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${media.url}`);
    }

    // Get the image data as ArrayBuffer and convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    console.log("Uploading media to WordPress");

    // Create FormData for WordPress upload
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([buffer], { type: contentType }),
      fileName
    );

    // Upload to WordPress with metadata
    const uploadImage = await fetch(
      process.env.WP_URL! + "/wp-json/wp/v2/media",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
        body: formData,
      }
    );

    if (!uploadImage.ok) {
      throw new Error(
        `Failed to upload image to WordPress: ${await uploadImage.text()}`
      );
    }

    const wpMediaData = await uploadImage.json();
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
        console.error(
          `Failed to assign HappyFiles category: ${updateResponse.status}`
        );
        console.error(await updateResponse.text());
        throw new Error(
          `Failed to assign media to SureCart HappyFiles category`
        );
      } else {
        updatedMedia = await updateResponse.json();
        console.log(`Successfully assigned media to HappyFiles category`);
      }
    } catch (categoryError) {
      console.error("Error assigning HappyFiles category:", categoryError);
      throw new Error(
        `Failed to assign media to SureCart HappyFiles category: ${categoryError}`
      );
    }

    console.log(
      `Successfully uploaded media to WordPress with ID: ${updatedMedia.id}`
    );

    // Return media data that can be used with SureCart product variant
    // When creating/updating the product variant, use:
    // metadata: { wp_media: mediaResponse.id }
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
