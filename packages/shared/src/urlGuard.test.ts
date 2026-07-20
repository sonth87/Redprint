import { describe, expect, it } from "vitest";
import { isPrivateHost, isSafeFetchEndpoint } from "./urlGuard";

describe("isPrivateHost", () => {
  it("flags loopback, private, and link-local ranges", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("10.0.0.1")).toBe(true);
    expect(isPrivateHost("192.168.1.1")).toBe(true);
    expect(isPrivateHost("172.16.0.1")).toBe(true);
    expect(isPrivateHost("172.31.255.255")).toBe(true);
    expect(isPrivateHost("169.254.169.254")).toBe(true); // cloud metadata endpoint
    expect(isPrivateHost("0.0.0.0")).toBe(true);
    expect(isPrivateHost("::1")).toBe(true);
  });

  it("does not flag public hosts or adjacent-but-public ranges", () => {
    expect(isPrivateHost("example.com")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
    expect(isPrivateHost("172.32.0.1")).toBe(false); // just outside the 172.16-31 private range
    expect(isPrivateHost("172.15.255.255")).toBe(false);
  });
});

describe("isSafeFetchEndpoint", () => {
  it("allows https:// to a public host", () => {
    expect(isSafeFetchEndpoint("https://api.example.com/track")).toBe(true);
  });

  it("allows http://localhost and http://127.0.0.1 for local dev backends", () => {
    expect(isSafeFetchEndpoint("http://localhost:3002/api")).toBe(true);
    expect(isSafeFetchEndpoint("http://127.0.0.1:3002/api")).toBe(true);
  });

  it("rejects http:// to a real host", () => {
    expect(isSafeFetchEndpoint("http://api.example.com/track")).toBe(false);
  });

  it("rejects https:// to a private/loopback/link-local host", () => {
    expect(isSafeFetchEndpoint("https://10.0.0.5/x")).toBe(false);
    expect(isSafeFetchEndpoint("https://192.168.1.1/x")).toBe(false);
    expect(isSafeFetchEndpoint("https://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("rejects javascript: and data: schemes", () => {
    expect(isSafeFetchEndpoint("javascript:alert(1)")).toBe(false);
    expect(isSafeFetchEndpoint("data:text/plain,hi")).toBe(false);
  });

  it("rejects malformed URLs and empty strings", () => {
    expect(isSafeFetchEndpoint("")).toBe(false);
    expect(isSafeFetchEndpoint("not a url")).toBe(false);
  });
});
