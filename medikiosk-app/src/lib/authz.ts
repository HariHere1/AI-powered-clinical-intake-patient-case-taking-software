import { prisma } from "@/lib/db";
import { getPatientSession, type PatientSessionPayload } from "@/lib/auth/patientSession";
import { getStaffSession, type StaffSessionPayload } from "@/lib/auth/staffSession";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export async function requirePatient(): Promise<PatientSessionPayload> {
  const session = await getPatientSession();
  if (!session) throw new UnauthorizedError("Patient session required");
  return session;
}

export async function requireStaff(role?: "DOCTOR" | "ADMIN"): Promise<StaffSessionPayload> {
  const session = await getStaffSession();
  if (!session) throw new UnauthorizedError("Staff session required");
  if (role && session.role !== role) throw new ForbiddenError(`${role} role required`);
  return session;
}

/** Patients may only act on their own intake session. */
export async function assertPatientOwnsSession(patientId: string, sessionId: string) {
  const session = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
  if (!session || session.patientId !== patientId) {
    throw new ForbiddenError("Session does not belong to this patient");
  }
  return session;
}

/** Patients may only act on their own report. */
export async function assertPatientOwnsReport(patientId: string, reportId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.patientId !== patientId) {
    throw new ForbiddenError("Report does not belong to this patient");
  }
  return report;
}

/** Doctors may only read a report if they hold a currently-active key for it. */
export async function assertDoctorHasActiveKey(doctorId: string, reportId: string) {
  const key = await prisma.accessKey.findFirst({
    where: { doctorId, reportId, isActive: true },
  });
  if (!key) {
    throw new ForbiddenError("No active access key for this report");
  }
  return key;
}

/** Admins may only manage survey templates within their own hospital. */
export function assertAdminOwnsHospital(staffHospitalId: string, targetHospitalId: string) {
  if (staffHospitalId !== targetHospitalId) {
    throw new ForbiddenError("Cannot manage another hospital's data");
  }
}
