/* eslint-env jest */

/**
 * Reanimated 测试替身
 *
 * 为什么需要它：
 * 测试环境没有 worklets / reanimated 的原生层，真实实现一被 import
 * 就会去访问不存在的原生模块。同时 expo-router 的原生 Stack 又会
 * 间接拉起一整条原生依赖链，让 renderRouter 直接抛错。
 *
 * 为什么不直接 jest.mock('react-native-reanimated/mock')：
 * 官方 mock 是 TypeScript 源码，经 babel 转译后的导出形态与
 * 真实包不一致（拿不到 useSharedValue 等具名导出），
 * 会导致 "useSharedValue is not a function"。
 *
 * 这里的策略：只替换「必须有原生层才能工作」的部分。
 * - 动画函数（withTiming / withSpring / withDelay）直接返回终值，
 *   动画在测试里瞬时完成，断言不需要等待。
 * - Hook 返回稳定的假对象，组件可正常渲染。
 * - Animated.* 退化成普通 RN 组件，保留 props 与 children。
 */

const React = require('react');

/**
 * 惰性取 RN 组件：
 * 在 jest.setup 阶段直接 require('react-native') 会与 RN 自身的
 * 初始化形成循环依赖（表现为 require 栈无限重复），
 * 所以推迟到真正渲染时才解析。
 */
function rn() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native');
}

/** 把 Animated.X 变成能渲染的普通组件，并丢掉动画专属 prop */
function makeAnimatedComponent(Base) {
  return function AnimatedMock(props) {
    const { entering, exiting, layout, sharedTransitionTag, style, ...rest } = props;
    void entering;
    void exiting;
    void layout;
    void sharedTransitionTag;
    return React.createElement(Base, { ...rest, style }, props.children);
  };
}

/** 动画进度对象：测试中直接视为已到终态 */
function createSharedValue(initial) {
  return {
    value: initial,
    get() {
      return this.value;
    },
    set(next) {
      this.value = typeof next === 'function' ? next(this.value) : next;
    },
    addListener() {},
    removeListener() {},
    modify() {},
  };
}

const Animated = {
  get View() {
    return makeAnimatedComponent(rn().View);
  },
  get Text() {
    return makeAnimatedComponent(rn().Text);
  },
  get Image() {
    return makeAnimatedComponent(rn().Image);
  },
  get ScrollView() {
    return makeAnimatedComponent(rn().ScrollView);
  },
  get FlatList() {
    return makeAnimatedComponent(rn().FlatList);
  },
  createAnimatedComponent: makeAnimatedComponent,
};

// 布局动画的 builder：链式调用全部返回自身，不产生任何实际效果
function layoutBuilder() {
  const builder = {
    delay: () => builder,
    duration: () => builder,
    springify: () => builder,
    damping: () => builder,
    stiffness: () => builder,
    withInitialValues: () => builder,
    easing: () => builder,
    build: () => ({}),
  };
  return builder;
}

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,

  // Hooks
  useSharedValue: (initial) => React.useMemo(() => createSharedValue(initial), []),
  useAnimatedStyle: (fn) => {
    try {
      return fn() ?? {};
    } catch {
      return {};
    }
  },
  useAnimatedReaction: () => {},
  useAnimatedRef: () => React.createRef(),
  useAnimatedProps: () => ({}),
  useAnimatedScrollHandler: () => () => {},
  useDerivedValue: (fn) => createSharedValue(fn()),
  useReducedMotion: () => false,

  // 动画函数：直接返回目标值，等价于「瞬时完成」
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  withDelay: (_delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: (animation) => animation,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,

  // 布局动画
  FadeIn: layoutBuilder(),
  FadeOut: layoutBuilder(),
  FadeInDown: layoutBuilder(),
  FadeInUp: layoutBuilder(),
  FadeOutDown: layoutBuilder(),
  FadeOutUp: layoutBuilder(),
  ZoomIn: layoutBuilder(),
  ZoomOut: layoutBuilder(),
  SlideInDown: layoutBuilder(),
  Layout: layoutBuilder(),
  LinearTransition: layoutBuilder(),

  // 其他常用工具
  interpolate: (value, input, output) => {
    const idx = input.findIndex((v) => v >= value);
    if (idx <= 0) return output[0];
    const [in0, in1] = [input[idx - 1], input[idx]];
    const [out0, out1] = [output[idx - 1], output[idx]];
    const t = in1 === in0 ? 0 : (value - in0) / (in1 - in0);
    return out0 + t * (out1 - out0);
  },
  interpolateColor: (value) => value,
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    quad: (t) => t * t,
    cubic: (t) => t * t * t,
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
    bezier: () => (t) => t,
  },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  Keyframe: layoutBuilder,
  configureReanimatedLogger: () => {},
  enableLayoutAnimations: () => {},
  isReanimated3: () => true,
  isSharedValue: (v) => Boolean(v && typeof v === 'object' && 'value' in v),
};
