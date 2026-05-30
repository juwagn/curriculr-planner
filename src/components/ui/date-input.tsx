import * as React from 'react';
import { Input } from './input';

type Props = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'defaultValue' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Native `<input type="date">` controlled by React resets the editing caret on
 * every re-render: while typing the year digit-by-digit each intermediate date
 * (year 0008, 0082, 0820, …) is valid, fires onChange, and React writes the
 * value back, stomping the caret. The field becomes untypeable and lands on a
 * garbage year.
 *
 * Fix: keep the input uncontrolled (`defaultValue`) so React never sets `.value`
 * mid-edit. We still surface every change via `onValueChange`, and we re-mount
 * (bumping `key`) only when `value` changes from the *outside* (e.g. an API
 * fetch populating the field), never in response to the user's own typing.
 */
export function DateInput({ value, onValueChange, ...props }: Props) {
  const lastEmitted = React.useRef(value);
  const [mountKey, setMountKey] = React.useState(0);

  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setMountKey((k) => k + 1);
    }
  }, [value]);

  return (
    <Input
      key={mountKey}
      type="date"
      defaultValue={value}
      onChange={(e) => {
        lastEmitted.current = e.target.value;
        onValueChange(e.target.value);
      }}
      {...props}
    />
  );
}
