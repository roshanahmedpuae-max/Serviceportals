import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeRatingModel from "@/lib/models/EmployeeRating";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["employee"]);
    await connectToDatabase();

    const ratings = await EmployeeRatingModel.find({
      employeeId: auth.id,
      businessUnit: auth.businessUnit,
      score: { $gte: 1 },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!ratings.length) {
      return NextResponse.json({
        averageScore: null,
        count: 0,
        ratings: [],
      });
    }

    const total = ratings.reduce((sum, r: any) => sum + (r.score || 0), 0);
    const averageScore = total / ratings.length;

    return NextResponse.json({
      averageScore,
      count: ratings.length,
      ratings: ratings.map((r: any) => ({
        id: r._id,
        workOrderId: r.workOrderId,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[ratings/employee] Error:", error);
    const status = error?.statusCode ?? 500;
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status }
    );
  }
}


