"use client";

import Link from "next/link";
import { Mountain, Menu, Search, User, ShoppingCart } from "lucide-react";
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

export function MobileNav() {
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
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>Account</span>
                </p>
                <div className="grid gap-2 pl-4">
                  <Link href="#" className="text-sm hover:text-primary">
                    Dashboard
                  </Link>
                  <Link href="#" className="text-sm hover:text-primary">
                    Orders
                  </Link>
                  <Link href="#" className="text-sm hover:text-primary">
                    Billing
                  </Link>
                  <Link href="#" className="text-sm hover:text-primary">
                    Log out
                  </Link>
                </div>
              </div>
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
