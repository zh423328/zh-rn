import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * 路由入口（/）
 *
 * 这里刻意**不**使用 <Redirect>。
 *
 * 原因：<Redirect> 自身渲染为 null。如果它触发的导航因为时序问题
 * （导航容器尚未 ready、或与 SessionGate 的 replace 撞车）没有生效，
 * 界面就停在 "/" 上，而 "/" 渲染的是 null —— 表现为整屏白屏，且没有任何报错。
 *
 * 改为渲染一个纯色 Loading：即使导航还没完成，用户看到的也是加载态，
 * 并且能明确区分「还在跳转」和「已经白屏」。
 * 真正的跳转统一交给根布局的 SessionGate 处理，避免两处同时导航。
 */
export default function Index() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      <ActivityIndicator size="large" color="#4f7cff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6fa',
  },
});
