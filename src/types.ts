// =============================================================
// Shyam Creations — Shared Type Definitions
// =============================================================

export type ViewMode = 'home' | 'product' | 'henna-booking' | 'my-bookings' | 'admin';

export type ServiceCategoryKey = 'mehendi' | 'jewellery';

export interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  price: string;
  rentalPriceDay?: string;
  stock?: number;
  stockLabel?: string;
  images: string[];
  description?: string;
  material?: string;
  weight?: string;
  inclusion?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface HennaBooking {
  id: string;
  ref: string;
  serviceCategory?: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  location: string;
  clientName: string;
  clientEmail?: string;
  phone: string;
  wa?: string;
  deliveryAddress?: string;
  shippingFee?: string;
  specialRequests?: string;
  rescheduleNotes?: string;
  artist?: string;
  status: string;
  type: 'henna' | 'jewellery';
  paymentStatus?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface JewelleryRental {
  id: string;
  productName: string;
  ref: string;
  image: string;
  startDate: string;
  returnDue: string;
  dailyRate: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  totalAmount?: string;
  itemPrice?: string;
  shippingFee?: string;
  deliveryAddress?: string;
}

export interface VisionaryArtist {
  id: string;
  name: string;
  role: string;
  specialty: string;
  experience: string;
  image: string;
}

export interface ServicePackage {
  id: string;
  category: string;
  title: string;
  price: string;
  unit: string;
  duration: string;
  description: string;
  image: string;
}

export interface StudioInfo {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  location: string;
}

export interface CustomerAccount {
  id?: string;
  created_at?: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  cart?: CartItem[];
  wishlist?: string[];
}

export interface PendingAuthAction {
  action: 'cart' | 'wishlist' | 'mehendi' | 'buy' | 'view-price' | string;
  targetView?: ViewMode;
  targetCategory?: ServiceCategoryKey;
  targetProduct?: Product;
}

export interface JewelleryCustomer {
  id?: string;
  created_at?: string;
  orderRef: string;
  customerName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  deliveryAddress: string;
  productName: string;
  jewelleryId?: string;
  itemPrice: string;
  shippingFee: string;
  totalAmount: string;
  paymentMethod: string;
  upiTransactionId: string;
  paymentStatus: string;
  orderStatus: string;
  notes?: string;
}

export interface JewelleryBooking {
  id?: string;
  created_at?: string;
  bookingRef: string;
  clientName: string;
  phone: string;
  email?: string;
  productName: string;
  jewelleryId?: string;
  bookingType?: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  dailyRate?: string;
  depositAmount?: string;
  totalPrice: string;
  location?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  status: string;
  notes?: string;
}
