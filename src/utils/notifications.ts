import { Note, Task, Transaction, DebtItem, TataAccount } from '../types';

export type NotificationType = 
  | 'update' 
  | 'note' 
  | 'task' 
  | 'streak' 
  | 'system' 
  | 'payment' 
  | 'finance' 
  | 'mood' 
  | 'general';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  timeFormatted?: string;
  targetScreen?: string;
  targetId?: string;
  priority?: 'high' | 'medium' | 'low';
  isRead?: boolean;
}

export interface ActivePaymentOrderInfo {
  orderId: string;
  amount: number;
  planName: string;
  plan?: string;
  createdAt: number;
  snapToken?: string;
  redirectUrl?: string;
  clientKey?: string;
  isProduction?: boolean;
}

export interface BuildNotificationOptions {
  notes?: Note[];
  tasks?: Task[];
  transactions?: Transaction[];
  debts?: DebtItem[];
  lang?: 'id' | 'en';
  streak?: number;
  tataAccount?: TataAccount | null;
  isAccountPremium?: boolean;
  savingsBalance?: number;
  savingsTarget?: number;
  moods?: any[];
}

const READ_NOTIF_KEY = 'tata_read_notification_ids';
const DYNAMIC_NOTIF_KEY = 'tata_dynamic_notifications';
const ACTIVE_ORDER_KEY = 'tata_active_payment_order';

export const getReadNotifIds = (): string[] => {
  try {
    const raw = localStorage.getItem(READ_NOTIF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const markNotifAsRead = (notifId: string): string[] => {
  try {
    const current = getReadNotifIds();
    if (!current.includes(notifId)) {
      const updated = [...current, notifId];
      localStorage.setItem(READ_NOTIF_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('tata_notifications_changed'));
      return updated;
    }
  } catch (e) {}
  return getReadNotifIds();
};

export const markAllNotifsAsRead = (notifIds: string[]): string[] => {
  try {
    const current = getReadNotifIds();
    const set = new Set([...current, ...notifIds]);
    const updated = Array.from(set);
    localStorage.setItem(READ_NOTIF_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tata_notifications_changed'));
    return updated;
  } catch (e) {}
  return getReadNotifIds();
};

export const clearReadHistory = () => {
  try {
    localStorage.removeItem(READ_NOTIF_KEY);
    localStorage.removeItem(DYNAMIC_NOTIF_KEY);
    window.dispatchEvent(new Event('tata_notifications_changed'));
  } catch (e) {}
};

export const getActivePaymentOrder = (): ActivePaymentOrderInfo | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_KEY);
    if (raw) {
      const order = JSON.parse(raw);
      // Valid if created within the last 24 hours
      if (order && order.orderId && (Date.now() - (order.createdAt || 0)) < 24 * 60 * 60 * 1000) {
        return order;
      }
    }
  } catch (e) {}
  return null;
};

export const setActivePaymentOrderStorage = (order: ActivePaymentOrderInfo | null) => {
  try {
    if (order) {
      localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify(order));
    } else {
      localStorage.removeItem(ACTIVE_ORDER_KEY);
    }
    window.dispatchEvent(new Event('tata_notifications_changed'));
  } catch (e) {}
};

export const addDynamicNotif = (notif: Omit<NotificationItem, 'id' | 'timestamp'> & { id?: string }) => {
  try {
    const raw = localStorage.getItem(DYNAMIC_NOTIF_KEY);
    let list: NotificationItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const newNotif: NotificationItem = {
      id: notif.id || `dyn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      timestamp: Date.now(),
      targetScreen: notif.targetScreen,
      targetId: notif.targetId,
      priority: notif.priority,
    };

    // Keep items from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    list = [newNotif, ...list.filter(item => item.timestamp > oneDayAgo)].slice(0, 30);
    localStorage.setItem(DYNAMIC_NOTIF_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('tata_notifications_changed'));
  } catch (e) {}
};

export const getDynamicNotifs = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(DYNAMIC_NOTIF_KEY);
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return list.filter(item => item.timestamp > oneDayAgo);
      }
    }
  } catch (e) {}
  return [];
};

export const buildAllNotifications = (
  notesOrOptions?: Note[] | BuildNotificationOptions,
  tasksArg?: Task[],
  langArg?: 'id' | 'en',
  streakArg?: number,
  extraOptions?: Partial<BuildNotificationOptions>
): NotificationItem[] => {
  let notes: Note[] = [];
  let tasks: Task[] = [];
  let lang: 'id' | 'en' = 'id';
  let streak = 0;
  let transactions: Transaction[] = [];
  let debts: DebtItem[] = [];
  let tataAccount: TataAccount | null = null;
  let isAccountPremium = false;
  let savingsBalance = 0;
  let savingsTarget = 0;
  let moods: any[] = [];

  if (notesOrOptions && !Array.isArray(notesOrOptions)) {
    notes = notesOrOptions.notes || [];
    tasks = notesOrOptions.tasks || [];
    lang = notesOrOptions.lang || 'id';
    streak = notesOrOptions.streak || 0;
    transactions = notesOrOptions.transactions || [];
    debts = notesOrOptions.debts || [];
    tataAccount = notesOrOptions.tataAccount || null;
    isAccountPremium = !!notesOrOptions.isAccountPremium;
    savingsBalance = notesOrOptions.savingsBalance || 0;
    savingsTarget = notesOrOptions.savingsTarget || 0;
    moods = notesOrOptions.moods || [];
  } else {
    notes = (notesOrOptions as Note[]) || [];
    tasks = tasksArg || [];
    lang = langArg || 'id';
    streak = streakArg || 0;
    if (extraOptions) {
      transactions = extraOptions.transactions || [];
      debts = extraOptions.debts || [];
      tataAccount = extraOptions.tataAccount || null;
      isAccountPremium = !!extraOptions.isAccountPremium;
      savingsBalance = extraOptions.savingsBalance || 0;
      savingsTarget = extraOptions.savingsTarget || 0;
      moods = extraOptions.moods || [];
    }
  }

  const readIds = getReadNotifIds();
  const readSet = new Set(readIds);
  const items: NotificationItem[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  // 1. INFO PEMBAYARAN & LISENSI (Payment, Active Order, Premium Status)
  const activeOrder = getActivePaymentOrder();
  if (activeOrder && activeOrder.orderId) {
    const payNotifId = `notif_payment_pending_${activeOrder.orderId}`;
    if (!readSet.has(payNotifId)) {
      items.push({
        id: payNotifId,
        type: 'payment',
        priority: 'high',
        title: lang === 'id' 
          ? `Menunggu Pembayaran: ${activeOrder.planName || 'Tata Pro/Pro Max'}` 
          : `Payment Pending: ${activeOrder.planName || 'Tata Pro/Pro Max'}`,
        body: lang === 'id'
          ? `Pesanan #${activeOrder.orderId} (Rp ${(activeOrder.amount || 0).toLocaleString('id-ID')}) menunggu pembayaran. Ketuk untuk melihat instruksi dan verifikasi akun.`
          : `Order #${activeOrder.orderId} (Rp ${(activeOrder.amount || 0).toLocaleString('id-ID')}) is awaiting payment. Tap to view payment instructions or verify.`,
        timestamp: activeOrder.createdAt || now.getTime(),
        timeFormatted: lang === 'id' ? 'Menunggu' : 'Pending',
        targetScreen: 'account',
        targetId: activeOrder.orderId
      });
    }
  }

  // Check pending account transactions
  if (tataAccount?.transactions && Array.isArray(tataAccount.transactions)) {
    tataAccount.transactions.forEach(pt => {
      if (pt.status === 'pending') {
        const ptId = `notif_account_pending_${pt.orderId || pt.id}`;
        if (!readSet.has(ptId) && (!activeOrder || activeOrder.orderId !== pt.orderId)) {
          items.push({
            id: ptId,
            type: 'payment',
            priority: 'high',
            title: lang === 'id' 
              ? `Transaksi Menunggu: ${pt.planName}` 
              : `Pending Transaction: ${pt.planName}`,
            body: lang === 'id'
              ? `Status pembayaran invoice #${pt.orderId || pt.transactionId} sebesar Rp ${(pt.amount || 0).toLocaleString('id-ID')} sedang diproses. Ketuk untuk verifikasi.`
              : `Payment status for invoice #${pt.orderId || pt.transactionId} (Rp ${(pt.amount || 0).toLocaleString('id-ID')}) is pending. Tap to verify.`,
            timestamp: pt.paidAt ? new Date(pt.paidAt).getTime() : now.getTime(),
            timeFormatted: lang === 'id' ? 'Tertunda' : 'Pending',
            targetScreen: 'account'
          });
        }
      }
    });
  }

  // Active Premium / Pro Max License notification
  if (isAccountPremium || tataAccount?.isPremium) {
    const isProMax = tataAccount?.premiumType === 'pro_max';
    const activeLicId = `notif_premium_active_${tataAccount?.userId || 'user'}`;
    if (!readSet.has(activeLicId)) {
      items.push({
        id: activeLicId,
        type: 'payment',
        priority: 'medium',
        title: lang === 'id' 
          ? `Status Lisensi: Tata ${isProMax ? 'Pro Max' : 'Premium'} Aktif ✨` 
          : `License Status: Tata ${isProMax ? 'Pro Max' : 'Premium'} Active ✨`,
        body: lang === 'id'
          ? `Akun ${tataAccount?.email || ''} telah menikmati akses bebas iklan, tema 3D Pro Max, dan seluruh fitur eksklusif tanpa batasan.`
          : `Account ${tataAccount?.email || ''} has unlocked unlimited ad-free access, 3D Pro Max theme, and exclusive productivity features.`,
        timestamp: tataAccount?.subscribedAt ? new Date(tataAccount.subscribedAt).getTime() : now.getTime(),
        timeFormatted: lang === 'id' ? 'Aktif' : 'Active',
        targetScreen: 'account'
      });
    }

    // License expiry warning (within 7 days)
    if (tataAccount?.premiumExpiresAt) {
      try {
        const expTime = new Date(tataAccount.premiumExpiresAt).getTime();
        const daysLeft = Math.ceil((expTime - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          const expNotifId = `notif_license_expiring_${todayStr}`;
          if (!readSet.has(expNotifId)) {
            items.push({
              id: expNotifId,
              type: 'payment',
              priority: 'high',
              title: lang === 'id' 
                ? `⚠️ Masa Aktif Lisensi Berakhir ${daysLeft} Hari Lagi` 
                : `⚠️ License Expires in ${daysLeft} Days`,
              body: lang === 'id'
                ? `Masa aktif langganan Anda akan berakhir pada ${new Date(tataAccount.premiumExpiresAt).toLocaleDateString('id-ID')}. Perpanjang sekarang agar tidak kehilangan fitur Pro Max.`
                : `Your subscription will expire on ${new Date(tataAccount.premiumExpiresAt).toLocaleDateString('en-US')}. Renew now to maintain uninterrupted Pro Max features.`,
              timestamp: now.getTime(),
              timeFormatted: `${daysLeft}d`,
              targetScreen: 'account'
            });
          }
        }
      } catch (e) {}
    }
  }

  // 2. TUGAS YANG BELUM SELESAI (Overdue, Pending Today, & Discipline)
  // 2a. Overdue uncompleted tasks
  const overdueTasks = tasks.filter(t => {
    if (t.completed || t.deleted) return false;
    if (!t.date || t.date === 'Hari ini' || t.date.toLowerCase() === 'today') return false;
    return t.date < todayStr;
  });

  if (overdueTasks.length > 0) {
    const overdueId = `notif_overdue_${todayStr}_${overdueTasks.length}`;
    if (!readSet.has(overdueId)) {
      const sample = overdueTasks[0];
      items.push({
        id: overdueId,
        type: 'task',
        priority: 'high',
        title: lang === 'id'
          ? `⚠️ ${overdueTasks.length} Tugas Terlewat Waktu`
          : `⚠️ ${overdueTasks.length} Overdue Tasks Need Attention`,
        body: lang === 'id'
          ? `Tugas "${sample.title}" ${overdueTasks.length > 1 ? `dan ${overdueTasks.length - 1} tugas lainnya ` : ''}melewati tenggat waktu. Ketuk untuk meninjau dan menyelesaikan.`
          : `Task "${sample.title}" ${overdueTasks.length > 1 ? `and ${overdueTasks.length - 1} other tasks ` : ''}are overdue. Tap to view and manage them.`,
        timestamp: now.getTime(),
        timeFormatted: lang === 'id' ? 'Terlewat' : 'Overdue',
        targetScreen: 'tasks'
      });
    }
  }

  // 2b. Today's pending tasks & alarms
  const todayTasks = tasks.filter(t => {
    if (t.completed || t.deleted) return false;
    const isToday = t.date === 'Hari ini' || (t.date && t.date.toLowerCase() === 'today') || t.date === todayStr || t.repeat === 'daily';
    return isToday || !!t.alarmTime;
  });

  todayTasks.forEach(task => {
    const notifId = `notif_task_${task.id}`;
    if (readSet.has(notifId)) return;

    const timeLabel = task.alarmTime ? `⏰ ${task.alarmTime}` : (lang === 'id' ? 'Hari ini' : 'Today');
    const priorityEmoji = task.priority === 'Tinggi' ? '🔥' : task.priority === 'Sedang' ? '⚡' : '📌';

    items.push({
      id: notifId,
      type: 'task',
      title: `${priorityEmoji} ${task.title}`,
      body: lang === 'id'
        ? `Waktu pengingat: ${timeLabel}. Ketuk untuk melihat tugas dan mencentangnya.`
        : `Scheduled: ${timeLabel}. Tap to view and check off this task.`,
      timestamp: now.getTime(),
      timeFormatted: task.alarmTime || (lang === 'id' ? 'Hari ini' : 'Today'),
      targetScreen: 'tasks',
      targetId: task.id,
      priority: task.priority === 'Tinggi' ? 'high' : task.priority === 'Sedang' ? 'medium' : 'low'
    });
  });

  // 2c. Daily discipline routine pending
  const pendingDiscipline = tasks.filter(t => t.isDiscipline && !t.completed && !t.deleted);
  if (pendingDiscipline.length > 0) {
    const discId = `notif_discipline_pending_${todayStr}`;
    if (!readSet.has(discId)) {
      items.push({
        id: discId,
        type: 'task',
        priority: 'medium',
        title: lang === 'id' ? '🎯 Rutinitas Disiplin Hari Ini' : '🎯 Today\'s Discipline Routine',
        body: lang === 'id'
          ? `Ada ${pendingDiscipline.length} kebiasaan harian yang belum dicentang hari ini. Pertahankan konsistensi produktifmu!`
          : `You have ${pendingDiscipline.length} daily habits left to check off today. Maintain your consistency!`,
        timestamp: now.getTime(),
        timeFormatted: lang === 'id' ? 'Disiplin' : 'Discipline',
        targetScreen: 'tasks'
      });
    }
  }

  // 3. PEMBARUAN APLIKASI & PRIVASI (App Updates & Changelog)
  const updateId = 'tata_update_5_1_0_promax';
  if (!readSet.has(updateId)) {
    items.push({
      id: updateId,
      type: 'update',
      priority: 'high',
      title: lang === 'id' 
        ? 'Pembaruan Tata v5.1 Pro Max Resmi Hadir ✨' 
        : 'Tata v5.1 Pro Max Official Release ✨',
      body: lang === 'id'
        ? 'Tata hadir lengkap dengan 3 mode: Lite, Pro, dan Pro Max dengan visual 3D interaktif, deteksi notifikasi cerdas real-time, Pusat Privasi audit data lokal, dan keamanan offline 100% terjamin.'
        : 'Tata now features 3 modes: Lite, Pro, and Pro Max featuring tactile 3D visuals, real-time smart notifications, offline Data Audit Privacy Center, and verified local storage.',
      timestamp: now.getTime(),
      targetScreen: 'settings',
      timeFormatted: lang === 'id' ? 'Resmi' : 'Official'
    });
  }

  const privacyId = 'tata_privacy_audit_verified';
  if (!readSet.has(privacyId)) {
    items.push({
      id: privacyId,
      type: 'system',
      priority: 'low',
      title: lang === 'id' ? '🛡️ Privasi 100% Offline-First Terjamin' : '🛡️ 100% Offline-First Privacy Verified',
      body: lang === 'id'
        ? 'Semua catatan, tugas, dan transaksi kas Anda tersimpan lokal di perangkat ini tanpa pelacakan atau server database luar.'
        : 'All your notes, tasks, and cash transactions are stored strictly on this device with zero external cloud database tracking.',
      timestamp: now.getTime(),
      targetScreen: 'settings',
      timeFormatted: 'v5.1'
    });
  }

  // 4. KEUANGAN & HUTANG/PIUTANG (Debts, Due Dates, Savings Target)
  if (debts && Array.isArray(debts)) {
    debts.forEach(debt => {
      const remaining = debt.remainingAmount !== undefined 
        ? debt.remainingAmount 
        : (debt.totalAmount - (debt.paidInstallments || 0) * (debt.installmentAmount || 0));
      if (remaining <= 0) return;

      if (debt.dueDate) {
        if (debt.dueDate < todayStr) {
          const debtOverdueId = `notif_debt_overdue_${debt.id}_${debt.dueDate}`;
          if (!readSet.has(debtOverdueId)) {
            items.push({
              id: debtOverdueId,
              type: 'finance',
              priority: 'high',
              title: lang === 'id' ? `🚨 Jatuh Tempo Terlewat: ${debt.title}` : `🚨 Overdue Due Date: ${debt.title}`,
              body: lang === 'id'
                ? `Tunggakan Rp ${remaining.toLocaleString('id-ID')} (${debt.lender ? `ke ${debt.lender}` : 'cicilan'}) telah melewati tanggal ${debt.dueDate}. Ketuk untuk mengelola.`
                : `Remaining Rp ${remaining.toLocaleString('id-ID')} is overdue since ${debt.dueDate}. Tap to manage.`,
              timestamp: now.getTime(),
              timeFormatted: lang === 'id' ? 'Jatuh Tempo' : 'Overdue',
              targetScreen: 'finance',
              targetId: debt.id
            });
          }
        } else if (debt.dueDate === todayStr) {
          const debtTodayId = `notif_debt_today_${debt.id}_${todayStr}`;
          if (!readSet.has(debtTodayId)) {
            items.push({
              id: debtTodayId,
              type: 'finance',
              priority: 'high',
              title: lang === 'id' ? `💸 Tagihan Hari Ini: ${debt.title}` : `💸 Bill Due Today: ${debt.title}`,
              body: lang === 'id'
                ? `Cicilan Rp ${(debt.installmentAmount || remaining).toLocaleString('id-ID')} jatuh tempo hari ini.`
                : `Installment payment of Rp ${(debt.installmentAmount || remaining).toLocaleString('id-ID')} is due today.`,
              timestamp: now.getTime(),
              timeFormatted: lang === 'id' ? 'Hari ini' : 'Today',
              targetScreen: 'finance',
              targetId: debt.id
            });
          }
        }
      }
    });
  }

  // Savings Target Reached
  if (savingsTarget && savingsTarget > 0 && (savingsBalance || 0) >= savingsTarget) {
    const savId = `notif_savings_target_${savingsTarget}`;
    if (!readSet.has(savId)) {
      items.push({
        id: savId,
        type: 'finance',
        priority: 'medium',
        title: lang === 'id' ? '🏆 Target Tabunganmu Tercapai!' : '🏆 Savings Target Achieved!',
        body: lang === 'id'
          ? `Selamat! Saldo tabungan Anda telah mencapai Rp ${(savingsBalance || 0).toLocaleString('id-ID')}, melampaui target yang ditentukan.`
          : `Congratulations! Your savings balance reached Rp ${(savingsBalance || 0).toLocaleString('id-ID')}, hitting your target goal!`,
        timestamp: now.getTime(),
        timeFormatted: lang === 'id' ? 'Tercapai' : 'Achieved',
        targetScreen: 'finance'
      });
    }
  }

  // 5. PENGINGAT CATATAN (Note Reminders)
  notes.forEach(note => {
    if (note.isArchived || !note.reminder) return;
    const notifId = `notif_note_${note.id}`;
    if (readSet.has(notifId)) return;

    try {
      const remDate = new Date(note.reminder);
      const remTime = remDate.getTime();
      
      const noteTitle = note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note');
      const dateFormatted = remDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      items.push({
        id: notifId,
        type: 'note',
        title: `${lang === 'id' ? 'Pengingat Catatan' : 'Note Reminder'}: "${noteTitle}"`,
        body: lang === 'id'
          ? `Terjadwal untuk ${dateFormatted}. Ketuk untuk membuka catatan.`
          : `Scheduled for ${dateFormatted}. Tap to open note.`,
        timestamp: remTime || now.getTime(),
        timeFormatted: dateFormatted,
        targetScreen: 'note-editor',
        targetId: note.id
      });
    } catch (e) {}
  });

  // 6. SUASANA HATI & STREAK (Mood Check-in & Streak Protection)
  const hasMoodToday = moods && moods.some((m: any) => m.date === todayStr);
  if (!hasMoodToday && now.getHours() >= 12) {
    const moodId = `notif_mood_prompt_${todayStr}`;
    if (!readSet.has(moodId)) {
      items.push({
        id: moodId,
        type: 'mood',
        priority: 'low',
        title: lang === 'id' ? '🌿 Bagaimana Suasana Hatimu Hari Ini?' : '🌿 How Are You Feeling Today?',
        body: lang === 'id'
          ? 'Sempatkan beberapa detik untuk mencatat suasana hatimu dan menjaga kesehatan mental produktifmu.'
          : 'Take a moment to record today\'s mood and reflect on your emotional balance.',
        timestamp: now.getTime(),
        timeFormatted: lang === 'id' ? 'Jurnal' : 'Journal',
        targetScreen: 'home'
      });
    }
  }

  // Daily Streak Reminder
  const incompleteTodayTasks = tasks.filter(t => !t.completed && !t.deleted && (t.date === 'Hari ini' || t.date === todayStr || t.repeat === 'daily'));
  if (streak > 0 && incompleteTodayTasks.length > 0) {
    const streakNotifId = `notif_streak_${todayStr}`;
    if (!readSet.has(streakNotifId)) {
      items.push({
        id: streakNotifId,
        type: 'streak',
        priority: 'high',
        title: lang === 'id' ? `🔥 Pertahankan Streak ${streak} Hari!` : `🔥 Keep Your ${streak}-Day Streak Active!`,
        body: lang === 'id'
          ? `Masih ada ${incompleteTodayTasks.length} tugas menunggumu hari ini. Selesaikan sebelum tengah malam agar streak tetap terjaga!`
          : `You have ${incompleteTodayTasks.length} pending tasks today. Complete them before midnight to maintain your streak!`,
        timestamp: now.getTime(),
        targetScreen: 'tasks',
        timeFormatted: lang === 'id' ? 'Hari ini' : 'Today'
      });
    }
  }

  // 7. PENCADANGAN DATA MANDIRI (Offline-First Backup Reminder)
  const totalItems = notes.length + tasks.length + transactions.length;
  if (totalItems >= 8) {
    // Show backup reminder once every 7 days
    const backupEpochWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    const backupNotifId = `notif_backup_reminder_${backupEpochWeek}`;
    if (!readSet.has(backupNotifId)) {
      items.push({
        id: backupNotifId,
        type: 'system',
        priority: 'medium',
        title: lang === 'id' ? '💾 Amankan Data dengan Cadangan Lokal' : '💾 Protect Your Data with Local Backup',
        body: lang === 'id'
          ? `Anda memiliki ${totalItems} data produktivitas. Buat berkas cadangan JSON mandiri di menu Pengaturan agar data Anda selalu aman.`
          : `You have ${totalItems} items saved locally. Generate a JSON backup in Settings to keep your data protected.`,
        timestamp: now.getTime(),
        timeFormatted: lang === 'id' ? 'Cadangan' : 'Backup',
        targetScreen: 'settings'
      });
    }
  }

  // 8. DYNAMIC NOTIFICATIONS (from localStorage)
  const dynamicNotifs = getDynamicNotifs();
  dynamicNotifs.forEach(dyn => {
    if (!readSet.has(dyn.id) && dyn.timestamp > oneDayAgo) {
      items.push({
        ...dyn,
        timeFormatted: dyn.timeFormatted || (lang === 'id' ? 'Baru saja' : 'Just now')
      });
    }
  });

  // Sort newest first
  return items.sort((a, b) => b.timestamp - a.timestamp);
};
