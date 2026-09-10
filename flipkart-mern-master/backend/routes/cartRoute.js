const express = require('express');
const {
    getCart,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    mergeCart,
} = require('../controllers/cartController');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

router.route('/cart').get(isAuthenticatedUser, getCart);
router.route('/cart/add').post(isAuthenticatedUser, addToCart);
router.route('/cart/merge').post(isAuthenticatedUser, mergeCart);
router.route('/cart/update').put(isAuthenticatedUser, updateCartItemQuantity);
router.route('/cart/remove/:productId').delete(isAuthenticatedUser, removeCartItem);
router.route('/cart/clear').delete(isAuthenticatedUser, clearCart);

module.exports = router;
