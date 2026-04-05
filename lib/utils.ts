import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const safeText = (val: any): string => {
  if (val == null) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    return val.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.richText || item.text || item.t || item.v || '';
      return String(item || '');
    }).join('');
  }
  if (typeof val === 'object') {
    if (val.richText) return safeText(val.richText);
    if (val.text) return String(val.text);
    return '';
  }
  return "";
};

export const toDirectFileUrl = (url: string) => {
  if (!url) return "";
  const s = safeText(url).trim();
  
  // Refined regex to catch Google Drive ID more reliably
  // Match after /d/ or id=, until the next slash, question mark, or end of string
  const driveMatch = s.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{15,})/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  
  return s;
};
