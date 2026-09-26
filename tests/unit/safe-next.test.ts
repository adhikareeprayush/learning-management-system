import { describe, expect, it } from "vitest";
import { authPageHref, firstParam, safeNextPath } from "@/lib/safe-next";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/student/courses")).toBe("/student/courses");
    expect(safeNextPath("/courses/web?tab=reviews#top")).toBe("/courses/web?tab=reviews#top");
  });

  it("normalizes dot segments", () => {
    expect(safeNextPath("/a/../student")).toBe("/student");
  });

  it("rejects empty, relative and absolute URLs", () => {
    for (const value of [null, undefined, "", "student", "https://evil.example/", "javascript:alert(1)"]) {
      expect(safeNextPath(value), String(value)).toBeNull();
    }
  });

  it("rejects protocol-relative tricks", () => {
    for (const value of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "/.//evil.example", "/./\\evil.example"]) {
      expect(safeNextPath(value), JSON.stringify(value)).toBeNull();
    }
  });
});

describe("firstParam", () => {
  it("reads URLSearchParams and page searchParams", () => {
    expect(firstParam(new URLSearchParams("next=/a&next=/b"), "next")).toBe("/a");
    expect(firstParam({ next: ["/a", "/b"] }, "next")).toBe("/a");
    expect(firstParam({ next: "/a" }, "next")).toBe("/a");
    expect(firstParam({}, "next")).toBeNull();
  });
});

describe("authPageHref", () => {
  it("carries a safe return path and pending enrollment", () => {
    expect(authPageHref("/register", { next: "/student", enroll: "1", slug: "web" })).toBe(
      "/register?next=%2Fstudent&enroll=1&slug=web",
    );
  });

  it("drops unsafe return paths", () => {
    expect(authPageHref("/login", { next: "//evil.example" })).toBe("/login");
  });
});
