import crypto from "crypto";

const getCloudinaryConfig = () => {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUD_NAME;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUD_API_KEY;
  const apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env.CLOUD_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME/CLOUD_NAME, CLOUDINARY_API_KEY/CLOUD_API_KEY and CLOUDINARY_API_SECRET/CLOUD_API_SECRET."
    );
  }

  return { cloudName, apiKey, apiSecret };
};

export const uploadImageToCloudinary = async ({
  file,
  folder = "hu-erp/profile-images",
  publicId,
}) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const resolvedPublicId = publicId || `profile_${timestamp}`;

  const signatureBase = `folder=${folder}&public_id=${resolvedPublicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureBase)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("public_id", resolvedPublicId);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  if (!data?.secure_url) {
    throw new Error("Cloudinary upload succeeded but secure URL is missing");
  }

  return data.secure_url;
};

