import crypto from "crypto";

const getCloudinaryConfig = () => {
  const cloudName = String(
    process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || ""
  ).trim();
  const apiKey = String(
    process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY || ""
  ).trim();
  const apiSecret = String(
    process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET || ""
  ).trim();
  const uploadPreset = String(
    process.env.CLOUDINARY_UPLOAD_PRESET ||
      process.env.CLOUDINARY_UNSIGNED_UPLOAD_PRESET ||
      ""
  ).trim();

  if (!cloudName) {
    throw new Error(
      "Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME/CLOUD_NAME."
    );
  }

  if ((!apiKey || !apiSecret) && !uploadPreset) {
    throw new Error(
      "Cloudinary credentials missing. Set CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET for signed uploads or CLOUDINARY_UPLOAD_PRESET for unsigned uploads."
    );
  }

  return { cloudName, apiKey, apiSecret, uploadPreset };
};

export const uploadImageToCloudinary = async ({
  file,
  folder = "hu-erp/profile-images",
  publicId,
}) => {
  const { cloudName, apiKey, apiSecret, uploadPreset } = getCloudinaryConfig();
  const useSignedUpload = Boolean(apiKey && apiSecret);
  const timestamp = Math.floor(Date.now() / 1000);
  const resolvedPublicId = publicId || `profile_${timestamp}`;

  const buildPayload = ({ signed }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("public_id", resolvedPublicId);

    if (signed) {
      const signatureBase = `folder=${folder}&public_id=${resolvedPublicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto
        .createHash("sha1")
        .update(signatureBase)
        .digest("hex");

      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      if (uploadPreset) {
        formData.append("upload_preset", uploadPreset);
      }
    } else {
      formData.append("upload_preset", uploadPreset);
    }

    return formData;
  };

  const sendUpload = async (payload) => {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: payload,
      }
    );
    const data = await response.json();
    return { response, data };
  };

  let { response, data } = await sendUpload(buildPayload({ signed: useSignedUpload }));
  const responseMessage = String(data?.error?.message || "");

  if (
    !response.ok &&
    useSignedUpload &&
    uploadPreset &&
    /upload preset must be specified/i.test(responseMessage)
  ) {
    ({ response, data } = await sendUpload(buildPayload({ signed: false })));
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  if (!data?.secure_url) {
    throw new Error("Cloudinary upload succeeded but secure URL is missing");
  }

  return data.secure_url;
};

