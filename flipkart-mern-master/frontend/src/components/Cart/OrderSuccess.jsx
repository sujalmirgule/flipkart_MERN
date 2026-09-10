import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import MetaData from '../Layouts/MetaData';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircularProgress from '@mui/material/CircularProgress';

const OrderSuccess = ({ success = true }) => {
    const params = useParams();
    const [searchParams] = useSearchParams();

    const orderId = params.orderId || searchParams.get("orderId");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(Boolean(orderId));
    const [unverified, setUnverified] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/v1/order/${orderId}`);
                if (data.success && data.order) {
                    const fetchedOrder = data.order;
                    const paymentStatus = fetchedOrder.payment?.status || (fetchedOrder.paymentInfo?.status === 'Paid' ? 'SUCCESS' : 'PENDING');
                    const isCod = fetchedOrder.payment?.method === 'COD' || fetchedOrder.paymentInfo?.method === 'COD';

                    // Only show success if verified or COD
                    if (!isCod && paymentStatus !== 'SUCCESS') {
                        setUnverified(true);
                    } else {
                        setOrder(fetchedOrder);
                    }
                }
            } catch (err) {
                console.error("Order fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const isCod = order?.payment?.method === 'COD' || order?.paymentInfo?.method === 'COD';
    const amount = order?.totalPrice;
    const paymentMethod = order?.payment?.provider || order?.payment?.method || (isCod ? "Cash on Delivery" : "UPI");

    if (loading) {
        return (
            <div className="w-full mt-24 min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <CircularProgress size={44} className="text-primary-blue" />
                <span className="text-sm text-gray-500 font-medium">Loading verified order summary...</span>
            </div>
        );
    }

    if (unverified) {
        return (
            <main className="w-full mt-20 min-h-[70vh] flex items-center justify-center p-4">
                <div className="flex flex-col items-center justify-center max-w-lg w-full bg-white shadow-md rounded-lg p-6 sm:p-10 border border-gray-100 text-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Pending Verification</h1>
                    <p className="text-sm text-gray-600">
                        Your payment has not yet been confirmed by the bank or payment gateway. Please check back shortly or review your order history.
                    </p>
                    <div className="flex gap-3 w-full pt-3">
                        <Link to={`/order_details/${orderId}`} className="flex-1 py-3 bg-primary-blue text-white font-medium text-sm rounded shadow">
                            CHECK ORDER STATUS
                        </Link>
                        <Link to="/orders" className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded">
                            MY ORDERS
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <>
            <MetaData title={isCod ? "Order Placed Successfully | Flipkart" : "Payment Successful | Flipkart"} />

            <main className="w-full mt-20 min-h-[75vh] flex items-center justify-center p-4">
                <div className="flex flex-col items-center max-w-2xl w-full bg-white shadow-md rounded-lg p-6 sm:p-10 border border-gray-100 text-center gap-6">
                    {/* Status Icon */}
                    <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center text-green-600 shadow-inner">
                        <CheckCircleIcon sx={{ fontSize: 64 }} />
                    </div>

                    {/* Headline */}
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            {isCod ? "ORDER PLACED SUCCESSFULLY" : "✓ PAYMENT SUCCESSFUL"}
                        </h1>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            {isCod 
                                ? "Thank you for your order! Your order has been placed and you can pay when it is delivered to your doorstep." 
                                : "Thank you for your order! Your payment has been verified and your transaction is complete."}
                        </p>
                    </div>

                    {/* Order Details Card */}
                    <div className="w-full bg-gray-50/80 rounded-lg p-5 border border-gray-200/80 text-left flex flex-col gap-3 text-sm">
                        {orderId && (
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-gray-500 font-medium">Order ID:</span>
                                <span className="font-mono font-bold text-gray-900">#{orderId}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-500 font-medium">Payment Method:</span>
                            <span className="font-semibold text-gray-800 flex items-center gap-1">
                                {isCod && <LocalShippingIcon fontSize="small" className="text-primary-blue" />}
                                {paymentMethod}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-500 font-medium">Payment Status:</span>
                            <span className={`text-xs px-2.5 py-0.5 font-bold rounded-full uppercase ${
                                isCod ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                            }`}>
                                {isCod ? "UNPAID (Pay on Delivery)" : "PAID"}
                            </span>
                        </div>

                        {amount !== undefined && (
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-gray-500 font-medium">{isCod ? "Payable Amount:" : "Amount Paid:"}</span>
                                <span className="font-extrabold text-primary-blue text-base">₹{Number(amount).toLocaleString()}</span>
                            </div>
                        )}

                        {order?.createdAt && (
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                                <span className="text-gray-500 font-medium">Order Date:</span>
                                <span className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}

                        {order?.shippingInfo && (
                            <div className="flex flex-col gap-1 pt-1 pb-2 border-b border-gray-200 text-xs">
                                <span className="text-gray-500 font-medium uppercase tracking-wider text-[11px]">Delivery Address:</span>
                                <span className="text-gray-800 font-medium leading-relaxed">
                                    {order.shippingInfo.address}, {order.shippingInfo.city}, {order.shippingInfo.state} - {order.shippingInfo.pincode}
                                </span>
                                <span className="text-gray-500">Phone: {order.shippingInfo.phoneNo}</span>
                            </div>
                        )}

                        {/* Order Items Preview */}
                        {order?.orderItems && order.orderItems.length > 0 && (
                            <div className="flex flex-col gap-2 pt-2">
                                <span className="text-gray-500 font-medium uppercase tracking-wider text-[11px]">Order Items ({order.orderItems.length}):</span>
                                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
                                    {order.orderItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200/60">
                                            <div className="w-12 h-12 flex-shrink-0">
                                                <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-xs">
                                                <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                                <p className="text-gray-500">Qty: {item.quantity} | ₹{item.price.toLocaleString()}</p>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-900">
                                                ₹{(item.quantity * item.price).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
                        {orderId && (
                            <Link
                                to={`/order_details/${orderId}`}
                                className="w-full sm:w-auto px-8 py-3 bg-primary-blue hover:bg-blue-700 text-white font-semibold text-sm rounded shadow hover:shadow-md transition uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <ShoppingBagIcon fontSize="small" />
                                VIEW ORDER
                            </Link>
                        )}
                        <Link
                            to="/products"
                            className="w-full sm:w-auto px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                            CONTINUE SHOPPING
                            <ArrowForwardIcon fontSize="small" />
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
};

export default OrderSuccess;
