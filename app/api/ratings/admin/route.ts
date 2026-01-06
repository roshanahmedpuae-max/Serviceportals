import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeRatingModel from "@/lib/models/EmployeeRating";
import EmployeeModel from "@/lib/models/Employee";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["admin"]);
    await connectToDatabase();

    const ratings = await EmployeeRatingModel.aggregate([
      {
        $match: {
          businessUnit: auth.businessUnit,
          score: { $gte: 1 },
        },
      },
      {
        $group: {
          _id: "$employeeId",
          averageScore: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get employee details
    const employeeIds = ratings.map((r) => r._id);
    const employees = await EmployeeModel.find({
      _id: { $in: employeeIds },
      businessUnit: auth.businessUnit,
    }).lean();

    const employeeMap = new Map<string, any>();
    employees.forEach((e: any) => employeeMap.set(e._id, e));

    const result = ratings.map((r: any) => {
      const employee = employeeMap.get(r._id);
      return {
        employeeId: r._id,
        employeeName: employee?.name ?? "Unknown",
        role: employee?.role ?? "",
        averageScore: r.averageScore,
        count: r.count,
      };
    });

    return NextResponse.json({ employees: result });
  } catch (error: any) {
    console.error("[ratings/admin] Error:", error);
    const status = error?.statusCode ?? 500;
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status }
    );
  }
}


