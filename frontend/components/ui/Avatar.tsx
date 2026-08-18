import Image from "next/image";
import { initials } from "@/lib/format";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name) || "?"}
    </div>
  );
}
