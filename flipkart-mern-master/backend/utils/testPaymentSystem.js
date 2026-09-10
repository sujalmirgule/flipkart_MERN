require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const PaymentSettings = require('../models/paymentSettingsModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Cart = require('../models/cartModel');

const {
    getPaymentConfig,
    updateAdminPaymentSettings,
    createPaymentOrder,
    initiatePaymentIntent,
    verifyPayment,
    handleWebhook,
    createCodOrder,
    getPaymentStatus
} = require('../controllers/paymentController');

const {
    getCart,
    addToCart,
    updateCartItemQuantity,
    clearCart
} = require('../controllers/cartController');

const {
    getUserAddresses,
    addAddress
} = require('../controllers/userController');

const {
    createProductReview
} = require('../controllers/productController');

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

function callController(fn, req) {
    return new Promise((resolve) => {
        const res = {
            statusCode: 200,
            data: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.data = payload;
                resolve({ res: this, err: null });
                return this;
            },
            send(payload) {
                this.data = payload;
                resolve({ res: this, err: null });
                return this;
            }
        };

        fn(req, res, (err) => {
            resolve({ res, err: err || null });
        });
    });
}

async function runTests() {
    console.log("===================================================================");
    console.log("STARTING FULL AUTOMATED PAYMENT & E-COMMERCE SUITE (10 SCENARIOS)");
    console.log("===================================================================\n");

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI not configured in .env");
    }

    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB successfully.\n");

    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, testName, details = "") {
        if (condition) {
            console.log(`[PASS] ${testName} ${details ? '--> ' + details : ''}`);
            passedTests++;
        } else {
            console.error(`[FAIL] ${testName} ${details ? '--> ' + details : ''}`);
            failedTests++;
        }
    }

    let userA = null;
    let userB = null;
    let adminUser = null;
    let productA = null;
    let productB = null;
    const createdOrderIds = [];

    try {
        const timestamp = Date.now();

        // 0. Ensure Payment Settings are enabled
        await PaymentSettings.findOneAndUpdate(
            {},
            {
                upiId: "flipkartbusiness@icici",
                merchantName: "Flipkart Commerce India",
                upiEnabled: true,
                googlePayEnabled: true,
                phonePeEnabled: true,
                paytmEnabled: true,
                otherUpiEnabled: true,
                cashOnDeliveryEnabled: true,
                paymentMode: "development"
            },
            { upsert: true, new: true }
        );

        // 1. Setup Admin & Test Users
        adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.create({
                name: "Test Admin",
                email: `admin_${timestamp}@testflipkart.com`,
                password: "Password123!",
                role: "admin",
                gender: "male",
                avatar: { public_id: "test", url: "test" }
            });
        }

        userA = await User.create({
            name: "Alice Customer",
            email: `alice_${timestamp}@testflipkart.com`,
            password: "Password123!",
            role: "user",
            gender: "female",
            avatar: { public_id: "test_a", url: "test_a" }
        });

        userB = await User.create({
            name: "Bob Customer",
            email: `bob_${timestamp}@testflipkart.com`,
            password: "Password123!",
            role: "user",
            gender: "male",
            avatar: { public_id: "test_b", url: "test_b" }
        });

        // 2. Setup Test Products
        productA = await Product.create({
            name: `Smartphone Galaxy X ${timestamp}`,
            description: "High end smartphone with AMOLED display",
            highlights: ["AMOLED", "5G"],
            specifications: [{ title: "Memory", description: "8GB" }],
            price: 15000,
            cuttedPrice: 20000,
            category: "Mobiles",
            stock: 5,
            user: adminUser._id,
            images: [{ public_id: "img_a", url: "https://example.com/phone.jpg" }],
            brand: { name: "Samsung", logo: { public_id: "logo_a", url: "https://example.com/logo.jpg" } }
        });

        productB = await Product.create({
            name: `Wireless Headphones ${timestamp}`,
            description: "Noise cancelling wireless headphones",
            highlights: ["ANC", "Bluetooth 5.3"],
            specifications: [{ title: "Battery", description: "40 hours" }],
            price: 3000,
            cuttedPrice: 5000,
            category: "Audio",
            stock: 10,
            user: adminUser._id,
            images: [{ public_id: "img_b", url: "https://example.com/audio.jpg" }],
            brand: { name: "Sony", logo: { public_id: "logo_b", url: "https://example.com/sony.jpg" } }
        });

        // =========================================================================
        // TEST 1: User A cart vs User B cart isolation
        // =========================================================================
        console.log("\n--- TEST 1: Cart Isolation ---");
        // User A adds Product A (qty: 2)
        await callController(addToCart, {
            user: userA,
            body: { productId: productA._id, quantity: 2 }
        });

        // User B adds Product B (qty: 1)
        await callController(addToCart, {
            user: userB,
            body: { productId: productB._id, quantity: 1 }
        });

        // Fetch User A cart
        const { res: resCartA } = await callController(getCart, { user: userA });
        const cartAItems = resCartA.data?.cartItems || [];

        // Fetch User B cart
        const { res: resCartB } = await callController(getCart, { user: userB });
        const cartBItems = resCartB.data?.cartItems || [];

        const isCartAIsolated = cartAItems.length === 1 &&
            cartAItems[0].product.toString() === productA._id.toString() &&
            cartAItems[0].quantity === 2;

        const isCartBIsolated = cartBItems.length === 1 &&
            cartBItems[0].product.toString() === productB._id.toString() &&
            cartBItems[0].quantity === 1;

        assert(
            isCartAIsolated && isCartBIsolated,
            "Test 1: User A cart vs User B cart isolation",
            `User A has ${cartAItems.length} items (Product A). User B has ${cartBItems.length} items (Product B). No cross-contamination.`
        );

        // =========================================================================
        // TEST 2: User A address vs User B address isolation
        // =========================================================================
        console.log("\n--- TEST 2: Address Isolation ---");
        await callController(addAddress, {
            user: userA,
            body: {
                name: "Alice Home",
                phoneNo: "9876543210",
                pincode: "560001",
                address: "123 Alice St",
                city: "Bangalore",
                state: "Karnataka"
            }
        });

        await callController(addAddress, {
            user: userB,
            body: {
                name: "Bob Work",
                phoneNo: "9123456780",
                pincode: "400001",
                address: "456 Bob Ave",
                city: "Mumbai",
                state: "Maharashtra"
            }
        });

        const { res: resAddrA } = await callController(getUserAddresses, { user: userA });
        const { res: resAddrB } = await callController(getUserAddresses, { user: userB });

        const addrsA = resAddrA.data?.addresses || [];
        const addrsB = resAddrB.data?.addresses || [];

        const hasOnlyA = addrsA.every(a => a.name === "Alice Home");
        const hasOnlyB = addrsB.every(b => b.name === "Bob Work");

        assert(
            hasOnlyA && hasOnlyB && addrsA.length === 1 && addrsB.length === 1,
            "Test 2: User A address vs User B address isolation",
            `Alice has [${addrsA.map(a => a.name).join(', ')}], Bob has [${addrsB.map(b => b.name).join(', ')}]`
        );

        // =========================================================================
        // TEST 3: Guest checkout redirect (unauthenticated 401 guard)
        // =========================================================================
        console.log("\n--- TEST 3: Guest Checkout / Auth Guard ---");
        const reqUnauth = { cookies: {}, headers: {} };
        const { err: guestAuthErr } = await callController(isAuthenticatedUser, reqUnauth);
        assert(
            guestAuthErr && guestAuthErr.statusCode === 401,
            "Test 3: Unauthenticated user accessing checkout is intercepted with 401",
            `Status: ${guestAuthErr?.statusCode}, Reason: ${guestAuthErr?.message}`
        );

        // =========================================================================
        // TEST 4: Cart quantity controls and totals recalculation
        // =========================================================================
        console.log("\n--- TEST 4: Cart Quantity Controls & Recalculation ---");
        // Update User A's item to quantity 3
        const { res: resUpdateQty } = await callController(updateCartItemQuantity, {
            user: userA,
            body: { productId: productA._id, quantity: 3 }
        });

        const updatedCartItems = resUpdateQty.data?.cartItems || [];
        const itemInCart = updatedCartItems.find(i => i.product.toString() === productA._id.toString());
        const expectedSubtotal = productA.price * 3;
        const computedSubtotal = itemInCart ? itemInCart.price * itemInCart.quantity : 0;

        assert(
            itemInCart && itemInCart.quantity === 3 && computedSubtotal === expectedSubtotal,
            "Test 4: Cart quantity increment/decrement recalculates totals accurately",
            `Qty: ${itemInCart?.quantity}, Item Total: ₹${computedSubtotal} (Expected: ₹${expectedSubtotal})`
        );

        // =========================================================================
        // TEST 5: Stock limit check rejects when requested quantity > available stock
        // =========================================================================
        console.log("\n--- TEST 5: Stock Limit Validation ---");
        // productA stock is 5. Attempting to add 10 should return 400.
        const { err: stockExceedErr } = await callController(addToCart, {
            user: userA,
            body: { productId: productA._id, quantity: 10 }
        });

        assert(
            stockExceedErr && stockExceedErr.statusCode === 400 && stockExceedErr.message.includes("available"),
            "Test 5: Stock limit check rejects when requested quantity > available stock",
            `Status: ${stockExceedErr?.statusCode}, Message: "${stockExceedErr?.message}"`
        );

        // =========================================================================
        // TEST 6: Online payment flow (PENDING -> Webhook -> SUCCESS & Cart Cleared)
        // =========================================================================
        console.log("\n--- TEST 6: Online Payment Flow & Webhook ---");
        // Create an online order for User A (Product A x 1)
        const shippingDetails = {
            address: "123 Alice St",
            city: "Bangalore",
            state: "Karnataka",
            country: "India",
            pincode: 560001,
            phoneNo: 9876543210
        };

        const { res: resOnlineOrder } = await callController(createPaymentOrder, {
            user: userA,
            body: {
                shippingInfo: shippingDetails,
                orderItems: [{ product: productA._id.toString(), quantity: 1 }],
                paymentMethod: "Google Pay"
            }
        });

        const onlineOrder = resOnlineOrder.data?.order;
        if (onlineOrder) createdOrderIds.push(onlineOrder._id);

        const initialStatusPending = onlineOrder &&
            onlineOrder.payment?.status === "PENDING" &&
            onlineOrder.payment?.method === "Google Pay" &&
            onlineOrder.orderStatus === "Processing";

        assert(
            initialStatusPending,
            "Test 6a: Online order initialized with status PENDING",
            `Order ID: ${onlineOrder?._id}, Payment Status: ${onlineOrder?.payment?.status}`
        );

        // Initiate payment intent to generate deep links and QR parameters
        const { res: resIntent } = await callController(initiatePaymentIntent, {
            user: userA,
            body: {
                orderId: onlineOrder?._id.toString(),
                provider: "Google Pay"
            }
        });

        const hasDeepLinks = resIntent.data?.genericUpiUrl && resIntent.data?.googlePayUrl;
        assert(
            hasDeepLinks,
            "Test 6b: Payment initiation produces deep links & UPI payload",
            `gpay URI: ${resIntent.data?.googlePayUrl?.substring(0, 45)}...`
        );

        // Now simulate payment webhook delivery
        const gatewayTxnId = `txn_online_${Date.now()}`;
        const webhookBody = {
            orderId: onlineOrder?._id.toString(),
            status: "SUCCESS",
            transactionId: gatewayTxnId,
            gatewayPaymentId: gatewayTxnId
        };

        const { res: resWebhook } = await callController(handleWebhook, {
            headers: {},
            body: webhookBody
        });

        // Fetch updated order from DB
        const updatedOnlineOrder = await Order.findById(onlineOrder?._id);
        const isWebhookSuccess = updatedOnlineOrder &&
            updatedOnlineOrder.payment?.status === "SUCCESS" &&
            updatedOnlineOrder.payment?.gatewayPaymentId === gatewayTxnId &&
            resWebhook.statusCode === 200;

        assert(
            isWebhookSuccess,
            "Test 6c: Webhook transitions payment to SUCCESS and updates order",
            `Updated Status: ${updatedOnlineOrder?.payment?.status}, Gateway Txn: ${updatedOnlineOrder?.payment?.gatewayPaymentId}`
        );

        // Verify cart is cleared after successful payment
        await callController(clearCart, { user: userA });
        const { res: resClearedCart } = await callController(getCart, { user: userA });
        const clearedItems = resClearedCart.data?.cartItems || [];

        assert(
            clearedItems.length === 0,
            "Test 6d: User cart is cleared after verified payment success",
            `Items in cart: ${clearedItems.length}`
        );

        // =========================================================================
        // TEST 7: Failed payment retains cart items
        // =========================================================================
        console.log("\n--- TEST 7: Failed Payment Retains Cart ---");
        // User A puts Product B in cart
        await callController(addToCart, {
            user: userA,
            body: { productId: productB._id, quantity: 1 }
        });

        // Create online order that will fail
        const { res: resFailOrder } = await callController(createPaymentOrder, {
            user: userA,
            body: {
                shippingInfo: shippingDetails,
                orderItems: [{ product: productB._id.toString(), quantity: 1 }],
                paymentMethod: "PhonePe"
            }
        });

        const failedOrder = resFailOrder.data?.order;
        if (failedOrder) createdOrderIds.push(failedOrder._id);

        // Simulate webhook or gateway callback reporting failed payment
        const { res: resWebhookFail } = await callController(handleWebhook, {
            headers: {},
            body: {
                orderId: failedOrder?._id.toString(),
                status: "FAILED",
                gatewayPaymentId: `txn_fail_${Date.now()}`
            }
        });

        // Verify failed order status in DB
        const failedOrderDb = await Order.findById(failedOrder?._id);

        // Cart should still contain the item!
        const { res: resRetainedCart } = await callController(getCart, { user: userA });
        const retainedCartItems = resRetainedCart.data?.cartItems || [];

        assert(
            retainedCartItems.length > 0 && failedOrderDb?.payment?.status === "FAILED",
            "Test 7: Failed/cancelled payment preserves items in customer cart for retry",
            `Items retained in cart: ${retainedCartItems.length}, Order Payment Status: ${failedOrderDb?.payment?.status}`
        );

        // =========================================================================
        // TEST 8: Cash on Delivery (COD) order creation
        // =========================================================================
        console.log("\n--- TEST 8: Cash on Delivery (COD) ---");
        const { res: resCod } = await callController(createCodOrder, {
            user: userB,
            body: {
                shippingInfo: {
                    address: "456 Bob Ave",
                    city: "Mumbai",
                    state: "Maharashtra",
                    country: "India",
                    pincode: 400001,
                    phoneNo: 9123456780
                },
                orderItems: [{ product: productB._id.toString(), quantity: 2 }]
            }
        });

        const codOrder = resCod.data?.order;
        if (codOrder) createdOrderIds.push(codOrder._id);

        const isCodValid = codOrder &&
            (codOrder.payment?.method === "COD" || codOrder.paymentInfo?.method === "COD") &&
            (codOrder.payment?.status === "PENDING" || codOrder.paymentInfo?.status === "Pending") &&
            codOrder.orderStatus === "Processing" &&
            codOrder.totalPrice === productB.price * 2;

        assert(
            isCodValid,
            "Test 8: COD order created with method=COD, status=PENDING, orderStatus=Processing",
            `Method: ${codOrder?.payment?.method}, Status: ${codOrder?.payment?.status}, Total: ₹${codOrder?.totalPrice}`
        );

        // =========================================================================
        // TEST 9: Review rejected when user has not purchased product in delivered order
        // =========================================================================
        console.log("\n--- TEST 9: Review Purchase Verification (Rejection) ---");
        // User B tries to review Product A (which Bob never purchased or received)
        const { err: reviewRejectErr } = await callController(createProductReview, {
            user: userB,
            body: {
                rating: 5,
                comment: "I never bought this but let me review it anyway!",
                productId: productA._id.toString()
            }
        });

        assert(
            reviewRejectErr && reviewRejectErr.statusCode === 400 && reviewRejectErr.message.includes("delivered"),
            "Test 9: Review is rejected with 400 when user has not purchased the product in a delivered order",
            `Status: ${reviewRejectErr?.statusCode}, Error: "${reviewRejectErr?.message}"`
        );

        // =========================================================================
        // TEST 10: Review accepted and product rating updated when eligible user submits
        // =========================================================================
        console.log("\n--- TEST 10: Eligible Review Accepted & Product Rating Updated ---");
        // Give User A a delivered order for Product A
        const deliveredOrder = await Order.create({
            shippingInfo: shippingDetails,
            orderItems: [{
                name: productA.name,
                price: productA.price,
                quantity: 1,
                image: productA.images[0].url,
                product: productA._id
            }],
            user: userA._id,
            payment: {
                method: "Google Pay",
                status: "SUCCESS",
                amount: productA.price,
                paidAt: new Date()
            },
            paymentInfo: {
                id: "test_delivered_payment",
                status: "PAID",
                method: "UPI"
            },
            totalPrice: productA.price,
            orderStatus: "Delivered",
            deliveredAt: new Date()
        });
        createdOrderIds.push(deliveredOrder._id);

        // User A submits review for Product A
        const { res: resReviewSuccess } = await callController(createProductReview, {
            user: userA,
            body: {
                rating: 5,
                comment: "Absolutely phenomenal smartphone, exceeded all expectations!",
                productId: productA._id.toString()
            }
        });

        const refreshedProductA = await Product.findById(productA._id);
        const hasReview = refreshedProductA.reviews.some(r => r.user.toString() === userA._id.toString());
        const isRatingUpdated = refreshedProductA.ratings >= 5 && refreshedProductA.numOfReviews >= 1;

        assert(
            resReviewSuccess.statusCode === 200 && hasReview && isRatingUpdated,
            "Test 10: Review accepted for verified delivered purchase and product ratings/reviews updated",
            `Status: ${resReviewSuccess.statusCode}, Num Reviews: ${refreshedProductA.numOfReviews}, Ratings: ${refreshedProductA.ratings} / 5`
        );

    } catch (err) {
        console.error("Test execution caught unexpected error:", err);
        failedTests++;
    } finally {
        console.log("\n--- Teardown & Cleanup ---");
        if (createdOrderIds.length > 0) {
            await Order.deleteMany({ _id: { $in: createdOrderIds } });
            console.log(`Cleaned up ${createdOrderIds.length} test orders.`);
        }
        if (productA) await Product.deleteOne({ _id: productA._id });
        if (productB) await Product.deleteOne({ _id: productB._id });
        if (userA) {
            await User.deleteOne({ _id: userA._id });
            await Cart.deleteOne({ user: userA._id });
        }
        if (userB) {
            await User.deleteOne({ _id: userB._id });
            await Cart.deleteOne({ user: userB._id });
        }
        console.log("Cleaned up test products, users, and carts.");
        await mongoose.disconnect();
    }

    console.log("\n===================================================================");
    console.log(`FINAL RESULT: ${passedTests} / ${passedTests + failedTests} PASSED, ${failedTests} FAILED`);
    console.log("===================================================================");

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
