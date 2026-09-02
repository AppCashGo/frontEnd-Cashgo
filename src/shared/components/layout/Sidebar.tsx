import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import {
  getActiveBusiness,
  getActiveBusinessCategory,
  getActiveBusinessRole,
  isActiveBusiness as matchesActiveBusiness,
} from "@/modules/auth/utils/get-active-business";
import { useCreateManagedBusinessMutation } from "@/modules/settings/hooks/use-settings-query";
import { CreateBusinessModal } from "@/shared/components/business/CreateBusinessModal";
import { getBusinessNavigationPreset } from "@/shared/constants/business-categories";
import { BrandLogo } from "@/shared/components/brand/BrandLogo";
import { AppIcon, type AppIconName } from "@/shared/components/icons/AppIcon";
import { LanguageSelect } from "@/shared/components/ui/LanguageSelect";
import {
  getModuleLandingPath,
  getModuleNavigationRoutes,
} from "@/routes/module-navigation-routes";
import { routePaths, routeSegments } from "@/routes/route-paths";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import { useTranslationsQuery } from "@/shared/hooks/use-translations-query";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

type SidebarIconName = AppIconName;

type SidebarIconProps = {
  name: SidebarIconName;
  className?: string;
};

function SidebarIcon({ name, className }: SidebarIconProps) {
  return <AppIcon className={className} name={name} />;
}

function BusinessAvatar({
  className,
  logoUrl,
  name,
}: {
  className: string;
  logoUrl?: string | null;
  name: string;
}) {
  const resolvedLogoUrl = resolveApiAssetUrl(logoUrl);

  return (
    <div className={className}>
      {resolvedLogoUrl ? (
        <img alt="" src={resolvedLogoUrl} />
      ) : (
        name.trim().charAt(0) || "?"
      )}
    </div>
  );
}

function getRouteIconName(segment: string): SidebarIconName {
  switch (segment) {
    case routeSegments.dashboard:
      return "dashboard";
    case routeSegments.sales:
      return "sales";
    case routeSegments.deliveries:
      return "deliveries";
    case routeSegments.movements:
      return "movements";
    case routeSegments.billing:
      return "billing";
    case routeSegments.reports:
      return "reports";
    case routeSegments.inventory:
      return "inventory";
    case routeSegments.products:
      return "products";
    case routeSegments.expenses:
      return "expenses";
    case routeSegments.employees:
      return "employees";
    case routeSegments.quotes:
      return "quotes";
    case routeSegments.money:
      return "money";
    case routeSegments.customers:
      return "customers";
    case routeSegments.suppliers:
      return "suppliers";
    case routeSegments.settings:
      return "settings";
    default:
      return "dashboard";
  }
}

function getRoleLabel(
  role: string | undefined,
  dictionary: ReturnType<typeof useAppTranslation>["dictionary"],
) {
  if (!role) {
    return "";
  }

  const roles = dictionary.layout.roles as Record<string, string>;

  return roles[role] ?? role;
}

export function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [isSupportOpen, setIsSupportOpen] = useState(true);
  const [isCreateBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [isBusinessMenuOpen, setBusinessMenuOpen] = useState(false);
  const location = useLocation();
  const businessMenuRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthSessionStore((state) => state.user);
  const setActiveBusiness = useAuthSessionStore(
    (state) => state.setActiveBusiness,
  );
  const addBusiness = useAuthSessionStore((state) => state.addBusiness);
  const clearSession = useAuthSessionStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const createManagedBusinessMutation = useCreateManagedBusinessMutation();
  const { dictionary, languageCode, translationId, setLanguagePreference } =
    useAppTranslation();
  const { data: translations = [] } = useTranslationsQuery();
  const navigationPreset = useBusinessNavigationPreset();
  const activeBusiness = getActiveBusiness(user);
  const activeBusinessCategory = getActiveBusinessCategory(user);
  const activeBusinessRole = getActiveBusinessRole(user);
  const navigationRoutes = getModuleNavigationRoutes(
    languageCode,
    activeBusinessCategory,
    activeBusinessRole,
  );
  const businessRoutes = navigationRoutes.filter(
    (route) => route.group === "business" && route.isVisible,
  );
  const contactRoutes = navigationRoutes.filter(
    (route) => route.group === "contacts" && route.isVisible,
  );
  const settingsRoute = navigationRoutes.find(
    (route) => route.segment === routeSegments.settings && route.isVisible,
  );
  const hasMultipleBusinesses = Boolean(user && user.businesses.length > 1);
  const activeRoleLabel = getRoleLabel(
    activeBusinessRole ?? undefined,
    dictionary,
  );

  useEffect(() => {
    if (!isBusinessMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        businessMenuRef.current &&
        !businessMenuRef.current.contains(event.target as Node)
      ) {
        setBusinessMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isBusinessMenuOpen]);

  function handleRouteClick() {
    onCloseMobile();
    setBusinessMenuOpen(false);
  }

  function handleBusinessChange(nextBusinessId: string) {
    const nextBusiness = user?.businesses.find(
      (business) => business.id === nextBusinessId,
    );

    setBusinessMenuOpen(false);
    setActiveBusiness(nextBusinessId);
    void queryClient.invalidateQueries();

    if (!nextBusiness) {
      return;
    }

    const currentPreset = getBusinessNavigationPreset(activeBusinessCategory);
    const nextPreset = getBusinessNavigationPreset(
      nextBusiness.businessCategory,
    );
    const shouldRedirect =
      location.pathname === routePaths.dashboard ||
      currentPreset !== nextPreset;

    if (shouldRedirect) {
      navigate(
        getModuleLandingPath(
          languageCode,
          nextBusiness.businessCategory,
          nextBusiness.role,
        ),
      );
    }

    onCloseMobile();
  }

  function handleLogout() {
    queryClient.clear();
    clearSession();
    onCloseMobile();
    navigate(routePaths.auth, { replace: true });
  }

  function renderNavigationRoute(route: (typeof navigationRoutes)[number]) {
    return (
      <div key={route.path} className={styles.navEntry}>
        <NavLink
          to={route.path}
          className={({ isActive }) =>
            joinClassNames(
              styles.navItem,
              navigationPreset === "retail" && styles.navItemRetail,
              isActive && styles.navItemActive,
            )
          }
          onClick={handleRouteClick}
        >
          <span className={styles.shortLabel}>
            <SidebarIcon
              className={styles.navIcon}
              name={getRouteIconName(route.segment)}
            />
          </span>

          <span className={styles.copy}>
            <span className={styles.labelRow}>
              <span className={styles.label}>{route.label}</span>
              <span className={styles.labelMeta}>
                {route.featureBadge ? (
                  <span className={styles.featureBadge}>
                    {navigationPreset === "retail"
                      ? dictionary.layout.sidebar.proBadge
                      : route.featureBadge}
                  </span>
                ) : null}
                {route.children?.length ? (
                  <span className={styles.navChevron}>⌄</span>
                ) : null}
              </span>
            </span>
          </span>
        </NavLink>

        {route.children?.length ? (
          <div className={styles.navChildren}>
            {route.children.map((child) =>
              child.path && !child.isDisabled ? (
                <NavLink
                  key={`${route.path}-${child.label}`}
                  to={child.path}
                  className={({ isActive }) =>
                    joinClassNames(
                      styles.navChild,
                      isActive && styles.navChildActive,
                    )
                  }
                  onClick={handleRouteClick}
                >
                  {child.label}
                </NavLink>
              ) : (
                <span
                  key={`${route.path}-${child.label}`}
                  className={joinClassNames(
                    styles.navChild,
                    styles.navChildDisabled,
                  )}
                >
                  {child.label}
                </span>
              ),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <aside
        id="app-sidebar"
        className={joinClassNames(
          styles.sidebar,
          navigationPreset === "retail" && styles.sidebarRetail,
          isCollapsed && styles.sidebarCollapsed,
          isMobileOpen && styles.sidebarMobileOpen,
        )}
      >
        <div className={styles.scrollArea}>
          <div className={styles.brandBlock}>
            <BrandLogo
              brand={dictionary.layout.sidebar.eyebrow}
              className={styles.sidebarBrand}
              size="sm"
              tagline={dictionary.layout.sidebar.title}
              variant={isCollapsed ? "mark" : "default"}
            />

            <button
              className={styles.mobileClose}
              type="button"
              onClick={onCloseMobile}
            >
              {dictionary.layout.sidebar.close}
            </button>
          </div>

          {user ? (
            <section className={styles.businessCard}>
              <div className={styles.businessMenu} ref={businessMenuRef}>
                <button
                  aria-expanded={
                    hasMultipleBusinesses ? isBusinessMenuOpen : false
                  }
                  className={styles.businessIdentityButton}
                  disabled={!hasMultipleBusinesses}
                  type="button"
                  onClick={() => {
                    if (!hasMultipleBusinesses) {
                      return;
                    }

                    setBusinessMenuOpen((currentValue) => !currentValue);
                  }}
                >
                  <div className={styles.businessIdentity}>
                    <BusinessAvatar
                      className={styles.businessAvatar}
                      logoUrl={activeBusiness?.logoUrl ?? user.logoUrl}
                      name={user.businessName}
                    />

                    <div className={styles.businessCopy}>
                      <p className={styles.businessName}>{user.businessName}</p>
                      <p className={styles.businessMeta}>{activeRoleLabel}</p>
                    </div>
                  </div>

                  {hasMultipleBusinesses ? (
                    <span className={styles.businessIdentityCaret}>
                      {isBusinessMenuOpen ? "⌃" : "⌄"}
                    </span>
                  ) : null}
                </button>

                {hasMultipleBusinesses && isBusinessMenuOpen ? (
                  <div className={styles.businessDropdown}>
                    {user.businesses.map((business) => {
                      const isActiveBusiness = matchesActiveBusiness(
                        business,
                        user,
                      );
                      const businessRoleLabel = getRoleLabel(
                        business.role,
                        dictionary,
                      );

                      return (
                        <button
                          key={business.id}
                          className={styles.businessDropdownItem}
                          type="button"
                          onClick={() => handleBusinessChange(business.id)}
                        >
                          <BusinessAvatar
                            className={styles.businessAvatarSmall}
                            logoUrl={business.logoUrl}
                            name={business.businessName}
                          />

                          <div className={styles.businessDropdownCopy}>
                            <p className={styles.businessDropdownName}>
                              {business.businessName}
                            </p>
                            <p className={styles.businessDropdownMeta}>
                              {businessRoleLabel}
                            </p>
                          </div>

                          {isActiveBusiness ? (
                            <span className={styles.businessDropdownCheck}>
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <button
                className={styles.addBusinessButton}
                type="button"
                onClick={() => setCreateBusinessOpen(true)}
              >
                <span className={styles.addBusinessIcon}>+</span>
                <span>{dictionary.layout.sidebar.addBusiness}</span>
              </button>
            </section>
          ) : null}

          <nav className={styles.navigation}>
            <section className={styles.navigationSection}>
              <p className={styles.sectionTitle}>
                {dictionary.layout.sidebar.businessManagement}
              </p>

              <div className={styles.sectionItems}>
                {businessRoutes.map(renderNavigationRoute)}
              </div>
            </section>

            <section className={styles.navigationSection}>
              <p className={styles.sectionTitle}>
                {dictionary.layout.sidebar.contactManagement}
              </p>

              <div className={styles.sectionItems}>
                {contactRoutes.map(renderNavigationRoute)}
              </div>
            </section>
          </nav>

          <div className={styles.sidebarFooter}>
            {settingsRoute ? (
              <NavLink
                to={settingsRoute.path}
                className={({ isActive }) =>
                  joinClassNames(
                    styles.utilityItem,
                    isActive && styles.utilityItemActive,
                  )
                }
                onClick={handleRouteClick}
              >
                <span className={styles.utilityContent}>
                  <SidebarIcon className={styles.utilityIcon} name="settings" />
                  <span className={styles.utilityLabel}>
                    {settingsRoute.label}
                  </span>
                </span>
              </NavLink>
            ) : null}

            <div className={styles.supportPanel}>
              <button
                aria-expanded={isSupportOpen}
                className={styles.utilityToggle}
                type="button"
                onClick={() =>
                  setIsSupportOpen((currentValue) => !currentValue)
                }
              >
                <span className={styles.utilityContent}>
                  <SidebarIcon className={styles.utilityIcon} name="help" />
                  <span className={styles.utilityLabel}>
                    {dictionary.layout.sidebar.help}
                  </span>
                </span>
                <span className={styles.utilityCaret}>
                  {isSupportOpen ? "^" : "v"}
                </span>
              </button>

              {isSupportOpen ? (
                <div className={styles.supportLinks}>
                  <NavLink
                    className={({ isActive }) =>
                      joinClassNames(
                        styles.supportLink,
                        isActive && styles.supportLinkActive,
                      )
                    }
                    to={routePaths.help}
                    onClick={handleRouteClick}
                  >
                    <SidebarIcon className={styles.utilityIcon} name="learn" />
                    <span>{dictionary.layout.sidebar.learn}</span>
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      joinClassNames(
                        styles.supportLink,
                        isActive && styles.supportLinkActive,
                      )
                    }
                    to={routePaths.terms}
                    onClick={handleRouteClick}
                  >
                    <SidebarIcon className={styles.utilityIcon} name="terms" />
                    <span>{dictionary.layout.sidebar.terms}</span>
                  </NavLink>
                  <div className={styles.supportLink}>
                    <SidebarIcon
                      className={styles.utilityIcon}
                      name="privacy"
                    />
                    <span>{dictionary.layout.sidebar.privacy}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className={styles.logoutButton}
              type="button"
              onClick={handleLogout}
            >
              <SidebarIcon className={styles.utilityIcon} name="logout" />
              <span>{dictionary.layout.sidebar.logout}</span>
            </button>

            {translations.length > 0 ? (
              <div className={styles.languagePanel}>
                <LanguageSelect
                  id="sidebar-language"
                  label={dictionary.layout.header.interfaceLanguage}
                  options={translations}
                  value={translationId}
                  onChange={(translation) =>
                    setLanguagePreference({
                      code: translation.code,
                      translationId: translation.id,
                    })
                  }
                />
              </div>
            ) : null}

            <div className={styles.versionRow}>
              <BrandLogo
                className={styles.footerLogo}
                size="sm"
                variant="mark"
              />
              <span className={styles.versionText}>
                {dictionary.layout.sidebar.version} 0.0.0
              </span>
            </div>
          </div>
        </div>
      </aside>

      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        isSubmitting={createManagedBusinessMutation.isPending}
        onClose={() => setCreateBusinessOpen(false)}
        onSubmit={async (values) => {
          const normalizedAddress = [values.address.trim(), values.city.trim()]
            .filter((value) => value.length > 0)
            .join(", ");

          const createdBusiness =
            await createManagedBusinessMutation.mutateAsync({
              businessName: values.businessName,
              businessCategory: values.businessCategory,
              address: normalizedAddress || null,
              phone: values.phone.trim() || null,
              email: values.email.trim() || null,
              taxId: values.document.trim() || null,
              currency: "COP",
              taxRate: 0,
              taxLabel: "IVA",
            });

          addBusiness(createdBusiness, true);
          await queryClient.invalidateQueries();
          navigate(
            getModuleLandingPath(
              languageCode,
              createdBusiness.businessCategory,
              createdBusiness.role,
            ),
          );
          onCloseMobile();
        }}
      />
    </>
  );
}
