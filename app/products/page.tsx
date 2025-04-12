import Link from "next/link";
import Image from "next/image";
import { getSureCartProducts } from "@/lib/surecart/surecart-products";
import { ProductsClient } from "./products-client";
import { Product, CollectionOption, SortOption } from "./types";

// Collection options for filtering
const collectionOptions: CollectionOption[] = [
  { id: "featured", label: "Featured" },
  { id: "new-arrivals", label: "New Arrivals" },
  { id: "best-sellers", label: "Best Sellers" },
  { id: "mountain", label: "Mountain Bikes" },
  { id: "road", label: "Road Bikes" },
  { id: "electric", label: "Electric Bikes" },
  { id: "commuter", label: "Commuter Bikes" },
  { id: "premium", label: "Premium Collection" },
];

// Sort options
const sortOptions: SortOption[] = [
  { value: "featured", label: "Featured" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "price-high-low", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

export default async function ProductsPage() {
  // Fetch products server-side
  const response = await getSureCartProducts();

  // Extract products from response.data if it exists
  let products: Product[] = [];

  if (response && typeof response === "object") {
    // Check if response has a data property that is an array
    if ("data" in response && Array.isArray(response.data)) {
      products = response.data as Product[];
    } else if (Array.isArray(response)) {
      products = response as Product[];
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
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

        <ProductsClient
          products={products}
          collectionOptions={collectionOptions}
          sortOptions={sortOptions}
        />
      </main>
    </div>
  );
}
