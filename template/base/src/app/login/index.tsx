import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { loginByAccount, loginByPhone, sendVerificationCode } from '@/api/login';
import { useTokenStore, useUserStore } from '@/store';
import { reLaunchToHome } from '@/utils';

type LoginMode = 'account' | 'phone';

/**
 * 登录页（对应 uni 版 pages/login/index.vue）
 * 演示账号 admin / 123456；演示验证码 123456
 */
export default function Login() {
  const [mode, setMode] = useState<LoginMode>('account');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [phoneNumber, setPhoneNumber] = useState('13800138000');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setToken = useTokenStore((s) => s.setToken);
  const setUserInfo = useUserStore((s) => s.setUserInfo);

  const handleSendCode = async () => {
    await sendVerificationCode({ phoneNumber });
    Toast.show({ type: 'success', text1: '验证码已发送（演示验证码：123456）' });
  };

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res =
        mode === 'account'
          ? await loginByAccount({ username, password })
          : await loginByPhone({ phoneNumber, verificationCode });

      // 写入登录态（persist 自动持久化）
      setToken(res.access_token);
      setUserInfo(res.user);

      Toast.show({ type: 'success', text1: `欢迎回来，${res.user.nickname}` });
      reLaunchToHome();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || '登录失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6">
        {/* 标题 */}
        <View className="mt-10">
          <Text className="text-3xl font-bold text-text">欢迎登录</Text>
          <Text className="mt-2 text-sm text-text-secondary">zh-rn-app · Expo + NativeWind 模板</Text>
        </View>

        {/* 模式切换 */}
        <View className="mt-8 flex-row rounded-xl bg-surface p-1">
          <ModeTab label="账号密码" active={mode === 'account'} onPress={() => setMode('account')} />
          <ModeTab label="验证码" active={mode === 'phone'} onPress={() => setMode('phone')} />
        </View>

        {/* 表单 */}
        <View className="mt-6 gap-4">
          {mode === 'account' ? (
            <>
              <TextInput
                className="h-12 rounded-xl bg-surface px-4 text-base text-text"
                placeholder="用户名（admin）"
                placeholderTextColor="#8a9099"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <TextInput
                className="h-12 rounded-xl bg-surface px-4 text-base text-text"
                placeholder="密码（123456）"
                placeholderTextColor="#8a9099"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          ) : (
            <>
              <TextInput
                className="h-12 rounded-xl bg-surface px-4 text-base text-text"
                placeholder="手机号"
                placeholderTextColor="#8a9099"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={11}
              />
              <View className="flex-row gap-3">
                <TextInput
                  className="h-12 flex-1 rounded-xl bg-surface px-4 text-base text-text"
                  placeholder="验证码（123456）"
                  placeholderTextColor="#8a9099"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  onPress={handleSendCode}
                  className="h-12 w-28 items-center justify-center rounded-xl border border-primary active:opacity-80"
                >
                  <Text className="text-sm font-semibold text-primary">发验证码</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="mt-2 h-12 items-center justify-center rounded-xl bg-primary active:opacity-80 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-primary-foreground">
              {loading ? '登录中...' : '登录'}
            </Text>
          </Pressable>
        </View>

        {/* 返回 */}
        <Pressable onPress={() => router.back()} className="mt-6 items-center py-2">
          <Text className="text-sm text-text-secondary">先逛逛，返回首页</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 flex-1 items-center justify-center rounded-lg ${active ? 'bg-primary' : ''}`}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-primary-foreground' : 'text-text-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
