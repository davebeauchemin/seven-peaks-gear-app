import { fetchCSVData } from "@/lib/csv-helpers";
import { CollectionCSVItem } from "@/app/api/sync-product/route";
import { NextRequest, NextResponse } from "next/server";
import { SureCartProductCollection } from "@/types";
import { createProductCollection } from "@/lib/surecart/surecart-collections";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { success: false, message: "Name and slug are required" },
        { status: 400 }
      );
    }

    const collection: SureCartProductCollection = {
      name: body.name,
      slug: body.slug,
      description: body.description || "",
      position: body.position,
      metadata: {
        ...(body.parent_collection
          ? { parent_collection: body.parent_collection }
          : {}),
      },
    };

    const createdCollection = await createProductCollection(collection);

    return NextResponse.json({
      success: true,
      collection: createdCollection,
    });
  } catch (error: any) {
    console.error("Error creating collection:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create collection",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
