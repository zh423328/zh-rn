/**
 * 组件测试范例：EmptyView / ErrorView
 *
 * 注意：@testing-library/react-native v14 起 `render` 改为 **async**，
 * 必须 `await render(...)`，否则拿到的是 Promise（会让 screen 报
 * "`render` function has not been called"）。这是 v14 与 v13 的主要差异。
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyView, ErrorView } from '@/components/EmptyView';

describe('EmptyView', () => {
  it('渲染默认标题', async () => {
    await render(<EmptyView />);
    expect(screen.getByText('暂无数据')).toBeTruthy();
  });

  it('渲染自定义标题与描述', async () => {
    await render(<EmptyView title="还没有设备" description="设备注册后会显示在这里" />);
    expect(screen.getByText('还没有设备')).toBeTruthy();
    expect(screen.getByText('设备注册后会显示在这里')).toBeTruthy();
  });

  it('提供 actionLabel 时点击触发回调', async () => {
    const onAction = jest.fn();
    await render(<EmptyView actionLabel="刷新" onAction={onAction} />);

    fireEvent.press(screen.getByText('刷新'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('没有 actionLabel 时不渲染按钮', async () => {
    await render(<EmptyView onAction={jest.fn()} />);
    expect(screen.queryByText('刷新')).toBeNull();
  });
});

describe('ErrorView', () => {
  it('渲染错误信息并可重试', async () => {
    const onRetry = jest.fn();
    await render(<ErrorView message="设备列表加载失败" onRetry={onRetry} />);

    expect(screen.getByText('设备列表加载失败')).toBeTruthy();

    fireEvent.press(screen.getByText('重新加载'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('未传 onRetry 时不渲染重试按钮', async () => {
    await render(<ErrorView />);
    expect(screen.getByText('加载失败，请稍后重试')).toBeTruthy();
    expect(screen.queryByText('重新加载')).toBeNull();
  });
});
