import axios from "axios";
import {
    ADD_TO_CART,
    EMPTY_CART,
    REMOVE_FROM_CART,
    SAVE_SHIPPING_INFO,
    LOAD_CART_REQUEST,
    LOAD_CART_SUCCESS,
    LOAD_CART_FAIL,
    RESET_CART,
} from "../constants/cartConstants";

// Load Authenticated User's Cart from Database
export const loadCart = () => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;
    if (!isAuthenticated) return;

    try {
        dispatch({ type: LOAD_CART_REQUEST });

        const { data } = await axios.get('/api/v1/cart');

        dispatch({
            type: LOAD_CART_SUCCESS,
            payload: data.cartItems || [],
        });
        // Remove guest localStorage once loaded as authenticated user
        localStorage.removeItem('cartItems');
    } catch (error) {
        dispatch({
            type: LOAD_CART_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Merge Guest Cart into User Cart upon login
export const mergeGuestCart = () => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;
    if (!isAuthenticated) return;

    try {
        const guestItemsRaw = localStorage.getItem('cartItems');
        const guestItems = guestItemsRaw ? JSON.parse(guestItemsRaw) : [];

        if (Array.isArray(guestItems) && guestItems.length > 0) {
            const { data } = await axios.post('/api/v1/cart/merge', {
                guestItems: guestItems.map((item) => ({
                    product: item.product,
                    quantity: item.quantity
                }))
            });

            if (data.success) {
                dispatch({
                    type: LOAD_CART_SUCCESS,
                    payload: data.cartItems || [],
                });
                localStorage.removeItem('cartItems');
            }
        } else {
            dispatch(loadCart());
        }
    } catch (error) {
        dispatch(loadCart());
    }
};

// Add to Cart
export const addItemsToCart = (id, quantity = 1) => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;

    if (isAuthenticated) {
        try {
            const config = {
                headers: { "Content-Type": "application/json" }
            };

            const { data } = await axios.post(
                '/api/v1/cart/add',
                { productId: id, quantity },
                config
            );

            dispatch({
                type: ADD_TO_CART,
                payload: data.cartItems,
            });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            return { success: false, message };
        }
    } else {
        // Guest user local cart
        try {
            const { data } = await axios.get(`/api/v1/product/${id}`);
            const product = data.product;

            const sellerName = (product.brand && typeof product.brand === 'object' && product.brand.name)
                ? product.brand.name
                : (typeof product.brand === 'string' ? product.brand : "RetailNet");

            const primaryImage = product.images && product.images.length > 0
                ? product.images[0].url
                : "";

            dispatch({
                type: ADD_TO_CART,
                payload: {
                    product: product._id,
                    name: product.name,
                    seller: sellerName,
                    price: product.price,
                    cuttedPrice: product.cuttedPrice,
                    image: primaryImage,
                    stock: product.stock,
                    quantity,
                },
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    }
};

// Update Cart Quantity (Plus / Minus)
export const updateCartQuantity = (productId, quantity) => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;

    if (quantity <= 0) {
        return dispatch(removeItemsFromCart(productId));
    }

    if (isAuthenticated) {
        try {
            const config = {
                headers: { "Content-Type": "application/json" }
            };

            const { data } = await axios.put(
                '/api/v1/cart/update',
                { productId, quantity },
                config
            );

            dispatch({
                type: ADD_TO_CART,
                payload: data.cartItems,
            });
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            return { success: false, message };
        }
    } else {
        // Guest user local update
        return dispatch(addItemsToCart(productId, quantity));
    }
};

// Remove Cart Item
export const removeItemsFromCart = (id) => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;

    if (isAuthenticated) {
        try {
            const { data } = await axios.delete(`/api/v1/cart/remove/${id}`);
            dispatch({
                type: REMOVE_FROM_CART,
                payload: data.cartItems,
            });
            return { success: true };
        } catch (error) {
            dispatch({
                type: REMOVE_FROM_CART,
                payload: id,
            });
            return { success: true };
        }
    } else {
        dispatch({
            type: REMOVE_FROM_CART,
            payload: id,
        });
        return { success: true };
    }
};

// Empty Cart
export const emptyCart = () => async (dispatch, getState) => {
    const { isAuthenticated } = getState().user;

    if (isAuthenticated) {
        try {
            await axios.delete('/api/v1/cart/clear');
        } catch (error) {
            // Ignore failure
        }
    }

    dispatch({ type: EMPTY_CART });
};

// Reset Entire Cart State (upon logout)
export const resetCartState = () => (dispatch) => {
    dispatch({ type: RESET_CART });
};

// Save Shipping Info (User delivery address)
export const saveShippingInfo = (data) => async (dispatch) => {
    dispatch({
        type: SAVE_SHIPPING_INFO,
        payload: data,
    });
};