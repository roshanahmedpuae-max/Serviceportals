import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeRatingModel from "@/lib/models/EmployeeRating";
import WorkOrderModel from "@/lib/models/WorkOrder";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await connectToDatabase();

    const rating = await EmployeeRatingModel.findOne({ ratingToken: token });
    if (!rating) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    const workOrder = await WorkOrderModel.findById(rating.workOrderId);

    return NextResponse.json({
      employeeId: rating.employeeId,
      workOrderId: rating.workOrderId,
      businessUnit: rating.businessUnit,
      // Minimal info for display
      job: workOrder
        ? {
            customerName: workOrder.customerName,
            description: workOrder.workDescription,
            locationAddress: workOrder.locationAddress,
            orderDateTime: workOrder.orderDateTime,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[ratings/token] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}


