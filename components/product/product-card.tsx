import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: any }) {
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
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            width={400}
            height={400}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
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
