"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getProductCollections } from "@/lib/surecart/surecart-collections";

export function ProductFilter({
  onFilterChange,
}: {
  onFilterChange: (filters: {
    collections: Array<{ id: string; name: string }>;
    priceRange: Array<{ id: string; name: string }>;
  }) => void;
}) {
  const [activeFilters, setActiveFilters] = useState<{
    collections: Array<{ id: string; name: string }>;
    priceRange: Array<{ id: string; name: string }>;
  }>({
    collections: [],
    priceRange: [],
  });
  const [collectionOptions, setCollectionOptions] = useState<
    Array<{
      id: string;
      label: string;
      isParent?: boolean;
      position?: number;
    }>
  >([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set()
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [parentChildMap, setParentChildMap] = useState<
    Map<string, { id: string; label: string; position?: number }[]>
  >(new Map());

  // Fetch collections from SureCart API - only run once on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoading(true);
      try {
        const response = await getProductCollections({
          limit: 100,
        });
        if (response.data && response.data.length > 0) {
          // Group collections by parent/child
          const parentCollections: Array<{
            id: string;
            originalId: string; // Store the original UUID
            label: string;
            position?: number;
            children: { id: string; label: string; position?: number }[];
          }> = [];
          const childCollectionsMap = new Map<
            string,
            { id: string; label: string; position?: number; parentId: string }[]
          >();

          // First pass - identify parents and group children
          response.data.forEach((collection) => {
            const parentId = collection.metadata?.parent_collection;
            // Get position from API response
            const position =
              collection.position !== undefined
                ? Number(collection.position)
                : undefined;

            if (!parentId) {
              // This is a parent collection
              parentCollections.push({
                id: collection.id,
                originalId: collection.id, // Store the original UUID
                label: collection.name,
                position,
                children: [],
              });
            } else {
              // This is a child collection
              if (!childCollectionsMap.has(parentId)) {
                childCollectionsMap.set(parentId, []);
              }
              childCollectionsMap.get(parentId)!.push({
                id: collection.id,
                label: collection.name,
                position,
                parentId,
              });
            }
          });

          // Sort parent collections by position
          parentCollections.sort((a, b) => {
            // If positions are defined, sort by them
            if (a.position !== undefined && b.position !== undefined) {
              return a.position - b.position;
            }
            // If only one has position, prioritize it
            if (a.position !== undefined) return -1;
            if (b.position !== undefined) return 1;
            // Otherwise sort alphabetically
            return a.label.localeCompare(b.label);
          });

          // Second pass - add sorted children to their parents
          parentCollections.forEach((parent) => {
            // Look up children by the parent's original UUID
            const children = childCollectionsMap.get(parent.originalId) || [];

            // Sort children by position
            const sortedChildren = children
              .map((child) => ({
                id: child.id,
                label: child.label,
                position: child.position,
              }))
              .sort((a, b) => {
                // If positions are defined, sort by them
                if (a.position !== undefined && b.position !== undefined) {
                  return a.position - b.position;
                }
                // If only one has position, prioritize it
                if (a.position !== undefined) return -1;
                if (b.position !== undefined) return 1;
                // Otherwise sort alphabetically
                return a.label.localeCompare(b.label);
              });

            parent.children = sortedChildren;
          });

          // Create parent-child map for UI rendering
          const newParentChildMap = new Map<
            string,
            { id: string; label: string; position?: number }[]
          >();
          parentCollections.forEach((parent) => {
            // Map uses the ID for lookup in the UI
            newParentChildMap.set(parent.id, parent.children);
          });
          setParentChildMap(newParentChildMap);

          // Create flat collection options list with parent items only
          const collections = parentCollections.map((parent) => ({
            id: parent.id,
            label: parent.label,
            position: parent.position,
            isParent: true,
          }));

          setCollectionOptions(collections);
        } else {
          setCollectionOptions([]);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        setCollectionOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []); // Only run once on component mount

  // Update expanded parents when active filters change
  useEffect(() => {
    // Auto-expand parents with active filters
    if (activeFilters.collections.length > 0 && parentChildMap.size > 0) {
      const newExpandedParents = new Set<string>();

      // For each parent in parentChildMap
      parentChildMap.forEach((children, parentId) => {
        // Check if any of its children are in activeFilters
        const hasActiveChild = children.some((child) =>
          activeFilters.collections.some((filter) => filter.id === child.id)
        );

        if (hasActiveChild) {
          newExpandedParents.add(parentId);
        }
      });

      setExpandedParents(newExpandedParents);
    }
  }, [activeFilters.collections, parentChildMap]);

  // Toggle parent expansion
  const toggleParentExpand = (parentId: string) => {
    setExpandedParents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  // Toggle filter with single selection for collections
  const toggleFilter = (filterId: string, filterName: string) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const filterIndex = newFilters.collections.findIndex(
        (filter) => filter.id === filterId
      );

      if (filterIndex >= 0) {
        // Remove the filter if it exists
        newFilters.collections = newFilters.collections.filter(
          (filter) => filter.id !== filterId
        );
      } else {
        // Replace collections with the new one (single selection)
        newFilters.collections = [{ id: filterId, name: filterName }];
      }

      // Notify parent component about filter changes
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    const emptyFilters = { collections: [], priceRange: [] };
    setActiveFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  // Collection filter item renderer
  const renderCollectionItem = (option: {
    id: string;
    label: string;
    isParent?: boolean;
    position?: number;
  }) => {
    if (option.isParent) {
      const isExpanded = expandedParents.has(option.id);
      const hasChildren =
        parentChildMap.has(option.id) &&
        parentChildMap.get(option.id)!.length > 0;
      const childItems = parentChildMap.get(option.id) || [];

      return (
        <div key={option.id} className="mb-2">
          <button
            onClick={() =>
              hasChildren
                ? toggleParentExpand(option.id)
                : toggleFilter(option.id, option.label)
            }
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilters.collections.some(
                (filter) => filter.id === option.id
              )
                ? "bg-primary text-primary-foreground"
                : "bg-accent/40 hover:bg-accent/60"
            }`}
          >
            <span>{option.label}</span>
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-2 opacity-70" />
              ))}
          </button>

          {isExpanded && hasChildren && (
            <div className="pl-2 mt-1 space-y-1 border-l-2 border-accent/30 ml-2">
              {childItems.map((child) => (
                <button
                  key={child.id}
                  onClick={() => toggleFilter(child.id, child.label)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeFilters.collections.some(
                      (filter) => filter.id === child.id
                    )
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/30"
                  }`}
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Desktop Filters Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFilters.collections.length > 0 && (
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
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-8 animate-pulse rounded-md bg-muted"></div>
                      <div className="pl-3 space-y-1">
                        <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/70"></div>
                        <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/70"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {collectionOptions.map(renderCollectionItem)}
                </div>
              )}
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
              {activeFilters.collections.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeFilters.collections.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine your product selection</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-8">
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Collections
                </h3>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-8 animate-pulse rounded-md bg-muted"></div>
                        <div className="pl-3 space-y-1">
                          <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/70"></div>
                          <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/70"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {collectionOptions.map(renderCollectionItem)}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 space-x-2">
              <Button onClick={() => setMobileFiltersOpen(false)}>
                Apply Filters
              </Button>
              {activeFilters.collections.length > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
