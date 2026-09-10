const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const PaymentSettings = require('../models/paymentSettingsModel');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Payment Service Layer
 * Encapsulates payment lifecycle: order preparation, initiation, verification, webhooks, and admin queries.
 */
class PaymentService {
    /**
     * Create an order in PENDING payment state with authoritative DB prices and stock validation
     */
    async createPaymentOrder({ userId, shippingInfo, orderItems, paymentMethod = 'UPI', provider = 'UPI' }) {
        if (!shippingInfo || !orderItems || orderItems.length === 0) {
            throw new ErrorHandler("Invalid order details or empty cart items", 400);
        }

        const settings = await PaymentSettings.getSettings();
        const normalizedMethod = String(paymentMethod).toUpperCase();

        // Validate method against admin configuration
        if (normalizedMethod === 'COD' || normalizedMethod === 'CASH ON DELIVERY') {
            if (!settings.cashOnDeliveryEnabled) {
                throw new ErrorHandler("Cash on Delivery is currently disabled by administrator", 400);
            }
        } else if (normalizedMethod.includes('GOOGLE') || String(provider).toUpperCase().includes('GOOGLE')) {
            if (!settings.googlePayEnabled) {
                throw new ErrorHandler("Google Pay is currently disabled by administrator", 400);
            }
        } else if (normalizedMethod.includes('PHONEPE') || String(provider).toUpperCase().includes('PHONEPE')) {
            if (!settings.phonePeEnabled && !settings.phonepeEnabled) {
                throw new ErrorHandler("PhonePe is currently disabled by administrator", 400);
            }
        } else if (normalizedMethod.includes('PAYTM') || String(provider).toUpperCase().includes('PAYTM')) {
            if (!settings.paytmEnabled) {
                throw new ErrorHandler("Paytm is currently disabled by administrator", 400);
            }
        } else if (normalizedMethod === 'UPI' || normalizedMethod === 'OTHER UPI') {
            if (String(provider).toUpperCase().includes('QR') || String(provider).toUpperCase().includes('SCAN')) {
                if (!settings.qrPaymentEnabled && !settings.upiEnabled) {
                    throw new ErrorHandler("UPI QR Scanner payments are currently disabled by administrator", 400);
                }
            } else if (!settings.upiEnabled && !settings.otherUpiEnabled) {
                throw new ErrorHandler("UPI payments are currently disabled by administrator", 400);
            }
        }

        // Authoritative pricing & stock availability directly from MongoDB
        let calculatedTotalPrice = 0;
        const verifiedOrderItems = [];

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (!product) {
                throw new ErrorHandler(`Product with ID ${item.product} not found`, 404);
            }

            if (item.quantity > product.stock) {
                throw new ErrorHandler(`Only ${product.stock} items are currently available for ${product.name}`, 400);
            }

            calculatedTotalPrice += product.price * item.quantity;
            verifiedOrderItems.push({
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: item.image || (product.images && product.images[0] ? product.images[0].url : ""),
                product: product._id
            });
        }

        const prefix = (normalizedMethod === 'COD' || normalizedMethod === 'CASH ON DELIVERY') ? 'COD_' : 'TXN_';
        const transactionId = prefix + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();

        const isCod = (normalizedMethod === 'COD' || normalizedMethod === 'CASH ON DELIVERY');
        const resolvedMethod = isCod ? 'COD' : paymentMethod;
        const resolvedProvider = isCod ? 'Cash on Delivery' : provider;

        const order = await Order.create({
            shippingInfo,
            orderItems: verifiedOrderItems,
            totalPrice: calculatedTotalPrice,
            payment: {
                method: resolvedMethod,
                provider: resolvedProvider,
                status: 'PENDING',
                transactionId,
                amount: calculatedTotalPrice,
            },
            paymentInfo: {
                id: transactionId,
                status: 'Pending',
                method: resolvedMethod
            },
            orderStatus: 'Processing',
            user: userId,
        });

        // For Cash on Delivery, clear the database cart immediately upon order placement
        if (isCod) {
            try {
                await Cart.findOneAndUpdate({ user: userId }, { cartItems: [] });
            } catch (cartErr) {
                console.warn("[Cart Clear Warning]: Could not clear user cart:", cartErr.message);
            }
        }

        return order;
    }

    /**
     * Initiate payment and build verified UPI intent URLs with exact server amounts
     */
    async initiatePayment({ orderId, userId, requestedProvider = 'UPI' }) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new ErrorHandler("Order not found", 404);
        }

        if (order.user.toString() !== userId.toString()) {
            throw new ErrorHandler("Access denied: You are not authorized to access this order", 403);
        }

        const settings = await PaymentSettings.getSettings();
        const merchantUpiId = settings.upiId || "flipkart@upi";
        const merchantName = settings.merchantName || "Flipkart Commerce";
        const amount = order.totalPrice;
        const transactionRef = order.payment?.transactionId || order.paymentInfo?.id || order._id.toString();
        const transactionNote = encodeURIComponent(`Order_${order._id}`);

        const queryParams = `pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tr=${encodeURIComponent(transactionRef)}&tn=${transactionNote}`;

        const genericUpiUrl = `upi://pay?${queryParams}`;
        const googlePayUrl = `tez://upi/pay?${queryParams}`;
        const phonePeUrl = `phonepe://pay?${queryParams}`;
        const paytmUrl = `paytmmp://pay?${queryParams}`;

        return {
            success: true,
            orderId: order._id,
            transactionId: transactionRef,
            amount,
            method: order.payment?.method || 'UPI',
            provider: requestedProvider,
            merchantUpiId,
            merchantName,
            genericUpiUrl,
            googlePayUrl,
            phonePeUrl,
            paytmUrl,
            paymentMode: settings.paymentMode || 'development'
        };
    }

    /**
     * Verify payment and transition order to SUCCESS / Paid
     */
    async verifyPayment({ orderId, transactionId, paymentId, signature, userId, isAdmin = false }) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new ErrorHandler("Order not found", 404);
        }

        if (!isAdmin && order.user.toString() !== userId.toString()) {
            throw new ErrorHandler("Access denied", 403);
        }

        // Check if already processed
        if (order.payment?.status === 'SUCCESS') {
            return { success: true, order, message: "Payment already verified successfully" };
        }

        const now = new Date();
        order.payment = {
            ...order.payment,
            status: 'SUCCESS',
            paidAt: now,
            transactionId: transactionId || order.payment?.transactionId || `VERIFIED_${Date.now()}`,
            gatewayPaymentId: paymentId || ""
        };
        order.paymentInfo = {
            id: order.payment.transactionId,
            status: 'Paid',
            method: order.payment.method || 'UPI'
        };
        order.paidAt = now;
        order.orderStatus = 'Processing';

        await order.save();

        // Clear user cart only after verified successful payment
        try {
            await Cart.findOneAndUpdate({ user: order.user }, { cartItems: [] });
        } catch (cartErr) {
            console.warn("[Cart Clear Warning]: Could not clear user cart:", cartErr.message);
        }

        return { success: true, order, message: "Payment verified successfully" };
    }

    /**
     * Idempotent Webhook Handler for Payment Gateways
     */
    async handleWebhook({ headers = {}, body = {}, rawBody = "" }) {
        const webhookSecret = process.env.WEBHOOK_SECRET || 'flipkart_webhook_secret_key';
        const signature = headers['x-webhook-signature'] || headers['x-razorpay-signature'] || "";

        // If a signature is provided, verify authenticity
        if (signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(typeof rawBody === 'string' && rawBody.length > 0 ? rawBody : JSON.stringify(body))
                .digest('hex');

            if (signature !== expectedSignature) {
                throw new ErrorHandler("Invalid webhook signature", 400);
            }
        }

        const { event, orderId, transactionId, gatewayPaymentId, status } = body;

        if (!orderId) {
            throw new ErrorHandler("Missing orderId in webhook payload", 400);
        }

        const order = await Order.findById(orderId);
        if (!order) {
            throw new ErrorHandler(`Order with ID ${orderId} not found`, 404);
        }

        // Idempotency: prevent double processing if already successful
        if (order.payment?.status === 'SUCCESS') {
            return {
                success: true,
                message: "Order payment already marked SUCCESS. Webhook ignored (idempotent).",
                orderId: order._id
            };
        }

        const isSuccess = (status === 'SUCCESS' || event === 'payment.captured' || event === 'payment.success');

        if (isSuccess) {
            const now = new Date();
            order.payment = {
                ...order.payment,
                status: 'SUCCESS',
                paidAt: now,
                transactionId: transactionId || order.payment?.transactionId,
                gatewayPaymentId: gatewayPaymentId || order.payment?.gatewayPaymentId
            };
            order.paymentInfo = {
                id: order.payment.transactionId,
                status: 'Paid',
                method: order.payment.method || 'UPI'
            };
            order.paidAt = now;
            order.orderStatus = 'Processing';

            await order.save();

            // Clear purchased cart items in MongoDB
            try {
                await Cart.findOneAndUpdate({ user: order.user }, { cartItems: [] });
            } catch (err) {
                console.warn("[Cart Clear Warning]:", err.message);
            }
        } else {
            order.payment = {
                ...order.payment,
                status: 'FAILED',
                gatewayPaymentId: gatewayPaymentId || order.payment?.gatewayPaymentId
            };
            order.paymentInfo = {
                ...order.paymentInfo,
                status: 'Failed'
            };
            await order.save();
        }

        return {
            success: true,
            orderId: order._id,
            paymentStatus: order.payment.status,
            message: `Webhook processed successfully: payment status updated to ${order.payment.status}`
        };
    }

    /**
     * Safe payment status polling endpoint
     */
    async getPaymentStatus({ orderId, userId, isAdmin = false }) {
        const order = await Order.findById(orderId).select('payment paymentInfo orderStatus totalPrice user createdAt paidAt');
        if (!order) {
            throw new ErrorHandler("Order not found", 404);
        }

        if (!isAdmin && order.user.toString() !== userId.toString()) {
            throw new ErrorHandler("Access denied: You are not authorized to view this order status", 403);
        }

        const currentPaymentStatus = order.payment?.status || (order.paymentInfo?.status === 'Paid' ? 'SUCCESS' : 'PENDING');

        return {
            success: true,
            orderId: order._id,
            paymentStatus: currentPaymentStatus,
            orderStatus: order.orderStatus,
            amount: order.totalPrice,
            method: order.payment?.method || order.paymentInfo?.method || 'UPI',
            provider: order.payment?.provider || 'UPI',
            transactionId: order.payment?.transactionId || order.paymentInfo?.id,
            paidAt: order.payment?.paidAt || order.paidAt,
            createdAt: order.createdAt
        };
    }

    /**
     * Admin: Fetch all payments with filtering and pagination
     */
    async getAdminPayments({ page = 1, limit = 20, status, method }) {
        const filter = {};

        if (status && status !== 'ALL') {
            const upperStatus = status.toUpperCase();
            if (upperStatus === 'COD') {
                filter.$or = [
                    { 'payment.method': 'COD' },
                    { 'paymentInfo.method': 'COD' }
                ];
            } else {
                filter.$or = [
                    { 'payment.status': upperStatus },
                    { 'paymentInfo.status': upperStatus === 'SUCCESS' ? 'Paid' : upperStatus }
                ];
            }
        }

        if (method) {
            filter.$or = [
                { 'payment.method': new RegExp(method, 'i') },
                { 'paymentInfo.method': new RegExp(method, 'i') }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const payments = orders.map((ord) => ({
            paymentId: ord.payment?.transactionId || ord.paymentInfo?.id || ord._id,
            orderId: ord._id,
            customer: ord.user ? { name: ord.user.name, email: ord.user.email, id: ord.user._id } : { name: "Guest / Deleted", email: "" },
            paymentMethod: ord.payment?.method || ord.paymentInfo?.method || "UPI",
            provider: ord.payment?.provider || ord.payment?.method || "UPI",
            amount: ord.totalPrice,
            status: ord.payment?.status || (ord.paymentInfo?.status === 'Paid' ? 'SUCCESS' : 'PENDING'),
            transactionId: ord.payment?.transactionId || ord.paymentInfo?.id || "N/A",
            gatewayOrderId: ord.payment?.gatewayOrderId || "N/A",
            gatewayPaymentId: ord.payment?.gatewayPaymentId || "N/A",
            date: ord.createdAt,
            paidAt: ord.payment?.paidAt || ord.paidAt,
            orderStatus: ord.orderStatus
        }));

        return {
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)) || 1,
            payments
        };
    }

    /**
     * Admin: Fetch detailed payment breakdown for a specific order
     */
    async getAdminPaymentDetails(orderId) {
        const order = await Order.findById(orderId).populate('user', 'name email');
        if (!order) {
            throw new ErrorHandler("Order not found", 404);
        }

        return {
            success: true,
            payment: {
                orderId: order._id,
                customer: order.user ? { name: order.user.name, email: order.user.email, id: order.user._id } : { name: "Unknown", email: "" },
                paymentMethod: order.payment?.method || order.paymentInfo?.method || "UPI",
                provider: order.payment?.provider || "UPI",
                status: order.payment?.status || (order.paymentInfo?.status === 'Paid' ? 'SUCCESS' : 'PENDING'),
                amount: order.totalPrice,
                transactionId: order.payment?.transactionId || order.paymentInfo?.id || "N/A",
                gatewayOrderId: order.payment?.gatewayOrderId || "N/A",
                gatewayPaymentId: order.payment?.gatewayPaymentId || "N/A",
                createdDate: order.createdAt,
                paidDate: order.payment?.paidAt || order.paidAt || null,
                orderStatus: order.orderStatus,
                shippingInfo: order.shippingInfo,
                orderItemsCount: order.orderItems?.length || 0,
                webhookStatus: order.payment?.status === 'SUCCESS' ? 'VERIFIED' : 'PENDING'
            }
        };
    }
}

module.exports = new PaymentService();
