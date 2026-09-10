const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');

// Get Logged In User's Cart
exports.getCart = asyncErrorHandler(async (req, res, next) => {
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
        cart = await Cart.create({
            user: req.user._id,
            cartItems: []
        });
    }

    res.status(200).json({
        success: true,
        cartItems: cart.cartItems,
    });
});

// Add Item To Cart (or update quantity if already exists)
exports.addToCart = asyncErrorHandler(async (req, res, next) => {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    if (product.stock < 1) {
        return next(new ErrorHandler("Product is currently out of stock", 400));
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        cart = await Cart.create({
            user: req.user._id,
            cartItems: []
        });
    }

    const itemIndex = cart.cartItems.findIndex(
        (item) => item.product.toString() === productId.toString()
    );

    const targetQuantity = Number(quantity);

    if (itemIndex > -1) {
        // Already in cart - update to target quantity or validate stock
        if (targetQuantity > product.stock) {
            return next(new ErrorHandler(`Only ${product.stock} items available in stock`, 400));
        }

        cart.cartItems[itemIndex].quantity = targetQuantity;
        cart.cartItems[itemIndex].price = product.price;
        cart.cartItems[itemIndex].cuttedPrice = product.cuttedPrice;
        cart.cartItems[itemIndex].stock = product.stock;
    } else {
        // New item - validate stock
        if (targetQuantity > product.stock) {
            return next(new ErrorHandler(`Only ${product.stock} items available in stock`, 400));
        }

        const sellerName = (product.brand && typeof product.brand === 'object' && product.brand.name) 
            ? product.brand.name 
            : (typeof product.brand === 'string' ? product.brand : "RetailNet");

        const primaryImage = product.images && product.images.length > 0 
            ? product.images[0].url 
            : "";

        cart.cartItems.push({
            product: product._id,
            name: product.name,
            seller: sellerName,
            price: product.price,
            cuttedPrice: product.cuttedPrice,
            image: primaryImage,
            stock: product.stock,
            quantity: targetQuantity,
        });
    }

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Item added to cart successfully",
        cartItems: cart.cartItems,
    });
});

// Update Item Quantity in Cart
exports.updateCartItemQuantity = asyncErrorHandler(async (req, res, next) => {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
        return next(new ErrorHandler("Product ID and quantity are required", 400));
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        return next(new ErrorHandler("Cart not found", 404));
    }

    const itemIndex = cart.cartItems.findIndex(
        (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
        return next(new ErrorHandler("Item not found in your cart", 404));
    }

    const numQty = Number(quantity);

    // If quantity is 0 or less, remove item
    if (numQty <= 0) {
        cart.cartItems.splice(itemIndex, 1);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed from cart",
            cartItems: cart.cartItems,
        });
    }

    // Verify current stock in database
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    if (numQty > product.stock) {
        return next(new ErrorHandler(`Only ${product.stock} items available in stock`, 400));
    }

    cart.cartItems[itemIndex].quantity = numQty;
    cart.cartItems[itemIndex].stock = product.stock;
    cart.cartItems[itemIndex].price = product.price;

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        cartItems: cart.cartItems,
    });
});

// Remove Specific Item From Cart
exports.removeCartItem = asyncErrorHandler(async (req, res, next) => {
    const { productId } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        return next(new ErrorHandler("Cart not found", 404));
    }

    cart.cartItems = cart.cartItems.filter(
        (item) => item.product.toString() !== productId.toString()
    );

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Item removed from cart",
        cartItems: cart.cartItems,
    });
});

// Clear Entire User Cart (e.g. after successful order)
exports.clearCart = asyncErrorHandler(async (req, res, next) => {
    let cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
        cart.cartItems = [];
        await cart.save();
    }

    res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        cartItems: [],
    });
});

// Merge Guest Cart with Authenticated User Cart
exports.mergeCart = asyncErrorHandler(async (req, res, next) => {
    const { guestItems = [] } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        cart = await Cart.create({
            user: req.user._id,
            cartItems: []
        });
    }

    if (Array.isArray(guestItems) && guestItems.length > 0) {
        for (const gItem of guestItems) {
            const product = await Product.findById(gItem.product);
            if (!product || product.stock < 1) continue;

            const existingIdx = cart.cartItems.findIndex(
                (item) => item.product.toString() === gItem.product.toString()
            );

            const requestedQty = Math.min(Number(gItem.quantity) || 1, product.stock);

            if (existingIdx > -1) {
                // Merge quantity up to available stock
                const combinedQty = Math.min(cart.cartItems[existingIdx].quantity + requestedQty, product.stock);
                cart.cartItems[existingIdx].quantity = combinedQty;
                cart.cartItems[existingIdx].stock = product.stock;
                cart.cartItems[existingIdx].price = product.price;
            } else {
                const sellerName = (product.brand && typeof product.brand === 'object' && product.brand.name)
                    ? product.brand.name
                    : (typeof product.brand === 'string' ? product.brand : "RetailNet");

                const primaryImage = product.images && product.images.length > 0
                    ? product.images[0].url
                    : "";

                cart.cartItems.push({
                    product: product._id,
                    name: product.name,
                    seller: sellerName,
                    price: product.price,
                    cuttedPrice: product.cuttedPrice,
                    image: primaryImage,
                    stock: product.stock,
                    quantity: requestedQty,
                });
            }
        }
        await cart.save();
    }

    res.status(200).json({
        success: true,
        message: "Cart merged successfully",
        cartItems: cart.cartItems,
    });
});
