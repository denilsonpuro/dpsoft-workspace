export function decimalDifference(current: string, previous: string): string {
  const pattern = /^-?\d+(?:\.\d+)?$/;
  if (!pattern.test(current) || !pattern.test(previous)) throw new Error("The source returned a non-finite decimal amount.");
  const precision = Math.max(current.split(".")[1]?.length ?? 0, previous.split(".")[1]?.length ?? 0);
  const scaled = (value: string) => { const negative = value.startsWith("-"); const [whole = "0", fraction = ""] = value.replace(/^-/, "").split("."); return BigInt(`${whole}${fraction.padEnd(precision, "0")}`) * (negative ? -1n : 1n); };
  const delta = scaled(current) - scaled(previous);
  const digits = (delta < 0n ? -delta : delta).toString().padStart(precision + 1, "0");
  return `${delta < 0n ? "-" : ""}${precision ? `${digits.slice(0, -precision)}.${digits.slice(-precision)}` : digits}`;
}
