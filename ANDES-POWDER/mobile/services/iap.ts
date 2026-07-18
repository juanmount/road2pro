/**
 * In-App Purchase Service
 * Handles Apple App Store and Google Play Store purchases via RevenueCat
 */
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// CONFIGURATION: Replace these keys with your real RevenueCat API keys
// You can get them in your RevenueCat Dashboard > Project Settings > API Keys
export const REVENUECAT_API_KEYS = {
  apple: 'appl_NBnIOYNLeCiJIRvMQJlMSTPghBn', // Reemplazar con tu clave appl_... cuando configures Apple en RevenueCat
  google: 'goog_jOCZLxyljsaotyltWdHCZCyNsSg',
};

// The Product ID configured in App Store Connect & Google Play Console
export const PRODUCT_IDS = {
  FOUNDER_ACCESS: 'com.andespowder.founder_season2027',
};

// Entitlement ID configured in RevenueCat (standard best-practice setup)
export const ENTITLEMENT_ID = 'founder_access';

/**
 * Link current device to a stable App User ID (e.g., Firebase UID) in RevenueCat
 */
export const logInRevenueCat = async (appUserId: string): Promise<void> => {
  try {
    await initIAP();
    const { created, customerInfo } = await Purchases.logIn(appUserId);
    console.log(`[IAP] RevenueCat logIn -> appUserId=${appUserId} created=${created} entitlementActive=${!!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]}`);
  } catch (e) {
    console.error('[IAP] Error logging in to RevenueCat:', e);
  }
};

/**
 * Detach from any logged-in App User ID (returns to anonymous on this device)
 */
export const logOutRevenueCat = async (): Promise<void> => {
  try {
    await initIAP();
    await Purchases.logOut();
    console.log('[IAP] RevenueCat logOut -> anonymous appUserId');
  } catch (e) {
    console.error('[IAP] Error logging out from RevenueCat:', e);
  }
};

/**
 * Helper: read current App User ID for debugging/diagnostics
 */
export const getCurrentAppUserId = async (): Promise<string> => {
  try {
    await initIAP();
    const id = await Purchases.getAppUserID();
    return id;
  } catch (e) {
    console.error('[IAP] Error getting current App User ID:', e);
    return 'unknown';
  }
};

export interface FounderProduct {
  productId: string;
  price: string;
  currency: string;
  localizedPrice: string;
  title: string;
  description: string;
}

export interface PurchaseResult {
  transactionId: string;
  productId: string;
  transactionDate: string;
  transactionReceipt: string;
}

/**
 * Initializes RevenueCat SDK
 */
export const initIAP = async (): Promise<boolean> => {
  try {
    console.log('[IAP] Initializing RevenueCat...');
    
    // Enable debug logs in development mode to make store testing easy
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    } else {
      await Purchases.setLogLevel(LOG_LEVEL.INFO);
    }

    if (Platform.OS === 'ios') {
      if (REVENUECAT_API_KEYS.apple.includes('YOUR_APPLE')) {
        console.warn('[IAP] Warning: Using placeholder Apple RevenueCat API Key.');
      }
      await Purchases.configure({ apiKey: REVENUECAT_API_KEYS.apple });
    } else if (Platform.OS === 'android') {
      if (REVENUECAT_API_KEYS.google.includes('YOUR_GOOGLE')) {
        console.warn('[IAP] Warning: Using placeholder Google RevenueCat API Key.');
      }
      await Purchases.configure({ apiKey: REVENUECAT_API_KEYS.google });
    }
    
    console.log('[IAP] RevenueCat successfully configured.');
    return true;
  } catch (error) {
    console.error('[IAP] Failed to initialize RevenueCat:', error);
    return false;
  }
};

/**
 * Disconnects from store purchases
 */
export const disconnectIAP = async () => {
  console.log('[IAP] RevenueCat handles disconnection automatically.');
};

/**
 * Fetches product metadata for localized pricing and text
 */
export const getFounderProduct = async (): Promise<FounderProduct | null> => {
  try {
    console.log('[IAP] Fetching product info from store...');
    
    // Attempt to fetch from active RevenueCat Offerings (Best Practice)
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      // Look for a package with our product, or use the first available package
      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === PRODUCT_IDS.FOUNDER_ACCESS
      ) || offerings.current.availablePackages[0];
      
      const prod = pkg.product;
      console.log('[IAP] Product loaded from Offering package:', prod.identifier);
      return {
        productId: prod.identifier,
        price: prod.price.toString(),
        currency: prod.currencyCode,
        localizedPrice: prod.priceString,
        title: prod.title,
        description: prod.description,
      };
    }

    // Fallback: Fetch store product directly if offerings are not set up yet
    console.log('[IAP] No Offerings set up. Fetching product directly...');
    const products = await Purchases.getProducts([PRODUCT_IDS.FOUNDER_ACCESS]);
    if (products.length > 0) {
      const prod = products[0];
      console.log('[IAP] Product loaded directly:', prod.identifier);
      return {
        productId: prod.identifier,
        price: prod.price.toString(),
        currency: prod.currencyCode,
        localizedPrice: prod.priceString,
        title: prod.title,
        description: prod.description,
      };
    }
  } catch (e) {
    console.error('[IAP] Error fetching product info:', e);
  }
  
  // Hardcoded Fallback so the UI loads beautiful pricing even without network/sandbox
  console.log('[IAP] Using local fallback product definition.');
  return {
    productId: PRODUCT_IDS.FOUNDER_ACCESS,
    price: '9.99',
    currency: 'USD',
    localizedPrice: 'USD 9.99',
    title: 'Andes Powder - Pase Fundador Temporada 2027',
    description: 'Acceso completo de junio a octubre de 2027 al precio más bajo posible.',
  };
};

/**
 * Performs the store purchase transaction
 */
export const purchaseFounderAccess = async (): Promise<PurchaseResult> => {
  console.log('[IAP] Executing purchase flow...');
  
  try {
    // 1. Try purchasing through active Offerings package (Best Practice)
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      const pkg = offerings.current.availablePackages.find(
        p => p.product.identifier === PRODUCT_IDS.FOUNDER_ACCESS
      ) || offerings.current.availablePackages[0];
      
      console.log('[IAP] Purchasing package from offering:', pkg.identifier);
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
      
      return {
        transactionId: customerInfo.originalAppUserId || `AP_RC_${Date.now()}`,
        productId: productIdentifier,
        transactionDate: new Date().toISOString(),
        transactionReceipt: 'revenuecat_managed',
      };
    }

    // 2. Fallback: Purchase store product directly if offerings are not set up yet
    console.log('[IAP] No active Offerings. Purchasing product directly...');
    const products = await Purchases.getProducts([PRODUCT_IDS.FOUNDER_ACCESS]);
    if (products.length > 0) {
      const { customerInfo, productIdentifier } = await Purchases.purchaseStoreProduct(products[0]);
      return {
        transactionId: customerInfo.originalAppUserId || `AP_RC_${Date.now()}`,
        productId: productIdentifier,
        transactionDate: new Date().toISOString(),
        transactionReceipt: 'revenuecat_managed',
      };
    }

    throw new Error('No products or offerings found to purchase.');
  } catch (e: any) {
    if (e.userCancelled) {
      console.log('[IAP] Purchase cancelled by user.');
    } else {
      console.error('[IAP] Purchase exception:', e);
    }
    throw e;
  }
};

/**
 * Finalizes the transaction (handled automatically by RevenueCat)
 */
export const finishPurchase = async (purchase: PurchaseResult) => {
  console.log('[IAP] RevenueCat finishes purchases automatically: ', purchase.transactionId);
};

/**
 * Listener for purchases (handled by RevenueCat SDK)
 */
export const setupPurchaseListener = (
  onSuccess: (purchase: PurchaseResult) => void,
  onError: (error: Error) => void
) => {
  console.log('[IAP] Setting up RevenueCat customer info listener...');
  
  const listener = async (customerInfo: any) => {
    if (customerInfo?.entitlements?.active[ENTITLEMENT_ID]) {
      console.log('[IAP] Active entitlement detected: ', ENTITLEMENT_ID);
      onSuccess({
        transactionId: customerInfo.originalAppUserId || `AP_RC_LSTN`,
        productId: PRODUCT_IDS.FOUNDER_ACCESS,
        transactionDate: new Date().toISOString(),
        transactionReceipt: 'revenuecat_managed_listener',
      });
    }
  };

  Purchases.addCustomerInfoUpdateListener(listener);
  
  // Return cleanup function to remove listener
  return () => {
    console.log('[IAP] Removing RevenueCat listener...');
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
};

/**
 * Restores previous purchases
 */
export const restorePurchases = async (): Promise<boolean> => {
  try {
    console.log('[IAP] Restoring purchases...');
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[IAP] Restore result. Entitlement active:', isActive);
    return isActive;
  } catch (e) {
    console.error('[IAP] Error restoring purchases:', e);
    return false;
  }
};

/**
 * Checks if the current user already has active founder access entitlement
 */
export const checkFounderAccess = async (): Promise<boolean> => {
  try {
    await initIAP();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.error('[IAP] Error checking founder access:', e);
    return false;
  }
};

/**
 * Verifies purchase (RevenueCat handles server-side receipt verification automatically)
 */
export const verifyPurchaseWithBackend = async (
  purchase: PurchaseResult
): Promise<boolean> => {
  console.log('[IAP] RevenueCat performs automatic backend and cryptographic receipt verification.');
  return true;
};

export default {
  initIAP,
  disconnectIAP,
  getFounderProduct,
  purchaseFounderAccess,
  finishPurchase,
  setupPurchaseListener,
  restorePurchases,
  verifyPurchaseWithBackend,
  logInRevenueCat,
  logOutRevenueCat,
  getCurrentAppUserId,
  PRODUCT_IDS,
  ENTITLEMENT_ID,
  REVENUECAT_API_KEYS,
};
