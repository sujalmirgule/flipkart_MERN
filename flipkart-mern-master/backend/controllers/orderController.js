const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Cart = require('../models/cartModel');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');

// Create New Order (Authoritative Amount & Stock Validation)
exports.newOrder = asyncErrorHandler(async (req, res, next) => {

    const {
        shippingInfo,
        orderItems,
        paymentInfo,
    } = req.body;

    if (!shippingInfo || !orderItems || orderItems.length === 0) {
        return next(new ErrorHandler("Invalid order details or empty cart items", 400));
    }

    const query = paymentInfo?.id ? { "paymentInfo.id": paymentInfo.id } : null;
    if (query) {
        const orderExist = await Order.findOne(query);
        if (orderExist) {
            return next(new ErrorHandler("Order Already Placed", 400));
        }
    }

    // Authoritative Amount & Stock Calculation: Fetch actual product prices from database
    let calculatedTotalPrice = 0;
    const verifiedOrderItems = [];

    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
            return next(new ErrorHandler(`Product with ID ${item.product} not found`, 404));
        }

        if (item.quantity > product.stock) {
            return next(new ErrorHandler(`Only ${product.stock} items are currently available for ${product.name}`, 400));
        }

        calculatedTotalPrice += product.price * item.quantity;
        verifiedOrderItems.push({
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: item.image || (product.images && product.images[0] ? product.images[0].url : ""),
            product: product._id,
        });
    }

    const orderData = {
        shippingInfo,
        orderItems: verifiedOrderItems,
        paymentInfo: {
            id: paymentInfo?.id || ("ORD_" + Date.now()),
            status: paymentInfo?.status || "Pending",
            method: paymentInfo?.method || "UPI"
        },
        totalPrice: calculatedTotalPrice,
        user: req.user._id,
        orderStatus: "Processing",
    };

    if (orderData.paymentInfo.status !== "Pending" && orderData.paymentInfo.status !== "pending") {
        orderData.paidAt = Date.now();
    }

    const order = await Order.create(orderData);

    try {
        await sendEmail({
            email: req.user.email,
            templateId: process.env.SENDGRID_ORDER_TEMPLATEID,
            data: {
                name: req.user.name,
                shippingInfo,
                orderItems: verifiedOrderItems,
                totalPrice: calculatedTotalPrice,
                oid: order._id,
            }
        });
    } catch (emailErr) {
        console.warn("[Email Notification Warning]: Could not send order email:", emailErr.message);
    }

    try {
        await Cart.findOneAndUpdate({ user: req.user._id }, { cartItems: [] });
    } catch (cartErr) {
        console.warn("[Cart Clear Warning]: Could not clear user cart:", cartErr.message);
    }

    res.status(201).json({
        success: true,
        order,
    });
});

// Get Single Order Details (Multi-User Isolation Enforced)
exports.getSingleOrderDetails = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id).populate("user", "name email");

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    // Security check: Only the order owner or an admin can view details
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("Access denied: You are not authorized to access this order", 403));
    }

    res.status(200).json({
        success: true,
        order,
    });
});


// Get Logged In User Orders
exports.myOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find({ user: req.user._id });

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    res.status(200).json({
        success: true,
        orders,
    });
});


// Get All Orders ---ADMIN
exports.getAllOrders = asyncErrorHandler(async (req, res, next) => {

    const orders = await Order.find();

    if (!orders) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    let totalAmount = 0;
    orders.forEach((order) => {
        totalAmount += order.totalPrice;
    });

    res.status(200).json({
        success: true,
        orders,
        totalAmount,
    });
});

// Update Order Status & Payment Status ---ADMIN
exports.updateOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    if (req.body.status) {
        if (order.orderStatus === "Delivered" && req.body.status === "Delivered") {
            return next(new ErrorHandler("Already Delivered", 400));
        }

        if (req.body.status === "Shipped" && order.orderStatus !== "Shipped") {
            order.shippedAt = Date.now();
            for (const i of order.orderItems) {
                await updateStock(i.product, i.quantity);
            }
        }

        order.orderStatus = req.body.status;
        if (req.body.status === "Delivered") {
            order.deliveredAt = Date.now();
        }
    }

    // Update Payment Status if provided by Admin
    if (req.body.paymentStatus) {
        order.paymentInfo.status = req.body.paymentStatus;
        if (req.body.paymentStatus.toLowerCase() === "paid") {
            order.paidAt = Date.now();
        }
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        order,
        message: "Order updated successfully"
    });
});

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
    if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        await product.save({ validateBeforeSave: false });
    }
}


// Delete Order ---ADMIN
exports.deleteOrder = asyncErrorHandler(async (req, res, next) => {

    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new ErrorHandler("Order Not Found", 404));
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
    });
});