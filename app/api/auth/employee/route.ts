import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import EmployeeModel, { verifyEmployeeByPassword } from "@/lib/models/Employee";
import { issueEmployeeToken, setAuthCookie } from "@/lib/auth";
import { BusinessUnit } from "@/lib/types";
import { Employee } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // Simplified login: only businessUnit and password required (no name)
  if (!body?.businessUnit || !body?.password) {
    return NextResponse.json(
      { error: "Business unit and password are required" },
      { status: 400 }
    );
  }
  const businessUnit = body.businessUnit as BusinessUnit;
  await connectToDatabase();

  // Find employee by password hash within the specified business unit
  const employee = await verifyEmployeeByPassword(body.password, businessUnit);

  if (!employee) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const employeeObj = employee.toObject();
  const featureAccess = (employeeObj as any).featureAccess || [];
  
  const employeePayload: Employee = {
    id: (employeeObj as { id?: string; _id: string }).id ?? employeeObj._id,
    name: employeeObj.name,
    passwordHash: employeeObj.passwordHash,
    businessUnit: employeeObj.businessUnit,
    role: employeeObj.role,
    status: employeeObj.status,
    featureAccess: featureAccess,
  };

  const token = issueEmployeeToken(employeePayload);
  const response = NextResponse.json({
    token,
    employee: {
      id: employeePayload.id,
      name: employeePayload.name,
      businessUnit: employeePayload.businessUnit,
      role: employeePayload.role,
      status: employeePayload.status,
      featureAccess: employeePayload.featureAccess || [],
    },
  });
  setAuthCookie(response, token);
  return response;
}

