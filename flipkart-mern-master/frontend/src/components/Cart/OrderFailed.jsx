import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MetaData from '../Layouts/MetaData';
import CancelIcon from '@mui/icons-material/Cancel';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';

const OrderFailed = () => {
    const navigate = useNavigate();

    return (
        <>
            <MetaData title="Payment Failed | Flipkart" />

            <main className="w-full mt-20 min-h-[70vh] flex items-center justify-center p-4">
                <div className="flex flex-col items-center max-w-lg w-full bg-white shadow-md rounded-lg p-6 sm:p-10 border border-gray-100 text-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center text-red-600 shadow-inner">
                        <CancelIcon sx={{ fontSize: 64 }} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            ✕ PAYMENT FAILED
                        </h1>
                        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                            Your payment could not be completed or was cancelled by the bank. Don't worry, your cart items are preserved and untouched.
                        </p>
                    </div>

                    <div className="w-full bg-red-50/70 border border-red-200 rounded p-4 text-xs text-red-800 text-left flex flex-col gap-1.5">
                        <span className="font-semibold">Possible Reasons:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                            <li>Transaction timed out or was declined by the UPI app</li>
                            <li>Incorrect UPI PIN entered in the mobile application</li>
                            <li>Temporary bank server or network downtime</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
                        <button
                            onClick={() => navigate('/process/payment')}
                            className="w-full sm:w-auto px-6 py-3 bg-primary-orange hover:bg-orange-600 text-white font-semibold text-sm rounded shadow transition uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <PaymentIcon fontSize="small" />
                            TRY AGAIN
                        </button>
                        <button
                            onClick={() => navigate('/process/payment')}
                            className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded transition uppercase tracking-wider"
                        >
                            CHANGE METHOD
                        </button>
                        <Link
                            to="/cart"
                            className="w-full sm:w-auto px-6 py-3 bg-blue-50 hover:bg-blue-100 text-primary-blue font-semibold text-sm rounded transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                            <ShoppingCartIcon fontSize="small" />
                            VIEW CART
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
};

export default OrderFailed;
