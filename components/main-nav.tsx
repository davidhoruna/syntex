"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { memo } from "react"
import { LanguageToggle } from "@/components/language-toggle"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"

// Memoize the component to prevent unnecessary re-renders
export const MainNav = memo(function MainNav() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Pre-define navigation items to avoid recreating on each render
  const navItems = [
    { name: "Home", href: "/" },
    { name: "Math", href: "/math" },
    { name: "Read", href: "/read" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center">
        <Link href="/" className="text-xl mr-6 flex items-center">
          <span className="font-math">syntex</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "text-white"
                  : "text-zinc-400 hover:text-white transition-colors"
              }
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          {!loading &&
            (user ? (
              <UserMenu />
            ) : (
              <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Sign In
              </Link>
            ))}
        </div>
      </div>
    </header>
  )
})
