import Link from "next/link";

export default function ChannelLink({
  username,
  children,
  style,
}: {
  username: string | undefined | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (!username) return <>{children}</>;
  return (
    <Link
      href={`/channel/${username}`}
      style={{ textDecoration: "none", color: "inherit", ...style }}
    >
      {children}
    </Link>
  );
}
