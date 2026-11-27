import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';
import { APP_INFO } from '../config/constants';
import { authApi } from './api';
import { authStorage } from './storage';

let lastSyncMs = 0;

export async function collectDeviceInfo() {
  try {
    const [info, battery] = await Promise.all([
      Device.getInfo().catch(() => null),
      Device.getBatteryInfo().catch(() => null),
    ]);
    return {
      platform: info?.platform || Capacitor.getPlatform(),
      model: info?.model || navigator.platform || 'Unknown',
      manufacturer: info?.manufacturer || '',
      operatingSystem: info?.operatingSystem || '',
      osVersion: info?.osVersion || '',
      isVirtual: Boolean(info?.isVirtual),
      memUsed: info?.memUsed || null,
      batteryLevel: battery?.batteryLevel ?? null,
      isCharging: battery?.isCharging ?? null,
      language: navigator.language || 'en-IN',
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      userAgent: navigator.userAgent?.slice(0, 160) || '',
    };
  } catch {
    return {
      platform: Capacitor.getPlatform(),
      userAgent: navigator.userAgent?.slice(0, 160) || '',
    };
  }
}

export async function captureAndSyncTelemetry({ force = false, requestPermission = false } = {}) {
  const token = authStorage.getToken();
  if (!token) return null;

  const now = Date.now();
  if (!force && now - lastSyncMs < 90000) {
    return null;
  }
  lastSyncMs = now;

  let gps = null;
  let source = 'IP';

  try {
    if (Capacitor.isNativePlatform()) {
      let perm = await Geolocation.checkPermissions().catch(() => ({ location: 'prompt' }));
      if (requestPermission && perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions().catch(() => perm);
      }
      if (perm.location === 'granted' || perm.coarseLocation === 'granted') {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        }).catch(() => null);
        if (pos?.coords) {
          gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
          };
          source = 'GPS';
        }
      }
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const pos = await new Promise((resolve) => {
        if (!requestPermission && !navigator.permissions) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
        );
      });
      if (pos?.coords) {
        gps = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        };
        source = 'GPS';
      }
    }
  } catch {
    // Fallback cleanly to IP telemetry
  }

  const deviceInfo = await collectDeviceInfo();

  return authApi
    .sendTelemetry({
      ...(gps || {}),
      source,
      deviceInfo,
      appVersion: APP_INFO.appVersion,
    })
    .catch(() => null);
}
