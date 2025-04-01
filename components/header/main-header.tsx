import Link from "next/link";
import { Mountain, ShoppingCart, Search } from "lucide-react";
import { AccountPopover } from "./account-popover";
import { MobileNav } from "./mobile-nav";
import { MainNavigationMenu } from "./navigation-menu";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import Image from "next/image";

export function MainHeader() {
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
          <MainNavigationMenu />
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="hidden md:flex items-center gap-1 text-sm font-medium hover:text-primary"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Link>
          <AccountPopover />
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

function AccessoriesMenu() {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>Accessories</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid grid-cols-[250px_1fr] gap-6 p-6 md:w-[600px] lg:w-[700px]">
          <div className="flex flex-col justify-between rounded-md bg-muted/50 p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm7 11h-1a6 6 0 0 0-12 0H5" />
                </svg>
                <span className="font-bold">Accessories</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enhance your riding experience with premium accessories designed
                for safety, comfort, and performance.
              </p>
            </div>
            <Image
              src="/placeholder.svg?height=400&width=400"
              alt="Cycling accessories"
              width={200}
              height={200}
              className="rounded-md object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <NavigationMenuLink asChild>
                <Link
                  href="#"
                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                >
                  <div className="mb-2 mt-4 text-lg font-medium">
                    Safety Gear
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground">
                    Helmets, lights, and reflective gear to keep you safe on the
                    road and trail.
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
                    Storage & Transport
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground">
                    Bike bags, racks, and carriers for all your gear and
                    equipment.
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
                    Maintenance
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground">
                    Tools, lubricants, and cleaning supplies to keep your bike
                    in top condition.
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
                    Hydration & Nutrition
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground">
                    Water bottles, cages, and energy supplements for long rides.
                  </p>
                </Link>
              </NavigationMenuLink>
            </div>
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
