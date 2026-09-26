/** Shared by the contact form (client) and POST /api/contact. */
export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "course", label: "A course" },
  { value: "payment", label: "Payment" },
  { value: "certificate", label: "Certificate" },
  { value: "technical", label: "Technical problem" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export function isContactTopic(value: unknown): value is ContactTopic {
  return CONTACT_TOPICS.some((topic) => topic.value === value);
}

export function contactTopicLabel(value: string) {
  return CONTACT_TOPICS.find((topic) => topic.value === value)?.label ?? value;
}

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  messageMin: 10,
  messageMax: 5000,
} as const;
