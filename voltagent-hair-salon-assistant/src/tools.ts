import { createTool } from "@voltagent/core";
import { z } from "zod";
import { Salon } from "./salon.ts";

export function createSalonTools(salon: Salon) {
  const listServices = createTool({
    name: "list_services",
    description: "List every service the salon offers with its id, duration and price.",
    parameters: z.object({}),
    execute: async () => salon.listServices(),
  });

  const checkAvailability = createTool({
    name: "check_availability",
    description: "Find open appointment times for a service on one day, grouped by stylist.",
    parameters: z.object({
      service: z.string().describe("Service id or name, e.g. 'balayage'"),
      day: z.string().describe("Date as YYYY-MM-DD"),
    }),
    execute: async ({ service, day }) => {
      const match = salon.findService(service);
      if (!match) return { error: `No service matching '${service}'` };
      return { service: match.name, slots: salon.availableSlots(match.id, day) };
    },
  });

  const bookAppointment = createTool({
    name: "book_appointment",
    description: "Book an appointment. Only call after the customer chose a stylist, day and time.",
    parameters: z.object({
      service_id: z.string(),
      stylist_id: z.string(),
      day: z.string().describe("Date as YYYY-MM-DD"),
      time: z.string().describe("24h start time, e.g. 14:00"),
      customer_name: z.string(),
    }),
    execute: async ({ service_id, stylist_id, day, time, customer_name }) =>
      salon.book({ serviceId: service_id, stylistId: stylist_id, day, time, customer: customer_name }),
  });

  const cancelAppointment = createTool({
    name: "cancel_appointment",
    description: "Cancel an existing booking by its id (HS-xxxx).",
    parameters: z.object({ booking_id: z.string() }),
    execute: async ({ booking_id }) => salon.cancel(booking_id),
  });

  return [listServices, checkAvailability, bookAppointment, cancelAppointment];
}
