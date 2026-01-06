import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeRatingModel from "@/lib/models/EmployeeRating";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.token || typeof body.score !== "number") {
      return NextResponse.json(
        { error: "token and numeric score are required" },
        { status: 400 }
      );
    }

    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: "Score must be between 1 and 5" },
        { status: 400 }
      );
    }

    const comment =
      typeof body.comment === "string" ? body.comment.slice(0, 1000) : undefined;

    await connectToDatabase();

    const rating = await EmployeeRatingModel.findOne({
      ratingToken: body.token,
    });

    if (!rating) {
      return NextResponse.json(
        { error: "Invalid or expired rating link" },
        { status: 404 }
      );
    }

    // If score already set (> 0), treat as already submitted
    if (rating.score && rating.score >= 1 && rating.score <= 5) {
      return NextResponse.json(
        { error: "This rating link has already been used" },
        { status: 409 }
      );
    }

    rating.score = score;
    if (comment) {
      rating.comment = comment;
    }
    await rating.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ratings/submit] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}


