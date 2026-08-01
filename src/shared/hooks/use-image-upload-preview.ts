import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import { validateImageUploadFile } from "@/shared/utils/image-upload-validation";

type UseImageUploadPreviewOptions = {
  hideStoredImage?: boolean;
  resetKey?: string | number | boolean | null;
  storedImageUrl?: string | null;
};

export function useImageUploadPreview({
  hideStoredImage = false,
  resetKey = null,
  storedImageUrl = null,
}: UseImageUploadPreviewOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolvedStoredImageUrl = useMemo(
    () => resolveApiAssetUrl(storedImageUrl),
    [storedImageUrl],
  );
  const visibleImageUrl =
    previewUrl ?? (hideStoredImage ? null : resolvedStoredImageUrl);

  useEffect(() => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectFile = useCallback((nextFile: File | null) => {
    if (!nextFile) {
      setError(null);
      return null;
    }

    const validationError = validateImageUploadFile(nextFile);

    if (validationError) {
      setError(validationError);
      return validationError;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setError(null);
    return null;
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  return {
    clearFile,
    error,
    file,
    previewUrl,
    selectFile,
    visibleImageUrl,
  };
}
