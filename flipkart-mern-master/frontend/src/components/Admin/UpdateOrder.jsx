import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { clearErrors, getOrderDetails, updateOrder } from '../../actions/orderAction';
import { UPDATE_ORDER_RESET } from '../../constants/orderConstants';
import { formatDate } from '../../utils/functions';
import TrackStepper from '../Order/TrackStepper';
import Loading from './Loading';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MetaData from '../Layouts/MetaData';


const UpdateOrder = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();

    const [status, setStatus] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("");

    const { order, error, loading } = useSelector((state) => state.orderDetails);
    const { isUpdated, error: updateError } = useSelector((state) => state.order);

    useEffect(() => {
        if (order) {
            setStatus(order.orderStatus || "Processing");
            setPaymentStatus(order.paymentInfo?.status || "Pending");
        }
    }, [order]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (updateError) {
            enqueueSnackbar(updateError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isUpdated) {
            enqueueSnackbar("Order Updated Successfully", { variant: "success" });
            dispatch({ type: UPDATE_ORDER_RESET });
        }
        dispatch(getOrderDetails(params.id));
    }, [dispatch, error, params.id, isUpdated, updateError, enqueueSnackbar]);

    const updateOrderSubmitHandler = (e) => {
        e.preventDefault();
        const updateData = {
            status,
            paymentStatus,
        };
        dispatch(updateOrder(params.id, updateData));
    }

    return (
        <>
            <MetaData title="Admin: Update Order | Flipkart" />

            {loading ? <Loading /> : (
                <>
                    {order && order.user && order.shippingInfo && (
                        <div className="flex flex-col gap-5 pb-8">
                            <Link to="/admin/orders" className="ml-1 flex items-center gap-1 font-medium text-primary-blue uppercase text-sm hover:underline">
                                <ArrowBackIosIcon sx={{ fontSize: "14px" }} /> Back to Orders
                            </Link>

                            {/* Order Header Summary Bar */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Order Reference</span>
                                    <h1 className="text-xl font-bold text-gray-900">ORDER #{order._id}</h1>
                                    <span className="text-xs text-gray-500">Placed on {formatDate(order.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-gray-500 font-medium">Order Total</span>
                                        <span className="text-2xl font-black text-gray-900">₹{order.totalPrice.toLocaleString()}</span>
                                    </div>
                                    <span className={`text-xs px-3 py-1 font-semibold rounded-full uppercase ${
                                        order.orderStatus === "Delivered"
                                            ? "bg-green-100 text-green-800"
                                            : order.orderStatus === "Shipped"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-purple-100 text-purple-800"
                                    }`}>
                                        {order.orderStatus}
                                    </span>
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* Delivery Address Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-2 border-b pb-3">
                                        <LocalShippingIcon className="text-primary-blue" fontSize="small" />
                                        <h3 className="font-semibold text-gray-800 text-base">Customer & Delivery</h3>
                                    </div>
                                    <div className="flex flex-col gap-2 text-sm text-gray-700">
                                        <h4 className="font-bold text-gray-900 text-base">{order.user.name}</h4>
                                        <p className="text-gray-600">{`${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}`}</p>
                                        <div className="pt-2 flex flex-col gap-1 border-t text-xs">
                                            <p><span className="font-semibold text-gray-800">Email:</span> {order.user.email}</p>
                                            <p><span className="font-semibold text-gray-800">Phone:</span> {order.shippingInfo.phoneNo}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Information Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-2 border-b pb-3">
                                        <PaymentIcon className="text-primary-blue" fontSize="small" />
                                        <h3 className="font-semibold text-gray-800 text-base">Payment Information</h3>
                                    </div>
                                    <div className="flex flex-col gap-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Payment Method:</span>
                                            <span className="font-bold text-gray-800 uppercase px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                {order.paymentInfo?.method || "UPI"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Payment Status:</span>
                                            <span className={`text-xs px-2.5 py-1 font-bold rounded-full ${
                                                String(order.paymentInfo?.status).toLowerCase() === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : String(order.paymentInfo?.status).toLowerCase() === 'failed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {order.paymentInfo?.status || "Pending"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Transaction Ref:</span>
                                            <span className="text-xs font-mono text-gray-700 truncate max-w-[150px]">
                                                {order.paymentInfo?.id || "N/A"}
                                            </span>
                                        </div>
                                        {order.paidAt && (
                                            <div className="flex justify-between items-center pt-2 border-t text-xs text-gray-500">
                                                <span>Paid At:</span>
                                                <span>{formatDate(order.paidAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Update Order & Payment Status Form */}
                                <form onSubmit={updateOrderSubmitHandler} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
                                    <h3 className="font-semibold text-gray-800 text-base border-b pb-3">Manage Status</h3>
                                    
                                    <div className="flex flex-col gap-3">
                                        <FormControl fullWidth size="small">
                                            <InputLabel id="order-status-select-label">Order Status</InputLabel>
                                            <Select
                                                labelId="order-status-select-label"
                                                id="order-status-select"
                                                value={status}
                                                label="Order Status"
                                                onChange={(e) => setStatus(e.target.value)}
                                            >
                                                <MenuItem value="Processing">Processing</MenuItem>
                                                <MenuItem value="Confirmed">Confirmed</MenuItem>
                                                <MenuItem value="Shipped">Shipped</MenuItem>
                                                <MenuItem value="Out for Delivery">Out for Delivery</MenuItem>
                                                <MenuItem value="Delivered">Delivered</MenuItem>
                                                <MenuItem value="Cancelled">Cancelled</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth size="small">
                                            <InputLabel id="payment-status-select-label">Payment Status</InputLabel>
                                            <Select
                                                labelId="payment-status-select-label"
                                                id="payment-status-select"
                                                value={paymentStatus}
                                                label="Payment Status"
                                                onChange={(e) => setPaymentStatus(e.target.value)}
                                            >
                                                <MenuItem value="Pending">Pending</MenuItem>
                                                <MenuItem value="Processing">Processing</MenuItem>
                                                <MenuItem value="Paid">Paid</MenuItem>
                                                <MenuItem value="Failed">Failed</MenuItem>
                                                <MenuItem value="Cancelled">Cancelled</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="bg-primary-orange hover:bg-orange-600 p-2.5 text-white font-semibold rounded shadow transition cursor-pointer uppercase text-xs tracking-wider mt-1"
                                    >
                                        Save Changes
                                    </button>
                                </form>
                            </div>

                            {/* Order Items Table */}
                            <div className="flex flex-col gap-3 mt-2">
                                <h3 className="font-semibold text-gray-800 text-base">Ordered Products</h3>
                                {order.orderItems && order.orderItems.map((item) => {
                                    const { _id, image, name, price, quantity } = item;

                                    return (
                                        <div className="flex flex-col sm:flex-row items-center justify-between shadow-sm rounded-xl bg-white p-4 border border-gray-100 gap-4" key={_id}>
                                            <div className="flex items-center gap-4 w-full sm:w-2/3">
                                                <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded p-1 border">
                                                    <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
                                                </div>
                                                <div className="flex flex-col gap-1 overflow-hidden">
                                                    <p className="text-sm font-medium text-gray-900">{name}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>Price: ₹{price.toLocaleString()}</span>
                                                        <span>Quantity: {quantity}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                                                <span className="text-xs text-gray-400 sm:text-right">Subtotal</span>
                                                <span className="font-bold text-gray-900 text-base">₹{(quantity * price).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Order Tracking Stepper */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-800 text-base mb-4">Order Progress</h3>
                                <TrackStepper
                                    orderOn={order.createdAt}
                                    shippedAt={order.shippedAt}
                                    deliveredAt={order.deliveredAt}
                                    activeStep={
                                        order.orderStatus === "Delivered" ? 2 : order.orderStatus === "Shipped" ? 1 : 0
                                    }
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default UpdateOrder;

