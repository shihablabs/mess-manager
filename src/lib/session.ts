export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  image: string;
}

export const DEMO_USERS: AppUser[] = [
  {
    id: 'user_admin',
    name: 'মুহাম্মদ শিহাব উদ্দিন',
    email: 'admin@mess.com',
    role: 'admin',
    image: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
  },
  {
    id: 'user_1',
    name: 'সদস্য ক (রাফি)',
    email: 'rafi@mess.com',
    role: 'member',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rafi',
  },
  {
    id: 'user_2',
    name: 'সদস্য খ (তানভীর)',
    email: 'tanvir@mess.com',
    role: 'member',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanvir',
  },
  {
    id: 'user_3',
    name: 'সদস্য গ (হাসান)',
    email: 'hasan@mess.com',
    role: 'member',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hasan',
  },
];
