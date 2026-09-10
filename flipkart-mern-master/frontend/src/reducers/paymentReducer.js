import {
    PAYMENT_CONFIG_REQUEST,
    PAYMENT_CONFIG_SUCCESS,
    PAYMENT_CONFIG_FAIL,
    ADMIN_PAYMENT_SETTINGS_REQUEST,
    ADMIN_PAYMENT_SETTINGS_SUCCESS,
    ADMIN_PAYMENT_SETTINGS_FAIL,
    UPDATE_PAYMENT_SETTINGS_REQUEST,
    UPDATE_PAYMENT_SETTINGS_SUCCESS,
    UPDATE_PAYMENT_SETTINGS_RESET,
    UPDATE_PAYMENT_SETTINGS_FAIL,
    CLEAR_ERRORS,
} from "../constants/paymentConstants";

export const paymentConfigReducer = (state = { config: {} }, { type, payload }) => {
    switch (type) {
        case PAYMENT_CONFIG_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case PAYMENT_CONFIG_SUCCESS:
            return {
                loading: false,
                config: payload,
            };
        case PAYMENT_CONFIG_FAIL:
            return {
                loading: false,
                error: payload,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const adminPaymentSettingsReducer = (state = { settings: {} }, { type, payload }) => {
    switch (type) {
        case ADMIN_PAYMENT_SETTINGS_REQUEST:
        case UPDATE_PAYMENT_SETTINGS_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case ADMIN_PAYMENT_SETTINGS_SUCCESS:
            return {
                loading: false,
                settings: payload,
            };
        case UPDATE_PAYMENT_SETTINGS_SUCCESS:
            return {
                ...state,
                loading: false,
                isUpdated: true,
                settings: payload.settings,
                message: payload.message,
            };
        case ADMIN_PAYMENT_SETTINGS_FAIL:
        case UPDATE_PAYMENT_SETTINGS_FAIL:
            return {
                ...state,
                loading: false,
                error: payload,
            };
        case UPDATE_PAYMENT_SETTINGS_RESET:
            return {
                ...state,
                isUpdated: false,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};
