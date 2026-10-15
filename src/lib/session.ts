import { UserRole } from '@/models/types';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image: string;
  status?: 'pending' | 'active' | 'inactive' | 'rejected';
  phone?: string;
  whatsapp?: string;
  dob?: string;
  address?: string;
  bio?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  occupation?: string;
}

export const SUPER_ADMIN_EMAIL = 'shihab.warfaze@gmail.com';

export const INITIAL_SUPER_ADMIN: AppUser = {
  id: '6ad084c58790b3c278c86efa',
  name: 'Shihab Uddin',
  email: 'shihab.warfaze@gmail.com',
  role: 'super_admin',
  image: 'https://lh3.googleusercontent.com/a/ACg8ocJYyl_ytE7bX3w_IDsC1mzZRx63hG2MnjbhemMnBZ0rLUm47utI=s96-c',
};
