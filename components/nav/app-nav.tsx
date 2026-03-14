'use client';

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Link,
} from '@heroui/react';
import { Wallet } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';

const primaryNav = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/review', label: 'Review' },
];

const secondaryNav = [
  { href: '/rules', label: 'Rules' },
  { href: '/categories', label: 'Categories' },
  { href: '/statements', label: 'Statements' },
  { href: '/import', label: 'Import' },
];

export function AppNav() {
  const authEnabled = true; // keep client/server markup consistent

  return (
    <Navbar isBordered maxWidth="xl" classNames={{ wrapper: 'px-4 sm:px-6', brand: 'min-w-0', content: 'gap-3' }}>
      <NavbarBrand className="gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-400/80 to-emerald-400/70 flex items-center justify-center text-slate-900 font-bold">
          🤑
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-brand-200">Personal Finance</div>
          <p className="text-base font-semibold truncate">dkmhndr_ money</p>
        </div>
      </NavbarBrand>

      <NavbarContent className="hidden md:flex" justify="end" gap={2}>
        {primaryNav.map((item) => (
          <NavbarItem key={item.href}>
            <Link color="foreground" href={item.href} className="text-sm font-semibold">
              {item.label}
            </Link>
          </NavbarItem>
        ))}
        <Dropdown placement="bottom-end" backdrop="blur">
          <DropdownTrigger>
            <Button variant="solid" color="primary" size="sm" className="font-semibold">
              Data
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Data menu"
            className="w-56"
            itemClasses={{ base: 'data-[hover=true]:bg-content2' }}
          >
            {secondaryNav.map((item) => (
              <DropdownItem key={item.href} as={Link} href={item.href}>
                {item.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
        {authEnabled && (
          <NavbarItem>
            <LogoutButton variant="solid" />
          </NavbarItem>
        )}
      </NavbarContent>

      {/* Mobile */}
      <NavbarContent className="flex md:hidden" justify="end" gap={1}>
        <Dropdown placement="bottom-end" backdrop="blur">
          <DropdownTrigger>
            <Button isIconOnly variant="solid" color="primary" size="sm" aria-label="Open navigation">
              <Wallet size={18} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Navigation"
            className="w-56"
            itemClasses={{ base: 'data-[hover=true]:bg-content2' }}
          >
            <DropdownItem key="section-main" className="text-xs font-semibold text-muted pointer-events-none">
              Main
            </DropdownItem>
            {primaryNav.map((item) => (
              <DropdownItem key={item.href} as={Link} href={item.href}>
                {item.label}
              </DropdownItem>
            ))}
            <DropdownItem key="divider" className="h-px my-2 bg-divider pointer-events-none" />
            <DropdownItem key="section-data" className="text-xs font-semibold text-muted pointer-events-none">
              Data
            </DropdownItem>
            {secondaryNav.map((item) => (
              <DropdownItem key={item.href} as={Link} href={item.href}>
                {item.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
        {authEnabled && (
          <NavbarItem className="pl-1">
            <LogoutButton variant="solid" />
          </NavbarItem>
        )}
      </NavbarContent>
    </Navbar>
  );
}
