export interface WordPressMediaItem {
  id: number;
  source_url: string;
  media_details: {
    sizes: {
      [key: string]: {
        source_url: string;
      };
    };
  };
  alt_text?: string;
  title: {
    rendered: string;
  };
}

const WP_URL =
  process.env.NEXT_PUBLIC_WP_URL || "https://backoffice.sevenpeaksbike.com";

/**
 * Fetch media details from WordPress by ID
 */
export async function getMediaById(
  mediaId: number
): Promise<WordPressMediaItem | null> {
  try {
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/media/${mediaId}`);

    if (!response.ok) {
      console.error(
        `Failed to fetch media with ID ${mediaId}: ${response.status}`
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching media with ID ${mediaId}:`, error);
    return null;
  }
}

/**
 * Get the best image URL for a given WordPress media ID and size
 */
export function getOptimizedImageUrl(
  media: WordPressMediaItem | null,
  size: "thumbnail" | "medium" | "large" | "full" = "medium"
): string {
  if (!media) {
    return "/placeholder.svg?height=400&width=400";
  }

  // If the requested size exists, use it
  if (size !== "full" && media.media_details?.sizes?.[size]?.source_url) {
    return media.media_details.sizes[size].source_url;
  }

  // Otherwise fallback to the full image
  return media.source_url;
}

/**
 * Preload media for a list of IDs to improve performance
 */
export async function preloadMediaItems(
  mediaIds: number[]
): Promise<Map<number, WordPressMediaItem>> {
  const mediaMap = new Map<number, WordPressMediaItem>();

  if (!mediaIds.length) return mediaMap;

  try {
    // We can request multiple media items by ID
    const queryParams = new URLSearchParams();
    mediaIds.forEach((id) => queryParams.append("include[]", id.toString()));

    const response = await fetch(
      `${WP_URL}/wp-json/wp/v2/media?${queryParams.toString()}&per_page=${mediaIds.length}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status}`);
    }

    const mediaItems: WordPressMediaItem[] = await response.json();

    // Map each media item by its ID for easy lookup
    mediaItems.forEach((item) => {
      mediaMap.set(item.id, item);
    });

    return mediaMap;
  } catch (error) {
    console.error("Error preloading media items:", error);
    return mediaMap;
  }
}
