import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';
import { getAdminPaymentSettings, updatePaymentSettings, clearErrors } from '../../actions/paymentAction';
import { UPDATE_PAYMENT_SETTINGS_RESET } from '../../constants/paymentConstants';

const PaymentSettings = () => {
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { settings, loading, isUpdated, error } = useSelector((state) => state.adminPaymentSettings);

    const [upiId, setUpiId] = useState('');
    const [merchantName, setMerchantName] = useState('');
    const [upiEnabled, setUpiEnabled] = useState(true);
    const [qrPaymentEnabled, setQrPaymentEnabled] = useState(true);
    const [paytmEnabled, setPaytmEnabled] = useState(true);
    const [phonePeEnabled, setPhonePeEnabled] = useState(true);
    const [googlePayEnabled, setGooglePayEnabled] = useState(true);
    const [otherUpiEnabled, setOtherUpiEnabled] = useState(true);
    const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(true);
    const [paymentMode, setPaymentMode] = useState('development');

    // Sync form with loaded settings
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setUpiId(settings.upiId || '');
            setMerchantName(settings.merchantName || '');
            setUpiEnabled(settings.upiEnabled !== undefined ? settings.upiEnabled : true);
            setQrPaymentEnabled(settings.qrPaymentEnabled !== undefined ? settings.qrPaymentEnabled : true);
            setPaytmEnabled(settings.paytmEnabled !== undefined ? settings.paytmEnabled : true);
            setPhonePeEnabled(settings.phonePeEnabled !== undefined ? settings.phonePeEnabled : (settings.phonepeEnabled !== undefined ? settings.phonepeEnabled : true));
            setGooglePayEnabled(settings.googlePayEnabled !== undefined ? settings.googlePayEnabled : true);
            setOtherUpiEnabled(settings.otherUpiEnabled !== undefined ? settings.otherUpiEnabled : true);
            setCashOnDeliveryEnabled(settings.cashOnDeliveryEnabled !== undefined ? settings.cashOnDeliveryEnabled : true);
            setPaymentMode(settings.paymentMode || 'development');
        }
    }, [settings]);

    useEffect(() => {
        dispatch(getAdminPaymentSettings());
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: 'error' });
            dispatch(clearErrors());
        }

        if (isUpdated) {
            enqueueSnackbar('Payment settings updated successfully!', { variant: 'success' });
            dispatch({ type: UPDATE_PAYMENT_SETTINGS_RESET });
            dispatch(getAdminPaymentSettings());
        }
    }, [dispatch, error, isUpdated, enqueueSnackbar]);

    const handleCancel = () => {
        if (settings) {
            setUpiId(settings.upiId || '');
            setMerchantName(settings.merchantName || '');
            setUpiEnabled(settings.upiEnabled !== undefined ? settings.upiEnabled : true);
            setQrPaymentEnabled(settings.qrPaymentEnabled !== undefined ? settings.qrPaymentEnabled : true);
            setPaytmEnabled(settings.paytmEnabled !== undefined ? settings.paytmEnabled : true);
            setPhonePeEnabled(settings.phonePeEnabled !== undefined ? settings.phonePeEnabled : (settings.phonepeEnabled !== undefined ? settings.phonepeEnabled : true));
            setGooglePayEnabled(settings.googlePayEnabled !== undefined ? settings.googlePayEnabled : true);
            setOtherUpiEnabled(settings.otherUpiEnabled !== undefined ? settings.otherUpiEnabled : true);
            setCashOnDeliveryEnabled(settings.cashOnDeliveryEnabled !== undefined ? settings.cashOnDeliveryEnabled : true);
            setPaymentMode(settings.paymentMode || 'development');
            enqueueSnackbar('Changes reverted to saved configuration.', { variant: 'info' });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!merchantName.trim()) {
            enqueueSnackbar('Merchant / Receiver Name is required.', { variant: 'warning' });
            return;
        }

        const isUpiRequired = upiEnabled || qrPaymentEnabled;
        if (isUpiRequired && !upiId.trim()) {
            enqueueSnackbar('UPI ID is required when UPI or QR payments are enabled.', { variant: 'warning' });
            return;
        }

        if (upiId && !upiId.includes('@')) {
            enqueueSnackbar('Please enter a valid UPI ID (e.g. username@bank).', { variant: 'warning' });
            return;
        }

        const settingsData = {
            upiId: upiId.trim(),
            merchantName: merchantName.trim(),
            upiEnabled,
            qrPaymentEnabled,
            paytmEnabled,
            phonePeEnabled,
            phonepeEnabled: phonePeEnabled,
            googlePayEnabled,
            otherUpiEnabled,
            cashOnDeliveryEnabled,
            paymentMode,
        };

        dispatch(updatePaymentSettings(settingsData));
    };

    return (
        <>
            <MetaData title="Admin: Payment Settings | Flipkart" />

            {loading && <BackdropLoader />}

            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-8">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary-blue/10 p-3 rounded-xl text-primary-blue">
                            <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Payment Settings</h1>
                            <p className="text-sm text-gray-500">Manage store merchant UPI details and configure enabled payment methods</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => dispatch(getAdminPaymentSettings())}
                        className="mt-3 sm:mt-0 flex items-center gap-1.5 text-xs text-primary-blue bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
                    >
                        <RefreshIcon sx={{ fontSize: 16 }} />
                        Reload Settings
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Merchant & UPI Configuration Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                            <QrCodeScannerIcon className="text-primary-blue" fontSize="small" />
                            <h2 className="font-semibold text-gray-800 text-base">MERCHANT & UPI CONFIGURATION</h2>
                        </div>

                        <div className="p-6 flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <TextField
                                    label="Merchant Name"
                                    variant="outlined"
                                    fullWidth
                                    required
                                    placeholder="e.g. My Store or Flipkart Payments"
                                    value={merchantName}
                                    onChange={(e) => setMerchantName(e.target.value)}
                                    helperText="Display name shown to customers on UPI payment apps"
                                />

                                <TextField
                                    label="UPI ID"
                                    variant="outlined"
                                    fullWidth
                                    required={upiEnabled || qrPaymentEnabled}
                                    placeholder="e.g. store@upi or flipkart@okaxis"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                    helperText="The UPI VPA address that will receive customer payments via dynamic QR / deep links"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Online Payment Methods Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                            <AccountBalanceWalletIcon className="text-primary-blue" fontSize="small" />
                            <h2 className="font-semibold text-gray-800 text-base">ONLINE PAYMENT METHODS</h2>
                        </div>

                        <div className="p-6 flex flex-col divide-y divide-gray-100">
                            {/* Enable UPI Payment */}
                            <div className="py-3.5 flex items-center justify-between first:pt-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-primary-blue font-bold text-xs">
                                        UPI
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Enable UPI Payment</span>
                                        <span className="text-xs text-gray-500">Allow customers to pay via standard UPI payment request</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={upiEnabled}
                                            onChange={(e) => setUpiEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>

                            {/* Enable QR Code Payment */}
                            <div className="py-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-primary-blue">
                                        <QrCodeScannerIcon fontSize="small" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Enable QR Code Payment</span>
                                        <span className="text-xs text-gray-500">Display dynamic scannable QR code on desktop and mobile</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={qrPaymentEnabled}
                                            onChange={(e) => setQrPaymentEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>

                            {/* PhonePe */}
                            <div className="py-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        draggable="false"
                                        className="h-8 w-8 object-contain rounded-full"
                                        src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png"
                                        onError={(e) => { e.target.src = 'https://rukminim1.flixcart.com/www/96/96/promos/01/09/2020/a07396d4-0543-4b19-8406-b9fcbf5fd735.png'; }}
                                        alt="PhonePe"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">PhonePe</span>
                                        <span className="text-xs text-gray-500">Enable PhonePe payment button & UPI deep-link</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={phonePeEnabled}
                                            onChange={(e) => setPhonePeEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>

                            {/* Google Pay */}
                            <div className="py-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        draggable="false"
                                        className="h-8 w-8 object-contain"
                                        src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png"
                                        onError={(e) => { e.target.src = 'https://rukminim1.flixcart.com/www/96/96/promos/01/09/2020/a07396d4-0543-4b19-8406-b9fcbf5fd735.png'; }}
                                        alt="Google Pay"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Google Pay</span>
                                        <span className="text-xs text-gray-500">Enable Google Pay payment button & UPI deep-link</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={googlePayEnabled}
                                            onChange={(e) => setGooglePayEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>

                            {/* Paytm */}
                            <div className="py-3.5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        draggable="false"
                                        className="h-8 w-8 object-contain"
                                        src="https://rukminim1.flixcart.com/www/96/96/promos/01/09/2020/a07396d4-0543-4b19-8406-b9fcbf5fd735.png"
                                        alt="Paytm"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Paytm</span>
                                        <span className="text-xs text-gray-500">Enable Paytm payment button & UPI deep-link</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={paytmEnabled}
                                            onChange={(e) => setPaytmEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>

                            {/* Other UPI Apps */}
                            <div className="py-3.5 flex items-center justify-between last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-primary-blue font-bold text-xs">
                                        UPI
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Other UPI Apps</span>
                                        <span className="text-xs text-gray-500">Enable generic UPI intent for BHIM and other installed UPI apps</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={otherUpiEnabled}
                                            onChange={(e) => setOtherUpiEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Offline Payment Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                            <LocalShippingIcon className="text-primary-blue" fontSize="small" />
                            <h2 className="font-semibold text-gray-800 text-base">OFFLINE PAYMENT</h2>
                        </div>

                        <div className="p-6 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                                        <LocalShippingIcon fontSize="small" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-800">Cash on Delivery (COD)</span>
                                        <span className="text-xs text-gray-500">Allow customers to pay in cash upon receiving their order</span>
                                    </div>
                                </div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={cashOnDeliveryEnabled}
                                            onChange={(e) => setCashOnDeliveryEnabled(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label=""
                                    className="m-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mode & Environment Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                            <AccountBalanceWalletIcon className="text-primary-blue" fontSize="small" />
                            <h2 className="font-semibold text-gray-800 text-base">PAYMENT ENVIRONMENT MODE</h2>
                        </div>

                        <div className="p-6 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className={`flex-1 p-4 rounded border cursor-pointer transition ${paymentMode === 'development' ? 'border-primary-blue bg-blue-50/40' : 'border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMode"
                                        value="development"
                                        checked={paymentMode === 'development'}
                                        onChange={() => setPaymentMode('development')}
                                        className="mr-2 text-primary-blue"
                                    />
                                    <span className="font-semibold text-sm text-gray-800">Development / Demo Mode</span>
                                    <p className="text-xs text-gray-500 mt-1">Allows simulated desktop payment verification and instant testing.</p>
                                </label>
                                <label className={`flex-1 p-4 rounded border cursor-pointer transition ${paymentMode === 'production' ? 'border-primary-blue bg-blue-50/40' : 'border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="paymentMode"
                                        value="production"
                                        checked={paymentMode === 'production'}
                                        onChange={() => setPaymentMode('production')}
                                        className="mr-2 text-primary-blue"
                                    />
                                    <span className="font-semibold text-sm text-gray-800">Production Mode</span>
                                    <p className="text-xs text-gray-500 mt-1">Strict signature verification and verified payment gateway webhooks only.</p>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-100 transition shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-primary-orange hover:bg-orange-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition uppercase tracking-wider cursor-pointer disabled:bg-orange-300"
                        >
                            <SaveIcon fontSize="small" />
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default PaymentSettings;
