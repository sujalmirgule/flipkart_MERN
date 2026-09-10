import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';

import PriceSidebar from './PriceSidebar';
import Stepper from './Stepper';
import { saveShippingInfo } from '../../actions/cartAction';
import MetaData from '../Layouts/MetaData';
import states from '../../utils/states';

const Shipping = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const { cartItems } = useSelector((state) => state.cart);
    const { isAuthenticated, user } = useSelector((state) => state.user);

    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);

    // Form inputs
    const [name, setName] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
    const [pincode, setPincode] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [landmark, setLandmark] = useState('');
    const [addressType, setAddressType] = useState('Home');
    const [isDefault, setIsDefault] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    // Fetch user addresses from database
    const fetchAddresses = async () => {
        try {
            setLoadingAddresses(true);
            const { data } = await axios.get('/api/v1/addresses');
            if (data.success) {
                setAddresses(data.addresses || []);
                // If there's a default address, preselect it; otherwise select first
                if (data.addresses && data.addresses.length > 0) {
                    const defaultAddr = data.addresses.find((a) => a.isDefault) || data.addresses[0];
                    setSelectedAddressId(defaultAddr._id);
                    setShowAddressForm(false);
                } else {
                    // No addresses saved, show form automatically
                    setShowAddressForm(true);
                    if (user?.name) setName(user.name);
                }
            }
        } catch (error) {
            enqueueSnackbar(error.response?.data?.message || 'Could not fetch addresses', { variant: 'error' });
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchAddresses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // Reset Form
    const resetForm = () => {
        setName(user?.name || '');
        setPhoneNo('');
        setPincode('');
        setAddress('');
        setCity('');
        setState('');
        setLandmark('');
        setAddressType('Home');
        setIsDefault(false);
        setEditingAddressId(null);
    };

    // Open Edit Mode
    const handleEditAddress = (addr) => {
        setEditingAddressId(addr._id);
        setName(addr.name || '');
        setPhoneNo(addr.phoneNo ? String(addr.phoneNo) : '');
        setPincode(addr.pincode ? String(addr.pincode) : '');
        setAddress(addr.address || '');
        setCity(addr.city || '');
        setState(addr.state || '');
        setLandmark(addr.landmark || '');
        setAddressType(addr.addressType || 'Home');
        setIsDefault(Boolean(addr.isDefault));
        setShowAddressForm(true);
    };

    // Delete Address
    const handleDeleteAddress = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this delivery address?')) return;

        try {
            const { data } = await axios.delete(`/api/v1/address/${id}`);
            if (data.success) {
                setAddresses(data.addresses || []);
                enqueueSnackbar('Address deleted successfully', { variant: 'success' });
                if (selectedAddressId === id) {
                    const nextAddr = (data.addresses || [])[0];
                    setSelectedAddressId(nextAddr ? nextAddr._id : '');
                    if (!nextAddr) {
                        setShowAddressForm(true);
                        resetForm();
                    }
                }
            }
        } catch (error) {
            enqueueSnackbar(error.response?.data?.message || 'Failed to delete address', { variant: 'error' });
        }
    };

    // Form Submit (Add or Update Address)
    const handleAddressSubmit = async (e) => {
        e.preventDefault();

        if (phoneNo.trim().length !== 10 || isNaN(phoneNo)) {
            enqueueSnackbar('Please enter a valid 10-digit phone number', { variant: 'error' });
            return;
        }

        if (pincode.trim().length !== 6 || isNaN(pincode)) {
            enqueueSnackbar('Please enter a valid 6-digit pincode', { variant: 'error' });
            return;
        }

        if (!state) {
            enqueueSnackbar('Please select a state', { variant: 'error' });
            return;
        }

        setSubmitting(true);
        const payload = {
            name: name.trim(),
            phoneNo: phoneNo.trim(),
            pincode: pincode.trim(),
            address: address.trim(),
            city: city.trim(),
            state,
            landmark: landmark.trim(),
            addressType,
            isDefault,
        };

        try {
            let updatedList = [];
            let activeId = editingAddressId;

            if (editingAddressId) {
                const { data } = await axios.put(`/api/v1/address/${editingAddressId}`, payload);
                updatedList = data.addresses || [];
                enqueueSnackbar('Address updated successfully', { variant: 'success' });
            } else {
                const { data } = await axios.post('/api/v1/addresses', payload);
                updatedList = data.addresses || [];
                // Newly added address is usually the last in array
                const newlyAdded = updatedList[updatedList.length - 1];
                activeId = newlyAdded ? newlyAdded._id : null;
                enqueueSnackbar('Address saved successfully', { variant: 'success' });
            }

            setAddresses(updatedList);
            if (activeId) setSelectedAddressId(activeId);
            setShowAddressForm(false);
            setEditingAddressId(null);

            // Automatically proceed with delivery for this address
            dispatch(
                saveShippingInfo({
                    name: payload.name,
                    address: payload.address,
                    city: payload.city,
                    state: payload.state,
                    country: 'IN',
                    pincode: Number(payload.pincode),
                    phoneNo: Number(payload.phoneNo),
                })
            );
            navigate('/order/confirm');
        } catch (error) {
            enqueueSnackbar(error.response?.data?.message || 'Error saving address', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Deliver to selected saved address
    const handleDeliverHere = (addr) => {
        dispatch(
            saveShippingInfo({
                name: addr.name,
                address: addr.address,
                city: addr.city,
                state: addr.state,
                country: 'IN',
                pincode: Number(addr.pincode),
                phoneNo: Number(addr.phoneNo),
            })
        );
        navigate('/order/confirm');
    };

    return (
        <>
            <MetaData title="Flipkart: Delivery Address" />
            <main className="w-full mt-20">
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-11/12 mt-0 sm:mt-4 m-auto sm:mb-7 overflow-hidden">
                    {/* Main Column */}
                    <div className="flex-1">
                        <Stepper activeStep={1}>
                            <div className="w-full bg-white">
                                {loadingAddresses ? (
                                    <div className="flex justify-center items-center py-12">
                                        <CircularProgress size={36} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col w-full">
                                        {/* Saved Addresses List */}
                                        {addresses.length > 0 && (
                                            <div className="flex flex-col divide-y">
                                                {addresses.map((addr) => {
                                                    const isSelected = selectedAddressId === addr._id;
                                                    return (
                                                        <div
                                                            key={addr._id}
                                                            onClick={() => setSelectedAddressId(addr._id)}
                                                            className={`p-4 sm:p-5 cursor-pointer transition-colors ${
                                                                isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Radio
                                                                    checked={isSelected}
                                                                    onChange={() => setSelectedAddressId(addr._id)}
                                                                    value={addr._id}
                                                                    name="address-radio"
                                                                    size="small"
                                                                    sx={{ padding: '2px', color: '#2874f0', '&.Mui-checked': { color: '#2874f0' } }}
                                                                />

                                                                <div className="flex-1 text-sm">
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <span className="font-semibold text-gray-800 text-base">
                                                                            {addr.name}
                                                                        </span>
                                                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wider">
                                                                            {addr.addressType || 'Home'}
                                                                        </span>
                                                                        <span className="font-semibold text-gray-800">
                                                                            {addr.phoneNo}
                                                                        </span>
                                                                        {addr.isDefault && (
                                                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">
                                                                                Default
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                                                                        {addr.address}
                                                                        {addr.landmark ? `, Near ${addr.landmark}` : ''}, {addr.city},{' '}
                                                                        {addr.state} - <span className="font-medium text-gray-800">{addr.pincode}</span>
                                                                    </p>

                                                                    {isSelected && (
                                                                        <div className="mt-4 flex items-center gap-4">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeliverHere(addr)}
                                                                                className="bg-primary-orange text-white px-8 py-2.5 rounded-sm font-medium uppercase shadow hover:shadow-md transition tracking-wide text-sm"
                                                                            >
                                                                                Deliver Here
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleEditAddress(addr);
                                                                                }}
                                                                                className="text-primary-blue text-sm font-medium hover:underline flex items-center gap-1"
                                                                            >
                                                                                <EditIcon sx={{ fontSize: 16 }} /> Edit
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => handleDeleteAddress(addr._id, e)}
                                                                                className="text-red-600 text-sm font-medium hover:underline flex items-center gap-1 ml-auto"
                                                                            >
                                                                                <DeleteOutlineIcon sx={{ fontSize: 17 }} /> Delete
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Toggle Add New Address Button */}
                                        {!showAddressForm && (
                                            <div className="p-4 border-t border-gray-200">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetForm();
                                                        setShowAddressForm(true);
                                                    }}
                                                    className="flex items-center gap-2 text-primary-blue font-medium text-sm py-2 px-3 hover:bg-blue-50 rounded"
                                                >
                                                    <AddIcon sx={{ fontSize: 20 }} />
                                                    <span>Add a new address</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Address Entry / Edit Form */}
                                        {showAddressForm && (
                                            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50/50">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-semibold text-gray-800 uppercase text-xs tracking-wider text-primary-blue">
                                                        {editingAddressId ? 'Edit Delivery Address' : 'Add A New Address'}
                                                    </h3>
                                                    {addresses.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowAddressForm(false);
                                                                setEditingAddressId(null);
                                                            }}
                                                            className="text-gray-500 hover:text-gray-800 text-xs font-medium uppercase"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>

                                                <form onSubmit={handleAddressSubmit} autoComplete="off" className="flex flex-col gap-4 max-w-2xl">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <TextField
                                                            value={name}
                                                            onChange={(e) => setName(e.target.value)}
                                                            label="Name"
                                                            size="small"
                                                            variant="outlined"
                                                            required
                                                        />
                                                        <TextField
                                                            value={phoneNo}
                                                            onChange={(e) => setPhoneNo(e.target.value)}
                                                            type="tel"
                                                            label="10-digit mobile number"
                                                            size="small"
                                                            variant="outlined"
                                                            inputProps={{ maxLength: 10 }}
                                                            required
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <TextField
                                                            value={pincode}
                                                            onChange={(e) => setPincode(e.target.value)}
                                                            type="tel"
                                                            label="Pincode"
                                                            size="small"
                                                            variant="outlined"
                                                            inputProps={{ maxLength: 6 }}
                                                            required
                                                        />
                                                        <TextField
                                                            value={landmark}
                                                            onChange={(e) => setLandmark(e.target.value)}
                                                            label="Locality / Landmark (Optional)"
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </div>

                                                    <TextField
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        label="Address (Area and Street)"
                                                        multiline
                                                        rows={2}
                                                        size="small"
                                                        variant="outlined"
                                                        required
                                                    />

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <TextField
                                                            value={city}
                                                            onChange={(e) => setCity(e.target.value)}
                                                            label="City/District/Town"
                                                            size="small"
                                                            variant="outlined"
                                                            required
                                                        />
                                                        <FormControl size="small" fullWidth required>
                                                            <InputLabel id="state-select-label">State</InputLabel>
                                                            <Select
                                                                labelId="state-select-label"
                                                                value={state}
                                                                label="State"
                                                                onChange={(e) => setState(e.target.value)}
                                                            >
                                                                {states.map((item) => (
                                                                    <MenuItem key={item.code} value={item.code}>
                                                                        {item.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </div>

                                                    {/* Address Type */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-gray-500 font-medium">Address Type</span>
                                                        <RadioGroup
                                                            row
                                                            value={addressType}
                                                            onChange={(e) => setAddressType(e.target.value)}
                                                        >
                                                            <FormControlLabel
                                                                value="Home"
                                                                control={<Radio size="small" sx={{ color: '#2874f0', '&.Mui-checked': { color: '#2874f0' } }} />}
                                                                label={<span className="text-sm">Home (All day delivery)</span>}
                                                            />
                                                            <FormControlLabel
                                                                value="Work"
                                                                control={<Radio size="small" sx={{ color: '#2874f0', '&.Mui-checked': { color: '#2874f0' } }} />}
                                                                label={<span className="text-sm">Work (Delivery between 10 AM - 5 PM)</span>}
                                                            />
                                                        </RadioGroup>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-2">
                                                        <button
                                                            type="submit"
                                                            disabled={submitting}
                                                            className="bg-primary-orange text-white py-3 px-8 text-sm font-medium shadow hover:shadow-md rounded-sm uppercase tracking-wide disabled:opacity-50"
                                                        >
                                                            {submitting ? 'Saving...' : 'Save and Deliver Here'}
                                                        </button>
                                                        {addresses.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowAddressForm(false);
                                                                    setEditingAddressId(null);
                                                                }}
                                                                className="text-primary-blue text-sm font-medium uppercase px-4 py-2 hover:bg-gray-100 rounded"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Stepper>
                    </div>

                    <PriceSidebar cartItems={cartItems} />
                </div>
            </main>
        </>
    );
};

export default Shipping;
