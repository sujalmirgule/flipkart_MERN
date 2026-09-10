import { Link, useNavigate } from 'react-router-dom';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupIcon from '@mui/icons-material/Group';
import ReviewsIcon from '@mui/icons-material/Reviews';
import AddBoxIcon from '@mui/icons-material/AddBox';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentIcon from '@mui/icons-material/Payment';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import CloseIcon from '@mui/icons-material/Close';
import Avatar from '@mui/material/Avatar';
import { useDispatch, useSelector } from 'react-redux';
import './Sidebar.css';
import { useSnackbar } from 'notistack';
import { logoutUser } from '../../../actions/userAction';

const navMenu = [
    {
        icon: <EqualizerIcon />,
        label: "Dashboard",
        ref: "/admin/dashboard",
    },
    {
        icon: <ShoppingBagIcon />,
        label: "Orders",
        ref: "/admin/orders",
    },
    {
        icon: <InventoryIcon />,
        label: "Products",
        ref: "/admin/products",
    },
    {
        icon: <AddBoxIcon />,
        label: "Add Product",
        ref: "/admin/new_product",
    },
    {
        icon: <GroupIcon />,
        label: "Users",
        ref: "/admin/users",
    },
    {
        icon: <ReviewsIcon />,
        label: "Reviews",
        ref: "/admin/reviews",
    },
    {
        icon: <PaymentIcon />,
        label: "Payments",
        ref: "/admin/payments",
    },
    {
        icon: <AccountBalanceWalletIcon />,
        label: "Payment Settings",
        ref: "/admin/payment/settings",
    },
    {
        icon: <AccountBoxIcon />,
        label: "My Profile",
        ref: "/account",
    },
    {
        icon: <LogoutIcon />,
        label: "Logout",
    },
];

const Sidebar = ({ activeTab, setToggleSidebar }) => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const { user } = useSelector((state) => state.user);

    const handleLogout = () => {
        dispatch(logoutUser());
        enqueueSnackbar("Logout Successfully", { variant: "success" });
        navigate("/login");
    }

    return (
        <aside className="sidebar z-30 h-screen sm:h-[calc(100vh-3.5rem)] fixed left-0 top-0 sm:top-14 bottom-0 w-72 sm:w-64 bg-gray-800 text-white overflow-y-auto overflow-x-hidden border-r border-gray-700 flex flex-col justify-between shadow-lg">
            <div>
                <div className="flex items-center gap-3 bg-gray-700/70 p-3 rounded-lg shadow-sm m-3">
                    <Avatar
                        alt={user?.name || "Avatar"}
                        src={user?.avatar?.url}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">{user?.name || "Admin"}</span>
                        <span className="text-gray-300 text-xs truncate">{user?.email || ""}</span>
                    </div>
                    <button onClick={() => setToggleSidebar && setToggleSidebar(false)} className="sm:hidden text-gray-300 hover:text-white p-1 rounded-full">
                        <CloseIcon fontSize="small"/>
                    </button>
                </div>

                <div className="flex flex-col w-full py-1">
                    {navMenu.map((item, index) => {
                        const { icon, label, ref } = item;
                        return label === "Logout" ? (
                            <button
                                key={index}
                                onClick={handleLogout}
                                className="hover:bg-gray-700/70 text-gray-300 hover:text-white flex gap-3 items-center py-3 px-4 font-medium text-sm transition-colors text-left w-full"
                            >
                                <span className="text-gray-400">{icon}</span>
                                <span>{label}</span>
                            </button>
                        ) : (
                            <Link
                                key={index}
                                to={ref}
                                onClick={() => setToggleSidebar && setToggleSidebar(false)}
                                className={`${activeTab === index ? "bg-primary-blue text-white font-semibold shadow-sm" : "text-gray-300 hover:bg-gray-700/70 hover:text-white"} flex gap-3 items-center py-3 px-4 font-medium text-sm transition-colors`}
                            >
                                <span>{icon}</span>
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-1 bg-gray-900/60 p-3 rounded-lg m-3 text-xs text-gray-400 border border-gray-700/50">
                <span className="font-semibold text-gray-200 uppercase tracking-wider text-[11px]">Admin Control Panel</span>
                <span className="truncate">Flipkart MERN Store</span>
            </div>
        </aside>
    )
};

export default Sidebar;
