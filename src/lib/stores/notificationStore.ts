import { writable } from 'svelte/store';

export interface UINotification {
  title: string;
  description: string;
  buttonText: string;
  icon?: string | null;
  iconColor?: string | null;
  open: boolean;
  timed: boolean;
  timeout: number;
}

const defaultNotification: UINotification = {
  title: '',
  description: '',
  buttonText: '',
  icon: null,
  iconColor: null,
  open: false,
  timed: false,
  timeout: 10000 // default 10 seconds
};

function createNotificationStore() {
  const { subscribe, set, update } = writable<UINotification>({ ...defaultNotification });

  let timer: ReturnType<typeof setTimeout>;

  function NotificationTimedOpen({
    title,
    description,
    buttonText,
    timeout = 10000,
    icon = null,
    iconColor = null,
  }: {
    title: string;
    description: string;
    buttonText: string;
    timeout?: number;
    icon?: string | null;
  }) {
    clearTimeout(timer);
    set({
      title,
      description,
      buttonText,
      icon,
      iconColor,
      open: true,
      timed: true,
      timeout
    });
    timer = setTimeout(() => {
      update(notification => ({ ...notification, open: false }));
    }, timeout);
  }

  function NotificationOpen({
    title,
    description,
    buttonText,
    icon = null,
    iconColor = null,
  }: {
    title: string;
    description: string;
    buttonText: string;
    icon?: string | null;
    iconColor?: string | null;
  }) {
    clearTimeout(timer);
    set({
      title,
      description,
      buttonText,
      icon,
      iconColor,
      open: true,
      timed: false,
      timeout: 0
    });
  }

  function closeNotification() {
    clearTimeout(timer);
    update(notification => ({ ...notification, open: false }));
  }

  return {
    subscribe,
    NotificationTimedOpen,
    NotificationOpen,
    closeNotification
  };
}

export const notificationStore = createNotificationStore();
