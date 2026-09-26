import { describe, expect, it } from "vitest";
import {
  courseCertificateContent,
  formatCertificateDate,
  roadmapCertificateContent,
  verifyUrlLabel,
} from "@/lib/certificate-design";

describe("certificate content", () => {
  it("builds course certificate text", () => {
    const content = courseCertificateContent({
      studentName: "Alice Student",
      courseTitle: "Intro to Web Development",
      instructorName: "Jane Instructor",
      category: "  Web Development ",
      credentialId: "CERT-123",
      issuedAt: new Date("2026-03-05T12:00:00Z"),
      verifyUrl: "https://lms.example.com/verify/CERT-123",
    });
    expect(content).toMatchObject({
      label: "Certificate of Completion",
      studentName: "Alice Student",
      completingLine: "has successfully completed the course",
      title: "Intro to Web Development",
      meta: "Web Development",
      signatory: { name: "Jane Instructor", role: "Course instructor" },
      issuedOn: "March 5, 2026",
      credentialId: "CERT-123",
      verifyUrl: "https://lms.example.com/verify/CERT-123",
    });
  });

  it("drops a blank course category", () => {
    const content = courseCertificateContent({
      studentName: "A",
      courseTitle: "B",
      instructorName: "C",
      category: "   ",
      credentialId: "X",
      issuedAt: "2026-01-01T00:00:00Z",
      verifyUrl: "https://lms.example.com/verify/X",
    });
    expect(content.meta).toBeNull();
  });

  it("builds learning path text with a pluralized course count", () => {
    const base = {
      studentName: "Bob",
      roadmapTitle: "Web Developer Starter",
      credentialId: "RM-1",
      issuedAt: "2026-01-01T00:00:00Z",
      verifyUrl: "https://lms.example.com/verify/RM-1",
    };
    const content = roadmapCertificateContent({ ...base, courseCount: 3, category: "Web" });
    expect(content.label).toBe("Learning Path Certificate");
    expect(content.completingLine).toBe("has successfully completed the learning path");
    expect(content.meta).toBe("3 courses · Web");
    expect(roadmapCertificateContent({ ...base, courseCount: 1 }).meta).toBe("1 course");
  });

  it("formats the issue date in UTC", () => {
    expect(formatCertificateDate("2026-01-01T23:30:00-05:00")).toBe("January 2, 2026");
  });

  it("prints the verify link without scheme or trailing slash", () => {
    expect(verifyUrlLabel("https://lms.example.com/verify/abc/")).toBe("lms.example.com/verify/abc");
    expect(verifyUrlLabel("http://localhost:3005/verify/abc")).toBe("localhost:3005/verify/abc");
  });
});
