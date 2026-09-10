import axios from "axios";
import {
    PAYMENT_CONFIG_REQUEST,
    PAYMENT_CONFIG_SUCCESS,
    PAYMENT_CONFIG_FAIL,
    ADMIN_PAYMENT_SETTINGS_REQUEST,
    ADMIN_PAYMENT_SETTINGS_SUCCESS,
    ADMIN_PAYMENT_SETTINGS_FAIL,
    UPDATE_PAYMENT_SETTINGS_REQUEST,
    UPDATE_PAYMENT_SETTINGS_SUCCESS,
    UPDATE_PAYMENT_SETTINGS_FAIL,
    CLEAR_ERRORS,
} from "../constants/paymentConstants";

// Get Safe Public Payment Configuration (for Checkout)
export const getPaymentConfig = () => async (dispatch) => {
    try {
        dispatch({ type: PAYMENT_CONFIG_REQUEST });

        const { data } = await axios.get('/api/v1/payment/config');

        dispatch({
            type: PAYMENT_CONFIG_SUCCESS,
            payload: data.config,
        });
    } catch (error) {
        dispatch({
            type: PAYMENT_CONFIG_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Get Admin Payment Settings --- ADMIN
export const getAdminPaymentSettings = () => async (dispatch) => {
    try {
        dispatch({ type: ADMIN_PAYMENT_SETTINGS_REQUEST });

        const { data } = await axios.get('/api/v1/admin/payment/settings');

        dispatch({
            type: ADMIN_PAYMENT_SETTINGS_SUCCESS,
            payload: data.settings,
        });
    } catch (error) {
        dispatch({
            type: ADMIN_PAYMENT_SETTINGS_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Update Payment Settings --- ADMIN
export const updatePaymentSettings = (settingsData) => async (dispatch) => {
    try {
        dispatch({ type: UPDATE_PAYMENT_SETTINGS_REQUEST });

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        const { data } = await axios.put('/api/v1/admin/payment/settings', settingsData, config);

        dispatch({
            type: UPDATE_PAYMENT_SETTINGS_SUCCESS,
            payload: data,
        });
    } catch (error) {
        dispatch({
            type: UPDATE_PAYMENT_SETTINGS_FAIL,
            payload: error.response?.data?.message || error.message,
        });
    }
};

// Clear All Payment Errors
export const clearErrors = () => (dispatch) => {
    dispatch({ type: CLEAR_ERRORS });
};
