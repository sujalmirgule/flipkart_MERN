const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const SearchFeatures = require('../utils/searchFeatures');
const ErrorHandler = require('../utils/errorHandler');
const cloudinary = require('cloudinary');
const { saveBase64Image, uploadToCloudinaryOrLocal } = require('../utils/upload');

// Get All Products
exports.getAllProducts = asyncErrorHandler(async (req, res, next) => {

    const resultPerPage = 12;
    const productsCount = await Product.countDocuments();
    // console.log(req.query);

    const searchFeature = new SearchFeatures(Product.find(), req.query)
        .search()
        .filter();

    let products = await searchFeature.query;
    let filteredProductsCount = products.length;

    searchFeature.pagination(resultPerPage);

    products = await searchFeature.query.clone();

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount,
    });
});

// Get All Products ---Product Sliders
exports.getProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

// Get All Products ---ADMIN
exports.getAdminProducts = asyncErrorHandler(async (req, res, next) => {
    console.log("[Products API] Fetching admin products from MongoDB...");
    const products = await Product.find() || [];
    console.log(`[Products API] Found ${products.length} products`);

    res.status(200).json({
        success: true,
        products,
    });
});

// Create Product ---ADMIN
exports.createProduct = asyncErrorHandler(async (req, res, next) => {
    let imagesLink = [];

    // 1. If files were uploaded via Multer (upload to Cloudinary or fallback to local)
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            if (file.fieldname === 'images' || file.fieldname === 'image') {
                const uploaded = await uploadToCloudinaryOrLocal(file, 'products');
                if (uploaded) {
                    imagesLink.push(uploaded);
                }
            }
        }
    }

    // 2. If images passed in req.body.images (base64 or string array)
    if (req.body.images) {
        let rawImages = [];
        if (typeof req.body.images === "string") {
            try {
                const parsed = JSON.parse(req.body.images);
                rawImages = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                rawImages = [req.body.images];
            }
        } else if (Array.isArray(req.body.images)) {
            rawImages = req.body.images;
        }

        rawImages.forEach((img) => {
            const saved = saveBase64Image(img, 'products');
            if (saved) {
                imagesLink.push(saved);
            }
        });
    }

    // Brand logo
    let brandLogo = {
        public_id: `brand_${Date.now()}`,
        url: "https://rukminim1.flixcart.com/image/160/160/prod-maker-avatar/600x600-brands-8.png",
    };

    if (req.files && req.files.length > 0) {
        const logoFile = req.files.find((f) => f.fieldname === 'logo');
        if (logoFile) {
            const uploadedLogo = await uploadToCloudinaryOrLocal(logoFile, 'brands');
            if (uploadedLogo) {
                brandLogo = uploadedLogo;
            }
        }
    }

    if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.trim() !== '') {
        const savedLogo = saveBase64Image(req.body.logo, 'brands');
        if (savedLogo) {
            brandLogo = savedLogo;
        }
    }

    req.body.brand = {
        name: req.body.brandname || req.body.brand || "Generic",
        logo: brandLogo,
    };

    req.body.images = imagesLink;

    // Use authenticated user ID
    req.body.user = req.user._id;

    let specs = [];
    if (req.body.specifications) {
        if (Array.isArray(req.body.specifications)) {
            req.body.specifications.forEach((s) => {
                try {
                    specs.push(typeof s === 'string' ? JSON.parse(s) : s);
                } catch(e) {
                    specs.push({ title: "General", description: String(s) });
                }
            });
        } else if (typeof req.body.specifications === 'string') {
            try {
                const parsed = JSON.parse(req.body.specifications);
                if (Array.isArray(parsed)) specs = parsed;
                else specs.push(parsed);
            } catch(e) {
                specs.push({ title: "General", description: req.body.specifications });
            }
        }
    }
    req.body.specifications = specs;

    if (req.body.highlights) {
        if (!Array.isArray(req.body.highlights)) {
            req.body.highlights = [req.body.highlights];
        }
    } else {
        req.body.highlights = ["Standard Warranty", "Assured Quality"];
    }

    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        product,
    });
});

// Update Product ---ADMIN
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    let retainedImages = [];

    // Check if existing/old images list was passed to retain
    if (req.body.existingImages !== undefined) {
        try {
            const parsed = typeof req.body.existingImages === "string"
                ? JSON.parse(req.body.existingImages)
                : req.body.existingImages;
            if (Array.isArray(parsed)) {
                retainedImages = parsed;
            }
        } catch (e) {
            // If string or single object
            if (req.body.existingImages) retainedImages = [req.body.existingImages];
        }
    } else {
        // Default: Keep existing product images if not explicitly modified
        retainedImages = product.images || [];
    }

    let newImagesList = [];

    // 1. Files uploaded via Multer (upload to Cloudinary or fallback to local)
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            if (file.fieldname === 'images' || file.fieldname === 'image') {
                const uploaded = await uploadToCloudinaryOrLocal(file, 'products');
                if (uploaded) {
                    newImagesList.push(uploaded);
                }
            }
        }
    }

    // 2. Base64 images in req.body.images
    if (req.body.images !== undefined) {
        let rawImages = [];
        if (typeof req.body.images === "string") {
            try {
                const parsed = JSON.parse(req.body.images);
                rawImages = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                rawImages = [req.body.images];
            }
        } else if (Array.isArray(req.body.images)) {
            rawImages = req.body.images;
        }

        rawImages.forEach((img) => {
            const saved = saveBase64Image(img, 'products');
            if (saved) {
                newImagesList.push(saved);
            }
        });
    }

    // Combine retained images + newly added images
    req.body.images = [...retainedImages, ...newImagesList];

    // Brand logo handling: preserve old logo unless a new one was uploaded
    let currentBrandLogo = product.brand ? product.brand.logo : {
        public_id: `brand_${Date.now()}`,
        url: "https://rukminim1.flixcart.com/image/160/160/prod-maker-avatar/600x600-brands-8.png",
    };

    if (req.files && req.files.length > 0) {
        const logoFile = req.files.find((f) => f.fieldname === 'logo');
        if (logoFile) {
            const uploadedLogo = await uploadToCloudinaryOrLocal(logoFile, 'brands');
            if (uploadedLogo) {
                currentBrandLogo = uploadedLogo;
            }
        }
    } else if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.trim() !== '') {
        const savedLogo = saveBase64Image(req.body.logo, 'brands');
        if (savedLogo) {
            currentBrandLogo = savedLogo;
        }
    }

    req.body.brand = {
        name: req.body.brandname || req.body.brand || (product.brand && product.brand.name) || "Generic",
        logo: currentBrandLogo,
    };

    if (req.body.specifications) {
        let specs = [];
        if (Array.isArray(req.body.specifications)) {
            req.body.specifications.forEach((s) => {
                try {
                    specs.push(typeof s === 'string' ? JSON.parse(s) : s);
                } catch(e) {
                    specs.push({ title: "General", description: String(s) });
                }
            });
        } else if (typeof req.body.specifications === 'string') {
            try {
                const parsed = JSON.parse(req.body.specifications);
                if (Array.isArray(parsed)) specs = parsed;
                else specs.push(parsed);
            } catch(e) {
                specs.push({ title: "General", description: req.body.specifications });
            }
        }
        req.body.specifications = specs;
    }

    req.body.user = req.user._id;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
        product,
    });
});

// Delete Product ---ADMIN
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    if (product.images && product.images.length > 0 && process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_NAME !== "your_cloud_name") {
        for (let i = 0; i < product.images.length; i++) {
            try {
                if (product.images[i].public_id) {
                    await cloudinary.v2.uploader.destroy(product.images[i].public_id);
                }
            } catch(e) {}
        }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true
    });
});

// Create OR Update Reviews
exports.createProductReview = asyncErrorHandler(async (req, res, next) => {

    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    }

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const isReviewed = product.reviews.find(review => review.user.toString() === req.user._id.toString());

    if (isReviewed) {

        product.reviews.forEach((rev) => { 
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating, rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

// Get All Reviews of Product
exports.getProductReviews = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        reviews: product.reviews
    });
});

// Delete Reveiws
exports.deleteReview = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.id.toString());

    let avg = 0;

    reviews.forEach((rev) => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(req.query.productId, {
        reviews,
        ratings: Number(ratings),
        numOfReviews,
    }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});