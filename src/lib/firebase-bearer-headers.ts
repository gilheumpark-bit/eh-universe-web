import { lazyFirebaseAuth } from '@/lib/firebase';

export async function getFirebaseBearerHeaders(authRequiredMessage: string): Promise<Record<string, string>> {
  const auth = await lazyFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) {
    throw new Error(authRequiredMessage);
  }
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}
