"use client";

import { ProductFilter } from "@/components/product/product-filter";
import { ProductGrid } from "@/components/product/product-grid";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FilterItem = { id: string; name: string };

// Sort options
const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
];

export default function ProductsPage() {
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([]);
  const [activeSort, setActiveSort] = useState("newest");

  // Adapter function to handle filter changes
  const handleFilterChange = (filters: {
    collections: Array<{ id: string; name: string }>;
    priceRange: Array<{ id: string; name: string }>;
  }) => {
    // Just use the collections, ignore priceRange
    setActiveFilters(filters.collections);
  };

  // Function to remove a filter
  const removeFilter = (filterId: string) => {
    setActiveFilters(activeFilters.filter((filter) => filter.id !== filterId));
  };

  return (
    <main className="flex-1">
      <div className="bg-muted/30">
        <div className="container py-8 md:py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">All Bikes</h1>
            <p className="text-muted-foreground">
              Browse our collection of premium bikes for every terrain.
            </p>
          </div>
        </div>
      </div>

      <div className="container py-6 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar - Filter */}
          <div className="w-full md:w-64 flex-shrink-0">
            <ProductFilter onFilterChange={handleFilterChange} />
          </div>

          {/* Main content - Active filters and product grid */}
          <div className="flex-1">
            {/* Active filters and sort controls row */}
            <div className="mb-6 flex flex-wrap items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <Badge
                        key={filter.id}
                        variant="outline"
                        className="flex items-center gap-1 px-3 py-1.5"
                      >
                        {filter.name}
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove filter</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {
                        sortOptions.find((opt) => opt.value === activeSort)
                          ?.label
                      }
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sortOptions.map((option, i) => (
                      <DropdownMenuItem
                        key={i}
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

            {/* Product grid */}
            <ProductGrid
              filters={activeFilters.map((f) => f.id)}
              sortBy={activeSort}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductFilterWrapper() {
  return (
    <>
      <ClientFilterGrid />
    </>
  );
}

function ClientFilterGrid() {
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([]);
  const [activeSort, setActiveSort] = useState("newest");

  // Adapter function for ClientFilterGrid
  const handleFilterChange = (filters: {
    collections: Array<{ id: string; name: string }>;
    priceRange: Array<{ id: string; name: string }>;
  }) => {
    // Just use the collections, ignore priceRange
    setActiveFilters(filters.collections);
  };

  return (
    <>
      <ProductFilter onFilterChange={handleFilterChange} />
      <ProductGrid
        filters={activeFilters.map((f) => f.id)}
        sortBy={activeSort}
      />
    </>
  );
}
