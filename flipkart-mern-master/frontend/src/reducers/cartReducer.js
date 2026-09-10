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

export const cartReducer = (state = { cartItems: [], shippingInfo: {}, loading: false }, { type, payload }) => {
    switch (type) {
        case LOAD_CART_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case LOAD_CART_SUCCESS:
            return {
                ...state,
                loading: false,
                cartItems: payload || [],
            };
        case LOAD_CART_FAIL:
            return {
                ...state,
                loading: false,
                error: payload,
            };
        case ADD_TO_CART:
            // If payload is the full array of items returned by backend
            if (Array.isArray(payload)) {
                return {
                    ...state,
                    cartItems: payload,
                };
            }
            const item = payload;
            const isItemExist = state.cartItems.find((el) => el.product === item.product);

            if (isItemExist) {
                return {
                    ...state,
                    cartItems: state.cartItems.map((el) =>
                        el.product === isItemExist.product ? item : el
                    ),
                };
            } else {
                return {
                    ...state,
                    cartItems: [...state.cartItems, item],
                };
            }
        case REMOVE_FROM_CART:
            if (Array.isArray(payload)) {
                return {
                    ...state,
                    cartItems: payload,
                };
            }
            return {
                ...state,
                cartItems: state.cartItems.filter((el) => el.product !== payload)
            };
        case EMPTY_CART:
            return {
                ...state,
                cartItems: [],
            };
        case RESET_CART:
            return {
                cartItems: [],
                shippingInfo: {},
                loading: false,
            };
        case SAVE_SHIPPING_INFO:
            return {
                ...state,
                shippingInfo: payload
            };
        default:
            return state;
    }
};