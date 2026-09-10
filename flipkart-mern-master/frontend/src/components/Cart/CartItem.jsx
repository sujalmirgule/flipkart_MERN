import { useSnackbar } from 'notistack';
import { useDispatch } from 'react-redux';
import { updateCartQuantity, removeItemsFromCart } from '../../actions/cartAction';
import { getDeliveryDate, getDiscount } from '../../utils/functions';
import { saveForLater } from '../../actions/saveForLaterAction';
import { Link } from 'react-router-dom';

const CartItem = ({ product, name, seller, price, cuttedPrice, image, stock, quantity, inCart }) => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const increaseQuantity = async (id, currentQty, availableStock) => {
        if (currentQty >= availableStock) {
            enqueueSnackbar(`Only ${availableStock} items available in stock`, { variant: "warning" });
            return;
        }
        const newQty = currentQty + 1;
        const res = await dispatch(updateCartQuantity(id, newQty));
        if (res && !res.success && res.message) {
            enqueueSnackbar(res.message, { variant: "warning" });
        }
    }

    const decreaseQuantity = async (id, currentQty) => {
        if (currentQty <= 1) {
            await removeCartItem(id);
            return;
        }
        const newQty = currentQty - 1;
        const res = await dispatch(updateCartQuantity(id, newQty));
        if (res && !res.success && res.message) {
            enqueueSnackbar(res.message, { variant: "warning" });
        }
    }
    
    const removeCartItem = async (id) => {
        await dispatch(removeItemsFromCart(id));
        enqueueSnackbar("Product Removed From Cart", { variant: "success" });
    }

    const saveForLaterHandler = (id) => {
        dispatch(saveForLater(id));
        removeCartItem(id);
        enqueueSnackbar("Saved For Later", { variant: "success" });
    }

    return (
        <div className="flex flex-col gap-3 py-5 pl-2 sm:pl-6 border-b overflow-hidden" key={product}>

            <Link to={`/product/${product}`} className="flex flex-col sm:flex-row gap-5 items-stretch w-full group">
                {/* <!-- product image --> */}
                <div className="w-full sm:w-1/6 h-28 flex-shrink-0">
                    <img draggable="false" className="h-full w-full object-contain" src={image} alt={name} />
                </div>
                {/* <!-- product image --> */}

                {/* <!-- description --> */}
                <div className="flex flex-col sm:gap-5 w-full pr-6">
                    {/* <!-- product title --> */}
                    <div className="flex flex-col sm:flex-row justify-between items-start pr-5 gap-1 sm:gap-0">
                        <div className="flex flex-col gap-0.5 sm:w-3/5">
                            <p className="group-hover:text-primary-blue">{name.length > 42 ? `${name.substring(0, 42)}...` : name}</p>
                            <span className="text-sm text-gray-500">Seller: {seller}</span>
                        </div>

                        <div className="flex flex-col sm:gap-2">
                            <p className="text-sm">Delivery by {getDeliveryDate()} | <span className="text-primary-green">Free</span> <span className="line-through">₹{quantity * 40}</span></p>
                            <span className="text-xs text-gray-500">7 Days Replacement Policy</span>
                        </div>

                    </div>
                    {/* <!-- product title --> */}

                    {/* <!-- price desc --> */}
                    <div className="flex items-baseline gap-2 text-xl font-medium">
                        <span>₹{(price * quantity).toLocaleString()}</span>
                        <span className="text-sm text-gray-500 line-through font-normal">₹{(cuttedPrice * quantity).toLocaleString()}</span>
                        <span className="text-sm text-primary-green">{getDiscount(price, cuttedPrice)}%&nbsp;off</span>
                    </div>
                    {/* <!-- price desc --> */}

                </div>
                {/* <!-- description --> */}
            </Link>

            {/* <!-- save for later --> */}
            <div className="flex justify-between pr-4 sm:pr-0 sm:justify-start sm:gap-6">
                <div className="flex gap-1.5 items-center">
                    <button
                        type="button"
                        onClick={() => decreaseQuantity(product, quantity)}
                        disabled={quantity <= 1}
                        title={quantity <= 1 ? "Minimum quantity reached. Use Remove to delete." : "Decrease quantity"}
                        className={`w-7 h-7 text-base font-semibold rounded-full border border-gray-300 flex items-center justify-center transition select-none ${
                            quantity <= 1 
                                ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" 
                                : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 cursor-pointer"
                        }`}
                    >
                        -
                    </button>
                    <input
                        className="w-11 border border-gray-300 outline-none text-center rounded-sm py-0.5 text-gray-800 font-medium text-sm qtyInput bg-white"
                        value={quantity}
                        readOnly
                    />
                    <button
                        type="button"
                        onClick={() => increaseQuantity(product, quantity, stock)}
                        disabled={quantity >= stock}
                        title={quantity >= stock ? "Maximum stock limit reached" : "Increase quantity"}
                        className={`w-7 h-7 text-base font-semibold rounded-full border border-gray-300 flex items-center justify-center transition select-none ${
                            quantity >= stock 
                                ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed" 
                                : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 cursor-pointer"
                        }`}
                    >
                        +
                    </button>
                </div>
                {/* <!-- quantity --> */}
                {inCart && (
                    <>
                    <button onClick={() => saveForLaterHandler(product)} className="sm:ml-4 font-medium hover:text-primary-blue">SAVE FOR LATER</button>
                    <button onClick={() => removeCartItem(product)} className="font-medium hover:text-red-600">REMOVE</button>
                    </>
                )}
            </div>
            {/* <!-- save for later --> */}

        </div>
    );
};

export default CartItem;
