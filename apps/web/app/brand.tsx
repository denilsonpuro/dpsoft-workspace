import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="wordmark"><Image src="/brand/dpsoft-mark.png" width={48} height={48} alt="" priority /><span>dpsoft<span className="wordmark-period">.</span>{!compact && <small>BUSINESS, CONNECTED.</small>}</span></span>;
}
