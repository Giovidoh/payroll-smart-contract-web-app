import { APP_NAME } from "@/configs/app-config";
import { cn } from "@/lib/utils";
// import defaultLogo from "@/public/assets/images/logos/defaultLogo.png";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

interface LogoLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href?: string;
  src?: string | StaticImageData;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  linkClassName?: string;
  priority?: boolean;
  quality?: number;
}

const LogoLink = ({
  href = "/",
  src = "",
  alt = "Logo",
  width = 150,
  height = 150,
  className,
  imageClassName,
  linkClassName,
  priority = false,
  quality = 75,
  ...props
}: LogoLinkProps) => {
  return (
    <Link href={href} className={cn("w-fit", linkClassName)} {...props}>
      {/* <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        className={cn(
          "h-auto w-[clamp(100px,13vw,150px)]",
          imageClassName,
          className
        )}
      /> */}
      <span className="font-bold text-[clamp(16px,1.5vw,20px)]">
        {APP_NAME}
      </span>
    </Link>
  );
};

export default LogoLink;
