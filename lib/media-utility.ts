/**
 * Check if an image URL is valid
 * @param url The URL to check
 * @returns True if valid, false otherwise
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    // Only allow http/https URLs for security
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      console.log(`Invalid URL protocol: ${url}`);
      return false;
    }

    // Try to do a HEAD request to check if the URL exists
    const response = await fetch(url, { method: "HEAD" });

    // Check if response is OK and content type is an image
    if (!response.ok) {
      console.log(`URL returned non-OK status: ${response.status} - ${url}`);
      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.log(`URL does not point to an image: ${contentType} - ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error validating image URL ${url}:`, error);
    return false;
  }
}
