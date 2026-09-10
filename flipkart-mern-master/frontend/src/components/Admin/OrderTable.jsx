import { useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import Actions from './Actions';
import { formatDate } from '../../utils/functions';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';

const OrderTable = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { orders, error } = useSelector((state) => state.allOrders);
    const { loading, isDeleted, error: deleteError } = useSelector((state) => state.order);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (deleteError) {
            enqueueSnackbar(deleteError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isDeleted) {
            enqueueSnackbar("Deleted Successfully", { variant: "success" });
            dispatch({ type: DELETE_ORDER_RESET });
        }
        dispatch(getAllOrders());
    }, [dispatch, error, deleteError, isDeleted, enqueueSnackbar]);

    const deleteOrderHandler = (id) => {
        dispatch(deleteOrder(id));
    }

    const columns = [
        {
            field: "id",
            headerName: "Order ID",
            minWidth: 180,
            flex: 0.8,
        },
        {
            field: "status",
            headerName: "Order Status",
            minWidth: 130,
            flex: 0.2,
            renderCell: (params) => {
                return (
                    <>
                        {
                            params.row.status === "Delivered" ? (
                                <span className="text-xs bg-green-100 p-1 px-2.5 font-medium rounded-full text-green-800">{params.row.status}</span>
                            ) : params.row.status === "Shipped" ? (
                                <span className="text-xs bg-yellow-100 p-1 px-2.5 font-medium rounded-full text-yellow-800">{params.row.status}</span>
                            ) : (
                                <span className="text-xs bg-purple-100 p-1 px-2.5 font-medium rounded-full text-purple-800">{params.row.status}</span>
                            )
                        }
                    </>
                )
            },
        },
        {
            field: "paymentMethod",
            headerName: "Payment Method",
            minWidth: 140,
            flex: 0.25,
            renderCell: (params) => {
                return (
                    <span className="text-xs font-semibold uppercase text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {params.row.paymentMethod}
                    </span>
                );
            }
        },
        {
            field: "paymentStatus",
            headerName: "Payment Status",
            minWidth: 130,
            flex: 0.2,
            renderCell: (params) => {
                const status = String(params.row.paymentStatus || "Pending").toLowerCase();
                return (
                    <span className={`text-xs px-2.5 py-1 font-semibold rounded-full ${
                        status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}>
                        {params.row.paymentStatus}
                    </span>
                );
            }
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 90,
            flex: 0.1,
        },
        {
            field: "amount",
            headerName: "Amount",
            type: "number",
            minWidth: 120,
            flex: 0.2,
            renderCell: (params) => {
                return (
                    <span className="font-medium text-gray-900">₹{params.row.amount.toLocaleString()}</span>
                );
            },
        },
        {
            field: "orderOn",
            headerName: "Order On",
            type: "date",
            minWidth: 140,
            flex: 0.3,
        },
        {
            field: "actions",
            headerName: "Actions",
            minWidth: 100,
            flex: 0.2,
            type: "number",
            sortable: false,
            renderCell: (params) => {
                return (
                    <Actions editRoute={"order"} deleteHandler={deleteOrderHandler} id={params.row.id} />
                );
            },
        },
    ];

    const rows = [];

    orders && orders.forEach((order) => {
        rows.unshift({
            id: order._id,
            itemsQty: order.orderItems ? order.orderItems.length : 0,
            amount: order.totalPrice,
            orderOn: formatDate(order.createdAt),
            status: order.orderStatus,
            paymentMethod: order.paymentInfo?.method || "UPI",
            paymentStatus: order.paymentInfo?.status || "Pending",
        });
    });


    return (
        <>
            <MetaData title="Admin Orders | Flipkart" />

            {loading && <BackdropLoader />}

            <h1 className="text-lg font-medium uppercase">orders</h1>
            <div className="bg-white rounded-xl shadow-lg w-full" style={{ height: 470 }}>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={10}
                    disableSelectIconOnClick
                    sx={{
                        boxShadow: 0,
                        border: 0,
                    }}
                />
            </div>
        </>
    );
};

export default OrderTable;
