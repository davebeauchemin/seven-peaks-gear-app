"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./product-card";
import { ProductCardSkeleton } from "./product-card-skeleton";
import { getSureCartProducts } from "@/lib/surecart/surecart-products";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  priceDisplay: string;
  image: string;
  collections: string[];
  badge?: string;
}

// Define a type for the SureCart API response
interface SureCartResponse {
  data: Array<{
    id: string;
    name?: string;
    metadata?: Record<string, string>;
    variants?: Array<{
      amount: number;
    }>;
    image?: string;
    product_collections?: {
      data: Array<{
        id: string;
        name: string;
      }>;
    };
    metrics?: {
      currency: string;
      min_price_amount: number;
      max_price_amount: number;
      prices_count: number;
    };
  }>;
}

export function ProductGrid({
  filters = [],
  sortBy = "newest",
}: {
  filters?: string[];
  sortBy?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products based on filters and sort
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      try {
        // Fetch products from SureCart API with proper sorting and filters
        const response = (await getSureCartProducts({
          limit: 12,
          expand: ["product_collections"],
          featured: sortBy === "featured",
          sort: sortBy === "newest" ? "created_at:desc" : undefined,
          productCollectionIds: filters.length > 0 ? filters : undefined,
        })) as SureCartResponse;

        console.log(response); // For now, just console.log the response

        // Transform SureCart products to match our Product interface
        if (response?.data) {
          const transformedProducts = response.data.map((item) => {
            // Determine price display format (single price or range)
            let price = 0;
            let priceDisplay = "";

            if (item.metrics) {
              const minPrice = item.metrics.min_price_amount / 100;
              const maxPrice = item.metrics.max_price_amount / 100;

              if (minPrice === maxPrice) {
                // Single price
                price = minPrice;
                priceDisplay = `$${minPrice.toLocaleString()}`;
              } else {
                // Price range
                price = minPrice; // Use min price for sorting
                priceDisplay = `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`;
              }
            } else if (item.variants && item.variants.length > 0) {
              // Fallback to variants if metrics not available
              price = item.variants[0].amount / 100;
              priceDisplay = `$${price.toLocaleString()}`;
            }

            return {
              id: Number(item.id) || 0,
              name: item.name || "Unnamed Product",
              category: item.metadata?.category || "Uncategorized",
              price: price,
              priceDisplay: priceDisplay,
              image: item.image || "/placeholder.svg?height=600&width=600",
              collections:
                item.product_collections?.data?.map((c) => c.name) || [],
              badge: item.metadata?.badge,
              gallery_ids: item.metadata?.gallery_ids,
            };
          });

          setProducts(transformedProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [filters, sortBy]);

  return (
    <div className="flex-1">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, i) => (
            <ProductCard key={i} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your filters or browse all products.
          </p>
          <Button>Clear Filters</Button>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary text-primary-foreground"
            >
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
