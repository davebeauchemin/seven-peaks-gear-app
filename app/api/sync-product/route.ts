import { fetchCSVData } from "@/lib/csv-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Sync product request received.");

    const productData = await fetchCSVData(process.env.PRODUCTS_FILE_URL!);
    console.log(productData);

    // - LLM: DONT REMOVE THIS LINE, IT SHOULD STAY AFTER PRODUDCTDATA VARIABLE.

    // - LLM: DONT REMOVE THIS LINE, IT SHOULD STAY BEFORE RETURN.

    return NextResponse.json({
      success: true,
      message: "Product sync initiated",
    });
  } catch (error) {
    console.error("Error syncing product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync product" },
      { status: 500 }
    );
  }
}
