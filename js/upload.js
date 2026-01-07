// Image upload utility using Cloudinary
async function uploadImageToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imageData = event.target.result;
                const resp = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ imageData })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    resolve(data.url);
                } else {
                    const err = await resp.json().catch(() => ({}));
                    reject(new Error(err.error || 'Upload failed'));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.uploadImageToCloudinary = uploadImageToCloudinary;
}

module.exports = { uploadImageToCloudinary };
