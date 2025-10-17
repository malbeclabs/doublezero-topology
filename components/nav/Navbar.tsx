"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/images/logos/dz-logo-horizontal-dark.svg"
      : "/images/logos/dz-logo-horizontal-light.svg";

  return (
    <nav className="bg-background border-b border-border" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Image
              src={logoSrc}
              alt="DoubleZero"
              width={160}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>

          {/* Navigation Links and Theme Toggle */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className={
                  isActive("/")
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/upload">
              <Button
                variant="ghost"
                size="sm"
                className={
                  isActive("/upload")
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                Upload
              </Button>
            </Link>
            <Link href="/results">
              <Button
                variant="ghost"
                size="sm"
                className={
                  isActive("/results")
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                Results
              </Button>
            </Link>
            <Link href="/map">
              <Button
                variant="ghost"
                size="sm"
                className={
                  isActive("/map")
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                Map
              </Button>
            </Link>
            <Link href="/links">
              <Button
                variant="ghost"
                size="sm"
                className={
                  isActive("/links")
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }
              >
                Links
              </Button>
            </Link>

            {/* Theme Toggle */}
            <div className="ml-2 pl-2 border-l border-border">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
