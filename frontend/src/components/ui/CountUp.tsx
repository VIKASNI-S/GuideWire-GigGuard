import { useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";

type Props = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
};

export function CountUp({ value, duration = 1200, prefix = "", suffix = "" }: Props) {
  const [spr, api] = useSpring(() => ({ n: 0, config: { duration } }));
  useEffect(() => {
    api.start({ n: value, config: { duration } });
  }, [value, duration, api]);
  return (
    <animated.span>
      {spr.n.to((n) => `${prefix}${Math.round(n).toLocaleString()}${suffix}`)}
    </animated.span>
  );
}
