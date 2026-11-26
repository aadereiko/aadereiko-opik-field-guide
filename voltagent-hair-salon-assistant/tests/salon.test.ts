import { describe, expect, it } from "vitest";
import { Salon } from "../src/salon.ts";

describe("Salon", () => {
  it("does not mistake a men's cut for a women's cut", () => {
    const salon = new Salon();
    expect(salon.findService("men's cut")?.id).toBe("mens-cut");
    expect(salon.findService("balayage")?.id).toBe("balayage");
    expect(salon.findService("nonsense")).toBeUndefined();
  });

  it("hides taken slots from availability", () => {
    const salon = new Salon();
    const ines = salon.availableSlots("cut", "2026-12-01").find((s) => s.stylistId === "ines");
    expect(ines?.times).not.toContain("10:00");
    expect(ines?.times).toContain("09:00");
  });

  it("only lists stylists who offer the service", () => {
    const names = new Salon().availableSlots("mens-cut", "2026-12-01").map((s) => s.stylistId);
    expect(names).toEqual(["tomas"]);
  });

  it("books a free slot and refuses the same slot twice", () => {
    const salon = new Salon();
    const input = { serviceId: "blowout", stylistId: "ines", day: "2026-12-03", time: "11:00", customer: "Dana" };
    const first = salon.book(input);
    expect(first.ok && first.total_usd).toBe(45);
    expect(salon.book(input).ok).toBe(false);
  });

  it("rejects a stylist who does not offer the service", () => {
    const result = new Salon().book({ serviceId: "color", stylistId: "tomas", day: "2026-12-02", time: "10:00", customer: "Leo" });
    expect(result).toMatchObject({ ok: false });
  });

  it("frees the slot after a cancellation", () => {
    const salon = new Salon();
    expect(salon.cancel("HS-1001").ok).toBe(true);
    expect(salon.availableSlots("cut", "2026-12-01").find((s) => s.stylistId === "ines")?.times).toContain("10:00");
    expect(salon.cancel("HS-1001").ok).toBe(false);
  });
});
