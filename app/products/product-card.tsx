"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { Product } from "./types";
import { useState, useEffect } from "react";
import { useProductImage } from "@/hooks/use-product-image";

// Helper to format price
function formatPrice(amount: number, currency: string): string {
  const dollars = amount / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

// Helper for category determination based on slug or metadata
function getProductCategory(product: Product): string {
  if (product.slug.includes("mountain")) return "Mountain Bike";
  if (product.slug.includes("road")) return "Road Bike";
  if (product.slug.includes("electric")) return "Electric Bike";
  if (product.slug.includes("commuter")) return "Commuter Bike";
  return "Bike";
}

// Helper to get image URL from WordPress media gallery IDs
function getProductImageUrl(product: Product): string {
  // Check if product has gallery_ids in metadata
  if (product.metadata?.gallery_ids) {
    try {
      // Parse gallery_ids from string format "[id]" to number array
      const galleryIds = JSON.parse(product.metadata.gallery_ids);
      if (galleryIds && galleryIds.length > 0) {
        // Use the first gallery image ID
        const mediaId = galleryIds[0];

        // For products with gallery_id 2981, we know the exact image path
        if (mediaId === 2981) {
          return "https://backoffice.sevenpeaksbike.com/wp-content/uploads/ALPE_LIGHT_GREY-960x720.png";
        }

        // For other media IDs, we need to use a direct image URL, not the API endpoint
        // Constructing a fallback image URL pattern based on product name
        // This is a simplified approach - ideally you would fetch the actual image URL from the API
        const productSlug = product.slug.split("-")[0].toUpperCase();
        return `https://backoffice.sevenpeaksbike.com/wp-content/uploads/${productSlug}-960x720.png`;
      }
    } catch (error) {
      console.error("Error parsing gallery_ids:", error);
    }
  }

  // Fallback to product.image_url or placeholder
  return product.image_url || "/placeholder.png?height=400&width=400";
}

// Skeleton component for loading state
function ProductCardSkeleton() {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border bg-background transition-all hover:shadow-md"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
    >
      <div className="block">
        <div className="aspect-square overflow-hidden bg-muted/30"></div>
        <div className="p-4">
          <motion.div
            className="h-6 w-2/3 bg-muted/30 rounded mb-2"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0.8 }}
            transition={{
              repeat: Infinity,
              duration: 1,
              repeatType: "reverse",
            }}
          ></motion.div>
          <motion.div
            className="h-4 w-1/2 bg-muted/30 rounded mb-4"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0.7 }}
            transition={{
              repeat: Infinity,
              duration: 1.3,
              repeatType: "reverse",
            }}
          ></motion.div>
          <div className="mt-2 flex items-center justify-between">
            <motion.div
              className="h-5 w-20 bg-muted/30 rounded"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0.9 }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                repeatType: "reverse",
              }}
            ></motion.div>
            <motion.div
              className="h-8 w-8 rounded-full bg-muted/30"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{
                repeat: Infinity,
                duration: 0.9,
                repeatType: "reverse",
              }}
            ></motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const [imageStatus, setImageStatus] = useState<
    "loading" | "loaded" | "error"
  >("loading");
  const { imageUrl, isLoading } = useProductImage(product);
  const [isVisible, setIsVisible] = useState(false);

  // Use effect to coordinate the states and prevent flashing
  useEffect(() => {
    // Once the image is loaded, we show it and keep it visible
    if (imageStatus === "loaded" && !isLoading) {
      setIsVisible(true);
    }
  }, [imageStatus, isLoading]);

  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border bg-background transition-all hover:shadow-md"
      whileHover={{
        y: -5,
        transition: { type: "spring", stiffness: 300 },
      }}
    >
      {product.badge && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
          {product.badge}
        </div>
      )}
      <Link href={`/products/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden relative">
          {/* Placeholder that fades out when image is ready */}
          <motion.div
            className="absolute inset-0 bg-muted/30 z-10"
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: isVisible ? 0 : [0.5, 0.7, 0.5],
            }}
            transition={{
              opacity: {
                repeat: isVisible ? 0 : Infinity,
                duration: 1.5,
                ease: "easeInOut",
              },
            }}
            style={{
              pointerEvents: "none",
              display: isVisible ? "none" : "block",
            }}
          />

          {/* Image container */}
          <motion.div
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Image
              src={imageUrl}
              alt={product.name}
              width={960}
              height={720}
              priority={true}
              onLoad={() => setImageStatus("loaded")}
              onError={() => setImageStatus("error")}
              className="h-full w-full object-cover"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
              }}
            />
          </motion.div>
        </div>
        <div className="p-4">
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-sm text-muted-foreground">
            {getProductCategory(product)}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold">
              {formatPrice(
                product.metrics.min_price_amount,
                product.metrics.currency
              )}
            </span>
            <motion.button
              className="rounded-full h-8 w-8 p-0 flex items-center justify-center bg-muted hover:bg-muted/80"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">Add to cart</span>
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Export the skeleton for use in loading states elsewhere
export { ProductCardSkeleton };
