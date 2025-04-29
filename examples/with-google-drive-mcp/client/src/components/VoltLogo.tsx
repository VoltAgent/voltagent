import { BoltIcon } from "@heroicons/react/24/solid";

interface VoltLogoProps {
  className?: string;
}

const VoltLogo = ({ className = "" }: VoltLogoProps) => (
  <span className={`inline-flex items-center justify-center ${className}`}>
    <span className="flex items-center justify-center border-solid border-2 border-[#00d992] rounded-full p-1">
      <BoltIcon className="w-4 h-4 text-[#00d992]" />
    </span>
  </span>
);

export default VoltLogo;
