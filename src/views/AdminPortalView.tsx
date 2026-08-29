import React, { useState, useEffect } from 'react';
import { ViewMode, Product, HennaBooking, JewelleryRental, JewelleryCustomer, JewelleryBooking } from '../types';
import {
  isSupabaseConfigured,
  loginSupabaseAdmin,
  insertSupabaseJewellery,
  deleteSupabaseJewellery,
  fetchSupabaseJewelleryCustomers,
  updateSupabaseJewelleryCustomerStatus,
  deleteSupabaseJewelleryCustomer,
  JEWELLERY_CUSTOMERS_TABLE_SQL,
  fetchSupabaseJewelleryBookings,
  updateSupabaseJewelleryBookingStatus,
  deleteSupabaseJewelleryBooking,
  JEWELLERY_BOOKINGS_TABLE_SQL,
  JEWELLERY_TABLE_SQL,
  fetchSupabaseBookings,
  fetchSupabaseJewellery,
  testSupabaseConnection,
  SupabaseDiagnosticResult,
} from '../lib/supabaseService';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
} from '../lib/supabase';
import {
  getRazorpayKeyId,
  saveCustomRazorpayKeyId,
} from '../lib/razorpay';

interface AdminPortalViewProps {
  products: Product[];
  hennaBookings?: HennaBooking[];
  jewelleryRentals?: JewelleryRental[];
  onNavigate: (view: ViewMode) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateHennaBookingStatus?: (id: string, status: HennaBooking['status']) => void;
  onDeleteHennaBooking?: (id: string) => void;
  onUpdateJewelleryRentalStatus?: (id: string, status: JewelleryRental['status']) => void;
  onDeleteJewelleryRental?: (id: string) => void;
  onSelectProduct?: (product: Product) => void;
  onRefreshJewellery?: () => Promise<void>;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  products,
  hennaBookings = [],
  jewelleryRentals = [],
  onNavigate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateHennaBookingStatus,
  onDeleteHennaBooking,
  onUpdateJewelleryRentalStatus,
  onDeleteJewelleryRental,
  onSelectProduct,
  onRefreshJewellery,
}) => {
  // Admin Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [adminSection, setAdminSection] = useState<'INVENTORY' | 'HENNA' | 'RENTALS' | 'CUSTOMERS' | 'JEWELLERY_BOOKINGS'>('INVENTORY');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'RENTAL'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Database state fetched upon login or manual refresh
  const [dbHennaBookings, setDbHennaBookings] = useState<HennaBooking[]>(hennaBookings);
  const [dbProducts, setDbProducts] = useState<Product[]>(products);
  const [isRefreshingAll, setIsRefreshingAll] = useState<boolean>(false);

  // Sync props when parent App props change
  useEffect(() => {
    if (hennaBookings && hennaBookings.length > 0) {
      setDbHennaBookings(hennaBookings);
    }
  }, [hennaBookings]);

  useEffect(() => {
    if (products && products.length > 0) {
      setDbProducts(products);
    }
  }, [products]);

  // Jewellery Customers State
  const [customersList, setCustomersList] = useState<JewelleryCustomer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Jewellery Bookings State (jewellery_bookings Table)
  const [jewelleryBookingsList, setJewelleryBookingsList] = useState<JewelleryBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [showBookingsSqlModal, setShowBookingsSqlModal] = useState(false);
  const [copiedBookingsSql, setCopiedBookingsSql] = useState(false);

  // Jewellery Items Table Schema State
  const [showJewellerySqlModal, setShowJewellerySqlModal] = useState(false);
  const [copiedJewellerySql, setCopiedJewellerySql] = useState(false);

  // Supabase Custom Connection & Diagnostic State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<SupabaseDiagnosticResult | null>(null);
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);
  const [syncToastMsg, setSyncToastMsg] = useState<string | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState<boolean>(false);
  const [razorpayKeyInput, setRazorpayKeyInput] = useState<string>('');

  const handleOpenConfigModal = () => {
    const creds = getSupabaseCredentials();
    setCustomUrlInput(creds.url === 'https://placeholder-url.supabase.co' ? '' : creds.url);
    setCustomKeyInput(creds.key === 'placeholder-anon-key' ? '' : creds.key);
    setRazorpayKeyInput(getRazorpayKeyId() === 'rzp_test_1DP5mmOlF5G5ag' ? '' : getRazorpayKeyId());
    setDiagnosticResult(null);
    setConfigSaveMsg(null);
    setShowConfigModal(true);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setDiagnosticResult(null);
    setConfigSaveMsg(null);

    // Save temporary if inputs filled
    if (customUrlInput.trim() || customKeyInput.trim()) {
      saveCustomSupabaseCredentials(customUrlInput.trim(), customKeyInput.trim());
    }
    if (razorpayKeyInput.trim()) {
      saveCustomRazorpayKeyId(razorpayKeyInput.trim());
    }

    const diag = await testSupabaseConnection();
    setIsTestingConnection(false);
    setDiagnosticResult(diag);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (razorpayKeyInput.trim()) {
      saveCustomRazorpayKeyId(razorpayKeyInput.trim());
    }
    const saveRes = saveCustomSupabaseCredentials(customUrlInput.trim(), customKeyInput.trim());
    if (saveRes.success) {
      setConfigSaveMsg('✓ Credentials & Razorpay Key successfully saved!');
      const diag = await testSupabaseConnection();
      setDiagnosticResult(diag);
      if (isAuthenticated) {
        await loadAllDatabaseData();
      }
    } else {
      setConfigSaveMsg(`Credentials updated.`);
    }
  };

  const loadJewelleryCustomers = async () => {
    setIsLoadingCustomers(true);
    const data = await fetchSupabaseJewelleryCustomers();
    if (data) {
      setCustomersList(data);
    } else {
      // Derive from hennaBookings if table not yet populated
      const derivedFromBookings = dbHennaBookings
        .filter((b) => b.type === 'jewellery' || b.serviceCategory === 'Jewellery Rental & Sale')
        .map((b) => ({
          id: b.id,
          orderRef: b.ref,
          customerName: b.clientName,
          phone: b.phone || b.wa || '9363710342',
          whatsapp: b.wa || b.phone || '9363710342',
          email: b.clientEmail || 'client@shyamcreations.com',
          deliveryAddress: b.deliveryAddress || b.location || 'Studio Pickup',
          productName: b.serviceName.replace(/\(Jewellery Order\)/gi, '').trim(),
          itemPrice: b.paymentAmount ? `₹${(parseInt(b.paymentAmount.replace(/[^0-9]/g, '')) - 50).toLocaleString('en-IN')}` : '₹2,500',
          shippingFee: b.shippingFee || '₹50',
          totalAmount: b.paymentAmount || '₹2,550',
          paymentMethod: b.paymentMethod || 'Google Pay / UPI',
          upiTransactionId: b.transactionId || 'GPay-UTR-Verified',
          paymentStatus: 'Paid' as 'Paid',
          orderStatus: (b.status === 'Completed' ? 'Delivered' : 'Processing') as JewelleryCustomer['orderStatus'],
          notes: b.specialRequests || 'Express Courier Dispatch',
        }));
      setCustomersList(derivedFromBookings);
    }
    setIsLoadingCustomers(false);
  };

  const loadJewelleryBookings = async () => {
    setIsLoadingBookings(true);
    const data = await fetchSupabaseJewelleryBookings();
    if (data && data.length > 0) {
      setJewelleryBookingsList(data);
    } else {
      // Fallback derive from hennaBookings if table not yet populated
      const derivedFromHenna: JewelleryBooking[] = dbHennaBookings
        .filter((b) => b.type === 'jewellery' || b.serviceCategory === 'Jewellery Rental & Sale')
        .map((b) => ({
          id: b.id,
          bookingRef: b.ref,
          clientName: b.clientName,
          phone: b.phone || b.wa || '9363710342',
          email: b.clientEmail || 'client@shyamcreations.com',
          productName: b.serviceName.replace(/\(Jewellery Order\)/gi, '').trim(),
          bookingType: b.serviceName.toLowerCase().includes('rental') ? 'Rental' : 'Purchase',
          startDate: b.date || new Date().toISOString().split('T')[0],
          totalPrice: b.paymentAmount || '₹2,550',
          location: b.location || b.deliveryAddress || 'Studio Pickup',
          paymentStatus: 'Paid',
          paymentMethod: b.paymentMethod || 'Google Pay / UPI',
          transactionId: b.transactionId || 'UTN-VERIFIED',
          status: b.status === 'Completed' ? 'Returned' : (b.status === 'Cancelled' ? 'Cancelled' : 'Active Rental'),
          notes: b.specialRequests || 'Jewellery Reservation',
        }));
      setJewelleryBookingsList(derivedFromHenna);
    }
    setIsLoadingBookings(false);
  };

  // Comprehensive Database Fetch Function called on Admin Login or Refresh
  const loadAllDatabaseData = async () => {
    setIsRefreshingAll(true);
    setSyncToastMsg(null);

    let fetchedJewelCount = 0;
    let fetchedHennaCount = 0;

    // 1. Fetch Henna Bookings from Database
    try {
      const hennaData = await fetchSupabaseBookings();
      if (hennaData && hennaData.length > 0) {
        setDbHennaBookings(hennaData);
        fetchedHennaCount = hennaData.length;
      }
    } catch (e) {
      console.warn('Error fetching DB Henna bookings:', e);
    }

    // 2. Fetch Jewellery Inventory from Database
    try {
      const jewelleryData = await fetchSupabaseJewellery();
      if (jewelleryData && jewelleryData.length > 0) {
        setDbProducts(jewelleryData);
        fetchedJewelCount = jewelleryData.length;
      }
      if (onRefreshJewellery) {
        await onRefreshJewellery();
      }
    } catch (e) {
      console.warn('Error fetching DB Jewellery inventory:', e);
    }

    // 3. Fetch Jewellery Customers
    await loadJewelleryCustomers();

    // 4. Fetch Jewellery Bookings
    await loadJewelleryBookings();

    setIsRefreshingAll(false);

    if (fetchedJewelCount > 0) {
      setSyncToastMsg(`✓ Synced ${fetchedJewelCount} jewellery items & ${fetchedHennaCount} bookings from Supabase database.`);
    } else {
      setSyncToastMsg(`ℹ️ Database query completed. 0 items found in 'jewellery' table (using local catalogue cache). Check Database Settings if needed.`);
    }

    setTimeout(() => {
      setSyncToastMsg(null);
    }, 5000);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllDatabaseData();
    }
  }, [isAuthenticated, adminSection]);

  const handleUpdateBookingStatus = async (idOrRef: string, newStatus: JewelleryBooking['status']) => {
    await updateSupabaseJewelleryBookingStatus(idOrRef, newStatus);
    setJewelleryBookingsList((prev) =>
      prev.map((item) => (item.id === idOrRef || item.bookingRef === idOrRef ? { ...item, status: newStatus } : item))
    );
  };

  const handleDeleteBookingRecord = async (idOrRef: string) => {
    if (!window.confirm(`Are you sure you want to delete jewellery booking ${idOrRef}?`)) return;
    await deleteSupabaseJewelleryBooking(idOrRef);
    setJewelleryBookingsList((prev) => prev.filter((item) => item.id !== idOrRef && item.bookingRef !== idOrRef));
  };

  const handleUpdateCustomerStatus = async (idOrRef: string, newStatus: JewelleryCustomer['orderStatus']) => {
    await updateSupabaseJewelleryCustomerStatus(idOrRef, newStatus);
    setCustomersList((prev) =>
      prev.map((item) => (item.id === idOrRef || item.orderRef === idOrRef ? { ...item, orderStatus: newStatus } : item))
    );
  };

  const handleDeleteCustomer = async (idOrRef: string) => {
    if (!window.confirm(`Are you sure you want to delete customer record ${idOrRef}?`)) return;
    await deleteSupabaseJewelleryCustomer(idOrRef);
    setCustomersList((prev) => prev.filter((item) => item.id !== idOrRef && item.orderRef !== idOrRef));
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    const result = await loginSupabaseAdmin(loginEmail, loginPassword);
    setIsLoggingIn(false);

    if (result.success) {
      setIsAuthenticated(true);
      setAdminUser(result.user);
      setIsEmergencyMode(Boolean(result.isOffline || result.isEmergency));
      await loadAllDatabaseData();
    } else {
      setAuthError(result.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminUser(null);
  };


  // Form State for Add/Edit
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Bridal' as 'Bridal' | 'Minimal' | 'Hair' | 'Royal',
    type: 'Rental' as 'Rental' | 'Sale',
    price: '₹20,000',
    rentalPriceDay: '₹1,500/day',
    stock: 4,
    stockLabel: '4 Available',
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj'],
    description: 'Masterpiece bridal ornament.',
    material: '22k Gold Plated, Kundan, Pearls',
    weight: '200 grams',
    inclusion: 'Necklace, Earrings',
  });

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({
            ...prev,
            images: [reader.result as string, ...prev.images],
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [imageUrlInput.trim(), ...prev.images],
      }));
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      category: 'Bridal',
      type: 'Rental',
      price: '₹20,000',
      rentalPriceDay: '₹1,500/day',
      stock: 4,
      stockLabel: '4 Available',
      images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj'],
      description: 'Masterpiece bridal ornament.',
      material: '22k Gold Plated, Kundan, Pearls',
      weight: '200 grams',
      inclusion: 'Necklace, Earrings',
    });
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      type: prod.type,
      price: prod.price,
      rentalPriceDay: prod.rentalPriceDay || '',
      stock: prod.stock,
      stockLabel: prod.stockLabel,
      images: prod.images,
      description: prod.description,
      material: prod.material,
      weight: prod.weight,
      inclusion: prod.inclusion,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const updatedProd = {
        ...editingProduct,
        ...formData,
      };
      onUpdateProduct(updatedProd);

      // Insert/update into Supabase table if connected
      if (isSupabaseConfigured()) {
        await insertSupabaseJewellery({
          id: updatedProd.id,
          name: updatedProd.name,
          category: updatedProd.category,
          type: updatedProd.type,
          price: updatedProd.price,
          rental_price_day: updatedProd.rentalPriceDay,
          stock: updatedProd.stock,
          stock_label: updatedProd.stockLabel,
          images: updatedProd.images,
          description: updatedProd.description,
          material: updatedProd.material,
          weight: updatedProd.weight,
          inclusion: updatedProd.inclusion,
        });
      }
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
      };
      onAddProduct(newProd);

      // Insert into Supabase table if connected
      if (isSupabaseConfigured()) {
        await insertSupabaseJewellery({
          id: newProd.id,
          name: newProd.name,
          category: newProd.category,
          type: newProd.type,
          price: newProd.price,
          rental_price_day: newProd.rentalPriceDay,
          stock: newProd.stock,
          stock_label: newProd.stockLabel,
          images: newProd.images,
          description: newProd.description,
          material: newProd.material,
          weight: newProd.weight,
          inclusion: newProd.inclusion,
        });
      }
    }
    if (onRefreshJewellery) {
      await onRefreshJewellery();
    }
    setIsAddModalOpen(false);
  };

  const handleDeleteProductWithSupa = async (prodId: string) => {
    onDeleteProduct(prodId);
    if (isSupabaseConfigured()) {
      await deleteSupabaseJewellery(prodId);
    }
    if (onRefreshJewellery) {
      await onRefreshJewellery();
    }
  };

  const filteredProducts = dbProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === 'ALL'
        ? true
        : filterType === 'SALE'
        ? p.type === 'Sale'
        : p.type === 'Rental';
    return matchesSearch && matchesType;
  });

  const filteredHennaBookings = dbHennaBookings.filter((b) =>
    b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.ref.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJewelleryRentals = jewelleryRentals.filter((r) =>
    r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.ref.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // RENDER ADMIN LOGIN SCREEN IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1c1c1a] text-[#ded8ce] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle Luxury Glow Effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#c79a3b]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#7b5900]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#252522] border border-[#c79a3b]/30 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-bold uppercase tracking-widest text-[#c79a3b] hover:underline inline-flex items-center gap-1 mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Main Store</span>
            </button>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#c79a3b] to-[#7b5900] text-[#1c1c1a] font-serif font-black text-2xl flex items-center justify-center shadow-lg">
              S
            </div>
            <h1 className="font-serif text-2xl font-bold text-white tracking-tight pt-1">
              Shyam Admin Portal
            </h1>
            <p className="text-xs text-[#807665]">
              Supabase Authenticated Management & Tracking
            </p>
          </div>

          {/* Connection Badge & Config Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#1c1c1a] p-3 rounded-xl border border-[#3d3d38] text-xs">
              <span className="text-[#807665] font-semibold">Supabase Backend:</span>
              {isSupabaseConfigured() ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Local Mode</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenConfigModal}
              className="w-full py-2 px-3 bg-[#1c1c1a] hover:bg-[#252522] border border-[#c79a3b]/40 text-[#c79a3b] hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">settings_ethernet</span>
              <span>Supabase Connection & Diagnostics</span>
            </button>
          </div>

          {authError && (
            <div className="space-y-2">
              <div className="p-3 bg-red-900/30 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5 text-red-400">error</span>
                <div className="space-y-1">
                  <p className="font-semibold leading-tight">{authError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenConfigModal}
                className="w-full py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-xs">tune</span>
                <span>Configure Supabase Project / Test Database Connection</span>
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#807665]">
                Admin Email / Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-[#807665] text-base">
                  mail
                </span>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@shyamcreations.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#807665]">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-[#807665] text-base">
                  lock
                </span>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-[#c79a3b] hover:bg-white text-[#1c1c1a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#1c1c1a] border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  <span>LOGIN TO ADMIN PORTAL</span>
                </>
              )}
            </button>
          </form>

          {/* Supabase authentication notice */}
          <div className="text-[11px] text-[#807665] bg-[#1c1c1a] p-3 rounded-xl border border-[#3d3d38] space-y-1">
            <p className="font-bold text-[#c79a3b] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified_user</span>
              <span>Supabase Admin Login:</span>
            </p>
            <p className="text-xs text-[#b8ae9c] leading-relaxed">
              Log in with your registered Supabase administrator email and password to track orders, manage henna bookings, and update jewellery inventory.
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#1c1c1a] text-[#ded8ce] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-[#121211] border-r border-[#c79a3b]/20 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Admin Header */}
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-bold uppercase tracking-widest text-[#c79a3b] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Public Store</span>
            </button>
            <h2 className="font-serif text-2xl font-bold text-white tracking-tight pt-2">
              Shyam Admin
            </h2>
            <p className="text-[10px] text-[#807665] uppercase tracking-widest font-bold">
              Jewellery & Henna Portal
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => {
                setAdminSection('INVENTORY');
                setFilterType('ALL');
              }}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                adminSection === 'INVENTORY'
                  ? 'bg-[#c79a3b] text-[#1c1c1a] font-bold shadow'
                  : 'hover:bg-[#252522] text-[#ded8ce]'
              }`}
            >
              <span className="material-symbols-outlined text-base">diamond</span>
              <span>Jewellery Inventory</span>
            </button>

            <button
              onClick={() => setAdminSection('HENNA')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                adminSection === 'HENNA'
                  ? 'bg-[#2d063d] text-white font-bold shadow'
                  : 'hover:bg-[#252522] text-[#ded8ce]'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-base">brush</span>
                <span>Henna Bookings</span>
              </span>
              <span className="px-2 py-0.5 bg-[#e2bd70]/20 text-[#e2bd70] rounded-full text-[10px]">
                {dbHennaBookings.length}
              </span>
            </button>

            <button
              onClick={() => setAdminSection('RENTALS')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                adminSection === 'RENTALS'
                  ? 'bg-[#7b5900] text-white font-bold shadow'
                  : 'hover:bg-[#252522] text-[#ded8ce]'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-base">key</span>
                <span>Active Rentals</span>
              </span>
              <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px]">
                {jewelleryRentals.length}
              </span>
            </button>

            <button
              onClick={() => setAdminSection('CUSTOMERS')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                adminSection === 'CUSTOMERS'
                  ? 'bg-[#0f5257] text-white font-bold shadow'
                  : 'hover:bg-[#252522] text-[#ded8ce]'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-base">badge</span>
                <span>Jewellery Customers</span>
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">
                {customersList.length}
              </span>
            </button>

            <button
              onClick={() => setAdminSection('JEWELLERY_BOOKINGS')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                adminSection === 'JEWELLERY_BOOKINGS'
                  ? 'bg-[#1e3a8a] text-white font-bold shadow'
                  : 'hover:bg-[#252522] text-[#ded8ce]'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-base">book_online</span>
                <span>Jewellery Bookings</span>
              </span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold">
                {jewelleryBookingsList.length}
              </span>
            </button>
            <button
              onClick={() => alert('WhatsApp Concierge messages synced: +91 93637 10342.')}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#252522] text-[#ded8ce] flex items-center gap-3 transition-colors"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>Client Concierge</span>
            </button>

            <button
              onClick={handleOpenConfigModal}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#252522] text-[#c79a3b] border border-[#c79a3b]/30 flex items-center justify-between transition-colors mt-2 cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-base">settings_ethernet</span>
                <span>Database Config</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </nav>
        </div>

        {/* Super Administrator Avatar & Logout */}
        <div className="pt-6 border-t border-[#252522] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c79a3b] text-[#1c1c1a] font-bold flex items-center justify-center text-sm">
              S
            </div>
            <div>
              <p className="font-serif font-bold text-xs text-white">
                {adminUser?.email || 'Shyam Admin'}
              </p>
              <p className="text-[10px] text-[#807665]">Super Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
            title="Log Out Admin Session"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-x-hidden">
        {/* Sync Notification Banner */}
        {syncToastMsg && (
          <div className="p-4 bg-[#0a2f1d] border border-emerald-500/50 text-emerald-200 text-xs rounded-2xl flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-400 text-base shrink-0">cloud_done</span>
              <span className="font-medium">{syncToastMsg}</span>
            </div>
            <button
              onClick={() => setSyncToastMsg(null)}
              className="text-emerald-400 hover:text-white p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        )}

        {/* Emergency / Offline Mode Warning */}
        {isEmergencyMode && (
          <div className="p-4 bg-[#3a1d05] border border-amber-500/50 text-amber-200 text-xs rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-base shrink-0">wifi_off</span>
              <span>
                <strong className="text-white">Studio Safety Access:</strong> Supabase database is unreachable or not configured. Running in local session mode.
              </span>
            </div>
            <button
              onClick={handleOpenConfigModal}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#1c1c1a] font-bold text-xs rounded-xl shadow shrink-0 cursor-pointer"
            >
              Configure Live Database
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#252522] pb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-3 text-[#807665] text-lg">
                search
              </span>
              <input
                type="text"
                placeholder={
                  adminSection === 'INVENTORY'
                    ? 'Search products, SKUs, or categories...'
                    : adminSection === 'HENNA'
                    ? 'Search client, reference code, or package...'
                    : 'Search rental items or ref codes...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
              />
            </div>

            <button
              onClick={loadAllDatabaseData}
              disabled={isRefreshingAll}
              className="px-4 py-2.5 bg-[#252522] hover:bg-[#3d3d38] border border-[#c79a3b]/40 text-[#c79a3b] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
              title="Fetch fresh data from Supabase database"
            >
              <span className={`material-symbols-outlined text-sm ${isRefreshingAll ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isRefreshingAll ? 'Syncing Database...' : 'Fetch Latest DB'}</span>
            </button>
          </div>

          {adminSection === 'INVENTORY' && (
            <button
              onClick={handleOpenAddModal}
              className="btn-royal px-6 py-3 bg-[#c79a3b] text-[#1c1c1a] font-bold rounded-xl hover:bg-white transition-all flex items-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>ADD PRODUCT</span>
            </button>
          )}

          {adminSection === 'HENNA' && (
            <button
              onClick={() => onNavigate('henna-booking')}
              className="btn-royal px-6 py-3 bg-[#e2bd70] text-[#2d063d] font-bold rounded-xl hover:bg-white transition-all flex items-center gap-2 shadow-lg"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>CREATE HENNA BOOKING</span>
            </button>
          )}
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#252522] p-6 rounded-2xl border border-[#3d3d38] space-y-2">
            <div className="flex justify-between items-center text-[#807665]">
              <span className="text-xs uppercase font-bold tracking-wider">
                Active Henna Bookings
              </span>
              <span className="material-symbols-outlined text-[#c79a3b]">brush</span>
            </div>
            <p className="font-serif text-3xl font-bold text-white">
              {dbHennaBookings.length} Bookings
            </p>
            <p className="text-[11px] text-[#42a85f] font-semibold flex items-center gap-1">
              <span>Live client appointments</span>
            </p>
          </div>

          <div className="bg-[#252522] p-6 rounded-2xl border border-[#3d3d38] space-y-2">
            <div className="flex justify-between items-center text-[#807665]">
              <span className="text-xs uppercase font-bold tracking-wider">
                Active Rentals
              </span>
              <span className="material-symbols-outlined text-[#c79a3b]">inventory_2</span>
            </div>
            <p className="font-serif text-3xl font-bold text-white">
              {jewelleryRentals.length} Rentals
            </p>
            <p className="text-[11px] text-[#e2bd70]">Insured jewellery shipments</p>
          </div>

          <div className="bg-[#252522] p-6 rounded-2xl border border-[#3d3d38] space-y-2">
            <div className="flex justify-between items-center text-[#807665]">
              <span className="text-xs uppercase font-bold tracking-wider">
                Total Inventory
              </span>
              <span className="material-symbols-outlined text-[#c79a3b]">diamond</span>
            </div>
            <p className="font-serif text-3xl font-bold text-white">
              {dbProducts.length} Products
            </p>
            <p className="text-[11px] text-[#42a85f]">Catalogue items online</p>
          </div>
        </div>

        {/* SECTION 1: Jewellery Product Management */}
        {adminSection === 'INVENTORY' && (
          <div className="bg-[#252522] rounded-2xl border border-[#3d3d38] overflow-hidden">
            {/* Filter Bar */}
            <div className="p-6 border-b border-[#3d3d38] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#c79a3b]">diamond</span>
                  <span>Jewellery Catalogue & Inventory</span>
                </h3>
                <p className="text-xs text-[#807665] mt-0.5">
                  Synchronized with Supabase `jewellery` and `products` tables ({filteredProducts.length} items)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenConfigModal}
                  className="px-3.5 py-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] text-[#c79a3b] border border-[#c79a3b]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
                  title="Configure Supabase Database & Run Diagnostics"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  <span>DB Config</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowJewellerySqlModal(true)}
                  className="px-3.5 py-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] text-[#c79a3b] border border-[#c79a3b]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
                  title="View PostgreSQL DDL Schema for jewellery table"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>Table SQL</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshingAll(true);
                    setSyncToastMsg(null);
                    try {
                      if (onRefreshJewellery) {
                        await onRefreshJewellery();
                      }
                      const refreshed = await fetchSupabaseJewellery();
                      if (refreshed && refreshed.length > 0) {
                        setDbProducts(refreshed);
                        setSyncToastMsg(`✓ Successfully synced ${refreshed.length} jewellery items from database 'jewellery' table!`);
                      } else {
                        setSyncToastMsg(`ℹ️ 0 items returned from Supabase table 'jewellery'. Click 'Table SQL' to check table structure and RLS policy.`);
                      }
                      setTimeout(() => setSyncToastMsg(null), 5000);
                    } catch (syncErr: any) {
                      setSyncToastMsg(`Fetch failed: ${syncErr?.message || 'Check database connection'}`);
                    } finally {
                      setIsRefreshingAll(false);
                    }
                  }}
                  disabled={isRefreshingAll}
                  className="px-3.5 py-1.5 bg-[#c79a3b] hover:bg-[#7b5900] text-[#1c1c1a] font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isRefreshingAll ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span>{isRefreshingAll ? 'Fetching...' : 'Fetch Supabase'}</span>
                </button>

                <div className="flex gap-1 bg-[#1c1c1a] p-1 rounded-xl border border-[#3d3d38]">
                  {(['ALL', 'SALE', 'RENTAL'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterType(mode)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                        filterType === mode
                          ? 'bg-[#c79a3b] text-[#1c1c1a]'
                          : 'text-[#807665] hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c1a] text-[#807665] uppercase tracking-wider font-bold border-b border-[#3d3d38]">
                  <tr>
                    <th className="p-4">Product Name & Item</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Pricing</th>
                    <th className="p-4">Stock Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d3d38]">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#2d2d2a] transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          className="w-12 h-12 rounded-lg object-cover border border-[#3d3d38]"
                        />
                        <div>
                          <p className="font-serif font-bold text-sm text-white">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-[#807665] font-mono">
                            ID: {prod.id}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-[#ded8ce]">{prod.category}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            prod.type === 'Rental'
                              ? 'bg-[#c79a3b]/20 text-[#c79a3b]'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {prod.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">
                        {prod.type === 'Rental' ? prod.rentalPriceDay : prod.price}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-[#1c1c1a] text-[#ded8ce] border border-[#3d3d38] rounded-full text-[10px] font-semibold">
                          {prod.stockLabel}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            if (onSelectProduct) onSelectProduct(prod);
                          }}
                          className="p-2 hover:bg-[#3d3d38] rounded-lg text-emerald-400 transition-colors"
                          title="Preview Item Page"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-2 hover:bg-[#3d3d38] rounded-lg text-[#c79a3b] transition-colors"
                          title="Edit Item"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${prod.name}?`)) {
                              handleDeleteProductWithSupa(prod.id);
                            }
                          }}
                          className="p-2 hover:bg-[#3d3d38] rounded-lg text-red-400 transition-colors"
                          title="Delete Item"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: Henna Bookings Admin Table */}
        {adminSection === 'HENNA' && (
          <div className="bg-[#252522] rounded-2xl border border-[#3d3d38] overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-[#3d3d38] pb-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e2bd70]">brush</span>
                <span>HennaBliss Appointments Management</span>
              </h3>
              <span className="text-xs text-[#807665]">
                Total Bookings: {filteredHennaBookings.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c1a] text-[#807665] uppercase tracking-wider font-bold border-b border-[#3d3d38]">
                  <tr>
                    <th className="p-4">Client & Ref</th>
                    <th className="p-4">Package / Service</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Venue Address</th>
                    <th className="p-4">Assigned Artist</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d3d38]">
                  {filteredHennaBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#2d2d2a] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{booking.clientName}</p>
                        <p className="text-[10px] text-[#807665]">{booking.clientEmail}</p>
                        <p className="text-[10px] font-mono text-[#e2bd70]">#{booking.ref}</p>
                      </td>
                      <td className="p-4 font-serif text-sm font-semibold text-[#ded8ce]">
                        {booking.serviceName}
                      </td>
                      <td className="p-4 text-[#ded8ce]">
                        <p className="font-bold">{booking.date}</p>
                        <p className="text-[10px] text-[#807665]">{booking.timeSlot}</p>
                      </td>
                      <td className="p-4 text-xs text-[#807665] max-w-xs truncate">
                        {booking.location}
                      </td>
                      <td className="p-4 text-xs text-[#e2bd70]">
                        {booking.artist || 'Unassigned'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            booking.status === 'Confirmed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : booking.status === 'Completed'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {onUpdateHennaBookingStatus && (
                          <select
                            value={booking.status}
                            onChange={(e) =>
                              onUpdateHennaBookingStatus(
                                booking.id,
                                e.target.value as HennaBooking['status']
                              )
                            }
                            className="bg-[#1c1c1a] border border-[#3d3d38] text-[10px] text-white p-1 rounded"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                        {onDeleteHennaBooking && (
                          <button
                            onClick={() => onDeleteHennaBooking(booking.id)}
                            className="p-1.5 hover:bg-[#3d3d38] rounded text-red-400"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: Jewellery Rentals Admin Table */}
        {adminSection === 'RENTALS' && (
          <div className="bg-[#252522] rounded-2xl border border-[#3d3d38] overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center border-b border-[#3d3d38] pb-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c79a3b]">key</span>
                <span>Active Jewellery Rentals & Subscriptions</span>
              </h3>
              <span className="text-xs text-[#807665]">
                Total Rentals: {filteredJewelleryRentals.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c1a] text-[#807665] uppercase tracking-wider font-bold border-b border-[#3d3d38]">
                  <tr>
                    <th className="p-4">Product Item & Ref</th>
                    <th className="p-4">Daily Rate</th>
                    <th className="p-4">Start Date</th>
                    <th className="p-4">Return Due</th>
                    <th className="p-4">Rental Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d3d38]">
                  {filteredJewelleryRentals.map((rental) => (
                    <tr key={rental.id} className="hover:bg-[#2d2d2a] transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={rental.image}
                          alt={rental.productName}
                          className="w-12 h-12 rounded-lg object-cover border border-[#3d3d38]"
                        />
                        <div>
                          <p className="font-serif font-bold text-sm text-white">
                            {rental.productName}
                          </p>
                          <p className="text-[10px] text-[#c79a3b] font-mono">
                            REF: {rental.ref}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-white">{rental.dailyRate}</td>
                      <td className="p-4 text-[#ded8ce]">{rental.startDate}</td>
                      <td className="p-4 font-bold text-[#e2bd70]">{rental.returnDue}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rental.status === 'Active Rental'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : rental.status === 'Returned'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {rental.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {onUpdateJewelleryRentalStatus && (
                          <select
                            value={rental.status}
                            onChange={(e) =>
                              onUpdateJewelleryRentalStatus(
                                rental.id,
                                e.target.value as JewelleryRental['status']
                              )
                            }
                            className="bg-[#1c1c1a] border border-[#3d3d38] text-[10px] text-white p-1 rounded"
                          >
                            <option value="Active Rental">Active Rental</option>
                            <option value="Returned">Returned</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        )}
                        {onDeleteJewelleryRental && (
                          <button
                            onClick={() => onDeleteJewelleryRental(rental.id)}
                            className="p-1.5 hover:bg-[#3d3d38] rounded text-red-400"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: Jewellery Customers & Orders Database Table */}
        {adminSection === 'CUSTOMERS' && (
          <div className="bg-[#252522] rounded-2xl border border-[#3d3d38] overflow-hidden space-y-5 p-6 shadow-xl">
            {/* Table Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#3d3d38] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0f5257] bg-[#0f5257]/30 px-2.5 py-0.5 rounded-full border border-[#0f5257]/50 text-emerald-300">
                  Supabase Table: jewellery_customers
                </span>
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-emerald-400">badge</span>
                  <span>Jewellery Customer Directory & Dispatch Orders</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlSchemaModal(true)}
                  className="px-3 py-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] border border-[#c79a3b]/40 text-[#c79a3b] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>View SQL Table DDL</span>
                </button>

                <button
                  type="button"
                  onClick={loadJewelleryCustomers}
                  disabled={isLoadingCustomers}
                  className="px-3.5 py-1.5 bg-[#0f5257] hover:bg-[#146b72] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-sm ${isLoadingCustomers ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>Refresh DB</span>
                </button>
              </div>
            </div>

            {/* Search Filter Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#807665] text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Search customers by Name, Phone, Order Ref, Address, or UPI Txn ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Customer Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c1a] text-[#807665] uppercase tracking-wider font-bold border-b border-[#3d3d38]">
                  <tr>
                    <th className="p-3.5">Customer Details</th>
                    <th className="p-3.5">Order Ref & Product</th>
                    <th className="p-3.5">Courier Address</th>
                    <th className="p-3.5">Price & Shipping</th>
                    <th className="p-3.5">UPI Payment UTR</th>
                    <th className="p-3.5">Dispatch Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d3d38]">
                  {customersList
                    .filter(
                      (c) =>
                        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.orderRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.upiTransactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.productName.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((cust, idx) => {
                      const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                        `Hello ${cust.customerName}, this is Shyam Creations regarding your Jewellery Order ${cust.orderRef} (${cust.productName}).`
                      )}`;

                      return (
                        <tr key={cust.id || cust.orderRef || idx} className="hover:bg-[#2d2d2a] transition-colors">
                          <td className="p-3.5">
                            <p className="font-bold text-white text-sm">{cust.customerName}</p>
                            <p className="text-[11px] text-[#c79a3b] font-mono mt-0.5">{cust.phone}</p>
                            {cust.email && <p className="text-[10px] text-[#807665] truncate max-w-[140px]">{cust.email}</p>}
                          </td>

                          <td className="p-3.5">
                            <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                              {cust.orderRef}
                            </span>
                            <p className="font-serif font-semibold text-white text-xs mt-1.5">
                              {cust.productName}
                            </p>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <p className="text-xs text-[#ded8ce] leading-relaxed line-clamp-2" title={cust.deliveryAddress}>
                              {cust.deliveryAddress}
                            </p>
                          </td>

                          <td className="p-3.5">
                            <p className="font-bold text-emerald-400 text-sm">{cust.totalAmount}</p>
                            <p className="text-[10px] text-[#807665]">
                              Item: {cust.itemPrice} | Courier: {cust.shippingFee}
                            </p>
                          </td>

                          <td className="p-3.5 font-mono text-[11px]">
                            <span className="bg-[#1c1c1a] px-2 py-1 rounded border border-[#3d3d38] text-amber-300 font-bold block w-max">
                              {cust.upiTransactionId}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                              ✓ {cust.paymentStatus} via {cust.paymentMethod}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                cust.orderStatus === 'Delivered'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : cust.orderStatus === 'Dispatched'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : cust.orderStatus === 'Cancelled'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {cust.orderStatus}
                            </span>
                          </td>

                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <select
                              value={cust.orderStatus}
                              onChange={(e) =>
                                handleUpdateCustomerStatus(
                                  cust.id || cust.orderRef,
                                  e.target.value as JewelleryCustomer['orderStatus']
                                )
                              }
                              className="bg-[#1c1c1a] border border-[#3d3d38] text-[10px] text-white p-1 rounded font-bold cursor-pointer"
                            >
                              <option value="Processing">Processing</option>
                              <option value="Dispatched">Dispatched</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/40 text-[#25D366] rounded inline-flex items-center"
                              title="Chat on WhatsApp"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                            </a>

                            <button
                              onClick={() => handleDeleteCustomer(cust.id || cust.orderRef)}
                              className="p-1.5 hover:bg-red-900/30 text-red-400 rounded transition-colors"
                              title="Delete Record"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {customersList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#807665] text-xs">
                        No customer orders recorded yet in `jewellery_customers`. New express checkouts will populate automatically!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 5: Jewellery Bookings Database Table */}
        {adminSection === 'JEWELLERY_BOOKINGS' && (
          <div className="bg-[#252522] rounded-2xl border border-[#3d3d38] overflow-hidden space-y-5 p-6 shadow-xl">
            {/* Table Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#3d3d38] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                  Supabase Table: jewellery_bookings
                </span>
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-blue-400">book_online</span>
                  <span>Jewellery Rental & Order Bookings Database</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookingsSqlModal(true)}
                  className="px-3 py-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] border border-[#c79a3b]/40 text-[#c79a3b] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>View SQL Table DDL</span>
                </button>

                <button
                  type="button"
                  onClick={loadJewelleryBookings}
                  disabled={isLoadingBookings}
                  className="px-3.5 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-sm ${isLoadingBookings ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>Refresh DB</span>
                </button>
              </div>
            </div>

            {/* Search Filter Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#807665] text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Search bookings by Ref, Client Name, Phone, Item, Transaction ID, or Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Jewellery Bookings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c1a] text-[#807665] uppercase tracking-wider font-bold border-b border-[#3d3d38]">
                  <tr>
                    <th className="p-3.5">Booking Ref & Type</th>
                    <th className="p-3.5">Client & Contact</th>
                    <th className="p-3.5">Jewellery Piece</th>
                    <th className="p-3.5">Dates / Duration</th>
                    <th className="p-3.5">Price & Location</th>
                    <th className="p-3.5">Payment & UTR</th>
                    <th className="p-3.5">Booking Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d3d38]">
                  {jewelleryBookingsList
                    .filter(
                      (b) =>
                        b.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (b.transactionId && b.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (b.location && b.location.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((bk, idx) => {
                      const cleanPhone = bk.phone.replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                        `Hello ${bk.clientName}, this is Shyam Creations regarding your Jewellery Booking ${bk.bookingRef} (${bk.productName}).`
                      )}`;

                      return (
                        <tr key={bk.id || bk.bookingRef || idx} className="hover:bg-[#2d2d2a] transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded-full block w-max">
                              {bk.bookingRef}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-[#c79a3b] font-bold mt-1 block">
                              {bk.bookingType || 'Rental'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <p className="font-bold text-white text-sm">{bk.clientName}</p>
                            <p className="text-[11px] text-[#c79a3b] font-mono mt-0.5">{bk.phone}</p>
                            {bk.email && <p className="text-[10px] text-[#807665] truncate max-w-[130px]">{bk.email}</p>}
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <p className="font-serif font-semibold text-white text-xs leading-snug">
                              {bk.productName}
                            </p>
                          </td>

                          <td className="p-3.5">
                            <p className="text-xs font-semibold text-white">{bk.startDate}</p>
                            {bk.endDate && bk.endDate !== bk.startDate && (
                              <p className="text-[10px] text-[#807665]">To: {bk.endDate}</p>
                            )}
                            {bk.durationDays && bk.durationDays > 1 && (
                              <p className="text-[10px] text-amber-300 font-bold">{bk.durationDays} Days Duration</p>
                            )}
                          </td>

                          <td className="p-3.5">
                            <p className="font-bold text-emerald-400 text-sm">{bk.totalPrice}</p>
                            <p className="text-[10px] text-[#807665] truncate max-w-[140px]" title={bk.location}>
                              📍 {bk.location || 'Studio Pickup'}
                            </p>
                          </td>

                          <td className="p-3.5 font-mono text-[11px]">
                            <span className="bg-[#1c1c1a] px-2 py-1 rounded border border-[#3d3d38] text-amber-300 font-bold block w-max">
                              {bk.transactionId || 'N/A'}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                              ✓ {bk.paymentStatus || 'Confirmed'} ({bk.paymentMethod || 'UPI'})
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                bk.status === 'Returned'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : bk.status === 'Active Rental'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : bk.status === 'Overdue'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold animate-pulse'
                                  : bk.status === 'Cancelled'
                                  ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {bk.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <select
                              value={bk.status}
                              onChange={(e) =>
                                handleUpdateBookingStatus(
                                  bk.id || bk.bookingRef,
                                  e.target.value as JewelleryBooking['status']
                                )
                              }
                              className="bg-[#1c1c1a] border border-[#3d3d38] text-[10px] text-white p-1 rounded font-bold cursor-pointer"
                            >
                              <option value="Active Rental">Active Rental</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Returned">Returned</option>
                              <option value="Overdue">Overdue</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/40 text-[#25D366] rounded inline-flex items-center"
                              title="Chat on WhatsApp"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                            </a>

                            <button
                              onClick={() => handleDeleteBookingRecord(bk.id || bk.bookingRef)}
                              className="p-1.5 hover:bg-red-900/30 text-red-400 rounded transition-colors"
                              title="Delete Record"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {jewelleryBookingsList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#807665] text-xs">
                        No jewellery bookings stored yet in `jewellery_bookings`. New rental reservations & package bookings will appear here automatically!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#252522] border border-[#3d3d38] text-[#ded8ce] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#3d3d38] pb-4">
              <h3 className="font-serif text-xl font-bold text-white">
                {editingProduct ? 'Edit Product Item' : 'Add New Jewellery Item'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-[#3d3d38] rounded-full text-[#807665]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#807665] uppercase">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Kundan Bridal Choker Set"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                />
              </div>

              {/* JEWELLERY IMAGE UPLOADER & URL SECTION */}
              <div className="space-y-3 bg-[#1c1c1a] p-4 rounded-xl border border-[#3d3d38]">
                <label className="font-bold text-[#c79a3b] uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">add_a_photo</span>
                    <span>Jewellery Image(s)</span>
                  </span>
                  <span className="text-[10px] text-[#807665] font-normal lowercase">
                    ({formData.images.length} image{formData.images.length === 1 ? '' : 's'})
                  </span>
                </label>

                {/* File Upload & URL Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option A: Upload Device File */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#807665] font-bold uppercase">
                      Option 1: Upload File from Device
                    </span>
                    <label className="flex items-center justify-center gap-2 p-3 bg-[#252522] border border-dashed border-[#c79a3b]/50 hover:border-[#c79a3b] rounded-lg cursor-pointer transition-colors text-white text-xs">
                      <span className="material-symbols-outlined text-base text-[#c79a3b]">
                        upload_file
                      </span>
                      <span>Choose Image File...</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Option B: Enter Web URL */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#807665] font-bold uppercase">
                      Option 2: Paste Image URL
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/jewellery.jpg"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="flex-1 p-2.5 bg-[#252522] border border-[#3d3d38] rounded-lg text-white placeholder-[#807665]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3 py-2 bg-[#c79a3b] text-[#1c1c1a] font-bold rounded-lg shrink-0 hover:bg-white transition-colors"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Image Thumbnails Preview */}
                {formData.images.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#3d3d38]">
                    <span className="text-[10px] text-[#807665] font-bold uppercase">
                      Current Images Preview:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {formData.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[#3d3d38] bg-[#252522]"
                        >
                          <img
                            src={img}
                            alt={`Jewellery image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-[#c79a3b] text-[#1c1c1a] text-[8px] font-bold text-center py-0.5">
                              Main Cover
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <span className="material-symbols-outlined text-xs block">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as any })
                    }
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  >
                    <option value="Bridal">Bridal</option>
                    <option value="Minimal">Minimal</option>
                    <option value="Hair">Hair</option>
                    <option value="Royal">Royal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  >
                    <option value="Rental">Rental</option>
                    <option value="Sale">Sale</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Price (Purchase Amount)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹25,000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Rental Rate (per day)</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹2,000/day"
                    value={formData.rentalPriceDay}
                    onChange={(e) =>
                      setFormData({ ...formData, rentalPriceDay: e.target.value })
                    }
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Available Stock Count</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        stock: count,
                        stockLabel: count > 0 ? `${count} Available` : 'Out of Stock',
                      });
                    }}
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#807665] uppercase">Material Details</label>
                  <input
                    type="text"
                    placeholder="e.g. 22k Gold Plated, Kundan, Pearls"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#807665] uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding crafting, design style, and grandeur..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-[#1c1c1a] border border-[#3d3d38] rounded-lg text-white"
                />
              </div>

              <div className="border-t border-[#3d3d38] pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-[#1c1c1a] text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-royal px-6 py-2.5 bg-[#c79a3b] text-[#1c1c1a] font-bold rounded-lg"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL TABLE SCHEMA (DDL) MODAL FOR jewellery_customers */}
      {showSqlSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#252522] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#c79a3b]/50 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start border-b border-[#3d3d38] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#c79a3b] bg-[#c79a3b]/10 px-2.5 py-0.5 rounded-full border border-[#c79a3b]/30">
                  PostgreSQL DDL Query
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">
                  `jewellery_customers` Table Schema
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="p-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] rounded-full text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-[#ded8ce] leading-relaxed">
              Copy and execute the following SQL script in your <strong className="text-[#c79a3b]">Supabase SQL Editor</strong> to initialize or reset the customer details table:
            </p>

            <div className="relative">
              <pre className="bg-[#121211] p-4 rounded-2xl border border-[#3d3d38] text-xs font-mono text-emerald-300 max-h-64 overflow-y-auto whitespace-pre-wrap selection:bg-emerald-900 selection:text-white">
                {JEWELLERY_CUSTOMERS_TABLE_SQL}
              </pre>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JEWELLERY_CUSTOMERS_TABLE_SQL);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-[#c79a3b] hover:bg-[#7b5900] text-[#1c1c1a] font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>{copiedSql ? '✓ COPIED!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="px-5 py-2.5 bg-[#1c1c1a] hover:bg-[#3d3d38] text-white font-bold text-xs rounded-xl border border-[#3d3d38] cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SQL TABLE SCHEMA (DDL) MODAL FOR jewellery_bookings */}
      {showBookingsSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#252522] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-blue-500/50 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start border-b border-[#3d3d38] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                  PostgreSQL DDL Query
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">
                  `jewellery_bookings` Table Schema
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingsSqlModal(false)}
                className="p-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] rounded-full text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-[#ded8ce] leading-relaxed">
              Copy and execute the following SQL script in your <strong className="text-blue-400">Supabase SQL Editor</strong> to initialize or reset the jewellery bookings table:
            </p>

            <div className="relative">
              <pre className="bg-[#121211] p-4 rounded-2xl border border-[#3d3d38] text-xs font-mono text-blue-300 max-h-64 overflow-y-auto whitespace-pre-wrap selection:bg-blue-900 selection:text-white">
                {JEWELLERY_BOOKINGS_TABLE_SQL}
              </pre>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JEWELLERY_BOOKINGS_TABLE_SQL);
                  setCopiedBookingsSql(true);
                  setTimeout(() => setCopiedBookingsSql(false), 2500);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>{copiedBookingsSql ? '✓ COPIED!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowBookingsSqlModal(false)}
                className="px-5 py-2.5 bg-[#1c1c1a] hover:bg-[#3d3d38] text-white font-bold text-xs rounded-xl border border-[#3d3d38] cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL TABLE SCHEMA (DDL) MODAL FOR jewellery items */}
      {showJewellerySqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#252522] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#c79a3b]/50 shadow-2xl space-y-5 relative">
            <div className="flex justify-between items-start border-b border-[#3d3d38] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#c79a3b] bg-[#c79a3b]/10 px-2.5 py-0.5 rounded-full border border-[#c79a3b]/30">
                  PostgreSQL DDL Query
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-1">
                  `jewellery` Table Schema & Seed Data
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJewellerySqlModal(false)}
                className="p-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] rounded-full text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-[#ded8ce] leading-relaxed">
              Copy and execute the following SQL script in your <strong className="text-[#c79a3b]">Supabase SQL Editor</strong> to create or populate the <code className="text-[#c79a3b] font-mono">jewellery</code> table with sample bridal & minimal items:
            </p>

            <div className="relative">
              <pre className="bg-[#121211] p-4 rounded-2xl border border-[#3d3d38] text-xs font-mono text-amber-300 max-h-64 overflow-y-auto whitespace-pre-wrap selection:bg-amber-900 selection:text-white">
                {JEWELLERY_TABLE_SQL}
              </pre>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JEWELLERY_TABLE_SQL);
                  setCopiedJewellerySql(true);
                  setTimeout(() => setCopiedJewellerySql(false), 2500);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-[#c79a3b] hover:bg-[#7b5900] text-[#1c1c1a] font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>{copiedJewellerySql ? '✓ COPIED!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowJewellerySqlModal(false)}
                className="px-5 py-2.5 bg-[#1c1c1a] hover:bg-[#3d3d38] text-white font-bold text-xs rounded-xl border border-[#3d3d38] cursor-pointer"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE CONNECTION & DIAGNOSTICS MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#252522] rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#c79a3b]/60 shadow-2xl space-y-6 relative my-8">
            <div className="flex justify-between items-start border-b border-[#3d3d38] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#c79a3b]/10 border border-[#c79a3b]/30 flex items-center justify-center text-[#c79a3b]">
                  <span className="material-symbols-outlined text-xl">database</span>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Supabase Connection & Diagnostics
                  </h3>
                  <p className="text-xs text-[#807665]">
                    Configure credentials & diagnose database reachability and table access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 bg-[#1c1c1a] hover:bg-[#3d3d38] rounded-full text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {configSaveMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                <span>{configSaveMsg}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#ded8ce] flex items-center justify-between">
                  <span>Supabase Project URL</span>
                  <span className="text-[#807665] font-normal lowercase">e.g. https://xyzcompany.supabase.co</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-[#807665] text-base">
                    link
                  </span>
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://your-project-ref.supabase.co"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#ded8ce] flex items-center justify-between">
                  <span>Supabase Anon / Public API Key</span>
                  <span className="text-[#807665] font-normal lowercase">from Supabase Dashboard &gt; Project Settings &gt; API</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3 text-[#807665] text-base">
                    key
                  </span>
                  <input
                    type="text"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1a] border border-[#3d3d38] rounded-xl text-xs font-mono text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#c79a3b] hover:bg-white text-[#1c1c1a] font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Save & Apply Credentials</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-5 py-2.5 bg-[#1c1c1a] hover:bg-[#3d3d38] border border-[#c79a3b]/40 text-[#c79a3b] hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${isTestingConnection ? 'animate-spin' : ''}`}>
                    {isTestingConnection ? 'refresh' : 'network_check'}
                  </span>
                  <span>{isTestingConnection ? 'Running Diagnostics...' : 'Test Connection & Tables'}</span>
                </button>
              </div>
            </form>

            {/* Diagnostic Results Card */}
            {diagnosticResult && (
              <div className="bg-[#121211] p-5 rounded-2xl border border-[#3d3d38] space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#252522] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#c79a3b] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">troubleshoot</span>
                    <span>Diagnostic Health Check</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    diagnosticResult.status === 'OK'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {diagnosticResult.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#1c1c1a] rounded-xl border border-[#3d3d38] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#807665]">Configured URL</span>
                    <p className="font-mono text-white truncate text-[11px]">{diagnosticResult.url}</p>
                    <p className="text-[11px] flex items-center gap-1">
                      {diagnosticResult.isConfigured ? (
                        <span className="text-emerald-400 font-bold">✓ Valid URL Format</span>
                      ) : (
                        <span className="text-red-400 font-bold">✕ Not configured</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-[#1c1c1a] rounded-xl border border-[#3d3d38] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#807665]">Network Reachable</span>
                    <p className="font-semibold text-white">
                      {diagnosticResult.isReachable ? 'Online & Pingable' : 'Offline / Unreachable'}
                    </p>
                    <p className="text-[11px] flex items-center gap-1">
                      {diagnosticResult.isReachable ? (
                        <span className="text-emerald-400 font-bold">✓ Connected to server</span>
                      ) : (
                        <span className="text-red-400 font-bold">✕ Network Error / CORS</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-[#1c1c1a] rounded-xl border border-[#3d3d38] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#807665]">Table `jewellery`</span>
                    <p className="font-semibold text-white">
                      {diagnosticResult.jewelleryTableExists ? 'Table Found' : 'Table Not Found'}
                    </p>
                    <p className="text-[11px] text-[#ded8ce]">
                      {diagnosticResult.jewelleryRowCount !== undefined ? (
                        <span className="text-emerald-400 font-bold">
                          ✓ {diagnosticResult.jewelleryRowCount} items ready
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">{diagnosticResult.error || 'Check DDL schema'}</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-[#1c1c1a] rounded-xl border border-[#3d3d38] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#807665]">Table `bookings`</span>
                    <p className="font-semibold text-white">
                      {diagnosticResult.bookingsTableExists ? 'Table Found' : 'Table Not Found'}
                    </p>
                    <p className="text-[11px] text-[#ded8ce]">
                      {diagnosticResult.bookingsRowCount !== undefined ? (
                        <span className="text-emerald-400 font-bold">
                          ✓ {diagnosticResult.bookingsRowCount} bookings loaded
                        </span>
                      ) : (
                        <span className="text-[#807665]">Awaiting first booking</span>
                      )}
                    </p>
                  </div>
                </div>

                {diagnosticResult.suggestion && (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5 text-xs text-amber-200">
                    <p className="font-bold flex items-center gap-1.5 text-amber-300">
                      <span className="material-symbols-outlined text-sm">lightbulb</span>
                      <span>Actionable Recommendation:</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-[#ded8ce]">
                      {diagnosticResult.suggestion}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-[#3d3d38]">
              <button
                type="button"
                onClick={() => {
                  setShowConfigModal(false);
                  setShowJewellerySqlModal(true);
                }}
                className="text-xs text-[#c79a3b] hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">code</span>
                <span>View Supabase SQL Schema</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2 bg-[#1c1c1a] hover:bg-[#3d3d38] text-white font-bold text-xs rounded-xl border border-[#3d3d38] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
