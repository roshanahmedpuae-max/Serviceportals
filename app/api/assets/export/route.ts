import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AssetDateModel } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "";
    const days = parseInt(searchParams.get("days") || "90", 10);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + days);

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
      dateValue: { $lte: end },
    };

    if (status) {
      query.status = status;
    }

    const dates = await AssetDateModel.find(query).sort({ dateValue: 1 }).limit(5000);

    const header = [
      "BusinessUnit",
      "Category",
      "AssetId",
      "DateType",
      "Date",
      "Status",
    ];

    const rows = dates.map((d) => {
      const obj = d.toObject() as any;
      return [
        obj.businessUnit ?? "",
        obj.categoryKey,
        obj.assetId,
        obj.dateType,
        new Date(obj.dateValue).toISOString().slice(0, 10),
        obj.status,
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="assets-expiry-${user.businessUnit}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}















