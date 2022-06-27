export type Timestamp = {
  totalMillis: number,
};

export type TimestampParts = {
  millis: number,
  seconds: number,
  minutes: number,
  hours: number,
};

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLIS_PER_SECOND = 1000;
const MILLIS_PER_MINUTE = MILLIS_PER_SECOND * SECONDS_PER_MINUTE;
const MILLIS_PER_HOUR = MILLIS_PER_MINUTE * MINUTES_PER_HOUR;

export function toParts(timestamp: Timestamp): TimestampParts {
  const { totalMillis } = timestamp;
  const millis = totalMillis % MILLIS_PER_SECOND;
  const seconds = Math.floor(totalMillis / MILLIS_PER_SECOND) % SECONDS_PER_MINUTE;
  const minutes = Math.floor(totalMillis / MILLIS_PER_MINUTE) % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMillis / MILLIS_PER_HOUR);
  return { millis, seconds, minutes, hours };
}

export function fromParts({ millis, seconds, minutes, hours }: TimestampParts): Timestamp {
  const totalMillis = (hours * MILLIS_PER_HOUR) + (minutes * MILLIS_PER_MINUTE) + (seconds * MILLIS_PER_SECOND) + millis;
  return { totalMillis };
}

export function fromMillis(totalMillis: number): Timestamp {
  return { totalMillis };
}

function pad2(x: number): string {
  return String(x).padStart(2, '0');
}

export function prettyPrint(timestamp: Timestamp): string {
  const { millis, seconds, minutes, hours } = toParts(timestamp);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${String(millis).padStart(3, '0')}`;
}
