import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';
import Loading from './Loading';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';

const PaymentsTable = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailModal, setDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const filterTabs = [
        { label: "All Payments", value: "ALL" },
        { label: "Pending", value: "PENDING" },
        { label: "Processing", value: "PROCESSING" },
        { label: "Successful", value: "SUCCESS" },
        { label: "Failed", value: "FAILED" },
        { label: "Cancelled", value: "CANCELLED" },
        { label: "COD", value: "COD" },
    ];

    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter && statusFilter !== 'ALL') queryParams.append('status', statusFilter);
            queryParams.append('page', page);

            const { data } = await axios.get(`/api/v1/admin/payments?${queryParams.toString()}`);
            if (data.success) {
                setPayments(data.payments || []);
            }
        } catch (error) {
            enqueueSnackbar(error.response?.data?.message || "Failed to load payments", { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page, enqueueSnackbar]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleViewDetails = async (orderId) => {
        try {
            setDetailLoading(true);
            setDetailModal(true);
            const { data } = await axios.get(`/api/v1/admin/payment/${orderId}`);
            if (data.success) {
                setSelectedPayment(data.payment);
            }
        } catch (err) {
            enqueueSnackbar("Could not load payment details", { variant: 'error' });
            setDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const getStatusBadge = (status, method) => {
        const upper = String(status).toUpperCase();
        if (method === 'COD' && upper === 'PENDING') {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">COD (Unpaid)</span>;
        }
        if (upper === 'SUCCESS' || upper === 'PAID') {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Successful</span>;
        }
        if (upper === 'FAILED') {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
        }
        if (upper === 'PROCESSING') {
            return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Processing</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Pending</span>;
    };

    return (
        <>
            <MetaData title="Admin Payments Management | Flipkart" />

            <div className="flex flex-col gap-4 p-4 sm:p-6 min-h-[85vh]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Payments Management</h1>
                        <p className="text-xs text-gray-500">Monitor all online and COD payment transactions in real-time</p>
                    </div>
                    <button
                        onClick={fetchPayments}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition"
                    >
                        <RefreshIcon fontSize="small" />
                        Refresh List
                    </button>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
                    <FilterListIcon fontSize="small" className="text-gray-400 mr-1 flex-shrink-0" />
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setStatusFilter(tab.value);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                                statusFilter === tab.value
                                    ? 'bg-primary-blue text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Payments Table */}
                {loading ? (
                    <Loading />
                ) : payments.length === 0 ? (
                    <div className="bg-white rounded border border-gray-200 p-12 text-center text-gray-500 text-sm">
                        No payment records found matching the selected filter.
                    </div>
                ) : (
                    <div className="bg-white shadow-sm rounded border border-gray-200 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 font-semibold border-b uppercase tracking-wider">
                                    <th className="py-3 px-4">Transaction / Payment ID</th>
                                    <th className="py-3 px-4">Order ID</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Method & Provider</th>
                                    <th className="py-3 px-4 text-right">Amount</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {payments.map((p) => (
                                    <tr key={p.orderId} className="hover:bg-gray-50/80 transition">
                                        <td className="py-3 px-4 font-mono font-medium text-gray-900 truncate max-w-[140px]">
                                            {p.transactionId}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-primary-blue font-medium">
                                            #{String(p.orderId).substring(0, 10)}...
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-gray-800">{p.customer?.name || "Guest"}</p>
                                            <p className="text-gray-400 text-[11px] truncate max-w-[150px]">{p.customer?.email}</p>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-gray-900">{p.paymentMethod}</span>
                                            <span className="text-gray-400 block text-[11px]">{p.provider}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                                            ₹{Number(p.amount).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {getStatusBadge(p.status, p.paymentMethod)}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                                            {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => handleViewDetails(p.orderId)}
                                                className="px-2.5 py-1 text-xs text-primary-blue hover:bg-blue-50 rounded border border-blue-200 transition font-medium inline-flex items-center gap-1"
                                                title="View payment transaction details"
                                            >
                                                <VisibilityIcon fontSize="inherit" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Details Inspection Modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 relative animate-fade-in text-gray-800">
                        <button
                            onClick={() => setDetailModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
                        >
                            <CloseIcon fontSize="small" />
                        </button>

                        <h2 className="text-lg font-bold border-b pb-3 mb-4">Payment Transaction Details</h2>

                        {detailLoading || !selectedPayment ? (
                            <div className="py-12 flex justify-center">
                                <Loading />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 text-xs">
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Order Reference:</span>
                                    <span className="font-mono font-bold">{selectedPayment.orderId}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Customer Name:</span>
                                    <span className="font-semibold">{selectedPayment.customer?.name}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Customer Email:</span>
                                    <span>{selectedPayment.customer?.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Payment Method / Provider:</span>
                                    <span className="font-semibold">{selectedPayment.paymentMethod} ({selectedPayment.provider})</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Payment Status:</span>
                                    {getStatusBadge(selectedPayment.status, selectedPayment.paymentMethod)}
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Transaction ID:</span>
                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-900 select-all">
                                        {selectedPayment.transactionId}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Gateway Order ID:</span>
                                    <span className="font-mono text-gray-600">{selectedPayment.gatewayOrderId}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Webhook Status:</span>
                                    <span className="font-semibold text-green-700">{selectedPayment.webhookStatus}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-gray-500">Created Date:</span>
                                    <span>{new Date(selectedPayment.createdDate).toLocaleString('en-IN')}</span>
                                </div>
                                {selectedPayment.paidDate && (
                                    <div className="flex justify-between items-center py-1 border-b">
                                        <span className="text-gray-500">Paid Timestamp:</span>
                                        <span className="font-semibold text-green-700">{new Date(selectedPayment.paidDate).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 pt-3 font-semibold text-sm border-t">
                                    <span>Total Transaction Amount:</span>
                                    <span className="text-primary-blue text-base font-bold">₹{Number(selectedPayment.amount).toLocaleString()}</span>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={() => setDetailModal(false)}
                                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded transition"
                                    >
                                        Close Details
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

export default PaymentsTable;
