import retailStyles from "@/shared/components/retail/RetailUI.module.css";
import styles from "./MoneyPage.module.css";

export function MoneyPage() {
  return (
    <div className={styles.page}>
      <section className={`${retailStyles.surface} ${styles.card}`}>
        <div className={styles.device} />
        <h2 className={styles.title}>Mi dinero</h2>
        <p className={styles.description}>
          Adquiere tu datáfono Cashgo y recibe el dinero de tus ventas de forma
          segura, práctica y alineada a la operación de tu negocio.
        </p>

        <div className={retailStyles.actionRow}>
          <button className={retailStyles.buttonOutline} type="button">
            Hablar con un asesor
          </button>
          <button className={retailStyles.buttonDark} type="button">
            Quiero mi datáfono
          </button>
        </div>
      </section>
    </div>
  );
}
