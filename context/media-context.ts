"use client";

import React, { createContext, useContext, useState } from "react";

interface MediaItem {
  id: number;
  alt_text: string;
  title: string;
  source_url: string;
  sizes: {
    thumbnail?: string;
    medium?: string;
    large?: string;
  };
}

interface MediaContextType {
  getMedia: (id: number) => Promise<MediaItem | null>;
  mediaCache: Map<number, MediaItem>;
}

// Create context with undefined as default value
const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [mediaCache, setMediaCache] = useState<Map<number, MediaItem>>(
    new Map()
  );

  const getMedia = async (id: number): Promise<MediaItem | null> => {
    // Return from cache if available
    if (mediaCache.has(id)) {
      return mediaCache.get(id) || null;
    }

    try {
      // Fetch from API
      const response = await fetch(`/api/wordpress-media?id=${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch media ${id}: ${response.status}`);
      }

      const mediaData = await response.json();

      // Cache the result
      setMediaCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(id, mediaData);
        return newCache;
      });

      return mediaData;
    } catch (error) {
      console.error(`Error fetching media ${id}:`, error);
      return null;
    }
  };

  // Create the context value object
  const contextValue: MediaContextType = {
    getMedia,
    mediaCache,
  };

  // Use createElement instead of JSX
  return React.createElement(
    MediaContext.Provider,
    { value: contextValue },
    children
  );
}

export function useMedia() {
  const context = useContext(MediaContext);

  if (context === undefined) {
    throw new Error("useMedia must be used within a MediaProvider");
  }

  return context;
}
