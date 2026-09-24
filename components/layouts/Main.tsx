import { cn } from "@/lib/utils";
import { FC, ReactNode } from "react";

interface MainProps {
  children?: ReactNode;
  className?: string;
}

const Main: FC<MainProps> = ({ children, className }) => {
  return (
    <main className={cn("flex w-full grow flex-col", className)}>
      {children}
    </main>
  );
};

export default Main;
