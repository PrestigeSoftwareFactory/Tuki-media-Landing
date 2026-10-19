import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readCart } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { IconCart } from "@/components/icons";
import { HeaderNav } from "./HeaderNav";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const [user, cart, s] = await Promise.all([getCurrentUser(), readCart(), getSettings()]);
  // Tuki Media (inicio), Tuki Agencia y Tuki Academia, todo en el mismo sitio
  const links = [
    { href: "/", label: s.navMedia },
    { href: "/agencia", label: s.navAgency },
    { href: "/academia", label: s.navAcademy },
    { href: "/contacto", label: s.navContact },
  ];

  return (
    <header className="site-header">
      <div className="wrap headerinner">
        <Link href="/" className="brand" aria-label={`${s.brandName} — inicio`}>
          <img src={s.logoMain} alt={s.brandName} width={76} height={54} />
        </Link>
        <HeaderNav links={links} loggedIn={!!user} loginLabel={s.navLogin}>
          <Link href="/carrito" className="cartlink" aria-label={`Carrito (${cart.length})`}>
            <IconCart />
            {cart.length > 0 && <span className="cartcount">{cart.length}</span>}
          </Link>
          {user ? (
            <UserMenu
              firstName={user.firstName}
              lastName={user.lastName}
              email={user.email}
              isAdmin={user.role === "ADMIN"}
            />
          ) : (
            <Link href="/ingresar" className="btn accent nav-desktop-only">
              {s.navLogin.toUpperCase()} <span>→</span>
            </Link>
          )}
        </HeaderNav>
      </div>
    </header>
  );
}
