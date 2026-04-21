export class PushNotificationService {
  async savePushToken(userId: string, token: string): Promise<void> {
    console.log(`[PUSH] Token registered for user ${userId}: ${token}`);
  }
}

export const pushNotificationService = new PushNotificationService();
