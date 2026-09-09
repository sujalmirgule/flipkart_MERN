import TextField from '@mui/material/TextField';
import { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { NEW_PRODUCT_RESET } from '../../constants/productConstants';
import { createProduct, clearErrors } from '../../actions/productAction';
import ImageIcon from '@mui/icons-material/Image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { categories } from '../../utils/constants';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';

const NewProduct = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const { loading, success, error } = useSelector((state) => state.newProduct);

    const [highlights, setHighlights] = useState([]);
    const [highlightInput, setHighlightInput] = useState("");
    const [specs, setSpecs] = useState([]);
    const [specsInput, setSpecsInput] = useState({
        title: "",
        description: ""
    });

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [cuttedPrice, setCuttedPrice] = useState(0);
    const [category, setCategory] = useState("");
    const [stock, setStock] = useState(0);
    const [warranty, setWarranty] = useState(0);
    const [brand, setBrand] = useState("");
    
    // Arrays for images and previews
    const [images, setImages] = useState([]);
    const [imagesPreview, setImagesPreview] = useState([]);

    const [logo, setLogo] = useState("");
    const [logoPreview, setLogoPreview] = useState("");

    const handleSpecsChange = (e) => {
        setSpecsInput({ ...specsInput, [e.target.name]: e.target.value });
    }

    const addSpecs = () => {
        if (!specsInput.title.trim() || !specsInput.description.trim()) {
            enqueueSnackbar("Please enter both Specification Title and Description", { variant: "warning" });
            return;
        }
        setSpecs([...specs, specsInput]);
        setSpecsInput({ title: "", description: "" });
    }

    const addHighlight = () => {
        if (!highlightInput.trim()) return;
        setHighlights([...highlights, highlightInput.trim()]);
        setHighlightInput("");
    }

    const deleteHighlight = (index) => {
        setHighlights(highlights.filter((_, i) => i !== index));
    }

    const deleteSpec = (index) => {
        setSpecs(specs.filter((_, i) => i !== index));
    }

    // Brand logo handler with image validation
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            enqueueSnackbar("Please upload a valid image file (PNG, JPG, WEBP, SVG)", { variant: "error" });
            return;
        }

        setLogo(file);

        const reader = new FileReader();
        reader.onload = () => {
            if (reader.readyState === 2) {
                setLogoPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }

    const handleRemoveLogo = () => {
        setLogo("");
        setLogoPreview("");
    }

    // Product images handler: Append new files to existing selection
    const handleProductImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = files.filter(file => {
            if (!file.type.startsWith("image/")) {
                enqueueSnackbar(`Skipped non-image file: ${file.name}`, { variant: "warning" });
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setImages((prev) => [...prev, ...validFiles]);

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setImagesPreview((prev) => [...prev, reader.result]);
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input value so same files can be reselected if needed
        e.target.value = null;
    }

    // Remove individual product image before upload
    const handleRemoveImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
        setImagesPreview(imagesPreview.filter((_, index) => index !== indexToRemove));
    }

    const newProductSubmitHandler = (e) => {
        e.preventDefault();

        // Required field checks
        if (!name.trim()) {
            enqueueSnackbar("Please enter product name", { variant: "warning" });
            return;
        }
        if (!description.trim()) {
            enqueueSnackbar("Please enter product description", { variant: "warning" });
            return;
        }
        if (!category) {
            enqueueSnackbar("Please select a category", { variant: "warning" });
            return;
        }
        if (!brand.trim()) {
            enqueueSnackbar("Please enter brand name", { variant: "warning" });
            return;
        }
        if (highlights.length <= 0) {
            enqueueSnackbar("Add at least 1 Highlight", { variant: "warning" });
            return;
        }
        if (!logo) {
            enqueueSnackbar("Add Brand Logo", { variant: "warning" });
            return;
        }
        if (specs.length < 2) {
            enqueueSnackbar("Add Minimum 2 Specifications", { variant: "warning" });
            return;
        }
        if (images.length <= 0) {
            enqueueSnackbar("Add at least 1 Product Image", { variant: "warning" });
            return;
        }

        const formData = new FormData();

        formData.set("name", name);
        formData.set("description", description);
        formData.set("price", price);
        formData.set("cuttedPrice", cuttedPrice);
        formData.set("category", category);
        formData.set("stock", stock);
        formData.set("warranty", warranty);
        formData.set("brandname", brand);
        formData.set("logo", logo);

        images.forEach((image) => {
            formData.append("images", image);
        });

        highlights.forEach((h) => {
            formData.append("highlights", h);
        });

        specs.forEach((s) => {
            formData.append("specifications", JSON.stringify(s));
        });

        dispatch(createProduct(formData));
    }

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (success) {
            enqueueSnackbar("Product Created Successfully", { variant: "success" });
            dispatch({ type: NEW_PRODUCT_RESET });
            navigate("/admin/products");
        }
    }, [dispatch, error, success, navigate, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Admin: New Product | Flipkart" />

            {loading && <BackdropLoader />}

            <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">Create New Product</h1>
                        <p className="text-blue-100 text-xs mt-0.5">Fill in product details, images, highlights and specifications</p>
                    </div>
                </div>

                <form onSubmit={newProductSubmitHandler} encType="multipart/form-data" className="p-4 sm:p-6 lg:p-8 flex flex-col gap-8" id="mainform">
                    
                    {/* 2-Column Responsive Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        
                        {/* LEFT COLUMN: Core Info & Brand */}
                        <div className="flex flex-col gap-6">
                            
                            {/* Section 1: Basic Information */}
                            <div className="bg-gray-50/60 p-4 sm:p-5 rounded-lg border border-gray-200/80 flex flex-col gap-4">
                                <div className="border-b border-gray-200 pb-2">
                                    <h2 className="text-base font-semibold text-gray-800">1. Product Information</h2>
                                    <p className="text-xs text-gray-500">Title, description, pricing and inventory</p>
                                </div>

                                <TextField
                                    label="Product Name"
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />

                                <TextField
                                    label="Description"
                                    multiline
                                    rows={3}
                                    required
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <TextField
                                        label="Price (₹)"
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        InputProps={{ inputProps: { min: 0 } }}
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                    <TextField
                                        label="Cutted Price (₹)"
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        InputProps={{ inputProps: { min: 0 } }}
                                        required
                                        value={cuttedPrice}
                                        onChange={(e) => setCuttedPrice(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <TextField
                                        label="Category"
                                        select
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                        required
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {categories.map((el, i) => (
                                            <MenuItem value={el} key={i}>
                                                {el}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        label="Stock"
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        InputProps={{ inputProps: { min: 0 } }}
                                        required
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                    />
                                    <TextField
                                        label="Warranty (Years)"
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        InputProps={{ inputProps: { min: 0 } }}
                                        required
                                        value={warranty}
                                        onChange={(e) => setWarranty(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Highlights */}
                            <div className="bg-gray-50/60 p-4 sm:p-5 rounded-lg border border-gray-200/80 flex flex-col gap-4">
                                <div className="border-b border-gray-200 pb-2">
                                    <h2 className="text-base font-semibold text-gray-800">2. Highlights</h2>
                                    <p className="text-xs text-gray-500">Key bullet points showcased on the product page</p>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <input
                                        value={highlightInput}
                                        onChange={(e) => setHighlightInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                                        type="text"
                                        placeholder="e.g. 1 Year Comprehensive Warranty"
                                        className="px-3 py-2 text-sm border border-gray-300 rounded flex-1 focus:ring-1 focus:ring-primary-blue focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={addHighlight}
                                        className="py-2 px-4 bg-primary-blue text-white text-sm font-medium rounded hover:bg-blue-700 transition shadow"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                    {highlights.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No highlights added yet.</p>
                                    ) : (
                                        highlights.map((h, i) => (
                                            <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-blue-50/60 border border-blue-100 rounded text-sm">
                                                <span className="text-gray-700 text-xs sm:text-sm font-medium">✦ {h}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteHighlight(i)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Brand Details */}
                            <div className="bg-gray-50/60 p-4 sm:p-5 rounded-lg border border-gray-200/80 flex flex-col gap-4">
                                <div className="border-b border-gray-200 pb-2">
                                    <h2 className="text-base font-semibold text-gray-800">3. Brand Details</h2>
                                    <p className="text-xs text-gray-500">Brand identity & official logo</p>
                                </div>

                                <TextField
                                    label="Brand Name"
                                    type="text"
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    required
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                />

                                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-1 bg-gray-50 overflow-hidden relative group">
                                        {logoPreview ? (
                                            <>
                                                <img draggable="false" src={logoPreview} alt="Brand Logo" className="w-full h-full object-contain" />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveLogo}
                                                    title="Remove Logo"
                                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100"
                                                >
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <ImageIcon fontSize="medium" />
                                                <span className="text-[10px] text-center">No Logo</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold rounded cursor-pointer transition shadow">
                                            <CloudUploadIcon fontSize="small" />
                                            <span>{logoPreview ? "Change Logo" : "Choose Brand Logo"}</span>
                                            <input
                                                type="file"
                                                name="logo"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-[11px] text-gray-500">Supports PNG, JPG, WEBP or SVG. Max 20MB.</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Specifications & Product Images */}
                        <div className="flex flex-col gap-6">
                            
                            {/* Section 4: Specifications */}
                            <div className="bg-gray-50/60 p-4 sm:p-5 rounded-lg border border-gray-200/80 flex flex-col gap-4">
                                <div className="border-b border-gray-200 pb-2">
                                    <h2 className="text-base font-semibold text-gray-800">4. Specifications</h2>
                                    <p className="text-xs text-gray-500">Technical specifications (min 2 required)</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <TextField
                                        value={specsInput.title}
                                        onChange={handleSpecsChange}
                                        name="title"
                                        label="Name / Feature"
                                        placeholder="e.g. Model No or RAM"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                    />
                                    <TextField
                                        value={specsInput.description}
                                        onChange={handleSpecsChange}
                                        name="description"
                                        label="Value / Description"
                                        placeholder="e.g. 8GB DDR4"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={addSpecs}
                                    className="self-end inline-flex items-center gap-1 py-1.5 px-4 bg-primary-blue text-white text-xs font-medium rounded hover:bg-blue-700 transition shadow"
                                >
                                    <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                                    Add Specification
                                </button>

                                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                                    {specs.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No specifications added yet. Add at least 2.</p>
                                    ) : (
                                        specs.map((spec, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs sm:text-sm rounded bg-white border border-gray-200 py-2 px-3">
                                                <div className="flex flex-col sm:flex-row sm:gap-2">
                                                    <span className="font-semibold text-gray-700">{spec.title}:</span>
                                                    <span className="text-gray-600">{spec.description}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteSpec(i)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Section 5: Product Images */}
                            <div className="bg-gray-50/60 p-4 sm:p-5 rounded-lg border border-gray-200/80 flex flex-col gap-4">
                                <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-800">5. Product Images</h2>
                                        <p className="text-xs text-gray-500">Upload multiple high-res product photos</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                        {imagesPreview.length} Selected
                                    </span>
                                </div>

                                {/* Image Preview Grid with Remove Buttons */}
                                <div className="min-h-[160px] p-3 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                                    {imagesPreview.length === 0 ? (
                                        <div className="h-36 flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <ImageIcon sx={{ fontSize: 40 }} className="text-gray-300" />
                                            <span className="text-xs font-medium">No images uploaded yet</span>
                                            <span className="text-[11px] text-gray-400">Click below to select multiple images</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {imagesPreview.map((image, i) => (
                                                <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50 flex items-center justify-center">
                                                    <img
                                                        draggable="false"
                                                        src={image}
                                                        alt={`Product Preview ${i + 1}`}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(i)}
                                                        title="Remove Image"
                                                        className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                                                    >
                                                        <CloseIcon sx={{ fontSize: 14 }} />
                                                    </button>
                                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                                        #{i + 1}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <label className="flex items-center justify-center gap-2 rounded font-medium bg-primary-blue hover:bg-blue-700 text-white py-2.5 px-4 cursor-pointer transition shadow">
                                    <CloudUploadIcon fontSize="small" />
                                    <span className="text-sm">Select Product Images</span>
                                    <input
                                        type="file"
                                        name="images"
                                        accept="image/*"
                                        multiple
                                        onChange={handleProductImageChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                        </div>

                    </div>

                    {/* Bottom Submit Action */}
                    <div className="border-t border-gray-200 pt-6 flex justify-end">
                        <button
                            type="submit"
                            form="mainform"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3 bg-primary-orange hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition uppercase tracking-wide cursor-pointer disabled:bg-orange-300"
                        >
                            {loading ? "Creating Product..." : "Submit Product"}
                        </button>
                    </div>

                </form>
            </div>
        </>
    );
};

export default NewProduct;
