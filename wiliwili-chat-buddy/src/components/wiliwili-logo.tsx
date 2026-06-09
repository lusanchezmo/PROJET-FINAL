import logo from "@/assets/wiliwili-logo.png";

export function WiliwiliLogo({ size = 32, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logo}
        alt="Wiliwili logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {withText && (
        <span className="text-gradient-brand text-xl font-bold tracking-tight">wiliwili</span>
      )}
    </div>
  );
}
