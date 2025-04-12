"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Mountain, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MainFooter } from "@/components/footer/main-footer";

// Component interfaces
interface ProductCardProps {
  name: string;
  category: string;
  price: number;
  image: string;
  badge?: string; // Optional since one product doesn't have a badge
}

interface CategoryCardProps {
  title: string;
  description: string;
  image: string;
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20 z-10" />
        <div className="relative h-[70vh] w-full">
          <Image
            src="/placeholder.png?height=1080&width=1920"
            alt="Mountain biker riding through a forest trail"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 z-20 flex items-center">
          <div className="container">
            <div className="max-w-lg space-y-6 text-white">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Conquer Every <span className="text-primary">Peak</span>
              </h1>
              <p className="text-lg md:text-xl">
                Premium bikes engineered for the most demanding trails and the
                most ambitious riders.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="font-medium">
                  Shop Collection
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm font-medium"
                >
                  Find Your Fit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Featured Bikes
            </h2>
            <Link
              href="#"
              className="group flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
            >
              View all bikes
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProductCard
              name="Alpine X3"
              category="Mountain Bike"
              price={2499}
              image="/placeholder.png?height=600&width=600"
              badge="New"
            />
            <ProductCard
              name="Velocity Pro"
              category="Road Bike"
              price={1899}
              image="/placeholder.png?height=600&width=600"
              badge="Best Seller"
            />
            <ProductCard
              name="Summit E-Trail"
              category="Electric Bike"
              price={3299}
              image="/placeholder.png?height=600&width=600"
            />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Shop By Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <CategoryCard
              title="Mountain Bikes"
              description="Engineered for rough terrain and thrilling descents"
              image="/placeholder.png?height=600&width=600"
            />
            <CategoryCard
              title="Road Bikes"
              description="Built for speed, efficiency, and long-distance comfort"
              image="/placeholder.png?height=600&width=600"
            />
            <CategoryCard
              title="Electric Bikes"
              description="Power-assisted rides for extended adventures"
              image="/placeholder.png?height=600&width=600"
            />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Image
                src="/placeholder.png?height=800&width=800"
                alt="Bike manufacturing"
                width={600}
                height={600}
                className="rounded-lg object-cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Crafted With Precision
              </h2>
              <p className="text-lg text-muted-foreground">
                At Seven Peaks Gear, we combine cutting-edge technology with
                meticulous craftsmanship. Each bike is designed, engineered, and
                assembled with precision to deliver unparalleled performance on
                any terrain.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/png"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Premium aerospace-grade aluminum frames</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/png"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Precision-engineered suspension systems</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/png"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Hand-assembled by expert technicians</span>
                </li>
              </ul>
              <Button className="font-medium">Learn About Our Process</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Join The Seven Peaks Community
              </h2>
              <p className="text-lg opacity-90">
                Subscribe to our newsletter for exclusive offers, new product
                announcements, and expert riding tips.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
                />
                <Button variant="secondary" className="font-medium">
                  Subscribe
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-bold">30-Day Test Ride</h3>
                <p className="text-sm opacity-90">
                  Try any bike for 30 days. If you're not satisfied, return it
                  for a full refund.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Lifetime Warranty</h3>
                <p className="text-sm opacity-90">
                  All frames come with a lifetime warranty against manufacturing
                  defects.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Free Shipping</h3>
                <p className="text-sm opacity-90">
                  Free shipping on all orders over $100 within the continental
                  US.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">Expert Support</h3>
                <p className="text-sm opacity-90">
                  Our team of cycling experts is always available to answer your
                  questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({
  name,
  category,
  price,
  image,
  badge,
}: ProductCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background transition-all hover:shadow-md">
      {badge && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
          {badge}
        </div>
      )}
      <div className="aspect-square overflow-hidden">
        <Image
          src={image || "/placeholder.png"}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-muted-foreground">{category}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold">${price.toLocaleString()}</span>
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
    </div>
  );
}

function CategoryCard({ title, description, image }: CategoryCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/0 z-10" />
      <Image
        src={image || "/placeholder.png"}
        alt={title}
        width={600}
        height={400}
        className="h-[300px] w-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 text-white">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-white/80 mb-4">{description}</p>
        <Button
          variant="outline"
          className="w-fit border-white text-white bg-transparent hover:bg-white hover:text-black transition-colors"
        >
          Shop Now
        </Button>
      </div>
    </div>
  );
}
