import { cn } from "@/lib/utils";
import { MenuIcon, XIcon } from "lucide-react";
import { FC } from "react";

interface BurgerBtnProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}

const BurgerBtn: FC<BurgerBtnProps> = ({
  isOpen = false,
  setIsOpen,
  className,
}) => {
  return (
    <button
      className={cn(
        "bg-accent relative flex h-10 w-10 scale-90 cursor-pointer items-center justify-center overflow-hidden rounded-lg p-3 transition hover:scale-100",
        isOpen && "bg-primary scale-100 text-white",
        className
      )}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      {isOpen ? (
        <XIcon className="size-14" />
      ) : (
        <MenuIcon className="size-14" />
      )}
    </button>
  );
};

export default BurgerBtn;
