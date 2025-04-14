"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: any }) {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchProductImage() {
      // Check if product has gallery_ids and it's not empty
      if (
        product?.gallery_ids &&
        Array.isArray(product.gallery_ids) &&
        product.gallery_ids.length > 0
      ) {
        try {
          // Get just the first image ID
          const firstImageId = product.gallery_ids[0];

          // Fetch the first image from the API endpoint
          const response = await fetch(
            `/api/wordpress-media?id=${firstImageId}`
          );

          if (response.ok) {
            const imageData = await response.json();
            setImageUrl(imageData.source_url || "/placeholder.svg");
          }
        } catch (error) {
          console.error("Error fetching product image:", error);
        }
      } else if (typeof product?.gallery_ids === "string") {
        // Handle case where gallery_ids might be a JSON string
        try {
          const parsedIds = JSON.parse(product.gallery_ids);
          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            const firstImageId = parsedIds[0];
            const response = await fetch(
              `/api/wordpress-media?id=${firstImageId}`
            );

            if (response.ok) {
              const imageData = await response.json();
              setImageUrl(imageData.source_url || "/placeholder.svg");
            }
          }
        } catch (error) {
          console.error("Error parsing or fetching product image:", error);
        }
      }
      setIsLoading(false);
    }

    fetchProductImage();
  }, [product]);

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background transition-all hover:shadow-md">
      {product.badge && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
          {product.badge}
        </div>
      )}
      <Link href={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            width={400}
            height={400}
            className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${isLoading ? "animate-pulse" : ""}`}
          />
        </div>
        <div className="p-4">
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.collections}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold">
              {product.priceDisplay || `$${product.price.toLocaleString()}`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full h-8 w-8 p-0"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">Add to cart</span>
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
