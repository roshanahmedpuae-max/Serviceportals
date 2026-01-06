import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AssetDateModel } from "@/lib/models/Assets";

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || ""; // upcoming | overdue | resolved | ""
    const windowDays = parseInt(searchParams.get("windowDays") || "90", 10);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + windowDays);

    const query: Record<string, unknown> = {
      businessUnit: user.businessUnit,
      dateValue: { $lte: end },
    };

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ["upcoming", "overdue"] };
    }

    const dates = await AssetDateModel.find(query).sort({ dateValue: 1 }).limit(1000);

    const items = dates.map((d) => {
      const dateValue = d.dateValue;
      const diffMs = dateValue.getTime() - startOfToday.getTime();
      const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const obj = d.toObject() as any;
      return {
        id: obj.id ?? obj._id,
        categoryKey: obj.categoryKey,
        assetId: obj.assetId,
        businessUnit: obj.businessUnit,
        dateType: obj.dateType,
        dateValue: obj.dateValue,
        status: obj.status,
        daysUntil,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}















