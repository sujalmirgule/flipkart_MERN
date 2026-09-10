import { useSnackbar } from 'notistack';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { clearErrors, getOrderDetails } from '../../actions/orderAction';
import Loader from '../Layouts/Loader';
import TrackStepper from './TrackStepper';
import MinCategory from '../Layouts/MinCategory';
import MetaData from '../Layouts/MetaData';

const OrderDetails = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();

    const { order, error, loading } = useSelector((state) => state.orderDetails);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        dispatch(getOrderDetails(params.id));
    }, [dispatch, error, params.id, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Order Details | Flipkart" />

            <MinCategory />
            <main className="w-full mt-14 sm:mt-4">
                {loading ? <Loader /> : (
                    <>
                        {order && order.user && order.shippingInfo && (
                            <div className="flex flex-col gap-4 max-w-6xl mx-auto">

                                <div className="flex flex-col sm:flex-row bg-white shadow rounded-sm min-w-full">
                                    <div className="sm:w-1/2 sm:border-r border-b sm:border-b-0">
                                        <div className="flex flex-col gap-3 my-6 sm:my-8 mx-6 sm:mx-10">
                                            <h3 className="font-medium text-lg border-b pb-2 text-gray-800">Delivery Address</h3>
                                            <h4 className="font-semibold text-gray-800">{order.user.name}</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed">{`${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}`}</p>
                                            <div className="flex gap-2 text-sm">
                                                <p className="font-medium text-gray-700">Email:</p>
                                                <p className="text-gray-600">{order.user.email}</p>
                                            </div>
                                            <div className="flex gap-2 text-sm">
                                                <p className="font-medium text-gray-700">Phone Number:</p>
                                                <p className="text-gray-600">{order.shippingInfo.phoneNo}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sm:w-1/2">
                                        <div className="flex flex-col gap-3 my-6 sm:my-8 mx-6 sm:mx-10">
                                            <h3 className="font-medium text-lg border-b pb-2 text-gray-800">Payment & Summary</h3>
                                            <div className="flex items-center justify-between text-sm py-1">
                                                <span className="text-gray-600 font-medium">Payment Method:</span>
                                                <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded">
                                                    {order.paymentInfo?.method || "UPI / Online"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm py-1">
                                                <span className="text-gray-600 font-medium">Payment Status:</span>
                                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase ${
                                                    order.paymentInfo?.status === "PAID" || order.paymentInfo?.status === "Paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : order.paymentInfo?.status === "FAILED" || order.paymentInfo?.status === "Failed"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {order.paymentInfo?.status || "Pending"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm py-1">
                                                <span className="text-gray-600 font-medium">Order Status:</span>
                                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                                    order.orderStatus === "Delivered"
                                                        ? "bg-green-100 text-green-700"
                                                        : order.orderStatus === "Cancelled"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-blue-100 text-primary-blue"
                                                }`}>
                                                    {order.orderStatus}
                                                </span>
                                            </div>
                                            {order.paymentInfo?.id && (
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs py-1 gap-1">
                                                    <span className="text-gray-500 font-medium">Transaction ID:</span>
                                                    <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border select-all truncate max-w-xs">
                                                        {order.paymentInfo.id}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-base pt-3 border-t font-semibold">
                                                <span className="text-gray-800">Total Amount:</span>
                                                <span className="text-primary-blue text-lg">₹{order.totalPrice?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {order.orderItems && order.orderItems.map((item) => {

                                    const { _id, image, name, price, quantity } = item;

                                    return (
                                        <div className="flex flex-col sm:flex-row min-w-full shadow rounded-sm bg-white px-2 py-5" key={_id}>

                                            <div className="flex flex-col sm:flex-row sm:w-1/2 gap-2">
                                                <div className="w-full sm:w-32 h-20">
                                                    <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
                                                </div>
                                                <div className="flex flex-col gap-1 overflow-hidden">
                                                    <p className="text-sm">{name.length > 60 ? `${name.substring(0, 60)}...` : name}</p>
                                                    <p className="text-xs text-gray-600 mt-2">Quantity: {quantity}</p>
                                                    <p className="text-xs text-gray-600">Price: ₹{price.toLocaleString()}</p>
                                                    <span className="font-medium">Total: ₹{(quantity * price).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col w-full sm:w-1/2">
                                                <h3 className="font-medium sm:text-center">Order Status</h3>
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
                                    )
                                })
                                }
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
};

export default OrderDetails;
