const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseUploadDir = path.join(__dirname, '../../uploads');

// Ensure upload subdirectories exist
const subDirs = ['products', 'brands', 'avatars'];
if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
}
subDirs.forEach((sub) => {
    const dir = path.join(baseUploadDir, sub);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dest = baseUploadDir;
        if (file.fieldname === 'images' || file.fieldname === 'image') {
            dest = path.join(baseUploadDir, 'products');
        } else if (file.fieldname === 'logo') {
            dest = path.join(baseUploadDir, 'brands');
        } else if (file.fieldname === 'avatar') {
            dest = path.join(baseUploadDir, 'avatars');
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept standard images
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname || mimetype || !file.originalname) {
        return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp, gif, svg) are allowed!'), false);
};

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter
});

/**
 * Helper to save base64 string directly to disk if images/logo are passed as base64 strings
 */
const saveBase64Image = (base64Str, subfolder = 'products') => {
    if (!base64Str || typeof base64Str !== 'string') return null;

    // If it is already an accessible URL, return as is
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://') || base64Str.startsWith('/uploads/')) {
        return {
            public_id: `existing_${Date.now()}`,
            url: base64Str,
        };
    }

    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
        return {
            public_id: `raw_${Date.now()}`,
            url: base64Str,
        };
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${subfolder}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const targetDir = path.join(baseUploadDir, subfolder);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, filename), buffer);

    return {
        public_id: filename,
        url: `/uploads/${subfolder}/${filename}`,
    };
};

/**
 * Helper to upload file buffer/path to Cloudinary if available, otherwise fallback to local upload
 */
const uploadToCloudinaryOrLocal = async (file, folder = 'products') => {
    // Check if Cloudinary is configured
    const isCloudinaryConfigured = Boolean(
        process.env.CLOUDINARY_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_NAME !== 'your_cloud_name'
    );

    if (isCloudinaryConfigured && file && file.path) {
        try {
            const cloudinary = require('cloudinary').v2;
            const result = await cloudinary.uploader.upload(file.path, {
                folder: `flipkart/${folder}`,
                resource_type: 'auto',
            });

            // Clean up temporary local file after successful upload to Cloudinary
            if (fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {}
            }

            return {
                public_id: result.public_id,
                url: result.secure_url,
            };
        } catch (error) {
            console.warn(`[Upload] Cloudinary upload failed (${error.message}). Falling back to local storage.`);
        }
    }

    // Fallback: Use local file already saved by Multer disk storage
    if (file && file.filename) {
        return {
            public_id: file.filename,
            url: `/uploads/${folder}/${file.filename}`,
        };
    }

    return null;
};

module.exports = {
    upload,
    saveBase64Image,
    uploadToCloudinaryOrLocal,
    baseUploadDir
};
