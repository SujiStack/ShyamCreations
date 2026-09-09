import React, { useState, useEffect } from 'react';
import {
  ViewMode,
  Product,
  HennaBooking,
  JewelleryRental,
  CustomerAccount,
  CartItem,
  PendingAuthAction,
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
import { AdminPortalView } from './views/AdminPortalView';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import {
  fetchSupabaseBookings,
  fetchSupabaseJewellery,
  insertSupabaseBooking,
  updateSupabaseBookingStatus,
  deleteSupabaseBooking,
  isSupabaseConfigured,
  saveCustomerWishlistInDb,
  saveCustomerCartInDb,
  decrementProductStockInDb,
  logoutCustomerAccount,
} from './lib/supabaseService';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>('mehendi');
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('shyam_jewellery_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached jewellery products:', e);
    }
    return INITIAL_PRODUCTS;
  });
  const [selectedProductId, setSelectedProductId] = useState<string>(
    INITIAL_PRODUCTS[0]?.id || 'kundan-bridal-set-1'
  );
  const [hennaBookings, setHennaBookings] = useState<HennaBooking[]>(INITIAL_HENNA_BOOKINGS);
  const [jewelleryRentals, setJewelleryRentals] = useState<JewelleryRental[]>(
    INITIAL_JEWELLERY_RENTALS
  );

  // Customer Authentication & Account State
  const [customerUser, setCustomerUser] = useState<CustomerAccount | null>(() => {
    try {
      const stored = localStorage.getItem('shyam_customer_account');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<PendingAuthAction | null>(null);

  // Cart & Wishlist State (Only visible & stored when customer is signed in)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedAccount = localStorage.getItem('shyam_customer_account');
      if (!storedAccount) return [];
      const stored = localStorage.getItem('shyam_jewellery_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const parsedAccount = JSON.parse(storedAccount);
      if (parsedAccount?.cart && Array.isArray(parsedAccount.cart)) {
        return parsedAccount.cart;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const storedAccount = localStorage.getItem('shyam_customer_account');
      if (!storedAccount) return [];
      const stored = localStorage.getItem('shyam_jewellery_wishlist');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const parsedAccount = JSON.parse(storedAccount);
      if (parsedAccount?.wishlist && Array.isArray(parsedAccount.wishlist)) {
        return parsedAccount.wishlist;
      }
      return [];
    } catch {
      return [];
    }
  });

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
    try {
      localStorage.removeItem('shyam_user_mobile');
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync Customer Cart & Wishlist to localStorage and DB (Only while user is signed in)
  useEffect(() => {
    if (customerUser) {
      try {
        localStorage.setItem('shyam_jewellery_cart', JSON.stringify(cartItems));
      } catch {
        // ignore
      }
      if (customerUser.email) {
        saveCustomerCartInDb(customerUser.email, cartItems);
      }
    } else {
      try {
        localStorage.removeItem('shyam_jewellery_cart');
      } catch {
        // ignore
      }
    }
  }, [cartItems, customerUser]);

  useEffect(() => {
    if (customerUser) {
      try {
        localStorage.setItem('shyam_jewellery_wishlist', JSON.stringify(wishlistIds));
      } catch {
        // ignore
      }
      if (customerUser.email) {
        saveCustomerWishlistInDb(customerUser.email, wishlistIds);
      }
    } else {
      try {
        localStorage.removeItem('shyam_jewellery_wishlist');
      } catch {
        // ignore
      }
    }
  }, [wishlistIds, customerUser]);

  // Initial Load from Supabase Database
  useEffect(() => {
    // 1. Load local bookings from localStorage
    try {
      const stored = localStorage.getItem('shyam_henna_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHennaBookings((prev) => {
            const existingRefs = new Set(prev.map((b) => b.ref));
            const newFromLocal = parsed.filter((b: HennaBooking) => !existingRefs.has(b.ref));
            return [...newFromLocal, ...prev];
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage bookings:', e);
    }

    // 2. Load from Supabase if configured
    async function loadDb() {
      if (isSupabaseConfigured()) {
        const dbBookings = await fetchSupabaseBookings();
        if (dbBookings && dbBookings.length > 0) {
          setHennaBookings((prev) => {
            const existingRefs = new Set(prev.map((b) => b.ref));
            const newFromDb = dbBookings.filter((b) => !existingRefs.has(b.ref));
            return [...newFromDb, ...prev];
          });
        }

        // 3. Sync: push local bookings that are missing from the DB.
        //    Each ref is remembered in 'shyam_henna_synced_refs' after a
        //    successful push, so rows deleted from the DB later will NOT be
        //    re-pushed by the sync on future refreshes.
        try {
          const storedLocal = localStorage.getItem('shyam_henna_bookings');
          if (storedLocal) {
            const localList = JSON.parse(storedLocal);
            if (Array.isArray(localList) && localList.length > 0) {
              const dbRefs = new Set((dbBookings || []).map((b) => b.ref));
              let syncedRefs = new Set<string>();
              try {
                const rawSynced = localStorage.getItem('shyam_henna_synced_refs');
                if (rawSynced) syncedRefs = new Set(JSON.parse(rawSynced));
              } catch {
                // ignore parse errors
              }
              const missing = localList.filter(
                (b: HennaBooking) => b.ref && !dbRefs.has(b.ref) && !syncedRefs.has(b.ref)
              );
              for (const b of missing) {
                const res = await insertSupabaseBooking(b, { phone: b.phone, wa: b.wa });
                if (res.success) syncedRefs.add(b.ref);
              }
              if (missing.length > 0) {
                localStorage.setItem('shyam_henna_synced_refs', JSON.stringify(Array.from(syncedRefs)));
              }
            }
          }
        } catch (e) {
          console.warn('Local bookings → DB sync failed:', e);
        }

        const dbJewellery = await fetchSupabaseJewellery();
        if (dbJewellery && dbJewellery.length > 0) {
          setProducts(dbJewellery);
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
      if (dbBookings && dbBookings.length > 0) {
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
    try {
      localStorage.setItem('shyam_customer_account', JSON.stringify(account));
    } catch {
      // ignore
    }

    // Merge cart and wishlist from account if present
    if (account.cart && Array.isArray(account.cart) && account.cart.length > 0) {
      setCartItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.productId));
        const newItems = account.cart!.filter((i) => !existingIds.has(i.productId));
        return [...prev, ...newItems];
      });
    }

    if (account.wishlist && Array.isArray(account.wishlist) && account.wishlist.length > 0) {
      setWishlistIds((prev) => Array.from(new Set([...prev, ...account.wishlist!])));
    }

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
    try {
      localStorage.removeItem('shyam_customer_account');
      localStorage.removeItem('shyam_jewellery_cart');
      localStorage.removeItem('shyam_jewellery_wishlist');
    } catch {
      // ignore
    }
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
    // Persist immediately (synchronously) so the cart stays cleared even if
    // the tab is closed before React flushes the effect-based sync.
    try {
      localStorage.setItem('shyam_jewellery_cart', '[]');
    } catch {
      // ignore
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
    products.find((p) => p.id === selectedProductId) || products[0] || INITIAL_PRODUCTS[0];

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setCurrentView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRescheduleHennaBooking = (
    id: string,
    newDate: string,
    newTimeSlot: string,
    notes?: string
  ) => {
    setHennaBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              date: newDate,
              timeSlot: newTimeSlot,
              status: 'Rescheduled',
              rescheduleNotes: notes || b.rescheduleNotes,
            }
          : b
      )
    );
  };

  const handleAddHennaBooking = async (
    newBooking: HennaBooking
  ): Promise<{ success: boolean; isConfigured: boolean; error?: string }> => {
    // 1. React State
    setHennaBookings((prev) => [newBooking, ...prev]);

    // 2. Save locally in browser
    try {
      const stored = localStorage.getItem('shyam_henna_bookings');
      const list = stored ? JSON.parse(stored) : [];
      localStorage.setItem('shyam_henna_bookings', JSON.stringify([newBooking, ...list]));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    // 3. Save in Supabase
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
            onRequireAuth={handleOpenAuthModal}
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
            onRequireAuth={handleOpenAuthModal}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            wishlistIds={wishlistIds}
            onDecrementStock={handleDecrementStock}
            onOpenCart={() => setIsCartDrawerOpen(true)}
            onOpenWishlist={() => setIsWishlistDrawerOpen(true)}
          />
        )}

        {currentView === 'henna-booking' && (
          <HennaBookingView
            onNavigate={handleNavigate}
            onAddBooking={handleAddHennaBooking}
            initialCategory={selectedCategory}
            customerUser={customerUser}
            onRequireAuth={handleOpenAuthModal}
          />
        )}

        {currentView === 'my-bookings' && (
          <MyBookingsView
            hennaBookings={hennaBookings}
            jewelleryRentals={jewelleryRentals}
            onNavigate={handleNavigate}
            onRescheduleBooking={handleRescheduleHennaBooking}
            customerUser={customerUser}
            onOpenAuthModal={() => handleOpenAuthModal()}
          />
        )}

        {currentView === 'admin' && (
          <AdminPortalView
            products={products}
            hennaBookings={hennaBookings}
            jewelleryRentals={jewelleryRentals}
            onNavigate={handleNavigate}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateHennaBookingStatus={handleUpdateHennaBookingStatus}
            onDeleteHennaBooking={handleDeleteHennaBooking}
            onSelectProduct={handleSelectProduct}
            onRefreshJewellery={handleRefreshJewellery}
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
