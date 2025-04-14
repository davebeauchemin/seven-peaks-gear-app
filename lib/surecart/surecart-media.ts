"use server";

let sureCartHappyFilesId: number | null = null;

export async function getSureCartHappyFilesId(): Promise<number> {
  // Return cached value if available
  if (sureCartHappyFilesId !== null) {
    return sureCartHappyFilesId;
  }

  try {
    console.log("Fetching SureCart HappyFiles category...");

    // Use a simpler search query to find the SureCart folder directly
    const response = await fetch(
      `${process.env.WP_URL!}/wp-json/wp/v2/happyfiles_category?search=SureCart`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch HappyFiles categories: ${response.status}`
      );
    }

    const categories = await response.json();

    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error(
        "SureCart HappyFiles category not found. You MUST create this folder manually in WordPress before continuing."
      );
    }

    // Get the first matching category (should be the SureCart folder)
    const sureCartCategory = categories[0];

    console.log(
      `Found SureCart HappyFiles category with ID: ${sureCartCategory.id}`
    );
    sureCartHappyFilesId = sureCartCategory.id;
    return sureCartCategory.id;
  } catch (error) {
    console.error("Error finding SureCart HappyFiles category:", error);
    throw new Error(
      "SureCart HappyFiles category not found. You MUST create this folder manually in WordPress before continuing."
    );
  }
}

export async function checkExistingWPMediaByFilename(
  filename: string
): Promise<{ id: number; source_url: string } | null> {
  try {
    console.log(`Checking if image with filename "${filename}" already exists`);

    // Get the SureCart HappyFiles category ID
    let categoryId: number;
    try {
      categoryId = await getSureCartHappyFilesId();
      console.log(`Using SureCart HappyFiles category ID: ${categoryId}`);
    } catch (error) {
      // This is a critical error - we need the SureCart folder
      console.error("Failed to get SureCart HappyFiles category:", error);
      throw error; // Re-throw to stop the process
    }

    // Search WordPress media library for the filename within the SureCart category
    const mediaUrl = new URL(`${process.env.WP_URL!}/wp-json/wp/v2/media`);
    mediaUrl.searchParams.append("happyfiles_category", categoryId.toString());
    mediaUrl.searchParams.append("per_page", "100");

    // Fetch all media in the SureCart category
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
      console.error(`Error searching media: ${response.status}`);
      return null;
    }

    const media = await response.json();

    // Check if we found a matching media item by comparing filenames
    if (Array.isArray(media) && media.length > 0) {
      // Look for an exact filename match
      const matchingMedia = media.find((item) => {
        const itemFilename = item.source_url.split("/").pop();
        return itemFilename === filename;
      });

      if (matchingMedia) {
        console.log(
          `Found existing media with ID ${matchingMedia.id} for filename "${filename}" in SureCart category`
        );
        return {
          id: matchingMedia.id,
          source_url: matchingMedia.source_url,
        };
      }
    }

    console.log(
      `No existing media found for filename "${filename}" in SureCart category`
    );
    return null;
  } catch (error) {
    console.error(`Error checking existing media for "${filename}":`, error);
    throw error; // Re-throw the error to stop the process
  }
}

export async function getWPImage(id: number): Promise<string | null> {
  try {
    console.log(`Fetching WordPress media with ID: ${id}`);

    const response = await fetch(
      `${process.env.WP_URL!}/wp-json/wp/v2/media/${id}`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.WP_USERNAME!}:${process.env.WP_APP_PASSWORD!}`
            ).toString("base64"),
        },
      }
    );

    if (!response.ok) {
      console.error(`Error fetching media with ID ${id}: ${response.status}`);
      return null;
    }

    const media = await response.json();

    if (!media || !media.source_url) {
      console.error(`Media with ID ${id} does not have a source URL`);
      return null;
    }

    console.log(`Successfully fetched media URL: ${media.source_url}`);
    return media.source_url;
  } catch (error) {
    console.error(`Error fetching media with ID ${id}:`, error);
    return null;
  }
}
