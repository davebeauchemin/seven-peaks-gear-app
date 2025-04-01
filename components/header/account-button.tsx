"use client";

import { User } from "lucide-react";
import { useState, useRef, useEffect, createContext, useContext } from "react";

// Create a context to share the setOpen function
type PopoverContextType = {
  closePopover: () => void;
};

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

// Custom hook to use the popover context
export function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error("usePopover must be used within an AccountButton");
  }
  return context;
}

interface AccountButtonProps {
  children: React.ReactNode;
}

export function AccountButton({ children }: AccountButtonProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setOpen(false);
      timeoutRef.current = null;
    }, 200);
  };

  // Handle clicks outside to close the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open]);

  // Function to close the popover that can be shared with children
  const closePopover = () => {
    setOpen(false);
  };

  return (
    <PopoverContext.Provider value={{ closePopover }}>
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="hidden md:flex items-center gap-1 text-sm font-medium hover:text-primary focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          <User className="h-4 w-4" />
          <span>Account</span>
        </button>

        {open && children}
      </div>
    </PopoverContext.Provider>
  );
}
