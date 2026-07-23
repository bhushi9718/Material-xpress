export type Category = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  blurb: string;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  subtitle: string;
  keywords: string[];
  price: number;
  unit: string;
  icon: string;
  accent: string;
  tag?: string;
};

export type OrderHistoryItem = {
  id: string;
  date: string;
  total: number;
  status: 'Delivered' | 'In Transit' | 'Cancelled';
  statusAccent: string;
  itemSummary: string;
  productIds: string[];
  reorderItems?: Array<{
    productId: string;
    productName?: string;
    quantity: number;
  }>;
};

export const categories: Category[] = [
  {
    id: 'hinges',
    name: 'Hinges',
    icon: 'construct-outline',
    accent: '#B38843',
    blurb: 'Soft-close and concealed fittings',
  },
  {
    id: 'locks',
    name: 'Locks',
    icon: 'lock-closed-outline',
    accent: '#6D5C43',
    blurb: 'Mortise and cabinet security',
  },
  {
    id: 'handles',
    name: 'Handles',
    icon: 'ellipse-outline',
    accent: '#A55C35',
    blurb: 'Pulls, levers, and D handles',
  },
  {
    id: 'slides',
    name: 'Slides',
    icon: 'swap-horizontal-outline',
    accent: '#355C73',
    blurb: 'Smooth drawer and wardrobe glides',
  },
  {
    id: 'fasteners',
    name: 'Fasteners',
    icon: 'hardware-chip-outline',
    accent: '#4F6B57',
    blurb: 'Screws, bolts, and anchors',
  },
  {
    id: 'adhesives',
    name: 'Adhesives',
    icon: 'color-fill-outline',
    accent: '#8E724C',
    blurb: 'Glue, filler, and finishing kits',
  },
];

export const products: Product[] = [
  {
    id: 'soft-close-hinge',
    name: 'SS 304 Soft Close Cabinet Hinge',
    categoryId: 'hinges',
    category: 'Hinges',
    subtitle: 'Smooth motion, satin finish',
    keywords: ['cabinet hinge', 'soft close', 'ss 304', 'kitchen shutter'],
    price: 248,
    unit: 'pair',
    icon: 'construct-outline',
    accent: '#B38843',
    tag: 'Best seller',
  },
  {
    id: 'mortise-lock-body',
    name: 'Mortise Lock Body 60mm',
    categoryId: 'locks',
    category: 'Locks',
    subtitle: 'Matte black, brass latch',
    keywords: ['mortise', 'door lock', '60mm', 'safety'],
    price: 680,
    unit: 'piece',
    icon: 'lock-closed-outline',
    accent: '#6D5C43',
    tag: 'Contract pick',
  },
  {
    id: 'aluminium-d-handle',
    name: 'Aluminium D Handle 300mm',
    categoryId: 'handles',
    category: 'Handles',
    subtitle: 'Brushed champagne profile',
    keywords: ['d handle', 'wardrobe pull', 'door handle', 'aluminium'],
    price: 210,
    unit: 'piece',
    icon: 'ellipse-outline',
    accent: '#A55C35',
  },
  {
    id: 'drawer-slide-450',
    name: 'Telescopic Drawer Slide 450mm',
    categoryId: 'slides',
    category: 'Drawer Slides',
    subtitle: 'Ball bearing, soft close',
    keywords: ['drawer slide', 'telescopic', '450mm', 'channel'],
    price: 432,
    unit: 'pair',
    icon: 'swap-horizontal-outline',
    accent: '#355C73',
    tag: 'Fast moving',
  },
  {
    id: 'drawer-slide-350',
    name: 'Undermount Soft Close Slide 350mm',
    categoryId: 'slides',
    category: 'Drawer Slides',
    subtitle: 'Premium cabinet track set',
    keywords: ['undermount', '350mm', 'soft close', 'drawer runner'],
    price: 385,
    unit: 'pair',
    icon: 'swap-horizontal-outline',
    accent: '#355C73',
  },
  {
    id: 'cabinet-knob-set',
    name: 'Brass Cabinet Knob Set',
    categoryId: 'handles',
    category: 'Handles',
    subtitle: 'Pack of 10 with screws',
    keywords: ['knob', 'cabinet knob', 'brass', 'drawer knob'],
    price: 280,
    unit: 'pack',
    icon: 'albums-outline',
    accent: '#A55C35',
  },
  {
    id: 'wood-screws-box',
    name: 'Wood Screws 1.5 inch',
    categoryId: 'fasteners',
    category: 'Fasteners',
    subtitle: '100-piece carpenter box',
    keywords: ['screws', 'wood screws', '1.5 inch', 'fastener'],
    price: 90,
    unit: 'box',
    icon: 'hardware-chip-outline',
    accent: '#4F6B57',
  },
  {
    id: 'fevicol-pro',
    name: 'Fevicol Pro 1kg',
    categoryId: 'adhesives',
    category: 'Adhesives',
    subtitle: 'Fast bond for woodwork',
    keywords: ['fevicol', 'glue', 'wood adhesive', 'white glue'],
    price: 210,
    unit: 'tin',
    icon: 'color-fill-outline',
    accent: '#8E724C',
  },
];

export const popularSearches = [
  'drawer slides',
  'cabinet hinge',
  'mortise lock',
  'wood screws',
  'door handle',
];

export const serviceHighlights = [
  'GST-ready invoices',
  'Same-day dispatch in Agra',
  'Bulk rates for contractors',
];

export const savedLocations = [
  {
    id: 'loc-home',
    label: 'Workshop',
    address: 'Sector 12, Agra, Uttar Pradesh',
  },
  {
    id: 'loc-office',
    label: 'Site Office',
    address: 'MG Road, Agra, Uttar Pradesh',
  },
  {
    id: 'loc-family',
    label: 'Family Home',
    address: 'Civil Lines, Agra, Uttar Pradesh',
  },
];

export const paymentOptions = ['UPI', 'Card', 'Net Banking'] as const;

export const orderHistory: OrderHistoryItem[] = [
  {
    id: 'ORD-8732',
    date: '23 May 2026',
    total: 870,
    status: 'Delivered',
    statusAccent: '#2C7A57',
    itemSummary: 'Mortise Lock Body, Fevicol Pro 1kg',
    productIds: ['mortise-lock-body', 'fevicol-pro'],
    reorderItems: [
      { productId: 'mortise-lock-body', productName: 'Mortise Lock Body 60mm', quantity: 1 },
      { productId: 'fevicol-pro', productName: 'Fevicol Pro 1kg', quantity: 2 },
    ],
  },
  {
    id: 'ORD-8731',
    date: '25 May 2026',
    total: 380,
    status: 'In Transit',
    statusAccent: '#B38843',
    itemSummary: 'Soft Close Cabinet Hinge',
    productIds: ['soft-close-hinge'],
    reorderItems: [
      { productId: 'soft-close-hinge', productName: 'SS 304 Soft Close Cabinet Hinge', quantity: 4 },
    ],
  },
  {
    id: 'ORD-8699',
    date: '18 May 2026',
    total: 1500,
    status: 'Cancelled',
    statusAccent: '#A04836',
    itemSummary: 'Aluminium D Handle 300mm',
    productIds: ['aluminium-d-handle'],
    reorderItems: [
      { productId: 'aluminium-d-handle', productName: 'Aluminium D Handle 300mm', quantity: 10 },
    ],
  },
];

export const profileQuickLinks = [
  {
    id: 'details',
    icon: 'person-outline',
    title: 'Personal details',
    subtitle: 'Contact info and delivery preferences',
  },
  {
    id: 'orders',
    icon: 'receipt-outline',
    title: 'Order history',
    subtitle: 'Reorder previous hardware bundles',
  },
  {
    id: 'locations',
    icon: 'location-outline',
    title: 'Saved addresses',
    subtitle: 'Manage workshop and site drop-offs',
  },
  {
    id: 'support',
    icon: 'help-circle-outline',
    title: 'Support',
    subtitle: 'Talk to Material Xpress sales support',
  },
];

export function formatCurrency(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function formatUnitPrice(product: Product) {
  return `${formatCurrency(product.price)} / ${product.unit}`;
}

export function getProductById(productId: string) {
  return products.find((product) => product.id === productId);
}
