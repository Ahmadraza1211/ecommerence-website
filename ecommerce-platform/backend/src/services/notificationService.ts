import { Notification } from '../models/Notification';
import { INotification, NotificationType } from '../models/Notification';

export async function pushNotification(input: {
  userId: string | import('mongoose').Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  orderId?: string | import('mongoose').Types.ObjectId | null;
}): Promise<INotification> {
  return Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body || '',
    orderId: input.orderId || null,
    isRead: false,
  });
}
