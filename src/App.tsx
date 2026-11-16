import React, { useState, useEffect } from 'react';
import {
  ViewMode,
  Product,
  HennaBooking,
  JewelleryRental,
  CustomerAccount,
  CartItem,
  PendingAuthAction,
  DisabledSlot,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_HENNA_BOOKINGS,
  INITIAL_JEWELLERY_RENTALS,
} from './data/mockData';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { JewelleryProductView } from './views/JewelleryProductView';
import { HennaBookingView, ServiceCategoryKey } from './views/HennaBookingView';
import { MyBookingsView } from './views/MyBookingsView';
import { CheckAvailabilityView } from './views/CheckAvailabilityView';
import { AdminPortalView } from './views/AdminPortalView';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import {
  fetchSupabaseBookings,
  fetchSupabaseDisabledSlots,
  fetchSupabaseJewellery,
  insertSupabaseBooking,
  updateSupabaseBookingStatus,
  deleteSupabaseBooking,
  isSupabaseConfigured,
  saveCustomerWishlistInDb,
  saveCustomerCartInDb,
  decrementProductStockInDb,
  logoutCustomerAccount,
  getCurrentCustomerAccount,
} from './lib/supabaseService';
import { supabase } from './lib/supabase';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>('mehendi');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || (INITIAL_PRODUCTS[0]?.id || 'kundan-bridal-set-1')
  );
  const [hennaBookings, setHennaBookings] = useState<HennaBooking[]>(INITIAL_HENNA_BOOKINGS);
  const [jewelleryRentals, setJewelleryRentals] = useState<JewelleryRental[]>(
    INITIAL_JEWELLERY_RENTALS
  );
  const [disabledSlots, setDisabledSlots] = useState<DisabledSlot[]>([]);

  // Customer Authentication & Account State — session restored from
  // Supabase Auth on mount (no app data in localStorage)
  const [customerUser, setCustomerUser] = useState<CustomerAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<PendingAuthAction | null>(null);

  // Cart & Wishlist State — hydrated from the signed-in account profile (DB)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState<boolean>(false);
  const [isCartCheckoutOpen, setIsCartCheckoutOpen] = useState<boolean>(false);
  const [loginWelcomeToast, setLoginWelcomeToast] = useState<string | null>(null);

  const isAuthenticated = !!customerUser;

  // On navigation, also clear any active phone lookup search data
  const handleNavigate = (view: ViewMode, category?: ServiceCategoryKey) => {
    setCurrentView(view);
    if (category) {
      setSelectedCategory(category);
    }
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   // Restore the customer session from Supabase Auth on mount and keep it
   // in sync (sign-in / sign-out in other tabs too). No app data is kept in
   // localStorage — everything comes from Supabase.
  useEffect(() => {
    let mounted = true;

    const syncCustomerFromSession = async () => {
      const account = await getCurrentCustomerAccount();
      if (!mounted) return;
      setCustomerUser(account);
      setCartItems(account?.cart || []);
      setWishlistIds(account?.wishlist || []);
    };

    syncCustomerFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCustomerUser(null);
          setCartItems([]);
          setWishlistIds([]);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        syncCustomerFromSession();
      } else if (event === 'PASSWORD_RECOVERY') {
        if (mounted) setIsAuthModalOpen(true);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

   // Sync Customer Cart & Wishlist to Supabase (Only while user is signed in)
  useEffect(() => {
    if (customerUser?.email) {
      saveCustomerCartInDb(customerUser.email, cartItems);
    }
  }, [cartItems, customerUser]);

  useEffect(() => {
    if (customerUser?.email) {
      saveCustomerWishlistInDb(customerUser.email, wishlistIds);
    }
  }, [wishlistIds, customerUser]);

   // Initial Load from Supabase Database (always — no local fallback)
  useEffect(() => {
    async function loadDb() {
      if (isSupabaseConfigured()) {
        const dbBookings = await fetchSupabaseBookings();
        if (dbBookings) {
          setHennaBookings(dbBookings);
        }

        const dbJewellery = await fetchSupabaseJewellery();
        if (dbJewellery && dbJewellery.length > 0) {
          setProducts(dbJewellery);
        }

        try {
          const dbSlots = await fetchSupabaseDisabledSlots();
          const mapped: DisabledSlot[] = (dbSlots || [])
            .filter((s: any) => s?.date && s?.slot)
            .map((s: any) => ({ date: s.date, timeSlot: s.slot, reason: s.status && s.status !== 'disabled' ? s.status : undefined }));
          if (mapped.length > 0) {
            setDisabledSlots(mapped);
          }
        } catch (e) {
          console.warn('Failed to load disabled slots from DB:', e);
        }
      }
    }
    loadDb();
  }, []);

  const handleRefreshJewellery = async () => {
    if (isSupabaseConfigured()) {
      const dbJewellery = await fetchSupabaseJewellery();
      if (dbJewellery && dbJewellery.length > 0) {
        setProducts(dbJewellery);
      }
      const dbBookings = await fetchSupabaseBookings();
      if (dbBookings) {
        setHennaBookings(dbBookings);
      }
    }
  };

  // Auth Handling
  const handleOpenAuthModal = (pendingAction?: PendingAuthAction) => {
    setPendingAuthAction(pendingAction || null);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (account: CustomerAccount, pendingActionOverride?: PendingAuthAction) => {
    const actionToUse = pendingActionOverride || pendingAuthAction;
    setCustomerUser(account);
    // Hydrate cart & wishlist from the account profile (DB)
    setCartItems(account.cart || []);
    setWishlistIds(account.wishlist || []);

    // Set Welcome Toast on landing page
    setLoginWelcomeToast(`✨ Welcome, ${account.name}! Logged in to Shyam Creations.`);
    setTimeout(() => {
      setLoginWelcomeToast(null);
    }, 6000);

    // If there was a pending action before auth, execute or navigate, else navigate to landing page ('home')
    if (actionToUse) {
      if (actionToUse.targetView) {
        handleNavigate(actionToUse.targetView, actionToUse.targetCategory);
      } else {
        handleNavigate('home');
      }
      if (actionToUse.action === 'cart' && actionToUse.targetProduct) {
        handleAddToCart(actionToUse.targetProduct, 1);
      } else if (actionToUse.action === 'wishlist' && actionToUse.targetProduct) {
        handleToggleWishlist(actionToUse.targetProduct);
      }
      setPendingAuthAction(null);
    } else {
      // Standard login: Move directly to landing page
      handleNavigate('home');
    }
  };

  const handleLogoutCustomer = () => {
    logoutCustomerAccount();
    setCustomerUser(null);
    setCartItems([]);
    setWishlistIds([]);
    setIsWishlistDrawerOpen(false);
    setIsCartDrawerOpen(false);
    setIsCartCheckoutOpen(false);
    setLoginWelcomeToast(null);
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!customerUser) {
      handleOpenAuthModal({
        action: 'cart',
        targetProduct: product,
        targetView: currentView,
      });
      return;
    }

    const maxStock = product.stock ?? 1;
    if (maxStock <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxStock);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: Math.min(quantity, maxStock),
          addedAt: new Date().toISOString(),
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    const targetProd = products.find((p) => p.id === productId);
    const maxStock = targetProd?.stock ?? 1;
    const finalQty = Math.min(newQty, maxStock);

    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: finalQty } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    // Keep the signed-in account profile in sync (cart stored on the DB row)
    setCustomerUser((prev) => (prev ? { ...prev, cart: [] } : prev));
    if (customerUser?.email) {
      saveCustomerCartInDb(customerUser.email, []);
    }
  };

  // Wishlist Handlers
  const handleToggleWishlist = (product: Product) => {
    if (!customerUser) {
      handleOpenAuthModal({
        action: 'wishlist',
        targetProduct: product,
        targetView: currentView,
      });
      return;
    }

    setWishlistIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      }
      return [...prev, product.id];
    });
  };

  const handleRemoveFromWishlist = (productId: string) => {
    setWishlistIds((prev) => prev.filter((id) => id !== productId));
  };

  // Stock Decrement Handler
  const handleDecrementStock = async (productId: string, quantity: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const currentStock = p.stock ?? 1;
          const nextStock = Math.max(0, currentStock - quantity);
          return {
            ...p,
            stock: nextStock,
            stockLabel: nextStock <= 0 ? 'Out of Stock' : `${nextStock} in stock`,
          };
        }
        return p;
      })
    );
  };

  // Dynamic active product for detail page
  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0];

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRescheduleHennaBooking = (
    idOrRef: string,
    newDate: string,
    newTimeSlot: string,
    notes?: string
  ): boolean => {
    // Match by ref OR id: searched (fetched) copies and App copies of the same
    // booking can carry different local ids, so id-only matching silently
    // missed. The DB is updated via rescheduleSupabaseBooking() by the caller.
    const apply = (b: HennaBooking): HennaBooking =>
      b.id === idOrRef || b.ref === idOrRef
        ? {
            ...b,
            date: newDate,
            timeSlot: newTimeSlot,
            status: 'Rescheduled',
            rescheduleNotes: notes || b.rescheduleNotes,
          }
        : b;

    setHennaBookings((prev) => prev.map(apply));
    return true;
  };

  const handleRescheduleJewelleryRental = (
    idOrRef: string,
    newStartDate: string,
    notes?: string
  ): boolean => {
    setJewelleryRentals((prev) =>
      prev.map((r) =>
        r.id === idOrRef || r.ref === idOrRef
          ? { ...r, startDate: newStartDate, returnDue: newStartDate, status: 'Rescheduled' }
          : r
      )
    );
    return true;
  };

  const handleAddHennaBooking = async (
    newBooking: HennaBooking
  ): Promise<{ success: boolean; isConfigured: boolean; error?: string }> => {
    // 1. React State
    setHennaBookings((prev) => [newBooking, ...prev]);

    // 2. Save in Supabase
    const res = await insertSupabaseBooking(newBooking, {
      phone: newBooking.phone,
      wa: newBooking.wa,
    });

    return res;
  };

  const handleUpdateHennaBookingStatus = (id: string, status: HennaBooking['status']) => {
    setHennaBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    const booking = hennaBookings.find((b) => b.id === id);
    if (booking) {
      updateSupabaseBookingStatus(booking.ref || booking.id, status);
    }
  };

  const handleDeleteHennaBooking = (id: string) => {
    const booking = hennaBookings.find((b) => b.id === id);
    setHennaBookings((prev) => prev.filter((b) => b.id !== id));
    if (booking) {
      deleteSupabaseBooking(booking.ref || booking.id);
    }
  };

  const handleUpdateDisabledSlots = (slots: DisabledSlot[]) => {
    setDisabledSlots(slots);
  };

  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // The studio requires the Supabase backend for all bookings & orders —
  // without it, nothing works, so fail loudly instead of silently writing to localStorage.
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[var(--sc-bg)] flex flex-col items-center justify-center px-6 text-center">
        <span className="material-symbols-outlined text-6xl text-[var(--sc-emerald)] mb-4">cloud_off</span>
        <h1 className="font-serif text-3xl font-bold text-[var(--sc-text)] mb-2">Studio Booking is Temporarily Unavailable</h1>
        <p className="text-sm text-[var(--sc-text-dim)] max-w-md leading-relaxed">
          The Shyam Creations booking system could not reach its database. Please check your internet connection or try again shortly.
          For immediate assistance, WhatsApp us at <a className="underline font-semibold" href="https://wa.me/919363710342">+91 93637 10342</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sc-bg)] flex flex-col font-sans-body text-[var(--sc-text)]">
       <Navigation
        currentView={currentView}
        onNavigate={handleNavigate}
        cartCount={totalCartCount}
        wishlistCount={wishlistIds.length}
        isAuthenticated={isAuthenticated}
        customerUser={customerUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogoutCustomer={handleLogoutCustomer}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        onOpenWishlist={() => setIsWishlistDrawerOpen(true)}
      />

      <div className="flex-1 relative">
        {loginWelcomeToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-[var(--sc-emerald-deep)] border border-[var(--sc-emerald-light)] text-[#f3ebd9] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
              <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-xl animate-bounce">
                verified_user
              </span>
              <span className="text-xs font-bold">{loginWelcomeToast}</span>
              <button
                onClick={() => setLoginWelcomeToast(null)}
                className="text-[var(--sc-text-dimmer)] hover:text-white ml-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            products={products}
            isAuthenticated={isAuthenticated}
            customerUser={customerUser}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistIds={wishlistIds}
          />
        )}

        {currentView === 'product' && (
          <JewelleryProductView
            product={selectedProduct}
            products={products}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
            onAddOrder={handleAddHennaBooking}
            isAuthenticated={isAuthenticated}
            customerUser={customerUser}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistIds={wishlistIds}
            onDecrementStock={handleDecrementStock}
             onOpenCart={() => setIsCartDrawerOpen(true)}
             onOpenWishlist={() => setIsWishlistDrawerOpen(true)}
             onRefreshJewellery={handleRefreshJewellery}
             onRequireAuth={handleOpenAuthModal}
          />
        )}

        {currentView === 'henna-booking' && (
          <HennaBookingView
            onNavigate={handleNavigate}
            onAddBooking={handleAddHennaBooking}
            initialCategory={selectedCategory}
            customerUser={customerUser}
            onRequireAuth={handleOpenAuthModal}
            hennaBookings={hennaBookings}
            disabledSlots={disabledSlots}
          />
        )}

        {currentView === 'my-bookings' && (
          <MyBookingsView
            hennaBookings={hennaBookings}
            jewelleryRentals={jewelleryRentals}
            disabledSlots={disabledSlots}
            onNavigate={handleNavigate}
            onRescheduleBooking={handleRescheduleHennaBooking}
            onRescheduleJewelleryRental={handleRescheduleJewelleryRental}
            customerUser={customerUser}
            onOpenAuthModal={() => handleOpenAuthModal()}
            onRequireAuth={handleOpenAuthModal}
          />
        )}

        {currentView === 'check-availability' && (
          <CheckAvailabilityView
            onNavigate={handleNavigate}
            hennaBookings={hennaBookings}
            disabledSlots={disabledSlots}
          />
        )}

        {currentView === 'admin' && (
          <AdminPortalView
            products={products}
            hennaBookings={hennaBookings}
            jewelleryRentals={jewelleryRentals}
            disabledSlots={disabledSlots}
            onNavigate={handleNavigate}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateHennaBookingStatus={handleUpdateHennaBookingStatus}
            onDeleteHennaBooking={handleDeleteHennaBooking}
            onSelectProduct={handleSelectProduct}
            onRefreshJewellery={handleRefreshJewellery}
            onUpdateDisabledSlots={handleUpdateDisabledSlots}
          />
        )}
      </div>

      {/* Client Authentication & Registration Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        pendingAction={pendingAuthAction}
      />

      {/* Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartDrawerOpen(false);
          setIsCartCheckoutOpen(true);
        }}
        onSelectProduct={handleSelectProduct}
        isAuthenticated={isAuthenticated}
        onOpenAuthModal={() => handleOpenAuthModal()}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistDrawerOpen}
        onClose={() => setIsWishlistDrawerOpen(false)}
        wishlistProducts={wishlistProducts}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onAddToCart={(prod) => {
          handleAddToCart(prod, 1);
          setIsWishlistDrawerOpen(false);
          setIsCartDrawerOpen(true);
        }}
        onSelectProduct={handleSelectProduct}
        isAuthenticated={isAuthenticated}
        onOpenAuthModal={() => handleOpenAuthModal()}
      />

      {/* Cart Multi-Item Checkout Modal */}
      <CartCheckoutModal
        isOpen={isCartCheckoutOpen}
        onClose={() => setIsCartCheckoutOpen(false)}
        cartItems={cartItems}
        customerUser={customerUser}
        onClearCart={handleClearCart}
        onDecrementStock={handleDecrementStock}
        onAddOrder={handleAddHennaBooking}
        onViewOrders={() => handleNavigate('my-bookings')}
      />

       {/* Shared Footer (hidden on Admin view) */}
      {currentView !== 'admin' && (
        <Footer
          onNavigate={handleNavigate}
          isAuthenticated={isAuthenticated}
          onRequireAuth={handleOpenAuthModal}
        />
      )}
    </div>
  );
}

export default App;
