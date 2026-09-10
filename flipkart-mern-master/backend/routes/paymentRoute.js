const express = require('express');
const { 
    processPayment, 
    paytmResponse, 
    getPaymentStatus, 
    getPaymentConfig, 
    getAdminPaymentSettings, 
    updateAdminPaymentSettings, 
    initiateUpiPayment,
    createCodOrder,
    createPaymentOrder,
    initiatePaymentIntent,
    verifyPayment,
    handleWebhook,
    getAdminPayments,
    getAdminPaymentDetails
} = require('../controllers/paymentController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Existing Paytm routes (preserved)
router.route('/payment/process').post(isAuthenticatedUser, processPayment);
// router.route('/stripeapikey').get(isAuthenticatedUser, sendStripeApiKey);
router.route('/callback').post(paytmResponse);

// Safe Public Payment Config for Checkout
router.route('/payment/config').get(getPaymentConfig);

// Create Payment Order & Authoritative Amount Calculation
router.route('/payment/order').post(isAuthenticatedUser, createPaymentOrder);

// Initiate Payment (UPI intent / deep link generator)
router.route('/payment/initiate').post(isAuthenticatedUser, initiatePaymentIntent);

// Polling & Status Verification
router.route('/payment/status/:orderId').get(isAuthenticatedUser, getPaymentStatus);
router.route('/payment/verify').post(isAuthenticatedUser, verifyPayment);

// Payment Gateway Webhook (idempotent & signature-verified)
router.route('/payment/webhook').post(handleWebhook);

// Admin Payment Settings Routes
router.route('/admin/payment/settings')
    .get(isAuthenticatedUser, authorizeRoles("admin"), getAdminPaymentSettings)
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateAdminPaymentSettings);

// Admin Payments Management Routes
router.route('/admin/payments').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminPayments);
router.route('/admin/payment/:id').get(isAuthenticatedUser, authorizeRoles("admin"), getAdminPaymentDetails);

// Secure Authoritative UPI Payment Initiation (backward-compatible)
router.route('/payment/upi/initiate').post(isAuthenticatedUser, initiateUpiPayment);

// Secure Authoritative Cash on Delivery Order Creation (backward-compatible)
router.route('/payment/cod').post(isAuthenticatedUser, createCodOrder);

module.exports = router;