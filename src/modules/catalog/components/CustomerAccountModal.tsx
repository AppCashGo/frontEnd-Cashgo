import {
  Camera,
  ChevronRight,
  Heart,
  Home,
  LogOut,
  MapPin,
  PackageSearch,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import {
  deleteCatalogAddress,
  getCatalogCustomerFavorites,
  getCatalogCustomerProfile,
  getCatalogSavedAddresses,
  removeCatalogCustomerFavorite,
  saveCatalogAddress,
  updateCatalogCustomerProfile,
  uploadCatalogCustomerAvatar,
} from "../services/catalog-customer-api";
import type {
  CatalogCustomerFavorite,
  CatalogCustomerProfile,
  CatalogSavedAddress,
} from "../types/catalog-customer";
import type { CatalogCustomer } from "../types/customer-session";
import styles from "./CustomerAccountModal.module.css";

type Section = "home" | "favorites" | "addresses" | "profile";

export function CustomerAccountModal({
  accessToken,
  catalogSlug,
  customer,
  initialSection = "home",
  onClose,
  onLogout,
  onOpenOrders,
  onProfileUpdated,
  onShop,
}: {
  accessToken: string;
  catalogSlug: string;
  customer: CatalogCustomer;
  initialSection?: Section;
  onClose: () => void;
  onLogout: () => void;
  onOpenOrders: () => void;
  onProfileUpdated: (customer: Partial<CatalogCustomer>) => void;
  onShop: () => void;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [profile, setProfile] = useState<CatalogCustomerProfile | null>(null);
  const [favorites, setFavorites] = useState<CatalogCustomerFavorite[]>([]);
  const [addresses, setAddresses] = useState<CatalogSavedAddress[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Casa",
    address: "",
    instructions: "",
  });

  useEffect(() => {
    Promise.all([
      getCatalogCustomerProfile(catalogSlug, accessToken),
      getCatalogCustomerFavorites(catalogSlug, accessToken),
      getCatalogSavedAddresses(catalogSlug, accessToken),
    ])
      .then(([nextProfile, nextFavorites, nextAddresses]) => {
        setProfile(nextProfile);
        setFavorites(nextFavorites);
        setAddresses(nextAddresses);
      })
      .catch((error) =>
        setNotice(getErrorMessage(error, "No pudimos cargar toda tu cuenta.")),
      );
  }, [accessToken, catalogSlug]);

  const initials = useMemo(
    () =>
      customer.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    [customer.name],
  );

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setNotice(null);
    try {
      const updated = await updateCatalogCustomerProfile(
        catalogSlug,
        accessToken,
        {
          name: profile.name,
          phone: profile.phone,
          documentType: profile.documentType,
          documentNumber: profile.documentNumber,
          address: profile.address,
        },
      );
      setProfile(updated);
      onProfileUpdated({
        name: updated.name,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
      });
      setNotice("Perfil actualizado correctamente.");
    } catch (error) {
      setNotice(getErrorMessage(error, "No pudimos actualizar tu perfil."));
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await uploadCatalogCustomerAvatar(
        catalogSlug,
        accessToken,
        file,
      );
      setProfile((current) =>
        current ? { ...current, avatarUrl: result.avatarUrl } : current,
      );
      onProfileUpdated({ avatarUrl: result.avatarUrl });
      setNotice("Foto de perfil actualizada.");
    } catch (error) {
      setNotice(getErrorMessage(error, "No pudimos subir la foto."));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const addAddress = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const saved = await saveCatalogAddress(
        catalogSlug,
        accessToken,
        addressForm,
      );
      setAddresses((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setAddressForm({ label: "Casa", address: "", instructions: "" });
      setNotice("Dirección guardada.");
    } catch (error) {
      setNotice(getErrorMessage(error, "No pudimos guardar la dirección."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.layer}>
      <button
        aria-label="Cerrar mi cuenta"
        className={styles.backdrop}
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Mi cuenta"
        aria-modal="true"
        className={styles.modal}
        role="dialog"
      >
        <aside className={styles.sidebar}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {customer.avatarUrl ? (
                <img
                  alt=""
                  src={resolveApiAssetUrl(customer.avatarUrl) ?? undefined}
                />
              ) : (
                initials
              )}
            </span>
            <div>
              <small>Mi cuenta</small>
              <strong>{customer.name}</strong>
              <span>{customer.email}</span>
            </div>
          </div>
          <nav>
            <NavButton
              active={section === "home"}
              icon={<Home />}
              label="Inicio"
              onClick={() => setSection("home")}
            />
            <button onClick={onOpenOrders} type="button">
              <PackageSearch /> Mis compras <ChevronRight />
            </button>
            <NavButton
              active={section === "favorites"}
              icon={<Heart />}
              label="Favoritos"
              onClick={() => setSection("favorites")}
            />
            <NavButton
              active={section === "addresses"}
              icon={<MapPin />}
              label="Direcciones"
              onClick={() => setSection("addresses")}
            />
            <NavButton
              active={section === "profile"}
              icon={<UserRound />}
              label="Mi perfil"
              onClick={() => setSection("profile")}
            />
          </nav>
          <button className={styles.logout} onClick={onLogout} type="button">
            <LogOut /> Cerrar sesión
          </button>
        </aside>
        <div className={styles.content}>
          <header>
            <div>
              <p>Área personal</p>
              <h2>{sectionTitle(section)}</h2>
            </div>
            <button aria-label="Cerrar" onClick={onClose} type="button">
              <X />
            </button>
          </header>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {section === "home" ? (
            <div className={styles.homePanel}>
              <div className={styles.welcome}>
                <span>
                  <ShoppingBag />
                </span>
                <div>
                  <h3>Hola, {customer.name.split(" ")[0]}</h3>
                  <p>
                    Desde aquí puedes administrar tus compras y tus datos sin
                    salir del catálogo.
                  </p>
                </div>
              </div>
              <div className={styles.quickGrid}>
                <button onClick={onOpenOrders} type="button">
                  <PackageSearch />
                  <strong>Mis compras</strong>
                  <span>Consulta y recompra pedidos</span>
                </button>
                <button onClick={() => setSection("favorites")} type="button">
                  <Heart />
                  <strong>{favorites.length} favoritos</strong>
                  <span>Productos que guardaste</span>
                </button>
                <button onClick={() => setSection("addresses")} type="button">
                  <MapPin />
                  <strong>{addresses.length} direcciones</strong>
                  <span>Entrega más rápido</span>
                </button>
                <button onClick={() => setSection("profile")} type="button">
                  <UserRound />
                  <strong>Mi perfil</strong>
                  <span>Actualiza tus datos y foto</span>
                </button>
              </div>
              <button className={styles.primary} onClick={onShop} type="button">
                Seguir comprando
              </button>
            </div>
          ) : null}
          {section === "favorites" ? (
            favorites.length ? (
              <div className={styles.favoriteGrid}>
                {favorites.map(({ product }) => (
                  <article key={product.id}>
                    <span>
                      {product.imageUrls?.[0] ? (
                        <img
                          alt=""
                          src={
                            resolveApiAssetUrl(product.imageUrls[0]) ??
                            undefined
                          }
                        />
                      ) : (
                        <ShoppingBag />
                      )}
                    </span>
                    <div>
                      <strong>{product.name}</strong>
                      <small>
                        {product.isAvailable
                          ? `${product.stock} disponibles`
                          : "No disponible"}
                      </small>
                      <span className={styles.favoriteActions}>
                        <button onClick={onShop} type="button">
                          Comprar
                        </button>
                        <button
                          aria-label={`Quitar ${product.name} de favoritos`}
                          onClick={() => {
                            void removeCatalogCustomerFavorite(
                              catalogSlug,
                              accessToken,
                              product.id,
                            ).then(() =>
                              setFavorites((current) =>
                                current.filter(
                                  (item) => item.product.id !== product.id,
                                ),
                              ),
                            );
                          }}
                          type="button"
                        >
                          <Trash2 />
                        </button>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                icon={<Heart />}
                title="Aún no tienes favoritos"
                text="Usa el corazón de cada producto para guardarlo aquí."
              />
            )
          ) : null}
          {section === "addresses" ? (
            <div className={styles.addressLayout}>
              <form className={styles.form} onSubmit={addAddress}>
                <h3>
                  <Plus /> Nueva dirección
                </h3>
                <label>
                  Nombre
                  <input
                    required
                    minLength={2}
                    value={addressForm.label}
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,
                        label: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Dirección
                  <input
                    required
                    minLength={5}
                    value={addressForm.address}
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,
                        address: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Indicaciones
                  <input
                    value={addressForm.instructions}
                    onChange={(event) =>
                      setAddressForm({
                        ...addressForm,
                        instructions: event.target.value,
                      })
                    }
                  />
                </label>
                <button
                  className={styles.primary}
                  disabled={busy}
                  type="submit"
                >
                  Guardar dirección
                </button>
              </form>
              <div className={styles.addressList}>
                {addresses.map((address) => (
                  <article key={address.id}>
                    <MapPin />
                    <div>
                      <strong>
                        {address.label}{" "}
                        {address.isDefault ? <small>Principal</small> : null}
                      </strong>
                      <span>{address.address}</span>
                      {address.instructions ? (
                        <small>{address.instructions}</small>
                      ) : null}
                    </div>
                    <button
                      aria-label="Eliminar dirección"
                      onClick={() => {
                        void deleteCatalogAddress(
                          catalogSlug,
                          accessToken,
                          address.id,
                        ).then(() =>
                          setAddresses((current) =>
                            current.filter((item) => item.id !== address.id),
                          ),
                        );
                      }}
                      type="button"
                    >
                      <Trash2 />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {section === "profile" && profile ? (
            <form className={styles.profileForm} onSubmit={saveProfile}>
              <div className={styles.avatarEditor}>
                <span>
                  {profile.avatarUrl ? (
                    <img
                      alt=""
                      src={resolveApiAssetUrl(profile.avatarUrl) ?? undefined}
                    />
                  ) : (
                    initials
                  )}
                </span>
                <label>
                  <Camera /> Cambiar foto
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(event) => void uploadAvatar(event)}
                    type="file"
                  />
                </label>
                <small>PNG, JPG o WEBP. Máximo 2 MB.</small>
              </div>
              <div className={styles.fields}>
                <label>
                  Nombre completo
                  <input
                    required
                    minLength={2}
                    value={profile.name}
                    onChange={(event) =>
                      setProfile({ ...profile, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Correo verificado
                  <input disabled value={profile.email} />
                </label>
                <label>
                  Teléfono
                  <input
                    value={profile.phone ?? ""}
                    onChange={(event) =>
                      setProfile({ ...profile, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  Tipo de documento
                  <input
                    value={profile.documentType ?? ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        documentType: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Número de documento
                  <input
                    value={profile.documentNumber ?? ""}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        documentNumber: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.fullField}>
                  Dirección principal
                  <input
                    value={profile.address ?? ""}
                    onChange={(event) =>
                      setProfile({ ...profile, address: event.target.value })
                    }
                  />
                </label>
              </div>
              <button className={styles.primary} disabled={busy} type="submit">
                <Save /> {busy ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? styles.active : ""}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
      <ChevronRight />
    </button>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.empty}>
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function sectionTitle(section: Section) {
  return {
    home: "Resumen de mi cuenta",
    favorites: "Mis favoritos",
    addresses: "Mis direcciones",
    profile: "Mi perfil",
  }[section];
}
