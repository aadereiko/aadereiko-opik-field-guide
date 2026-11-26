export type Service = {
  id: string;
  name: string;
  minutes: number;
  price_usd: number;
};

export type Stylist = {
  id: string;
  name: string;
  serviceIds: string[];
};

export type Booking = {
  id: string;
  serviceId: string;
  stylistId: string;
  day: string;
  time: string;
  customer: string;
};

export const SERVICES: Service[] = [
  { id: "cut", name: "Women's Cut & Style", minutes: 60, price_usd: 68 },
  { id: "mens-cut", name: "Men's Cut", minutes: 30, price_usd: 38 },
  { id: "color", name: "Full Color", minutes: 120, price_usd: 145 },
  { id: "balayage", name: "Balayage", minutes: 180, price_usd: 230 },
  { id: "blowout", name: "Blowout", minutes: 30, price_usd: 45 },
];

export const STYLISTS: Stylist[] = [
  { id: "ines", name: "Ines Varga", serviceIds: ["cut", "color", "balayage", "blowout"] },
  { id: "tomas", name: "Tomas Okafor", serviceIds: ["mens-cut", "cut", "blowout"] },
  { id: "priya", name: "Priya Lindqvist", serviceIds: ["color", "balayage"] },
];

export const OPEN_DAYS = ["2026-12-01", "2026-12-02", "2026-12-03"];
export const SLOT_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

export function seedBookings(): Booking[] {
  return [
    { id: "HS-1001", serviceId: "cut", stylistId: "ines", day: "2026-12-01", time: "10:00", customer: "Walk-in regular" },
    { id: "HS-1002", serviceId: "mens-cut", stylistId: "tomas", day: "2026-12-01", time: "09:00", customer: "Walk-in regular" },
    { id: "HS-1003", serviceId: "color", stylistId: "priya", day: "2026-12-02", time: "09:00", customer: "Walk-in regular" },
  ];
}

export class Salon {
  private bookings: Booking[];
  private nextId = 1004;

  constructor(bookings: Booking[] = seedBookings()) {
    this.bookings = [...bookings];
  }

  findService(query: string): Service | undefined {
    const q = query.trim().toLowerCase();
    const exact = SERVICES.find((s) => s.id === q || s.name.toLowerCase() === q);
    if (exact) return exact;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return SERVICES.find((s) => new RegExp(`\\b${escaped}\\b`).test(s.name.toLowerCase()));
  }

  listServices(): Service[] {
    return SERVICES;
  }

  availableSlots(serviceId: string, day: string): { stylist: string; stylistId: string; times: string[] }[] {
    const service = SERVICES.find((s) => s.id === serviceId);
    if (!service || !OPEN_DAYS.includes(day)) return [];
    const result = [];
    for (const stylist of STYLISTS) {
      if (!stylist.serviceIds.includes(serviceId)) continue;
      const times = SLOT_TIMES.filter((t) => this.isFree(stylist.id, day, t));
      result.push({ stylist: stylist.name, stylistId: stylist.id, times });
    }
    return result;
  }

  book(input: { serviceId: string; stylistId: string; day: string; time: string; customer: string }):
    | { ok: true; booking: Booking; total_usd: number }
    | { ok: false; reason: string } {
    const service = SERVICES.find((s) => s.id === input.serviceId);
    const stylist = STYLISTS.find((s) => s.id === input.stylistId);
    if (!service) return { ok: false, reason: `Unknown service ${input.serviceId}` };
    if (!stylist) return { ok: false, reason: `Unknown stylist ${input.stylistId}` };
    if (!stylist.serviceIds.includes(service.id)) {
      return { ok: false, reason: `${stylist.name} does not offer ${service.name}` };
    }
    if (!OPEN_DAYS.includes(input.day)) return { ok: false, reason: `The salon is closed on ${input.day}` };
    if (!SLOT_TIMES.includes(input.time)) return { ok: false, reason: `${input.time} is not a bookable start time` };
    if (!this.isFree(stylist.id, input.day, input.time)) {
      return { ok: false, reason: `${stylist.name} is already booked at ${input.time} on ${input.day}` };
    }
    const booking: Booking = { id: `HS-${this.nextId++}`, ...input };
    this.bookings.push(booking);
    return { ok: true, booking, total_usd: service.price_usd };
  }

  cancel(bookingId: string): { ok: boolean; reason?: string } {
    const index = this.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return { ok: false, reason: `No booking ${bookingId}` };
    this.bookings.splice(index, 1);
    return { ok: true };
  }

  private isFree(stylistId: string, day: string, time: string): boolean {
    return !this.bookings.some((b) => b.stylistId === stylistId && b.day === day && b.time === time);
  }
}
