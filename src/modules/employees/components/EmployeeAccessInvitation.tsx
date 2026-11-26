import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { MailPlus, Send } from "lucide-react";
import { AppButton } from "@/shared/components/ui/AppButton";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { sendEmployeeInvitation } from "@/modules/employees/services/employees-api";
import type { Employee } from "@/modules/employees/types/employee";
import styles from "./EmployeeFormDrawer.module.css";

export function EmployeeAccessInvitation({ employee }: { employee: Employee }) {
  const [email, setEmail] = useState(employee.email.endsWith("@users.cashgo.local") ? "" : employee.email);
  const invitation = useMutation({
    mutationFn: (address: string) => sendEmployeeInvitation(employee.id, address),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation.isPending) invitation.mutate(email.trim());
  }

  return (
    <form className={styles.confirmCard} onSubmit={submit}>
      <h3 className={styles.invitationTitle}>
        <MailPlus aria-hidden="true" size={20} /> Invitación por correo
      </h3>
      <label className={styles.field}>
        <span className={styles.label}>Correo para activar el acceso</span>
        <input className={styles.input} type="email" autoComplete="email" required maxLength={191}
          value={email} disabled={invitation.isPending}
          onChange={(event) => { setEmail(event.target.value); invitation.reset(); }} />
      </label>
      <p className={styles.confirmDescription}>El enlace le permite crear una contraseña para su cuenta.</p>
      <AppButton type="submit" disabled={invitation.isPending} startIcon={<Send aria-hidden="true" size={16} />}>
        {invitation.isPending ? "Enviando…" : "Enviar invitación de acceso"}
      </AppButton>
      {invitation.data ? <p className={styles.invitationSuccess} role="status">Invitación enviada a {invitation.data.email}.</p> : null}
      {invitation.isError ? <p role="alert" className={styles.errorMessage}>{getErrorMessage(invitation.error, "No se pudo enviar la invitación.")}</p> : null}
    </form>
  );
}
