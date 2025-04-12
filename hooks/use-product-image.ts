"use client";

import { useState, useEffect } from "react";
import { useMedia } from "@/context/media-context";
import { Product } from "@/app/products/types";

export function useProductImage(product: Product) {
  const { getMedia } = useMedia();
  const [imageUrl, setImageUrl] = useState<string>(
    "/placeholder.png?height=400&width=400"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [mediaId, setMediaId] = useState<number | null>(null);

  // Extract media ID when product changes
  useEffect(() => {
    if (product.metadata?.gallery_ids) {
      try {
        const galleryIds = JSON.parse(product.metadata.gallery_ids);
        if (galleryIds && galleryIds.length > 0) {
          setMediaId(galleryIds[0]);
        } else {
          setMediaId(null);
        }
      } catch (error) {
        console.error("Error parsing gallery_ids:", error);
        setMediaId(null);
      }
    } else {
      setMediaId(null);
    }
  }, [product]);

  // Fetch media when ID changes
  useEffect(() => {
    let isMounted = true;

    const loadMedia = async () => {
      setIsLoading(true);

      if (!mediaId) {
        // Fallback to product.image_url or placeholder
        if (isMounted) {
          setImageUrl(
            product.image_url || "/placeholder.png?height=400&width=400"
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        // For products with gallery_id 2981, we know the exact image path
        if (mediaId === 2981) {
          if (isMounted) {
            setImageUrl(
              "https://backoffice.sevenpeaksbike.com/wp-content/uploads/ALPE_LIGHT_GREY-960x720.png"
            );
            setIsLoading(false);
          }
          return;
        }

        // Otherwise fetch from API
        const media = await getMedia(mediaId);

        if (isMounted) {
          if (media) {
            // Prefer medium size if available
            setImageUrl(media.sizes.medium || media.source_url);
          } else {
            // Try the pattern-based approach as fallback
            const productSlug = product.slug.split("-")[0].toUpperCase();
            setImageUrl(
              `https://backoffice.sevenpeaksbike.com/wp-content/uploads/${productSlug}-960x720.png`
            );
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading product image:", error);
        if (isMounted) {
          setImageUrl(
            product.image_url || "/placeholder.png?height=400&width=400"
          );
          setIsLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, [mediaId, product, getMedia]);

  return {
    imageUrl,
    isLoading,
    mediaId,
  };
}
