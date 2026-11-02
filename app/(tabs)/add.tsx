import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AddTabPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/trip/add-expense');
  }, [router]);

  return null;
}
