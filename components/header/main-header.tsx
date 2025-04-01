"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Mountain,
  ShoppingCart,
  Menu,
  Search,
  User,
  ChevronDown,
  Bike,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import React from "react";
import { cn } from "@/lib/utils";

const ListItem = React.forwardRef(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              Seven Peaks Gear
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Mountain Bikes</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid grid-cols-[250px_1fr] gap-6 p-6 md:w-[600px] lg:w-[700px]">
                    <div className="flex flex-col justify-between rounded-md bg-muted/50 p-6">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mountain className="h-6 w-6 text-primary" />
                          <span className="font-bold">Mountain Bikes</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Engineered for rough terrain and thrilling descents.
                          Find the perfect mountain bike for your adventures.
                        </p>
                      </div>
                      <Image
                        src="/placeholder.svg?height=400&width=400"
                        alt="Mountain bike on a trail"
                        width={200}
                        height={200}
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Adult Mountain Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Full-sized mountain bikes for riders 5'4" and
                              taller. Available in various frame sizes.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Junior Mountain Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Scaled-down mountain bikes for younger riders.
                              Durable and trail-ready.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Road Bikes</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid grid-cols-[250px_1fr] gap-6 p-6 md:w-[600px] lg:w-[700px]">
                    <div className="flex flex-col justify-between rounded-md bg-muted/50 p-6">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bike className="h-6 w-6 text-primary" />
                          <span className="font-bold">Road Bikes</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Built for speed, efficiency, and long-distance
                          comfort. Perfect for road cycling enthusiasts.
                        </p>
                      </div>
                      <Image
                        src="/placeholder.svg?height=400&width=400"
                        alt="Road bike on asphalt"
                        width={200}
                        height={200}
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Racing Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Lightweight and aerodynamic bikes designed for
                              competitive racing and maximum speed.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              Endurance Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Comfortable geometry for long-distance riding with
                              reduced fatigue.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Electric Bikes</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid grid-cols-[250px_1fr] gap-6 p-6 md:w-[600px] lg:w-[700px]">
                    <div className="flex flex-col justify-between rounded-md bg-muted/50 p-6">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-6 w-6 text-primary" />
                          <span className="font-bold">Electric Bikes</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Power-assisted rides for extended adventures. Conquer
                          longer distances and steeper climbs with ease.
                        </p>
                      </div>
                      <Image
                        src="/placeholder.svg?height=400&width=400"
                        alt="Electric bike"
                        width={200}
                        height={200}
                        className="rounded-md object-cover"
                      />
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              E-Mountain Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Electric mountain bikes for tackling challenging
                              trails with power assistance.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                      <div>
                        <NavigationMenuLink asChild>
                          <Link
                            href="#"
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium">
                              E-Commuter Bikes
                            </div>
                            <p className="text-sm leading-tight text-muted-foreground">
                              Practical electric bikes for daily commuting and
                              urban transportation.
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <AccessoriesPopover />
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="#" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    About
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="hidden md:flex items-center gap-1 text-sm font-medium hover:text-primary"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Link>
          <Link
            href="#"
            className="hidden md:flex items-center gap-1 text-sm font-medium hover:text-primary"
          >
            <User className="h-4 w-4" />
            <span>Account</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-1 text-sm font-medium hover:text-primary"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden md:inline">Cart</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              3
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function AccessoriesPopover() {
  return (
    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-sm font-medium">
            Accessories
            <ChevronDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="center">
          <div className="grid gap-1 p-2">
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Helmets
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Lights
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Locks
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Bike Bags
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Water Bottles
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              Maintenance
            </Link>
            <Link
              href="#"
              className="flex items-center rounded-md p-2 text-sm hover:bg-muted"
            >
              View All
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </NavigationMenuLink>
  );
}

function MobileNav() {
  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>
              <Link href="/" className="flex items-center gap-2">
                <Mountain className="h-6 w-6 text-primary" />
                <span className="font-bold">Seven Peaks Gear</span>
              </Link>
            </SheetTitle>
            <SheetDescription>
              Premium bikes for every adventure
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-4 mt-8">
            <div className="space-y-3">
              <p className="text-lg font-medium">Mountain Bikes</p>
              <div className="grid gap-2 pl-4">
                <Link href="#" className="text-sm hover:text-primary">
                  Adult Mountain Bikes
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Junior Mountain Bikes
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-medium">Road Bikes</p>
              <div className="grid gap-2 pl-4">
                <Link href="#" className="text-sm hover:text-primary">
                  Racing Bikes
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Endurance Bikes
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-medium">Electric Bikes</p>
              <div className="grid gap-2 pl-4">
                <Link href="#" className="text-sm hover:text-primary">
                  E-Mountain Bikes
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  E-Commuter Bikes
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-medium">Accessories</p>
              <div className="grid grid-cols-2 gap-2 pl-4">
                <Link href="#" className="text-sm hover:text-primary">
                  Helmets
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Lights
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Locks
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Bike Bags
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Water Bottles
                </Link>
                <Link href="#" className="text-sm hover:text-primary">
                  Maintenance
                </Link>
              </div>
            </div>
            <Link href="#" className="text-lg font-medium hover:text-primary">
              About
            </Link>
          </nav>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input type="search" placeholder="Search..." />
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="#"
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <User className="h-4 w-4" />
                <span>Account</span>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Cart (3)</span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
