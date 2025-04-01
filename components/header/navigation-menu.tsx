"use client";

import Link from "next/link";
import Image from "next/image";
import { Mountain, Bike, Zap } from "lucide-react";
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

interface ListItemProps extends React.ComponentPropsWithoutRef<typeof Link> {
  title: string;
  children: React.ReactNode;
}

const ListItem = React.forwardRef<HTMLAnchorElement, ListItemProps>(
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

export function MainNavigationMenu() {
  return (
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
                    Engineered for rough terrain and thrilling descents. Find
                    the perfect mountain bike for your adventures.
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
                        Full-sized mountain bikes for riders 5'4" and taller.
                        Available in various frame sizes.
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
                        Scaled-down mountain bikes for younger riders. Durable
                        and trail-ready.
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
                    Built for speed, efficiency, and long-distance comfort.
                    Perfect for road cycling enthusiasts.
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
                    Power-assisted rides for extended adventures. Conquer longer
                    distances and steeper climbs with ease.
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
                        Electric mountain bikes for tackling challenging trails
                        with power assistance.
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
                        Practical electric bikes for daily commuting and urban
                        transportation.
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <AccessoriesMenu />
        <NavigationMenuItem>
          <Link href="#" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              About
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
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
