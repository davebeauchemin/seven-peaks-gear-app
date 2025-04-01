import { Button } from "../ui/button";

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
            <Link href="#" className="text-lg font-medium hover:text-primary">
              Mountain Bikes
            </Link>
            <Link href="#" className="text-lg font-medium hover:text-primary">
              Road Bikes
            </Link>
            <Link href="#" className="text-lg font-medium hover:text-primary">
              Electric Bikes
            </Link>
            <Link href="#" className="text-lg font-medium hover:text-primary">
              Accessories
            </Link>
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

function Sheet({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { open, setOpen });
        }
        return child;
      })}
    </>
  );
}

function SheetTrigger({ asChild, children }) {
  return React.cloneElement(children, {
    onClick: () => {
      const event = new CustomEvent("toggleSheet", { detail: true });
      window.dispatchEvent(event);
    },
  });
}

function SheetContent({ side = "right", className, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleToggle = (e) => setOpen(e.detail);
    const handleClose = () => setOpen(false);

    window.addEventListener("toggleSheet", handleToggle);
    window.addEventListener("closeSheet", handleClose);

    return () => {
      window.removeEventListener("toggleSheet", handleToggle);
      window.removeEventListener("closeSheet", handleClose);
    };
  }, []);

  return (
    <>
      <div
        className={`fixed inset-y-0 ${
          side === "left" ? "left-0" : "right-0"
        } z-50 h-full w-3/4 max-w-sm transform bg-background p-6 shadow-lg transition duration-300 ease-in-out ${
          open
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full"
        } ${className}`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={() => {
            const event = new CustomEvent("closeSheet");
            window.dispatchEvent(event);
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        {children}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => {
            const event = new CustomEvent("closeSheet");
            window.dispatchEvent(event);
          }}
        />
      )}
    </>
  );
}

function SheetHeader({ children }) {
  return <div className="mb-6">{children}</div>;
}

function SheetTitle({ children }) {
  return <div className="text-lg font-semibold">{children}</div>;
}

function SheetDescription({ children }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
