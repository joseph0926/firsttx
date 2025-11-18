import { defineModel } from '@firsttx/local-first';
import { z } from 'zod';

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  company: z.string(),
  avatar: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const ContactsModel = defineModel('contacts', {
  schema: z.array(ContactSchema),
  ttl: 5 * 60 * 1000,
  initialData: [],
});
