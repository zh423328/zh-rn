import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { FadeInView, PressableScale, Screen, toast } from '@/components';
import {
  toErrorMessage,
  useLoginByAccount,
  useLoginByPhone,
  useSendVerificationCode,
} from '@/features/auth/hooks';
import { maskPhone } from '@/utils/logger';
import { ripple } from '@/theme';

type LoginMode = 'account' | 'phone';

/**
 * 登录页
 *
 * 演示账号 admin / 123456；演示验证码 123456。
 * 登录成功后由 SessionGate 自动切换到 (main) 分组。
 */
export default function Login() {
  const [mode, setMode] = useState<LoginMode>('account');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [phoneNumber, setPhoneNumber] = useState('13800138000');
  const [verificationCode, setVerificationCode] = useState('');

  const loginByAccount = useLoginByAccount();
  const loginByPhone = useLoginByPhone();
  const sendCode = useSendVerificationCode();

  const loading = loginByAccount.isPending || loginByPhone.isPending;

  const handleSendCode = () => {
    sendCode.mutate(phoneNumber, {
      onSuccess: () => toast.success('验证码已发送（演示：123456）'),
      onError: (error) => toast.error(toErrorMessage(error, '验证码发送失败')),
    });
  };

  const handleLogin = () => {
    if (loading) return;

    const onSuccess = () => {
      toast.success('登录成功');
      router.replace('/(main)/home');
    };
    const onError = (error: unknown) => {
      // 展示时对手机号做脱敏，避免明文进入提示与日志
      toast.error(
        toErrorMessage(error, '登录失败'),
        mode === 'phone' ? maskPhone(phoneNumber) : '',
      );
    };

    if (mode === 'account') {
      loginByAccount.mutate({ username, password }, { onSuccess, onError });
    } else {
      loginByPhone.mutate({ phoneNumber, verificationCode }, { onSuccess, onError });
    }
  };

  return (
    <Screen className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/*
       * 登录页必须处理键盘遮挡：
       * Android 默认 adjustResize 会压缩窗口，若子元素不能收缩（RN 默认 flexShrink: 0），
       * 各元素会溢出并互相重叠 —— 这就是之前排版错位的原因。
       * 解决方式：外层 KeyboardAvoidingView + 内层 ScrollView，内容可滚动且自动避让。
       */}
      <KeyboardAvoidingView
        className="flex-1"
        testID="login-keyboard-avoiding"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="login-scroll"
          className="flex-1"
          contentContainerClassName="grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-md self-center">
            {/* 标题区：最先入场 */}
            <FadeInView delay={0}>
              <Text className="text-3xl font-bold text-text">欢迎登录</Text>
              <Text className="mt-2 text-sm text-text-secondary">
                zh-rn-app · Expo + NativeWind 企业级模板
              </Text>
            </FadeInView>

            {/* 模式切换：错开 80ms */}
            <FadeInView delay={80} style={{ marginTop: 32 }}>
              <View className="flex-row rounded-xl bg-surface p-1">
                <ModeTab
                  label="账号密码"
                  active={mode === 'account'}
                  onPress={() => setMode('account')}
                />
                <ModeTab
                  label="验证码"
                  active={mode === 'phone'}
                  onPress={() => setMode('phone')}
                />
              </View>
            </FadeInView>

            {/* 表单区：错开 160ms */}
            <FadeInView delay={160} style={{ marginTop: 24 }}>
              <View className="gap-4">
                {mode === 'account' ? (
                  <>
                    <TextInput
                      className="h-12 rounded-xl bg-surface px-4 text-base text-text"
                      placeholder="用户名（admin）"
                      placeholderTextColor="#8a9099"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
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
                        disabled={sendCode.isPending}
                        android_ripple={ripple.onSurface}
                        accessibilityRole="button"
                        className="h-12 w-28 items-center justify-center rounded-xl border border-primary active:opacity-80 disabled:opacity-60"
                      >
                        <Text className="text-sm font-semibold text-primary">
                          {sendCode.isPending ? '发送中' : '发验证码'}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}

                <PressableScale
                  onPress={handleLogin}
                  disabled={loading}
                  accessibilityLabel={loading ? '登录中' : '登录'}
                  className="mt-2 h-12 items-center justify-center rounded-xl bg-primary disabled:opacity-60"
                >
                  <Text className="text-base font-semibold text-primary-foreground">
                    {loading ? '登录中...' : '登录'}
                  </Text>
                </PressableScale>

                <Text className="mt-2 text-center text-xs text-text-secondary">
                  演示账号 admin / 123456，验证码 123456
                </Text>
              </View>
            </FadeInView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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
      // 背景随选中态切换，ripple 颜色也要跟着变：
      // 激活时是蓝底白字 → 白色淡化；未激活是透明底 → 主色淡化
      android_ripple={active ? ripple.onPrimary : ripple.onSurface}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={`h-10 flex-1 items-center justify-center rounded-lg ${active ? 'bg-primary' : ''}`}
    >
      <Text
        className={`text-sm font-semibold ${
          active ? 'text-primary-foreground' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
