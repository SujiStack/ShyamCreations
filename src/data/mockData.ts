import { Product, HennaBooking, JewelleryRental, VisionaryArtist, ServicePackage, StudioInfo } from '../types';

export const STUDIO_INFO: StudioInfo = {
  name: 'SHYAM CREATIONS',
  tagline: 'Adorning your hands, Crowning your beauty.',
  phone: '+91 9363710342',
  whatsapp: '+91 9363710342',
  email: 'shyamcreationstudio@gmail.com',
  instagram: '@shyam_creations_studio',
  location: 'Tambaram, Chennai',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'kundan-bridal-set-1',
    name: 'Kundan Bridal Set',
    category: 'Bridal',
    type: 'Rental',
    price: '₹25,000',
    rentalPriceDay: '₹1,500/day',
    stock: 4,
    stockLabel: '4 Available',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDLeQZiCrFp4QPTrP-8YLyJGxFLSGKpKK040jU_o5rCTAP7Dh17vBPOidqxGlN2ob_MKYQz3qFRPaE7ztBEECEw8GTjzgVbKsB0UGVZDelRPvt72DceR3KHvH64Y4B8XRIVdPyGaKEszn-wGJ0ebc4dNG2rgZpUOOL7zTfJFtUBavN3mLHpM5dxIfdK8TdEKbpkee-Lqm3crADz7xsOfG5YkQP4YcmmEcjeAn70713O3_uNdCj51EZ65Vonw5nxBO28bLsErb70m9Do'
    ],
    description: 'A masterpiece of traditional craftsmanship, featuring intricate kundan work set in 22k gold plating, accented with emerald beads and pearls. Perfect for the discerning bride.',
    material: '22k Gold Plated, Kundan, Emerald Beads, Pearls',
    weight: '245 grams',
    inclusion: 'Necklace, Earrings, Maang Tikka'
  },
  {
    id: 'polki-choker-2',
    name: 'Royal Polki Choker',
    category: 'Bridal',
    type: 'Rental',
    price: '₹18,000',
    rentalPriceDay: '₹1,800/day',
    stock: 4,
    stockLabel: '4 Available',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD_jbuFLZq1ZXxKKACftMFK35aNdwd9VeQgOYWu3VuiWRpiXOAOCtind5NReGTTahercU7__M-Nq5MSZSg7-EPpe8RPLiqNbekSdSFQhtGW8OqCD-V_AMm7xTMnWOI4RrKyz7AK3tmgIxi_jga34tgtatZmvip2ORDPwbwcW-EkcysI2BRwxZACxWK-jr5xQimYzC75R19eG4Ipu91vny8ToYEzmDye-RToMzj3mZxXRtyTu6cIYcV6XkmRGI0PUvOnFyEtTCF7hqJg'
    ],
    description: 'Regal polki choker set lined with rubies and freshwater pearls. Designed to accentuate traditional South Indian & bridal ensembles.',
    material: '22k Gold Foil, Uncut Diamonds (Polki), Ruby Drops',
    weight: '190 grams',
    inclusion: 'Choker & Matching Jhumkas'
  },
  {
    id: 'minimal-pendant-3',
    name: 'Heritage Pearl Jhumkas',
    category: 'Minimal',
    type: 'Sale',
    price: '₹4,500',
    stock: 5,
    stockLabel: '5 Units Available',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnb2GfmkHVz1W7BYqKzs8N0VVvG9oZ2MorgUfZ9iYNNzifvmTyrVOqCSzZvseBJT2k527rm7wj9kQfyP2qHoto4YS_DYXhkeFERQxotoRs5fksf-DU_ncgUayh8rNha3td_m85kDzVIf793m6-2HO20D_E6xOdTR6kI-q5D5OrgYSQbqQm_e4DPsgx1Vcvck8Jy2bbOsL_6QG6zNkk95rFzHJhG0ulVLeeFYsemA-CMv8aZzAHP66TTbRRp7VFVDCLMmwGHBMdB_8m'
    ],
    description: 'Delicate minimal jhumkas suitable for sangeet, engagement, and reception functions.',
    material: 'Silver Alloy with 18k Gold Plating & Pearls',
    weight: '65 grams',
    inclusion: 'Pair of Earrings'
  },
  {
    id: 'temple-hair-set-4',
    name: 'Guttapusalu Hair Set',
    category: 'Hair',
    type: 'Rental',
    price: '₹12,000',
    rentalPriceDay: '₹1,200/day',
    stock: 8,
    stockLabel: '8 Available',
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAYwLxURGQANC52Col9Ykdeli1RfILsyHM-31PdErcJVUuwuL48zIVSwaz0YrO4eqnGUQidnFafDwpxgUueYAojdr4TRnBofPalWL-z0w2Nh0wUkqbxNVh6HtKwxoLud06saqxjiUkS9x7ZihQkispCY-I2uvaWaqzvPoiMagupLMjh7lukiEScf_J_8BChGC_RualG8lYwttKKMUZMn7Bf5vmiSMnPeiuYt3wHwm4_9O_Is3JHtWB7-7AH3VV8ojHx33zQvh6d2JYH'
    ],
    description: 'Handcrafted temple jewelry hair accessories and matha patti set with cascading pearl clusters.',
    material: 'Brass with 24k Gold Dip & Pearl Clusters',
    weight: '110 grams',
    inclusion: 'Matha Patti & 6 Hair Pins'
  }
];

export const INITIAL_HENNA_BOOKINGS: HennaBooking[] = [
  {
    id: 'booking-1',
    ref: 'SC-2026-089',
    serviceCategory: 'Bridal & Occasion Mehendi',
    serviceName: 'Royal Bridal Mehendi Package',
    date: '2026-08-15',
    timeSlot: '10:00 AM - 02:00 PM',
    location: 'Tambaram Studio / Client Venue',
    clientName: 'Sanya Alisha',
    clientEmail: 'shyamcreationstudio@gmail.com',
    phone: '+91 9363710342',
    wa: '+91 9363710342',
    specialRequests: 'Detailed Marwari bridal figures with peacock and lotus motifs.',
    artist: 'Shyam Creations Master Artist',
    status: 'Confirmed',
    type: 'henna'
  },
  {
    id: 'booking-2',
    ref: 'SC-2026-112',
    serviceCategory: 'Jewellery Rental & Sale',
    serviceName: 'Royal Kundan Choker & Trial Reservation',
    date: '2026-08-18',
    timeSlot: '04:30 PM - 05:30 PM',
    location: 'Tambaram Studio',
    clientName: 'Divya Ramesh',
    clientEmail: 'divya@example.com',
    phone: '+91 98401 23456',
    wa: '+91 98401 23456',
    specialRequests: 'Kundan Choker Set trial appointment for Muhurtham look.',
    artist: 'Jewellery Stylist',
    status: 'Confirmed',
    type: 'jewellery'
  }
];

export const INITIAL_JEWELLERY_RENTALS: JewelleryRental[] = [
  {
    id: 'rental-1',
    productName: 'Royal Kundan Choker Set',
    ref: 'RENT-SC-101',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj',
    startDate: '2026-08-20',
    returnDue: 'Aug 23, 2026',
    dailyRate: '₹1,500/day',
    status: 'Active Rental'
  }
];

export const VISIONARY_ARTISTS: VisionaryArtist[] = [
  {
    id: 'shyam-master',
    name: 'Shyam Creations Lead Artist',
    role: 'Master Bridal & Styling Specialist',
    specialty: 'Traditional South Indian bridal mehendi, precision saree drapes, and bridal makeover styling.',
    experience: '10+ Years in Tambaram, Chennai',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'nail-stylist',
    name: 'Shyam Nail & Lash Artist',
    role: 'Nail Extension & Art Specialist',
    specialty: 'Custom bridal gel & acrylic extensions, chrome art, and reusable luxury press-on nails.',
    experience: '6 Years Experience',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=600'
  }
];

export const SERVICE_PACKAGES: ServicePackage[] = [
  // 1. Bridal & Occasion Mehendi
  {
    id: 'bridal-mehendi-full',
    category: 'Bridal & Occasion Mehendi',
    title: 'Bridal Mehendi Extravaganza',
    price: '₹8,500',
    unit: 'package',
    duration: '4-6 Hours',
    description: 'Elbow-length custom designs on palms and backs of hands, plus detailed bridal foot patterns with organic dark-stain henna.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'occasion-guest-mehendi',
    category: 'Bridal & Occasion Mehendi',
    title: 'Sangeet & Guest Henna Troupe',
    price: '₹1,200',
    unit: 'per guest',
    duration: '1-2 Hours',
    description: 'Elegant palm and wrist designs for sangeet guests, family members, or festive celebrations.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'arabic-minimal-henna',
    category: 'Bridal & Occasion Mehendi',
    title: 'Arabic & Minimalist Henna Art',
    price: '₹2,500',
    unit: 'session',
    duration: '1.5 Hours',
    description: 'Flowing floral vines, shaded mandala motifs, and contemporary minimal wrist cuff patterns.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=600'
  },

  // 2. Jewellery Rental & Sale
  {
    id: 'jewellery-bridal-rental',
    category: 'Jewellery Rental & Sale',
    title: 'Heritage Kundan Bridal Rental Combo',
    price: '₹1,500',
    unit: 'per day',
    duration: '1-7 Days Rental',
    description: 'Complete Kundan, Polki, or Temple jewellery set including grand choker, long haram, jhumkas, maang tikka, and bangles.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj'
  },
  {
    id: 'jewellery-polki-choker',
    category: 'Jewellery Rental & Sale',
    title: 'Jaipur Polki Royal Choker Rental',
    price: '₹1,800',
    unit: 'per day',
    duration: '1-3 Days Rental',
    description: 'Regal Jaipur uncut polki choker lined with rubies and freshwater pearls. Designed for Muhurtham and reception glam.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_jbuFLZq1ZXxKKACftMFK35aNdwd9VeQgOYWu3VuiWRpiXOAOCtind5NReGTTahercU7__M-Nq5MSZSg7-EPpe8RPLiqNbekSdSFQhtGW8OqCD-V_AMm7xTMnWOI4RrKyz7AK3tmgIxi_jga34tgtatZmvip2ORDPwbwcW-EkcysI2BRwxZACxWK-jr5xQimYzC75R19eG4Ipu91vny8ToYEzmDye-RToMzj3mZxXRtyTu6cIYcV6XkmRGI0PUvOnFyEtTCF7hqJg'
  },
  {
    id: 'jewellery-temple-hair',
    category: 'Jewellery Rental & Sale',
    title: 'Antique Temple Hair & Accessories Set',
    price: '₹1,200',
    unit: 'per day',
    duration: '1-3 Days Rental',
    description: 'Handcrafted temple hair ornaments, billai set, matha patti, and heavy jhumkas for South Indian brides.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYwLxURGQANC52Col9Ykdeli1RfILsyHM-31PdErcJVUuwuL48zIVSwaz0YrO4eqnGUQidnFafDwpxgUueYAojdr4TRnBofPalWL-z0w2Nh0wUkqbxNVh6HtKwxoLud06saqxjiUkS9x7ZihQkispCY-I2uvaWaqzvPoiMagupLMjh7lukiEScf_J_8BChGC_RualG8lYwttKKMUZMn7Bf5vmiSMnPeiuYt3wHwm4_9O_Is3JHtWB7-7AH3VV8ojHx33zQvh6d2JYH'
  }
];

// Keep HENNA_PACKAGES exported for legacy compatibility
export const HENNA_PACKAGES = SERVICE_PACKAGES;

