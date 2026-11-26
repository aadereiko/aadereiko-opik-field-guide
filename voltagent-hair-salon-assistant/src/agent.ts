import { Agent } from "@voltagent/core";
import { Salon } from "./salon.ts";
import { createSalonTools } from "./tools.ts";

export function createFrontDeskAgent(salon: Salon = new Salon()) {
  return new Agent({
    name: "willowbrook-front-desk",
    model: "openai/gpt-4o-mini",
    instructions:
      "You are the front-desk assistant for Willowbrook Hair Studio. Today is 2026-11-26. " +
      "Never guess prices, durations or open times: use list_services and check_availability. " +
      "Only call book_appointment after the customer picked a stylist, day and time, and then " +
      "repeat the booking id, time and price back. If a slot is taken, offer another time. " +
      "Be warm and brief: 2-4 sentences.",
    tools: createSalonTools(salon),
  });
}
