import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || "https://backoffice.sevenpeaksbike.com";

export async function GET(request: NextRequest) {
  const mediaId = request.nextUrl.searchParams.get("id");

  if (!mediaId) {
    return NextResponse.json(
      { error: "Media ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the media details from WordPress
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/media/${mediaId}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: `WordPress API returned ${response.status}` },
        { status: response.status }
      );
    }

    const mediaData = await response.json();

    // Create a simplified response with just the needed information
    const simplifiedMedia = {
      id: mediaData.id,
      alt_text: mediaData.alt_text || "",
      title: mediaData.title?.rendered || "",
      source_url: mediaData.source_url,
      // Include the various sized versions
      sizes: {
        thumbnail: mediaData.media_details?.sizes?.thumbnail?.source_url,
        medium: mediaData.media_details?.sizes?.medium?.source_url,
        large: mediaData.media_details?.sizes?.large?.source_url,
      },
    };

    return NextResponse.json(simplifiedMedia);
  } catch (error) {
    console.error("Error fetching WordPress media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 }
    );
  }
}
