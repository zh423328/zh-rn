import { Stack } from 'expo-router';

/** 未登录流程分组：登录、验证码、忘记密码等 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
