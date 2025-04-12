import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || "https://backoffice.sevenpeaksbike.com";

export async function GET(request: NextRequest) {
  // Get array of media IDs from the query parameters
  const idsParam = request.nextUrl.searchParams.getAll("ids");

  if (!idsParam.length) {
    return NextResponse.json(
      { error: "At least one media ID is required" },
      { status: 400 }
    );
  }

  // Parse IDs and remove duplicates
  const mediaIds = Array.from(
    new Set(idsParam.map((id) => parseInt(id, 10)))
  ).filter((id) => !isNaN(id));

  if (!mediaIds.length) {
    return NextResponse.json(
      { error: "No valid media IDs provided" },
      { status: 400 }
    );
  }

  try {
    // Build the WordPress API URL with include[] parameters for each ID
    const queryParams = new URLSearchParams();
    mediaIds.forEach((id) => queryParams.append("include[]", id.toString()));
    queryParams.append("per_page", mediaIds.length.toString());

    const apiUrl = `${WP_URL}/wp-json/wp/v2/media?${queryParams.toString()}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `WordPress API returned ${response.status}` },
        { status: response.status }
      );
    }

    const mediaItems = await response.json();

    // Transform the data to a simplified format
    const simplifiedMedia = mediaItems.map((item: any) => ({
      id: item.id,
      alt_text: item.alt_text || "",
      title: item.title?.rendered || "",
      source_url: item.source_url,
      sizes: {
        thumbnail: item.media_details?.sizes?.thumbnail?.source_url,
        medium: item.media_details?.sizes?.medium?.source_url,
        large: item.media_details?.sizes?.large?.source_url,
      },
    }));

    return NextResponse.json({
      media: simplifiedMedia,
      count: simplifiedMedia.length,
    });
  } catch (error) {
    console.error("Error fetching batch media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 }
    );
  }
}
