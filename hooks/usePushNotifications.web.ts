// Web stub — push notifications not supported on web
export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export function usePushNotifications(_userId: string | undefined) {
  // no-op on web
}
