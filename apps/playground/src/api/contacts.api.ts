import { sleep, randomBetween } from '@/lib/utils';
import { type Contact } from '@/models/contacts.model';

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1 234 567 8901',
    company: 'TechCorp',
    avatar: 'https://i.pravatar.cc/150?u=alice',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1 234 567 8902',
    company: 'DataFlow',
    avatar: 'https://i.pravatar.cc/150?u=bob',
  },
  {
    id: '3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    phone: '+1 234 567 8903',
    company: 'CloudBase',
    avatar: 'https://i.pravatar.cc/150?u=carol',
  },
  {
    id: '4',
    name: 'David Brown',
    email: 'david@example.com',
    phone: '+1 234 567 8904',
    company: 'NetSolutions',
    avatar: 'https://i.pravatar.cc/150?u=david',
  },
  {
    id: '5',
    name: 'Eve Davis',
    email: 'eve@example.com',
    phone: '+1 234 567 8905',
    company: 'AppWorks',
    avatar: 'https://i.pravatar.cc/150?u=eve',
  },
  {
    id: '6',
    name: 'Frank Miller',
    email: 'frank@example.com',
    phone: '+1 234 567 8906',
    company: 'DevHub',
    avatar: 'https://i.pravatar.cc/150?u=frank',
  },
];

export async function fetchContacts(): Promise<Contact[]> {
  await sleep(randomBetween(800, 1500));
  return mockContacts;
}
