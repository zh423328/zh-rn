export * from './types';
export * from './version';
export * from './ota';
export * from './apk';
// api.ts 里的 isOtaAvailable 是从 ota.ts 转出的，避免重复导出
export { checkForUpdates, applyOtaNow, fetchVersionInfo, getLocalVersionInfo } from './api';
export * from './hooks';
export { useUpdateStore } from './store';
export { UpdateDialog } from "./UpdateDialog";
