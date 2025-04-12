"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown,
  Filter,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductCard } from "./product-card";
import { Product, CollectionOption, SortOption } from "./types";

interface ProductsClientProps {
  products: Product[];
  collectionOptions: CollectionOption[];
  sortOptions: SortOption[];
}

// Helper for category determination based on slug or metadata
function getProductCategory(product: Product): string {
  if (product.slug.includes("mountain")) return "Mountain Bike";
  if (product.slug.includes("road")) return "Road Bike";
  if (product.slug.includes("electric")) return "Electric Bike";
  if (product.slug.includes("commuter")) return "Commuter Bike";
  return "Bike";
}

// Helper to check if product belongs to a collection
function productBelongsToCollection(
  product: Product,
  collectionId: string
): boolean {
  if (!product || !product.slug) return false;

  switch (collectionId) {
    case "featured":
      return product.featured === true;
    case "mountain":
      return (
        product.slug.includes("mountain") ||
        product.content?.toLowerCase().includes("mountain")
      );
    case "road":
      return (
        product.slug.includes("road") ||
        product.content?.toLowerCase().includes("road")
      );
    case "electric":
      return (
        product.slug.includes("electric") ||
        product.content?.toLowerCase().includes("electric")
      );
    case "commuter":
      return (
        product.slug.includes("city") ||
        product.content?.toLowerCase().includes("city")
      );
    case "premium":
      return product.metrics?.min_price_amount > 100000; // Over $1000
    case "new-arrivals":
      // Consider products created in the last 3 months as new arrivals
      return true; // All products for demo
    case "best-sellers":
      // For demo, just show some products
      return product.metrics?.min_price_amount < 100000; // Under $1000
    default:
      return false;
  }
}

// Animation variants for the product container
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Animation variants for each product card
const productVariants = {
  hidden: { y: 50, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export function ProductsClient({
  products,
  collectionOptions,
  sortOptions,
}: ProductsClientProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9; // Show 9 products per page (3x3 grid)

  // Ref for the top filters section
  const filtersRef = useRef<HTMLDivElement>(null);
  // Ref for the products grid area
  const productsGridRef = useRef<HTMLDivElement>(null);

  // Filter products based on active filters
  const filteredProducts =
    Array.isArray(products) && products.length > 0
      ? activeFilters.length > 0
        ? products.filter(
            (product) =>
              product &&
              activeFilters.some((filter) =>
                productBelongsToCollection(product, filter)
              )
          )
        : products
      : [];

  // Sort products based on active sort
  const sortedProducts =
    Array.isArray(filteredProducts) && filteredProducts.length > 0
      ? [...filteredProducts].sort((a, b) => {
          if (!a?.metrics || !b?.metrics) return 0;

          switch (activeSort) {
            case "price-low-high":
              return (
                (a.metrics.min_price_amount || 0) -
                (b.metrics.min_price_amount || 0)
              );
            case "price-high-low":
              return (
                (b.metrics.min_price_amount || 0) -
                (a.metrics.min_price_amount || 0)
              );
            case "newest":
              // Sort by created_at if available
              const aTime = a.created_at || 0;
              const bTime = b.created_at || 0;
              return bTime - aTime;
            default:
              // Featured first
              return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          }
        })
      : [];

  // Calculate total pages
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  // When filters change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, activeSort]);

  // Get current page products
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    // Scroll to the top of the window instead of a specific element
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // Change page
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    scrollToTop();
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    scrollToTop();
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    scrollToTop();
  };

  // Toggle filter
  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters([]);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 5; // Maximum number of page buttons to show

    if (totalPages <= maxPageButtons) {
      // Show all pages if total pages is less than max buttons
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're at the start or end
      if (currentPage <= 2) {
        endPage = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 1) {
        startPage = Math.max(totalPages - 3, 2);
      }

      // Add ellipsis if needed
      if (startPage > 2) {
        pages.push("ellipsis-start");
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="container py-6 md:py-10">
      <div className="flex flex-col gap-6 md:flex-row" ref={filtersRef}>
        {/* Desktop Filters Sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Collections
                </h3>
                <div className="flex flex-wrap gap-2">
                  {collectionOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleFilter(option.id)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        activeFilters.includes(option.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Price Range
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    Under $1000
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    $1000 - $2000
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    $2000 - $3000
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    $3000+
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Bike Type
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    Mountain
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    Road
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    Electric
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                    Hybrid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        <div className="md:hidden">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mb-4 flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilters.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Refine your product selection
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-8">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Collections
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {collectionOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => toggleFilter(option.id)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          activeFilters.includes(option.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Price Range
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      Under $1000
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      $1000 - $2000
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      $2000 - $3000
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      $3000+
                    </button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Bike Type
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      Mountain
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      Road
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      Electric
                    </button>
                    <button className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80">
                      Hybrid
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 space-x-2">
                <Button onClick={() => setMobileFiltersOpen(false)}>
                  Apply Filters
                </Button>
                {activeFilters.length > 0 && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Products Grid */}
        <div className="flex-1" ref={productsGridRef}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => {
                const option = collectionOptions.find(
                  (opt) => opt.id === filter
                );
                return (
                  <div
                    key={filter}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm text-primary"
                  >
                    {option?.label}
                    <button
                      onClick={() => toggleFilter(filter)}
                      className="ml-1 rounded-full bg-primary/20 p-0.5 hover:bg-primary/30"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    {sortOptions.find((opt) => opt.value === activeSort)?.label}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setActiveSort(option.value)}
                      className={
                        activeSort === option.value
                          ? "bg-accent font-medium"
                          : ""
                      }
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {sortedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    {getPageNumbers().map((page, index) =>
                      typeof page === "number" ? (
                        <Button
                          key={`page-${page}`}
                          variant="outline"
                          size="sm"
                          className={
                            currentPage === page
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                          onClick={() => paginate(page)}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={`ellipsis-${index}`} className="px-2">
                          ...
                        </span>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or browse all products.
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
