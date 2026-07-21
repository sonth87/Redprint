import { describe, expect, it, vi } from "vitest";
import { collectFormFields, isHoneypotTripped, dispatchFormSubmit, type FormSubmitState, type FetchLike } from "./formSubmitPipeline";

function fd(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("collectFormFields", () => {
  it("collects name/value pairs", () => {
    const fields = collectFormFields(fd([["email", "a@b.com"], ["name", "Jane"]]));
    expect(fields).toEqual({ email: "a@b.com", name: "Jane" });
  });

  it("collects repeated names into an array (Repeater duplicating an Input)", () => {
    const fields = collectFormFields(fd([["tag", "a"], ["tag", "b"], ["tag", "c"]]));
    expect(fields.tag).toEqual(["a", "b", "c"]);
  });

  it("excludes the honeypot field from the payload", () => {
    const fields = collectFormFields(fd([["_hp", "bot-filled-this"], ["email", "a@b.com"]]));
    expect(fields).toEqual({ email: "a@b.com" });
    expect(fields._hp).toBeUndefined();
  });
});

describe("isHoneypotTripped", () => {
  it("is false when the honeypot field is empty or absent", () => {
    expect(isHoneypotTripped(fd([["_hp", ""]]))).toBe(false);
    expect(isHoneypotTripped(fd([["email", "a@b.com"]]))).toBe(false);
  });

  it("is true when the honeypot field has any value", () => {
    expect(isHoneypotTripped(fd([["_hp", "x"]]))).toBe(true);
  });
});

describe("dispatchFormSubmit — submitAction=none", () => {
  it("goes straight to success", async () => {
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit({ email: "a@b.com" }, { id: "n1", props: { submitAction: "none" } }, (s) => states.push(s));
    expect(states).toEqual([{ phase: "success" }]);
  });
});

describe("dispatchFormSubmit — submitAction=emit", () => {
  it("calls onFormSubmit with the form name and fields, then succeeds", async () => {
    const onFormSubmit = vi.fn();
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit(
      { email: "a@b.com" },
      { id: "n1", props: { submitAction: "emit", name: "contact-form" } },
      (s) => states.push(s),
      { onFormSubmit },
    );
    expect(onFormSubmit).toHaveBeenCalledWith("contact-form", { email: "a@b.com" });
    expect(states).toEqual([{ phase: "success" }]);
  });

  it("falls back to the node id as formName when no name prop is set", async () => {
    const onFormSubmit = vi.fn();
    await dispatchFormSubmit({ email: "a@b.com" }, { id: "node-42", props: { submitAction: "emit" } }, () => {}, { onFormSubmit });
    expect(onFormSubmit).toHaveBeenCalledWith("node-42", { email: "a@b.com" });
  });

  it("goes to error state if the onFormSubmit callback throws (never propagates)", async () => {
    const onFormSubmit = vi.fn(() => { throw new Error("host app bug"); });
    const states: FormSubmitState[] = [];
    await expect(
      dispatchFormSubmit({ x: "1" }, { id: "n1", props: { submitAction: "emit" } }, (s) => states.push(s), { onFormSubmit }),
    ).resolves.toBeUndefined();
    expect(states).toEqual([{ phase: "error" }]);
  });

  it("does not require onFormSubmit to be provided (dev-only no-op)", async () => {
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit({ x: "1" }, { id: "n1", props: { submitAction: "emit" } }, (s) => states.push(s));
    expect(states).toEqual([{ phase: "success" }]);
  });
});

describe("dispatchFormSubmit — submitAction=webhook", () => {
  it("POSTs fields + meta to the webhook URL and succeeds on 2xx", async () => {
    const fetchMock = vi.fn<FetchLike>(async () => ({ ok: true, status: 200 }) as Response);
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit(
      { email: "a@b.com" },
      { id: "n1", props: { submitAction: "webhook", webhookUrl: "https://example.com/hook", method: "POST" } },
      (s) => states.push(s),
      {},
      fetchMock,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.com/hook");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("omit");
    const body = JSON.parse(String(init?.body));
    expect(body.fields).toEqual({ email: "a@b.com" });
    expect(body.meta.timestamp).toEqual(expect.any(Number));
    expect(states.map((s) => s.phase)).toEqual(["submitting", "success"]);
  });

  it("goes to error state on a non-2xx response", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }) as Response);
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit(
      { x: "1" },
      { id: "n1", props: { submitAction: "webhook", webhookUrl: "https://example.com/hook" } },
      (s) => states.push(s),
      {},
      fetchMock,
    );
    expect(states.map((s) => s.phase)).toEqual(["submitting", "error"]);
  });

  it("goes to error state when fetch itself rejects (network failure)", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("network down"); });
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit(
      { x: "1" },
      { id: "n1", props: { submitAction: "webhook", webhookUrl: "https://example.com/hook" } },
      (s) => states.push(s),
      {},
      fetchMock,
    );
    expect(states.map((s) => s.phase)).toEqual(["submitting", "error"]);
  });

  it("rejects an unsafe/private-IP webhook URL WITHOUT calling fetch (SSRF guard)", async () => {
    const fetchMock = vi.fn();
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit(
      { x: "1" },
      { id: "n1", props: { submitAction: "webhook", webhookUrl: "http://169.254.169.254/latest/meta-data" } },
      (s) => states.push(s),
      {},
      fetchMock,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(states).toEqual([{ phase: "error" }]);
  });

  it("rejects a missing webhook URL without calling fetch", async () => {
    const fetchMock = vi.fn();
    const states: FormSubmitState[] = [];
    await dispatchFormSubmit({ x: "1" }, { id: "n1", props: { submitAction: "webhook" } }, (s) => states.push(s), {}, fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(states).toEqual([{ phase: "error" }]);
  });
});
