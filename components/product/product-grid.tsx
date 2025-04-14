"use client";

import { useState, useEffect, useRef } from "react";
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
  pagination?: {
    count: number;
    limit: number | null;
    page: number | null;
  };
}

// Sort options
const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest", sort: "created_at:desc" },
  { value: "oldest", label: "Oldest", sort: "created_at:asc" },
  { value: "name_asc", label: "Name (A-Z)", sort: "name:asc" },
  { value: "name_desc", label: "Name (Z-A)", sort: "name:desc" },
  {
    value: "recently_updated",
    label: "Recently Updated",
    sort: "updated_at:desc",
  },
  {
    value: "cataloged_newest",
    label: "Recently Cataloged",
    sort: "cataloged_at:desc",
  },
  {
    value: "cataloged_oldest",
    label: "Oldest Cataloged",
    sort: "cataloged_at:asc",
  },
];

export function ProductGrid({
  filters = [],
  sortBy = "newest",
}: {
  filters?: string[];
  sortBy?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 12,
  });

  // Reference to track previous filters and sort
  const prevFiltersRef = useRef<string[]>([]);
  const prevSortByRef = useRef<string>("");

  // Function to get sort parameter for API call
  const getSortParam = (sortValue: string): string | undefined => {
    if (sortValue === "featured") return undefined; // Featured is handled separately

    // Find the sort option that matches the sortBy value
    const sortOption = sortOptions.find((option) => option.value === sortValue);
    return sortOption?.sort;
  };

  // Combined effect for filter changes and data fetching
  useEffect(() => {
    const filtersChanged =
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    const sortByChanged = prevSortByRef.current !== sortBy;

    // Update currentPage state if filters/sort changed
    let currentPage = pagination.currentPage;
    if (filtersChanged || sortByChanged) {
      currentPage = 1;
      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
      }));
    }

    // Track previous values
    prevFiltersRef.current = [...filters];
    prevSortByRef.current = sortBy;

    // Fetch products function
    const fetchProducts = async () => {
      setIsLoading(true);

      try {
        // Use currentPage to ensure we always use the correct page number
        const response = (await getSureCartProducts({
          limit: pagination.limit,
          page: currentPage,
          expand: ["product_collections"],
          featured: sortBy === "featured",
          sort: getSortParam(sortBy),
          productCollectionIds: filters.length > 0 ? filters : undefined,
        })) as SureCartResponse;

        // Update pagination information
        if (response.pagination) {
          const { count, limit } = response.pagination;
          const limitValue = limit || pagination.limit;
          const totalPages = Math.ceil(count / limitValue);

          // Make sure the current page is within bounds
          const validCurrentPage = Math.min(
            response.pagination.page || 1,
            totalPages || 1
          );

          setPagination({
            currentPage: validCurrentPage,
            totalPages,
            totalItems: count,
            limit: limitValue,
          });
        }

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

        // If we get a page out of range error, try fetching page 1
        if (String(error).includes("expected :page") && currentPage > 1) {
          console.log("Page out of range, fetching page 1 instead");
          setPagination((prev) => ({
            ...prev,
            currentPage: 1,
          }));
        }

        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [filters, sortBy, pagination.currentPage]);

  // Handle page changes with scroll to top
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      // Update page
      setPagination((prev) => ({
        ...prev,
        currentPage: newPage,
      }));

      // Scroll to top smoothly
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const { currentPage, totalPages } = pagination;
    const pageNumbers = [];

    // Logic to show a reasonable number of page buttons
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Show ellipsis or pages around current
      if (currentPage > 3) {
        pageNumbers.push("ellipsis");
      }

      // Pages around current
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Another ellipsis if needed
      if (currentPage < totalPages - 2) {
        pageNumbers.push("ellipsis");
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

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
      {!isLoading && products.length > 0 && pagination.totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === 1}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
            >
              Previous
            </Button>

            {getPageNumbers().map((pageNum, index) =>
              pageNum === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2">
                  ...
                </span>
              ) : (
                <Button
                  key={`page-${pageNum}`}
                  variant="outline"
                  size="sm"
                  className={
                    pagination.currentPage === pageNum
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }
                  onClick={() => handlePageChange(Number(pageNum))}
                >
                  {pageNum}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
