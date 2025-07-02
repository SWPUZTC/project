/**
 * 将时间转换为友好的相对时间格式（如"刚刚"、"几分钟前"）
 * @param timeStr 用户活跃时间字符串，格式为 "YYYY-MM-DD HH:mm:ss"
 * @param options 可选配置项
 * @returns 格式化后的相对时间字符串
 */
export default function formatActiveTime(
 timestamp: number,
 options: {
   justNowSeconds?: number;  // 多少秒内显示为"刚刚"
   minuteText?: [string, string]; // 分钟前的文本（单复数）
   hourText?: [string, string];   // 小时前的文本（单复数）
   dayText?: string;         // 天前的文本
   weekText?: string;        // 周前的文本
   monthText?: string;       // 月前的文本
   yearText?: string;        // 年前的文本
   showExactTimeAfterDays?: number; // 多少天后显示精确时间
   exactTimeFormat?: (date: Date) => string; // 精确时间格式化函数
 } = {}
): string {
 // 转换时间戳为 Date 对象
 const targetDate = new Date(timestamp);
 const now = new Date();
 const secondsAgo = Math.floor((now.getTime() - timestamp) / 1000);
 
 // 处理未来时间（可能是时钟不同步）
 if (secondsAgo < 0) return '刚刚';

 // 默认配置
 const config = {
   justNowSeconds: options.justNowSeconds ?? 60,
   minuteText: options.minuteText ?? ['分钟前', '分钟前'],
   hourText: options.hourText ?? ['小时前', '小时前'],
   dayText: options.dayText ?? '天前',
   weekText: options.weekText ?? '周前',
   monthText: options.monthText ?? '月前',
   yearText: options.yearText ?? '年前',
   showExactTimeAfterDays: options.showExactTimeAfterDays ?? 30,
   exactTimeFormat: options.exactTimeFormat ?? ((date) => 
     `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
   ),
 };

 // 相对时间计算
 if (secondsAgo < config.justNowSeconds) {
   return '刚刚';
 }

 const minutesAgo = Math.floor(secondsAgo / 60);
 if (minutesAgo < 60) {
   return `${minutesAgo}${config.minuteText[minutesAgo === 1 ? 0 : 1]}`;
 }

 const hoursAgo = Math.floor(minutesAgo / 60);
 if (hoursAgo < 24) {
   return `${hoursAgo}${config.hourText[hoursAgo === 1 ? 0 : 1]}`;
 }

 const daysAgo = Math.floor(hoursAgo / 24);
 if (daysAgo < 7) {
   return `${daysAgo}${config.dayText}`;
 }

 const weeksAgo = Math.floor(daysAgo / 7);
 if (weeksAgo < 4) {
   return `${weeksAgo}${config.weekText}`;
 }

 const monthsAgo = Math.floor(daysAgo / 30);
 if (monthsAgo < 12) {
   return `${monthsAgo}${config.monthText}`;
 }

 const yearsAgo = Math.floor(daysAgo / 365);
 if (daysAgo < config.showExactTimeAfterDays) {
   return `${yearsAgo}${config.yearText}`;
 }

 // 超过指定天数，显示精确时间
 return config.exactTimeFormat(targetDate);
}