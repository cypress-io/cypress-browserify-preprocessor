import math from './math'

interface Props {
  greeting: string
}

export const Foo = ({ greeting }: Props) => {
  return <div>{greeting}{math.add(1, 2)}</div>
}
