export function formatTimeAgo(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
        return Math.floor(interval) + " سال پیش";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " ماه پیش";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " روز پیش";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " ساعت پیش";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " دقیقه پیش";
    }
    return "همین الان";
}