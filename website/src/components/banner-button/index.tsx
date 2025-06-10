export function BannerButton({
  children,
  color = "bg-light-yellow",
  ...props
}) {
  return (
    <a
      href="#_"
      className="relative inline-block px-4 py-2 font-bold group no-underline "
      {...props}
    >
      <div className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-black group-hover:-translate-x-0 group-hover:-translate-y-0" />
      <div
        className={`absolute inset-0 w-full h-full ${color} border-solid border-2 border-black `}
      />
      <div className="relative text-black  flex items-center group-hover:text-black">
        {children}
      </div>
    </a>
  );
}
