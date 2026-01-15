"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/images/logos/dz-logo-horizontal-dark.svg"
      : "/images/logos/dz-logo-horizontal-light.svg";

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto flex items-center gap-4 px-4 py-3">
        <Image
          src={logoSrc}
          alt="DoubleZero"
          width={180}
          height={40}
          priority
          className="h-10 w-auto"
        />
        <h1 className="text-xl font-bold">Network Topology</h1>
      </div>
    </header>
  );
}
