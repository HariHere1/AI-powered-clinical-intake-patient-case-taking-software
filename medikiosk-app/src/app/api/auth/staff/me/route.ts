import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/authz";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const staff = await requireStaff();
    return NextResponse.json(staff);
  } catch (error) {
    return handleApiError(error);
  }
}
