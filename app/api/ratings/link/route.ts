import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db";
import WorkOrderModel from "@/lib/models/WorkOrder";
import EmployeeRatingModel from "@/lib/models/EmployeeRating";
import { requireAuth } from "@/lib.auth";

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["employee"]);
    const { workOrderId } = await request.json().catch(() => ({}));

    if (!workOrderId) {
      return NextResponse.json({ error: "workOrderId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const workOrder = await WorkOrderModel.findById(workOrderId);
    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    if (workOrder.businessUnit !== auth.businessUnit) {
      return NextResponse.json({ error: "Work order not in your business unit" }, { status: 403 });
    }

    if (workOrder.assignedEmployeeId !== auth.id) {
      return NextResponse.json({ error: "You are not assigned to this work order" }, { status: 403 });
    }

    if (workOrder.status !== "Submitted") {
      return NextResponse.json(
        { error: "Rating can only be requested for submitted/completed work orders" },
        { status: 400 }
      );
    }

    // Reuse existing rating for this work order + employee if present
    let rating = await EmployeeRatingModel.findOne({
      businessUnit: auth.businessUnit,
      employeeId: auth.id,
      workOrderId,
    });

    if (!rating) {
      const ratingToken = generateToken();
      rating = await EmployeeRatingModel.create({
        businessUnit: auth.businessUnit,
        employeeId: auth.id,
        workOrderId,
        score: 0,
        ratingToken,
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const link = `${baseUrl}/rate/${rating.ratingToken}`;

    return NextResponse.json({
      link,
      token: rating.ratingToken,
    });
  } catch (error: any) {
    console.error("[ratings/link] Error:", error);
    const status = error?.statusCode ?? 500;
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status }
    );
  }
}


