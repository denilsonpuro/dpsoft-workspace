export function proxyTrust(hops = 0) {
  return (_address: string, hop: number): boolean => hop < hops;
}
