const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paytm = require('paytmchecksum');
const https = require('https');
const Payment = require('../models/paymentModel');
const PaymentSettings = require('../models/paymentSettingsModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const ErrorHandler = require('../utils/errorHandler');
const paymentService = require('../services/paymentService');
const { v4: uuidv4 } = require('uuid');

// exports.processPayment = asyncErrorHandler(async (req, res, next) => {
//     const myPayment = await stripe.paymentIntents.create({
//         amount: req.body.amount,
//         currency: "inr",
//         metadata: {
//             company: "Flipkart",
//         },
//     });

//     res.status(200).json({
//         success: true,
//         client_secret: myPayment.client_secret, 
//     });
// });

// exports.sendStripeApiKey = asyncErrorHandler(async (req, res, next) => {
//     res.status(200).json({ stripeApiKey: process.env.STRIPE_API_KEY });
// });

// Process Payment
exports.processPayment = asyncErrorHandler(async (req, res, next) => {

    const { amount, email, phoneNo } = req.body;

    var params = {};

    /* initialize an array */
    params["MID"] = process.env.PAYTM_MID;
    params["WEBSITE"] = process.env.PAYTM_WEBSITE;
    params["CHANNEL_ID"] = process.env.PAYTM_CHANNEL_ID;
    params["INDUSTRY_TYPE_ID"] = process.env.PAYTM_INDUSTRY_TYPE;
    params["ORDER_ID"] = "oid" + uuidv4();
    params["CUST_ID"] = process.env.PAYTM_CUST_ID;
    params["TXN_AMOUNT"] = JSON.stringify(amount);
    // params["CALLBACK_URL"] = `${req.protocol}://${req.get("host")}/api/v1/callback`;
    params["CALLBACK_URL"] = `https://${req.get("host")}/api/v1/callback`;
    params["EMAIL"] = email;
    params["MOBILE_NO"] = phoneNo;

    let paytmChecksum = paytm.generateSignature(params, process.env.PAYTM_MERCHANT_KEY);
    paytmChecksum.then(function (checksum) {

        let paytmParams = {
            ...params,
            "CHECKSUMHASH": checksum,
        };

        res.status(200).json({
            paytmParams
        });

    }).catch(function (error) {
        console.log(error);
    });
});

// Paytm Callback
exports.paytmResponse = (req, res, next) => {

    // console.log(req.body);

    let paytmChecksum = req.body.CHECKSUMHASH;
    delete req.body.CHECKSUMHASH;

    let isVerifySignature = paytm.verifySignature(req.body, process.env.PAYTM_MERCHANT_KEY, paytmChecksum);
    if (isVerifySignature) {
        // console.log("Checksum Matched");

        var paytmParams = {};

        paytmParams.body = {
            "mid": req.body.MID,
            "orderId": req.body.ORDERID,
        };

        paytm.generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_MERCHANT_KEY).then(function (checksum) {

            paytmParams.head = {
                "signature": checksum
            };

            /* prepare JSON string for request */
            var post_data = JSON.stringify(paytmParams);

            var options = {
                /* for Staging */
                hostname: 'securegw-stage.paytm.in',
                /* for Production */
                // hostname: 'securegw.paytm.in',
                port: 443,
                path: '/v3/order/status',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': post_data.length
                }
            };

            // Set up the request
            var response = "";
            var post_req = https.request(options, function (post_res) {
                post_res.on('data', function (chunk) {
                    response += chunk;
                });

                post_res.on('end', function () {
                    let { body } = JSON.parse(response);
                    // let status = body.resultInfo.resultStatus;
                    // res.json(body);
                    addPayment(body);
                    // res.redirect(`${req.protocol}://${req.get("host")}/order/${body.orderId}`)
                    res.redirect(`https://${req.get("host")}/order/${body.orderId}`)
                });
            });

            // post the data
            post_req.write(post_data);
            post_req.end();
        });

    } else {
        console.log("Checksum Mismatched");
    }
}

const addPayment = async (data) => {
    try {
        await Payment.create(data);
    } catch (error) {
        console.log("Payment Failed!");
    }
}

exports.getPaymentStatus = asyncErrorHandler(async (req, res, next) => {

    const payment = await Payment.findOne({ orderId: req.params.id });

    if (!payment) {
        return next(new ErrorHandler("Payment Details Not Found", 404));
    }

    const txn = {
        id: payment.txnId,
        status: payment.resultInfo.resultStatus,
    }

    res.status(200).json({
        success: true,
        txn,
    });
});

// Get Public Payment Configuration (Safe for checkout & payment page)
exports.getPaymentConfig = asyncErrorHandler(async (req, res, next) => {
    const settings = await PaymentSettings.getSettings();

    res.status(200).json({
        success: true,
        config: {
            upiId: settings.upiId,
            merchantName: settings.merchantName,
            upiEnabled: Boolean(settings.upiEnabled),
            qrPaymentEnabled: Boolean(settings.qrPaymentEnabled !== undefined ? settings.qrPaymentEnabled : settings.upiEnabled),
            paytmEnabled: Boolean(settings.paytmEnabled),
            phonePeEnabled: Boolean(settings.phonePeEnabled !== undefined ? settings.phonePeEnabled : settings.phonepeEnabled),
            phonepeEnabled: Boolean(settings.phonePeEnabled !== undefined ? settings.phonePeEnabled : settings.phonepeEnabled),
            googlePayEnabled: Boolean(settings.googlePayEnabled),
            otherUpiEnabled: Boolean(settings.otherUpiEnabled !== undefined ? settings.otherUpiEnabled : true),
            cashOnDeliveryEnabled: Boolean(settings.cashOnDeliveryEnabled !== undefined ? settings.cashOnDeliveryEnabled : true),
            paymentMode: settings.paymentMode || 'development'
        }
    });
});

// Get Admin Payment Settings --- ADMIN
exports.getAdminPaymentSettings = asyncErrorHandler(async (req, res, next) => {
    const settings = await PaymentSettings.getSettings();

    res.status(200).json({
        success: true,
        settings,
    });
});

// Update Admin Payment Settings --- ADMIN
exports.updateAdminPaymentSettings = asyncErrorHandler(async (req, res, next) => {
    let settings = await PaymentSettings.getSettings();

    const {
        upiId,
        merchantName,
        upiEnabled,
        qrPaymentEnabled,
        paytmEnabled,
        phonePeEnabled,
        phonepeEnabled,
        googlePayEnabled,
        otherUpiEnabled,
        cashOnDeliveryEnabled,
        paymentMode,
    } = req.body;

    if (!merchantName || merchantName.trim().length === 0) {
        return next(new ErrorHandler("Merchant / Receiver Name cannot be empty", 400));
    }

    const isUpiOrQrActive = (upiEnabled === true || qrPaymentEnabled === true || settings.upiEnabled || settings.qrPaymentEnabled);
    if (isUpiOrQrActive && (!upiId || upiId.trim().length === 0)) {
        return next(new ErrorHandler("UPI ID cannot be empty when UPI or QR payments are enabled", 400));
    }

    if (upiId && !upiId.includes('@')) {
        return next(new ErrorHandler("Please enter a valid UPI ID (e.g. username@bank)", 400));
    }

    if (upiId) settings.upiId = upiId.trim();
    settings.merchantName = merchantName.trim();
    if (typeof upiEnabled === 'boolean') settings.upiEnabled = upiEnabled;
    if (typeof qrPaymentEnabled === 'boolean') settings.qrPaymentEnabled = qrPaymentEnabled;
    if (typeof paytmEnabled === 'boolean') settings.paytmEnabled = paytmEnabled;

    const resolvedPhonePe = typeof phonePeEnabled === 'boolean' ? phonePeEnabled : (typeof phonepeEnabled === 'boolean' ? phonepeEnabled : undefined);
    if (resolvedPhonePe !== undefined) {
        settings.phonePeEnabled = resolvedPhonePe;
        settings.phonepeEnabled = resolvedPhonePe;
    }

    if (typeof googlePayEnabled === 'boolean') settings.googlePayEnabled = googlePayEnabled;
    if (typeof otherUpiEnabled === 'boolean') settings.otherUpiEnabled = otherUpiEnabled;
    if (typeof cashOnDeliveryEnabled === 'boolean') settings.cashOnDeliveryEnabled = cashOnDeliveryEnabled;
    if (paymentMode) settings.paymentMode = paymentMode;

    await settings.save();

    res.status(200).json({
        success: true,
        message: "Payment settings updated successfully",
        settings,
    });
});

// Create Order with Authoritative Amount & Stock Validation
exports.createPaymentOrder = asyncErrorHandler(async (req, res, next) => {
    const { shippingInfo, orderItems, paymentMethod = 'UPI', provider = 'UPI' } = req.body;

    const order = await paymentService.createPaymentOrder({
        userId: req.user._id,
        shippingInfo,
        orderItems,
        paymentMethod,
        provider
    });

    res.status(201).json({
        success: true,
        order,
        message: "Order created successfully in PENDING payment state"
    });
});

// Initiate Payment Intent / Deep Links
exports.initiatePaymentIntent = asyncErrorHandler(async (req, res, next) => {
    const { orderId, provider } = req.body;

    if (!orderId) {
        return next(new ErrorHandler("Order ID is required to initiate payment", 400));
    }

    const initiationData = await paymentService.initiatePayment({
        orderId,
        userId: req.user._id,
        requestedProvider: provider
    });

    res.status(200).json({
        success: true,
        ...initiationData
    });
});

// Safe Payment Status Polling Endpoint
exports.getPaymentStatus = asyncErrorHandler(async (req, res, next) => {
    const { orderId } = req.params;

    const statusData = await paymentService.getPaymentStatus({
        orderId,
        userId: req.user._id,
        isAdmin: req.user.role === 'admin'
    });

    res.status(200).json(statusData);
});

// Verify Payment Endpoint
exports.verifyPayment = asyncErrorHandler(async (req, res, next) => {
    const { orderId, transactionId, paymentId, signature } = req.body;

    const result = await paymentService.verifyPayment({
        orderId,
        transactionId,
        paymentId,
        signature,
        userId: req.user._id,
        isAdmin: req.user.role === 'admin'
    });

    res.status(200).json(result);
});

// Idempotent Webhook Handler
exports.handleWebhook = asyncErrorHandler(async (req, res, next) => {
    const result = await paymentService.handleWebhook({
        headers: req.headers,
        body: req.body,
        rawBody: req.rawBody
    });

    res.status(200).json(result);
});

// Admin: Get All Payments
exports.getAdminPayments = asyncErrorHandler(async (req, res, next) => {
    const result = await paymentService.getAdminPayments(req.query);

    res.status(200).json(result);
});

// Admin: Get Payment Details
exports.getAdminPaymentDetails = asyncErrorHandler(async (req, res, next) => {
    const result = await paymentService.getAdminPaymentDetails(req.params.id);

    res.status(200).json(result);
});

// Initiate UPI Payment & Prepare Order (Authoritative Amount & Stock Security - Backward Compatible)
exports.initiateUpiPayment = asyncErrorHandler(async (req, res, next) => {
    const { shippingInfo, orderItems, paymentMethod = 'UPI', provider = 'UPI' } = req.body;

    const order = await paymentService.createPaymentOrder({
        userId: req.user._id,
        shippingInfo,
        orderItems,
        paymentMethod,
        provider
    });

    const initiationData = await paymentService.initiatePayment({
        orderId: order._id,
        userId: req.user._id,
        requestedProvider: provider || paymentMethod
    });

    res.status(201).json({
        success: true,
        order,
        orderId: order._id,
        totalPrice: order.totalPrice,
        upiUri: initiationData.genericUpiUrl,
        phonePeUrl: initiationData.phonePeUrl,
        googlePayUrl: initiationData.googlePayUrl,
        paytmUrl: initiationData.paytmUrl,
        upiPayload: {
            upiUri: initiationData.genericUpiUrl,
            upiId: initiationData.merchantUpiId,
            merchantName: initiationData.merchantName,
            amount: order.totalPrice,
            orderId: order._id,
            method: paymentMethod || "UPI"
        }
    });
});

// Create Cash on Delivery (COD) Order (Authoritative Amount & Stock Security - Backward Compatible)
exports.createCodOrder = asyncErrorHandler(async (req, res, next) => {
    const { shippingInfo, orderItems } = req.body;

    const order = await paymentService.createPaymentOrder({
        userId: req.user._id,
        shippingInfo,
        orderItems,
        paymentMethod: 'COD',
        provider: 'Cash on Delivery'
    });

    res.status(201).json({
        success: true,
        order,
        message: "Order placed successfully with Cash on Delivery"
    });
});


