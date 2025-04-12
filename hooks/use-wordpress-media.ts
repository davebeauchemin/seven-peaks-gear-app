import { useState, useEffect } from "react";
import {
  getMediaById,
  getOptimizedImageUrl,
  WordPressMediaItem,
} from "@/lib/wordpress/wordpress-media";

// Global cache for media items to avoid duplicate fetches
const mediaCache = new Map<number, WordPressMediaItem>();

export function useWordPressMedia(
  mediaId: number | null,
  size: "thumbnail" | "medium" | "large" | "full" = "medium"
) {
  const [isLoading, setIsLoading] = useState(mediaId !== null);
  const [error, setError] = useState<Error | null>(null);
  const [mediaItem, setMediaItem] = useState<WordPressMediaItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(
    "/placeholder.png?height=400&width=400"
  );

  useEffect(() => {
    let isMounted = true;

    const fetchMedia = async () => {
      if (!mediaId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Check if we already have this media item in the cache
        if (mediaCache.has(mediaId)) {
          const cachedItem = mediaCache.get(mediaId)!;
          setMediaItem(cachedItem);
          setImageUrl(getOptimizedImageUrl(cachedItem, size));
          setIsLoading(false);
          return;
        }

        // Otherwise fetch from API
        const mediaData = await getMediaById(mediaId);

        if (isMounted) {
          if (mediaData) {
            // Store in cache for future use
            mediaCache.set(mediaId, mediaData);
            setMediaItem(mediaData);
            setImageUrl(getOptimizedImageUrl(mediaData, size));
          } else {
            setError(new Error(`Failed to load media with ID ${mediaId}`));
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error loading media")
          );
          setIsLoading(false);
        }
      }
    };

    if (mediaId) {
      fetchMedia();
    } else {
      setIsLoading(false);
      setMediaItem(null);
      setImageUrl("/placeholder.png?height=400&width=400");
    }

    return () => {
      isMounted = false;
    };
  }, [mediaId, size]);

  return { isLoading, error, mediaItem, imageUrl };
}
