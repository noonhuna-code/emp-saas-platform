import Image from "next/image";

type BrandLogoProps = {
  variant?: "lockup" | "mark";
  className?: string;
  priority?: boolean;
};

const variants = {
  lockup: {
    src: "/brand/emp-logo.svg",
    width: 360,
    height: 92
  },
  mark: {
    src: "/brand/emp-mark.svg",
    width: 96,
    height: 96
  }
} as const;

export function BrandLogo({
  variant = "lockup",
  className,
  priority = false
}: BrandLogoProps) {
  const asset = variants[variant];

  return (
    <Image
      alt="EMP"
      className={className}
      height={asset.height}
      priority={priority}
      src={asset.src}
      width={asset.width}
    />
  );
}
