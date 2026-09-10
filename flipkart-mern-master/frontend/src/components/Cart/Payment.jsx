import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PriceSidebar from './PriceSidebar';
import Stepper from './Stepper';
import MetaData from '../Layouts/MetaData';
import SecurityIcon from '@mui/icons-material/Security';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CircularProgress from '@mui/material/CircularProgress';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeSVG } from 'qrcode.react';
import { clearErrors } from '../../actions/orderAction';
import { emptyCart } from '../../actions/cartAction';
import { getPaymentConfig } from '../../actions/paymentAction';
import { post } from '../../utils/paytmForm';

const Payment = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [selectedMethod, setSelectedMethod] = useState('qr');
    const [submitting, setSubmitting] = useState(false);
    const [processingModal, setProcessingModal] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [activeOrderAmount, setActiveOrderAmount] = useState(0);
    const [activeUpiUri, setActiveUpiUri] = useState('');
    const [activeProvider, setActiveProvider] = useState('');
    const [countdown, setCountdown] = useState(900); // 15 mins countdown
    const [processingStatus, setProcessingStatus] = useState('PROCESSING'); // PROCESSING | SUCCESS | FAILED
    const [isMobile, setIsMobile] = useState(false);
    const pollingIntervalRef = useRef(null);

    const { shippingInfo, cartItems } = useSelector((state) => state.cart);
    const { user, isAuthenticated } = useSelector((state) => state.user);
    const { error } = useSelector((state) => state.newOrder);
    const { config: paymentConfig, loading: configLoading } = useSelector((state) => state.paymentConfig);

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
            setIsMobile(mobileRegex.test(userAgent) || window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Verify authentication and cart presence
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login?redirect=shipping');
            return;
        }
        if (!cartItems || cartItems.length === 0) {
            navigate('/cart');
        }
    }, [isAuthenticated, cartItems, navigate]);

    // Fetch payment settings on mount
    useEffect(() => {
        dispatch(getPaymentConfig());
    }, [dispatch]);

    // Handle redux errors
    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
            dispatch(clearErrors());
            setSubmitting(false);
        }
    }, [dispatch, error, enqueueSnackbar]);

    // Countdown timer for QR code validity
    useEffect(() => {
        let timer;
        if (processingModal && processingStatus === 'PROCESSING') {
            timer = setInterval(() => {
                setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [processingModal, processingStatus]);

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopyUpiId = (id) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(id);
            enqueueSnackbar("Merchant UPI ID copied to clipboard!", { variant: 'info' });
        }
    };

    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const payConfig = paymentConfig || {
        upiId: "flipkartbusiness@icici",
        merchantName: "Flipkart Commerce India",
        upiEnabled: true,
        qrPaymentEnabled: true,
        googlePayEnabled: true,
        phonePeEnabled: true,
        paytmEnabled: true,
        otherUpiEnabled: true,
        cashOnDeliveryEnabled: true,
        paymentMode: "development"
    };

    // Start payment polling
    const startPolling = (orderId, targetAmount, upiUri = '', providerName = '') => {
        setActiveOrderId(orderId);
        setActiveOrderAmount(targetAmount);
        setActiveUpiUri(upiUri);
        setActiveProvider(providerName);
        setCountdown(900); // 15 minutes
        setProcessingModal(true);
        setProcessingStatus('PROCESSING');

        let attempts = 0;
        const maxAttempts = 100; // 100 * 3s = 5 minutes

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            try {
                const { data } = await axios.get(`/api/v1/payment/status/${orderId}`);
                if (data.success && data.paymentStatus === 'SUCCESS') {
                    clearInterval(pollingIntervalRef.current);
                    setProcessingStatus('SUCCESS');
                    dispatch(emptyCart());
                    setTimeout(() => {
                        navigate(`/order_details/${orderId}`);
                    }, 1200);
                } else if (data.success && data.paymentStatus === 'FAILED') {
                    clearInterval(pollingIntervalRef.current);
                    setProcessingStatus('FAILED');
                }
            } catch (err) {
                // Ignore transient network errors during polling
            }

            if (attempts >= maxAttempts) {
                clearInterval(pollingIntervalRef.current);
                setProcessingStatus('FAILED');
            }
        }, 3000);
    };

    // Simulate Dev Mode Instant Verification (for desktop development demonstration)
    const handleSimulateDevSuccess = async () => {
        if (!activeOrderId) return;
        try {
            const { data } = await axios.post('/api/v1/payment/verify', {
                orderId: activeOrderId,
                transactionId: `SIMULATED_${Date.now()}`
            });
            if (data.success) {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setProcessingStatus('SUCCESS');
                dispatch(emptyCart());
                setTimeout(() => {
                    navigate(`/order_details/${activeOrderId}`);
                }, 800);
            }
        } catch (err) {
            enqueueSnackbar(err.response?.data?.message || "Simulation failed", { variant: 'error' });
        }
    };

    // Main payment trigger
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);

        try {
            // Determine method and provider
            let paymentMethod = 'UPI';
            let provider = 'UPI';

            if (selectedMethod === 'qr') {
                paymentMethod = 'UPI';
                provider = 'UPI QR Code';
            } else if (selectedMethod === 'gpay') {
                paymentMethod = 'UPI';
                provider = 'Google Pay';
            } else if (selectedMethod === 'phonepe') {
                paymentMethod = 'UPI';
                provider = 'PhonePe';
            } else if (selectedMethod === 'paytm') {
                paymentMethod = 'UPI';
                provider = 'Paytm';
            } else if (selectedMethod === 'other_upi') {
                paymentMethod = 'UPI';
                provider = 'Other UPI Apps';
            } else if (selectedMethod === 'cod') {
                paymentMethod = 'COD';
                provider = 'Cash on Delivery';
            } else if (selectedMethod === 'paytm_gateway') {
                // Existing Paytm Gateway Form Flow
                const { data } = await axios.post('/api/v1/payment/process', {
                    amount: totalPrice,
                    email: user.email,
                    phoneNo: shippingInfo.phoneNo,
                }, { headers: { "Content-Type": "application/json" } });

                const information = {
                    action: "https://securegw-stage.paytm.in/order/process",
                    params: data.paytmParams
                };
                post(information);
                setSubmitting(false);
                return;
            }

            // 1. Create order on backend (authoritative amount calculation and stock validation)
            const orderPayload = {
                shippingInfo: {
                    address: shippingInfo.address,
                    city: shippingInfo.city,
                    state: shippingInfo.state,
                    country: "India",
                    pincode: Number(shippingInfo.pincode),
                    phoneNo: Number(shippingInfo.phoneNo),
                },
                orderItems: cartItems.map((item) => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price,
                    image: item.image,
                })),
                paymentMethod,
                provider
            };

            const { data: orderRes } = await axios.post('/api/v1/payment/order', orderPayload, {
                headers: { "Content-Type": "application/json" }
            });

            if (!orderRes.success || !orderRes.order) {
                throw new Error(orderRes.message || "Failed to create order");
            }

            const createdOrder = orderRes.order;

            // Handle COD Order directly
            if (paymentMethod === 'COD') {
                dispatch(emptyCart());
                enqueueSnackbar("Order placed successfully with Cash on Delivery!", { variant: 'success' });
                navigate(`/order_details/${createdOrder._id}`);
                return;
            }

            // 2. Online UPI Payment Initiation
            const { data: initRes } = await axios.post('/api/v1/payment/initiate', {
                orderId: createdOrder._id,
                provider
            }, { headers: { "Content-Type": "application/json" } });

            if (!initRes.success) {
                throw new Error("Failed to initiate payment");
            }

            // 3. Attempt mobile deep-link handoff if on mobile (for non-QR methods)
            let deepLinkUrl = initRes.genericUpiUrl;
            if (provider === 'Google Pay') deepLinkUrl = initRes.googlePayUrl;
            else if (provider === 'PhonePe') deepLinkUrl = initRes.phonePeUrl;
            else if (provider === 'Paytm') deepLinkUrl = initRes.paytmUrl;

            if (isMobile && selectedMethod !== 'qr' && deepLinkUrl) {
                // Trigger UPI app intent on mobile
                window.location.href = deepLinkUrl;
            }

            // Start polling for payment verification & display modal/QR code
            startPolling(createdOrder._id, initRes.amount, initRes.genericUpiUrl, provider);

        } catch (err) {
            enqueueSnackbar(err.response?.data?.message || err.message || "Error processing payment", { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <MetaData title="Flipkart: Secure Payment" />

            <main className="w-full mt-20">
                {/* Stepper Header */}
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-11/12 mt-0 sm:mt-4 m-auto sm:mb-7">
                    <div className="flex-1">
                        <Stepper activeStep={3}>
                            <div className="w-full bg-white shadow-sm rounded-sm p-4 sm:p-6 mb-6">
                                <div className="border-b pb-4 mb-5 flex items-center justify-between">
                                    <h1 className="text-base sm:text-lg font-medium text-gray-800 uppercase tracking-wide">
                                        Select Payment Method
                                    </h1>
                                    <div className="flex items-center gap-1.5 text-xs text-primary-green font-medium">
                                        <SecurityIcon fontSize="small" />
                                        <span>100% Safe & Secure Payments</span>
                                    </div>
                                </div>

                                {configLoading ? (
                                    <div className="py-12 flex justify-center items-center">
                                        <CircularProgress size={36} />
                                    </div>
                                ) : (
                                    <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-3">
                                        {/* UPI QR Code Scanner Option */}
                                        {payConfig.qrPaymentEnabled !== false && (
                                            <div
                                                onClick={() => setSelectedMethod('qr')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'qr'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_qr"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'qr'}
                                                            onChange={() => setSelectedMethod('qr')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_qr" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 flex items-center gap-2">
                                                                <QrCodeScannerIcon fontSize="small" className="text-primary-blue" />
                                                                UPI QR Code (Scan & Pay)
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                Scan dynamic QR code using Google Pay, PhonePe, Paytm, BHIM, or any UPI App on your phone
                                                            </span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                                        SCANNER
                                                    </span>
                                                </div>

                                                {selectedMethod === 'qr' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100">
                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                            </span>
                                                            <button
                                                                type="submit"
                                                                disabled={submitting}
                                                                className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {submitting ? <CircularProgress size={18} color="inherit" /> : 'SHOW QR CODE TO PAY'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Google Pay Option */}
                                        {payConfig.googlePayEnabled && (
                                            <div
                                                onClick={() => setSelectedMethod('gpay')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'gpay'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_gpay"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'gpay'}
                                                            onChange={() => setSelectedMethod('gpay')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_gpay" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 block">Google Pay</span>
                                                            <span className="text-xs text-gray-500">Pay securely using Google Pay UPI</span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                        UPI
                                                    </span>
                                                </div>

                                                {selectedMethod === 'gpay' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100">
                                                        {!isMobile && (
                                                            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
                                                                <InfoOutlinedIcon fontSize="small" />
                                                                <span>UPI app payments are best completed from a mobile device.</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                            </span>
                                                            <button
                                                                type="submit"
                                                                disabled={submitting}
                                                                className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {submitting ? <CircularProgress size={18} color="inherit" /> : 'PAY WITH GOOGLE PAY'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* PhonePe Option */}
                                        {payConfig.phonePeEnabled && (
                                            <div
                                                onClick={() => setSelectedMethod('phonepe')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'phonepe'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_phonepe"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'phonepe'}
                                                            onChange={() => setSelectedMethod('phonepe')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_phonepe" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 block">PhonePe</span>
                                                            <span className="text-xs text-gray-500">Pay instantly using PhonePe UPI</span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                        UPI
                                                    </span>
                                                </div>

                                                {selectedMethod === 'phonepe' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100">
                                                        {!isMobile && (
                                                            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
                                                                <InfoOutlinedIcon fontSize="small" />
                                                                <span>UPI app payments are best completed from a mobile device.</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                            </span>
                                                            <button
                                                                type="submit"
                                                                disabled={submitting}
                                                                className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {submitting ? <CircularProgress size={18} color="inherit" /> : 'PAY WITH PHONEPE'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Paytm Option */}
                                        {payConfig.paytmEnabled && (
                                            <div
                                                onClick={() => setSelectedMethod('paytm')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'paytm'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_paytm"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'paytm'}
                                                            onChange={() => setSelectedMethod('paytm')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_paytm" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 block">Paytm</span>
                                                            <span className="text-xs text-gray-500">Pay using Paytm UPI or Wallet</span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                        UPI
                                                    </span>
                                                </div>

                                                {selectedMethod === 'paytm' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100">
                                                        {!isMobile && (
                                                            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
                                                                <InfoOutlinedIcon fontSize="small" />
                                                                <span>UPI app payments are best completed from a mobile device.</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                            </span>
                                                            <button
                                                                type="submit"
                                                                disabled={submitting}
                                                                className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {submitting ? <CircularProgress size={18} color="inherit" /> : 'PAY WITH PAYTM'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Other UPI Apps Option */}
                                        {(payConfig.otherUpiEnabled !== false && payConfig.upiEnabled) && (
                                            <div
                                                onClick={() => setSelectedMethod('other_upi')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'other_upi'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_other_upi"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'other_upi'}
                                                            onChange={() => setSelectedMethod('other_upi')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_other_upi" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 block">Other UPI Apps</span>
                                                            <span className="text-xs text-gray-500">Pay using BHIM or Any Installed UPI App</span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                        UPI
                                                    </span>
                                                </div>

                                                {selectedMethod === 'other_upi' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100">
                                                        {!isMobile && (
                                                            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
                                                                <InfoOutlinedIcon fontSize="small" />
                                                                <span>UPI app payments are best completed from a mobile device.</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                            <span className="text-sm font-medium text-gray-700">
                                                                Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                            </span>
                                                            <button
                                                                type="submit"
                                                                disabled={submitting}
                                                                className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {submitting ? <CircularProgress size={18} color="inherit" /> : 'PAY WITH UPI APP'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Cash on Delivery Option */}
                                        {payConfig.cashOnDeliveryEnabled && (
                                            <div
                                                onClick={() => setSelectedMethod('cod')}
                                                className={`border rounded p-4 cursor-pointer transition ${
                                                    selectedMethod === 'cod'
                                                        ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            id="method_cod"
                                                            name="payment_method"
                                                            checked={selectedMethod === 'cod'}
                                                            onChange={() => setSelectedMethod('cod')}
                                                            className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                        />
                                                        <label htmlFor="method_cod" className="cursor-pointer">
                                                            <span className="font-medium text-gray-900 block flex items-center gap-2">
                                                                <LocalShippingIcon fontSize="small" className="text-gray-600" />
                                                                Cash on Delivery
                                                            </span>
                                                            <span className="text-xs text-gray-500">Pay when your order is delivered to your doorstep</span>
                                                        </label>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded">
                                                        COD
                                                    </span>
                                                </div>

                                                {selectedMethod === 'cod' && (
                                                    <div className="mt-4 pt-3 border-t border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Payable at Delivery: <strong className="text-gray-900 text-base">₹{totalPrice.toLocaleString()}</strong>
                                                        </span>
                                                        <button
                                                            type="submit"
                                                            disabled={submitting}
                                                            className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {submitting ? <CircularProgress size={18} color="inherit" /> : 'PLACE ORDER'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Paytm Gateway (Preserved) */}
                                        <div
                                            onClick={() => setSelectedMethod('paytm_gateway')}
                                            className={`border rounded p-4 cursor-pointer transition ${
                                                selectedMethod === 'paytm_gateway'
                                                    ? 'border-primary-blue bg-blue-50/40 shadow-sm'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        id="method_paytm_gw"
                                                        name="payment_method"
                                                        checked={selectedMethod === 'paytm_gateway'}
                                                        onChange={() => setSelectedMethod('paytm_gateway')}
                                                        className="h-4 w-4 text-primary-blue focus:ring-primary-blue"
                                                    />
                                                    <label htmlFor="method_paytm_gw" className="cursor-pointer">
                                                        <span className="font-medium text-gray-900 block flex items-center gap-2">
                                                            <AccountBalanceWalletIcon fontSize="small" className="text-gray-600" />
                                                            Debit / Credit Card & Net Banking
                                                        </span>
                                                        <span className="text-xs text-gray-500">Pay via Secure Gateway with Cards or Net Banking</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {selectedMethod === 'paytm_gateway' && (
                                                <div className="mt-4 pt-3 border-t border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Total Amount: <strong className="text-primary-blue text-base">₹{totalPrice.toLocaleString()}</strong>
                                                    </span>
                                                    <button
                                                        type="submit"
                                                        disabled={submitting}
                                                        className="w-full sm:w-auto px-8 py-2.5 bg-primary-orange hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {submitting ? <CircularProgress size={18} color="inherit" /> : 'CONTINUE TO GATEWAY'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>
                        </Stepper>
                    </div>

                    <PriceSidebar cartItems={cartItems} />
                </div>
            </main>

            {/* Payment Processing & Status Polling Modal */}
            {processingModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded shadow-2xl max-w-md w-full p-6 text-center animate-fade-in relative">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b pb-3 mb-4 text-left">
                            <div className="flex items-center gap-2">
                                <QrCodeScannerIcon className="text-primary-blue" />
                                <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                                    {selectedMethod === 'qr' || !isMobile ? 'Scan QR Code to Pay' : 'Payment Processing'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                                    setProcessingModal(false);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                            >
                                <CloseIcon fontSize="small" />
                            </button>
                        </div>

                        {processingStatus === 'PROCESSING' && (
                            <div className="flex flex-col items-center gap-3 py-1">
                                {/* Dynamic QR Code Section */}
                                {activeUpiUri ? (
                                    <div className="flex flex-col items-center gap-2.5">
                                        <div className="bg-white p-2.5 border-2 border-dashed border-gray-300 rounded-lg inline-block shadow-sm">
                                            <QRCodeSVG
                                                value={activeUpiUri}
                                                size={210}
                                                level="M"
                                                includeMargin={true}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                            <AccessTimeIcon fontSize="inherit" />
                                            <span>QR Code expires in {formatTimer(countdown)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <CircularProgress size={48} thickness={4} className="text-primary-blue my-4" />
                                )}

                                {/* Amount & Summary */}
                                <div className="text-center mt-1">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Total Amount</span>
                                    <span className="text-2xl font-bold text-gray-900">
                                        ₹{activeOrderAmount ? activeOrderAmount.toLocaleString() : totalPrice.toLocaleString()}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-600 leading-relaxed px-2">
                                    Scan this QR code using <strong>Google Pay, PhonePe, Paytm, BHIM</strong> or any UPI App on your phone to complete payment.
                                </p>

                                {/* Merchant UPI ID with Copy Option */}
                                <div className="bg-gray-50 p-2.5 rounded border text-xs text-gray-600 w-full flex items-center justify-between mt-1">
                                    <div className="text-left overflow-hidden">
                                        <span className="block font-medium text-gray-800 text-xs truncate">
                                            {payConfig.merchantName || "Flipkart Commerce India"}
                                        </span>
                                        <span className="font-mono text-gray-500 text-xs truncate">
                                            {payConfig.upiId || "flipkartbusiness@icici"}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyUpiId(payConfig.upiId || "flipkartbusiness@icici")}
                                        className="text-primary-blue hover:text-blue-700 text-xs font-semibold flex items-center gap-1 ml-2 p-1 rounded hover:bg-blue-50 transition"
                                    >
                                        <ContentCopyIcon fontSize="inherit" />
                                        <span>COPY</span>
                                    </button>
                                </div>

                                {/* Active Polling Status Spinner */}
                                <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-gray-500">
                                    <CircularProgress size={14} thickness={4} className="text-primary-blue" />
                                    <span>Waiting for payment confirmation from your phone...</span>
                                </div>

                                <div className="text-gray-400 text-[11px] font-mono">
                                    Order ID: {activeOrderId} {activeProvider ? `• ${activeProvider}` : ''}
                                </div>

                                {/* Development Mode Instant Verification Button */}
                                {payConfig.paymentMode === 'development' && (
                                    <div className="w-full pt-2.5 mt-1 border-t text-left">
                                        <p className="text-[11px] text-gray-500 mb-1.5 font-medium">Development Mode Testing:</p>
                                        <button
                                            type="button"
                                            onClick={handleSimulateDevSuccess}
                                            className="w-full py-2 bg-gray-800 hover:bg-black text-white text-xs font-semibold rounded shadow transition"
                                        >
                                            Simulate Successful Payment Approval
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {processingStatus === 'SUCCESS' && (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <CheckCircleOutlineIcon className="text-green-500 text-6xl" style={{ fontSize: 64 }} />
                                <h3 className="text-lg font-bold text-gray-800">
                                    PAYMENT SUCCESSFUL
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Your payment has been verified! Redirecting to your order confirmation...
                                </p>
                            </div>
                        )}

                        {processingStatus === 'FAILED' && (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <ErrorOutlineIcon className="text-red-500 text-6xl" style={{ fontSize: 64 }} />
                                <h3 className="text-lg font-bold text-gray-800">
                                    PAYMENT NOT COMPLETED
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Your payment could not be completed or timed out. Your cart items remain safe in your cart.
                                </p>
                                <div className="flex gap-3 w-full pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setProcessingModal(false)}
                                        className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded transition"
                                    >
                                        CHANGE METHOD
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProcessingModal(false);
                                            handlePaymentSubmit({ preventDefault: () => {} });
                                        }}
                                        className="flex-1 py-2.5 bg-primary-orange hover:bg-orange-600 text-white text-sm font-medium rounded shadow transition"
                                    >
                                        TRY AGAIN
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Payment;