import { browser } from '$app/environment';
import { api } from '$lib/api/client';
import type { Notification } from '$lib/types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('NotificationStore');

function createNotificationStore() {
  let notifications = $state<Notification[]>([]);
  let unreadCount = $state(0);
  let loading = $state(false);
  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  async function loadNotifications() {
    if (!browser) return;
    loading = true;
    try {
      notifications = await api.getNotifications();
      updateUnreadCount();
      logger.info('Notifications loaded', { count: notifications.length });
    } catch (err) {
      logger.error('Failed to load notifications', err);
    } finally {
      loading = false;
    }
  }

  function updateUnreadCount() {
    unreadCount = notifications.filter((n) => !n.read).length;
  }

  async function markAsRead(id: string) {
    // Optimistic update
    const notification = notifications.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      updateUnreadCount();

      try {
        await api.markNotificationAsRead(id);
        logger.info('Notification marked as read', { id });
      } catch (err) {
        logger.error('Failed to mark notification as read', err, { id });
        // Revert on error
        notification.read = false;
        updateUnreadCount();
      }
    }
  }

  async function markAllAsRead() {
    // Optimistic update
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) {
      logger.warn('Mark all read skipped: no unread notifications');
      return;
    }
    unread.forEach((n) => (n.read = true));
    updateUnreadCount();

    try {
      await api.markAllNotificationsAsRead();
      logger.info('All notifications marked as read', { count: unread.length });
    } catch (err) {
      logger.error('Failed to mark all as read', err);
      // Revert
      unread.forEach((n) => (n.read = false));
      updateUnreadCount();
    }
  }

  function startPolling(intervalMs = 30000) {
    if (!browser) return;
    loadNotifications();
    stopPolling();
    pollingInterval = setInterval(loadNotifications, intervalMs);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  return {
    get notifications() {
      return notifications;
    },
    get unreadCount() {
      return unreadCount;
    },
    get loading() {
      return loading;
    },
    loadNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling
  };
}

export const notificationStore = createNotificationStore();
