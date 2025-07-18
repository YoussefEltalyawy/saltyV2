/**
 * Safe localStorage utility that handles SSR and errors
 */

export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            window.localStorage.setItem(key, value);
        } catch (error) { }
    },
    removeItem: (key: string): void => {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            window.localStorage.removeItem(key);
        } catch (error) { }
    },
};

// Store lock specific constants
export const STORE_ACCESS_KEY = 'storeAccessGranted';
export const STORE_ACCESS_VALUE = 'true';

export function isStoreAccessGranted(): boolean {
    return safeLocalStorage.getItem(STORE_ACCESS_KEY) === STORE_ACCESS_VALUE;
}

export function grantStoreAccess(): void {
    safeLocalStorage.setItem(STORE_ACCESS_KEY, STORE_ACCESS_VALUE);
}

export function revokeStoreAccess(): void {
    safeLocalStorage.removeItem(STORE_ACCESS_KEY);
}