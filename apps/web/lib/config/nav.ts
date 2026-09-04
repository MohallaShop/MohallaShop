import type { ComponentType, SVGProps } from 'react'
import {
  BarChartIcon,
  DashboardIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  StoreIcon,
  UserIcon,
  UsersIcon,
  BikeIcon,
  WalletIcon,
  HeartIcon,
  GridIcon,
  CartIcon,
  MapPinIcon,
} from '@/components/icons'

export type IconType = ComponentType<SVGProps<SVGSVGElement>>
export type NavAction = 'location'

export interface NavItem {
  label: string
  href?: string
  icon: IconType
  action?: NavAction
  disabled?: boolean
  /** Small pill shown next to the label (e.g. "New"). */
  badge?: string
}

/**
 * Customer navigation. Unsupported commerce features stay in the left rail as
 * locked placeholders, so this set only carries available customer routes.
 */
export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Location', action: 'location', icon: MapPinIcon },
  { label: 'Browse Shops', href: '/shops', icon: StoreIcon },
  { label: 'Categories', href: '/categories', icon: GridIcon },
  { label: 'My Orders', href: '/orders', icon: ReceiptIcon },
  { label: 'Favorites', href: '/favorites', icon: HeartIcon },
]

/** Compact subset for the mobile bottom bar (sidebar shows the full list). */
export const CUSTOMER_MOBILE_NAV: NavItem[] = [
  { label: 'Location', action: 'location', icon: MapPinIcon },
  { label: 'Shops', href: '/shops', icon: StoreIcon },
  { label: 'Search', href: '/search', icon: SearchIcon },
  { label: 'Cart', href: '/cart', icon: CartIcon },
  { label: 'Orders', href: '/orders', icon: ReceiptIcon },
]

export const SHOPKEEPER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/shop', icon: DashboardIcon },
  { label: 'Products', href: '/shop/products', icon: GridIcon },
  { label: 'Orders', href: '/shop/orders', icon: ReceiptIcon },
]

export const SHOPKEEPER_MOBILE_NAV: NavItem[] = SHOPKEEPER_NAV

export const RIDER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/rider/dashboard', icon: DashboardIcon },
  { label: 'Deliveries', href: '/rider/deliveries', icon: BikeIcon },
  { label: 'Earnings', href: '/rider/earnings', icon: WalletIcon },
  { label: 'Profile', href: '/rider/profile', icon: UserIcon },
]

export const RIDER_MOBILE_NAV: NavItem[] = RIDER_NAV

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Shops', href: '/admin/shops', icon: StoreIcon },
  { label: 'Products', href: '/admin/products', icon: GridIcon },
  { label: 'Riders', href: '/admin/riders', icon: BikeIcon },
  { label: 'Users', href: '/admin/customers', icon: UsersIcon },
  { label: 'Orders', href: '/admin/orders', icon: ReceiptIcon },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChartIcon },
  { label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
]

export const ADMIN_MOBILE_NAV: NavItem[] = [
  { label: 'Home', href: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Shops', href: '/admin/shops', icon: StoreIcon },
  { label: 'Products', href: '/admin/products', icon: GridIcon },
  { label: 'Orders', href: '/admin/orders', icon: ReceiptIcon },
  { label: 'Users', href: '/admin/customers', icon: UsersIcon },
]
