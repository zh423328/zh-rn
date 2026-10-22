/**
 * 版本比较与更新决策测试
 *
 * 这块逻辑最容易出线上事故：
 * - 写错会导致「永远提示更新」（骚扰用户）
 * - 或「永远不更新」（修复发不出去）
 */
import {
  compareVersion,
  formatBytes,
  isForceUpdate,
  isNewerVersion,
  needsApkUpdate,
  parseVersion,
} from '@/features/updates/version';

describe('parseVersion', () => {
  it('解析普通版本号', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
  });

  it('去掉 v 前缀', () => {
    expect(parseVersion('v2.0.1')).toEqual([2, 0, 1]);
  });

  it('忽略预发布标识', () => {
    expect(parseVersion('1.2.3-beta.1')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2.3+build.5')).toEqual([1, 2, 3]);
  });

  it('非法值不抛错', () => {
    expect(parseVersion('')).toEqual([0]);
    expect(parseVersion('abc')).toEqual([0]);
  });
});

describe('compareVersion', () => {
  it('位数不同也能正确比较', () => {
    // 关键边界：1.10 必须大于 1.9（字符串比较会出错）
    expect(compareVersion('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersion('1.9.0', '1.10.0')).toBe(-1);
  });

  it('相等返回 0', () => {
    expect(compareVersion('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersion('1.2', '1.2.0')).toBe(0);
  });

  it('主版本优先', () => {
    expect(compareVersion('2.0.0', '1.99.99')).toBe(1);
  });
});

describe('isNewerVersion', () => {
  it('新版本返回 true', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
  });

  it('相同或更旧返回 false', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('0.9.9', '1.0.0')).toBe(false);
  });
});

describe('needsApkUpdate', () => {
  it('runtimeVersion 不同 → 必须换 APK（原生已变）', () => {
    expect(
      needsApkUpdate({
        currentVersion: '1.0.0',
        currentRuntimeVersion: 'aaa',
        info: { version: '1.0.0', runtimeVersion: 'bbb' },
      }),
    ).toBe(true);
  });

  it('versionCode 更大 → 需要更新', () => {
    expect(
      needsApkUpdate({
        currentVersion: '1.0.0',
        currentVersionCode: 5,
        info: { version: '1.0.0', versionCode: 6 },
      }),
    ).toBe(true);
  });

  it('versionCode 相同则回退比较版本号', () => {
    expect(
      needsApkUpdate({
        currentVersion: '1.0.0',
        currentVersionCode: 5,
        info: { version: '1.1.0', versionCode: 5 },
      }),
    ).toBe(true);
  });

  it('版本没变化 → 不需要更新', () => {
    expect(
      needsApkUpdate({
        currentVersion: '1.0.0',
        currentVersionCode: 5,
        info: { version: '1.0.0', versionCode: 5 },
      }),
    ).toBe(false);
  });

  it('服务端版本更旧 → 不降级', () => {
    expect(
      needsApkUpdate({
        currentVersion: '2.0.0',
        currentVersionCode: 10,
        info: { version: '1.0.0', versionCode: 9 },
      }),
    ).toBe(false);
  });
});

describe('isForceUpdate', () => {
  it('服务端标记强制', () => {
    expect(isForceUpdate({ currentVersion: '1.0.0', forceUpdate: true })).toBe(true);
  });

  it('低于最低支持版本 → 强制', () => {
    expect(
      isForceUpdate({ currentVersion: '1.0.0', minSupportedVersion: '1.2.0' }),
    ).toBe(true);
  });

  it('达到最低版本 → 不强制', () => {
    expect(
      isForceUpdate({ currentVersion: '1.2.0', minSupportedVersion: '1.2.0' }),
    ).toBe(false);
  });

  it('无任何条件 → 不强制', () => {
    expect(isForceUpdate({ currentVersion: '1.0.0' })).toBe(false);
  });
});

describe('formatBytes', () => {
  it('按单位换算', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB');
  });

  it('非法值返回 0 B', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});
