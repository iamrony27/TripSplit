import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { AppNotification, NotificationType } from '../../types/notification';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalNotification,
  getLocalNotifications,
  subscribeLocalNotifications,
} from '../storage/localDatabase';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Creates and delivers an in-app notification to a user.
 */
export async function createNotificationInFirestore(
  params: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<AppNotification> {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const notification: AppNotification = {
    ...params,
    id: notificationId,
    isRead: false,
    createdAt: Date.now(),
  };

  await saveLocalNotification(notification);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await setDoc(ref, sanitizeForFirestore(notification));
    } catch (err) {
      console.warn('Failed to store notification in Firestore:', err);
    }
  }

  return notification;
}

/**
 * Subscribes to real-time notifications for the current user.
 */
export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || userId.startsWith('local_user_') || userId.startsWith('demo_user_')) {
    return subscribeLocalNotifications(userId, callback);
  }

  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', 'in', [userId, 'all'])
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((d) => {
          list.push(d.data() as AppNotification);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        callback(list);
      },
      (err) => {
        console.warn('Notifications subscription error, using local fallback:', err);
        subscribeLocalNotifications(userId, callback);
      }
    );
  } catch {
    return subscribeLocalNotifications(userId, callback);
  }
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(notificationId: string, userId?: string): Promise<void> {
  if (userId) {
    const list = await getLocalNotifications(userId);
    const existing = list.find((n) => n.id === notificationId);
    if (existing) {
      await saveLocalNotification({ ...existing, isRead: true });
    }
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(ref, { isRead: true });
    } catch (err) {
      console.warn('Failed to mark notification read in Firestore:', err);
    }
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const list = await getLocalNotifications(userId);
  for (const n of list) {
    if (!n.isRead) {
      await saveLocalNotification({ ...n, isRead: true });
    }
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(d.ref, { isRead: true });
      }
    } catch (err) {
      console.warn('Failed to mark all notifications read in Firestore:', err);
    }
  }
}
