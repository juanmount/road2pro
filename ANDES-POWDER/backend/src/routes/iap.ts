import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

type PurchasePlatform = 'android' | 'ios';

type EntitlementStatus = 'active' | 'pending' | 'expired' | 'revoked';

interface VerifyPurchaseBody {
  platform?: PurchasePlatform;
  productId?: string;
  purchaseToken?: string;
  transactionId?: string;
  orderId?: string;
  packageName?: string;
  purchaseTime?: string;
  receiptData?: string;
  rawPayload?: Record<string, unknown>;
}

function resolveEntitlementKey(productId: string): string {
  const normalized = productId.toLowerCase();

  if (normalized.includes('founder') && normalized.includes('2027')) {
    return 'founder_2027';
  }

  return `product:${productId}`;
}

function canAutoGrantUnverifiedPurchases(): boolean {
  return process.env.IAP_ALLOW_UNVERIFIED_GRANTS === 'true' || process.env.NODE_ENV !== 'production';
}

router.post('/verify', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const {
      platform,
      productId,
      purchaseToken,
      transactionId,
      orderId,
      packageName,
      purchaseTime,
      receiptData,
      rawPayload,
    } = req.body as VerifyPurchaseBody;

    if (!platform || (platform !== 'android' && platform !== 'ios')) {
      return res.status(400).json({ error: 'platform must be android or ios' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    if (!purchaseToken && !transactionId && !receiptData) {
      return res.status(400).json({
        error: 'At least one of purchaseToken, transactionId, or receiptData is required',
      });
    }

    const expectedPackage = process.env.GOOGLE_PLAY_PACKAGE_NAME;
    let isVerified = false;
    let verificationMessage = 'Pending store-side verification';

    if (platform === 'android') {
      if (expectedPackage && packageName && expectedPackage !== packageName) {
        verificationMessage = 'Package name mismatch against server configuration';
      } else {
        verificationMessage = 'Android purchase recorded; full Play verification pending integration';
      }
    } else {
      verificationMessage = 'iOS purchase recorded; full App Store verification pending integration';
    }

    const allowUnverifiedGrant = canAutoGrantUnverifiedPurchases();
    const entitlementStatus: EntitlementStatus = isVerified || allowUnverifiedGrant ? 'active' : 'pending';
    const verificationStatus = isVerified ? 'verified' : 'pending';

    const normalizedPurchaseTime = purchaseTime ? new Date(purchaseTime) : null;
    const purchasedAt = normalizedPurchaseTime && !Number.isNaN(normalizedPurchaseTime.valueOf())
      ? normalizedPurchaseTime.toISOString()
      : null;

    let existingPurchaseId: string | null = null;

    if (purchaseToken || transactionId) {
      const existingResult = await pool.query(
        `SELECT id
         FROM iap_purchases
         WHERE platform = $1
           AND (
             ($2::text IS NOT NULL AND purchase_token = $2)
             OR ($3::text IS NOT NULL AND transaction_id = $3)
           )
         LIMIT 1`,
        [platform, purchaseToken || null, transactionId || null]
      );

      existingPurchaseId = existingResult.rows[0]?.id || null;
    }

    let purchaseId: string;

    if (existingPurchaseId) {
      const updatedResult = await pool.query(
        `UPDATE iap_purchases
         SET product_id = $2,
             order_id = COALESCE($3, order_id),
             purchase_state = 'purchased',
             verification_status = $4,
             verification_message = $5,
             purchased_at = COALESCE($6::timestamptz, purchased_at),
             verified_at = CASE WHEN $4 = 'verified' THEN NOW() ELSE verified_at END,
             raw_payload = COALESCE($7::jsonb, raw_payload),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [
          existingPurchaseId,
          productId,
          orderId || null,
          verificationStatus,
          verificationMessage,
          purchasedAt,
          rawPayload ? JSON.stringify(rawPayload) : null,
        ]
      );

      purchaseId = updatedResult.rows[0].id;
    } else {
      const insertedResult = await pool.query(
        `INSERT INTO iap_purchases (
            user_id,
            platform,
            product_id,
            purchase_token,
            transaction_id,
            order_id,
            purchase_state,
            verification_status,
            verification_message,
            purchased_at,
            verified_at,
            raw_payload
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'purchased',
            $7,
            $8,
            $9::timestamptz,
            CASE WHEN $7 = 'verified' THEN NOW() ELSE NULL END,
            $10::jsonb
          )
          RETURNING id`,
        [
          req.user!.userId,
          platform,
          productId,
          purchaseToken || null,
          transactionId || null,
          orderId || null,
          verificationStatus,
          verificationMessage,
          purchasedAt,
          JSON.stringify(rawPayload || {}),
        ]
      );

      purchaseId = insertedResult.rows[0].id;
    }

    const entitlementKey = resolveEntitlementKey(productId);

    await pool.query(
      `INSERT INTO user_entitlements (
          user_id,
          entitlement_key,
          source_product_id,
          status,
          starts_at,
          metadata
        )
        VALUES ($1, $2, $3, $4, NOW(), $5::jsonb)
        ON CONFLICT (user_id, entitlement_key)
        DO UPDATE SET
          source_product_id = EXCLUDED.source_product_id,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()`,
      [
        req.user!.userId,
        entitlementKey,
        productId,
        entitlementStatus,
        JSON.stringify({
          platform,
          orderId: orderId || null,
          purchaseId,
          verificationStatus,
        }),
      ]
    );

    res.json({
      valid: isVerified || allowUnverifiedGrant,
      verificationStatus,
      verificationMessage,
      purchaseId,
      entitlement: {
        key: entitlementKey,
        status: entitlementStatus,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('IAP verify error:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

router.get('/me/entitlements', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT entitlement_key, source_product_id, status, starts_at, ends_at, metadata, updated_at
       FROM user_entitlements
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user!.userId]
    );

    const entitlements = result.rows.map((row) => ({
      key: row.entitlement_key,
      productId: row.source_product_id,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      metadata: row.metadata,
      updatedAt: row.updated_at,
    }));

    const hasFounder2027 = entitlements.some(
      (item) => item.key === 'founder_2027' && item.status === 'active'
    );

    res.json({
      entitlements,
      hasFounder2027,
    });
  } catch (error) {
    console.error('Get entitlements error:', error);
    res.status(500).json({ error: 'Failed to fetch entitlements' });
  }
});

export default router;
