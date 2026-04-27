/**
 * In-App Purchase Service
 * Handles Apple App Store and Google Play Store purchases
 */

// NOTE: This is a placeholder implementation
// react-native-iap requires native configuration in Xcode and Android Studio
// 
// NEXT STEPS:
// 1. Configure products in App Store Connect (Apple)
// 2. Configure products in Google Play Console (Google)
// 3. Add capabilities in Xcode (In-App Purchase)
// 4. Test with sandbox accounts
//
// For now, we'll use a mock implementation that simulates the purchase flow

export const PRODUCT_IDS = {
  FOUNDER_ACCESS: 'com.andespowder.founder_season1',
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

// Mock implementation - replace with real react-native-iap when ready
export const initIAP = async (): Promise<boolean> => {
  console.log('[IAP] Initializing (MOCK)...');
  return true;
};

export const disconnectIAP = async () => {
  console.log('[IAP] Disconnecting (MOCK)...');
};

export const getFounderProduct = async (): Promise<FounderProduct | null> => {
  console.log('[IAP] Getting product (MOCK)...');
  
  // Mock product data
  return {
    productId: PRODUCT_IDS.FOUNDER_ACCESS,
    price: '299.00',
    currency: 'ARS',
    localizedPrice: '$299',
    title: 'Andes Powder - Acceso Fundador Season 1',
    description: 'Precio fundador para acceso anticipado a Season 1',
  };
};

export const purchaseFounderAccess = async (): Promise<PurchaseResult> => {
  console.log('[IAP] Purchasing (MOCK)...');
  
  // Simulate purchase delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock purchase result
  return {
    transactionId: `AP_MOCK_${Date.now()}`,
    productId: PRODUCT_IDS.FOUNDER_ACCESS,
    transactionDate: new Date().toISOString(),
    transactionReceipt: 'mock_receipt_' + Date.now(),
  };
};

export const finishPurchase = async (purchase: PurchaseResult) => {
  console.log('[IAP] Finishing transaction (MOCK):', purchase.transactionId);
};

export const setupPurchaseListener = (
  onSuccess: (purchase: PurchaseResult) => void,
  onError: (error: Error) => void
) => {
  console.log('[IAP] Setting up listeners (MOCK)...');
  
  // Return cleanup function
  return () => {
    console.log('[IAP] Cleaning up listeners (MOCK)...');
  };
};

export const restorePurchases = async (): Promise<boolean> => {
  console.log('[IAP] Restoring purchases (MOCK)...');
  return false;
};

export const verifyPurchaseWithBackend = async (
  purchase: PurchaseResult
): Promise<boolean> => {
  console.log('[IAP] Verifying purchase with backend (MOCK)...');
  
  try {
    // TODO: Replace with real backend endpoint
    const response = await fetch('https://api.andespowder.com/verify-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receipt: purchase.transactionReceipt,
        productId: purchase.productId,
        platform: 'mock',
      }),
    });

    if (!response.ok) {
      // For now, accept all purchases in mock mode
      console.log('[IAP] Backend verification skipped (MOCK mode)');
      return true;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('[IAP] Error verifying purchase:', error);
    // Accept purchase in mock mode
    return true;
  }
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
  PRODUCT_IDS,
};
