import { getBlob, getJson, postJson } from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";
import type {
  CashRegisterAssignee,
  CashRegisterManualEntryInput,
  CashRegisterReportDownloadInput,
  CashRegisterSession,
  CloseCashRegisterInput,
  MovementsOverview,
  OpenCashRegisterInput,
} from "@/modules/cash-register/types/cash-register";

export function getCashRegisterAssignees() {
  return getJson<CashRegisterAssignee[]>("/cash-register/assignees", {
    accessToken: getAuthAccessToken(),
  });
}

export function getCurrentCashRegisterSession() {
  return getJson<CashRegisterSession | null>("/cash-register/current", {
    accessToken: getAuthAccessToken(),
  });
}

export function getCashRegisterHistory() {
  return getJson<CashRegisterSession[]>("/cash-register/history", {
    accessToken: getAuthAccessToken(),
  });
}

export function getMovementsOverview(input: {
  from?: string;
  to?: string;
  search?: string;
  type?: "ALL" | "INCOME" | "EXPENSE";
}) {
  const searchParams = new URLSearchParams();

  if (input.from) {
    searchParams.set("from", input.from);
  }

  if (input.to) {
    searchParams.set("to", input.to);
  }

  if (input.search) {
    searchParams.set("search", input.search);
  }

  if (input.type) {
    searchParams.set("type", input.type);
  }

  return getJson<MovementsOverview>(
    `/movements/overview?${searchParams.toString()}`,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export function openCashRegister(input: OpenCashRegisterInput) {
  return postJson<CashRegisterSession, OpenCashRegisterInput>(
    "/cash-register/open",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export function closeCashRegister(input: CloseCashRegisterInput) {
  return postJson<CashRegisterSession, CloseCashRegisterInput>(
    "/cash-register/close",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export function createCashRegisterManualEntry(
  input: CashRegisterManualEntryInput,
) {
  return postJson<CashRegisterSession, CashRegisterManualEntryInput>(
    "/cash-register/manual-entry",
    input,
    {
      accessToken: getAuthAccessToken(),
    },
  );
}

export function downloadCashRegisterReport(
  input: CashRegisterReportDownloadInput,
) {
  const searchParams = new URLSearchParams();

  searchParams.set("view", input.view);

  if (input.from) {
    searchParams.set("from", input.from);
  }

  if (input.to) {
    searchParams.set("to", input.to);
  }

  if (input.search) {
    searchParams.set("search", input.search);
  }

  if (input.type) {
    searchParams.set("type", input.type);
  }

  return getBlob(`/cash-register/report?${searchParams.toString()}`, {
    accessToken: getAuthAccessToken(),
    accept: "text/csv",
  });
}

export function downloadMovementsReport(input: {
  from?: string;
  to?: string;
  search?: string;
  type?: "ALL" | "INCOME" | "EXPENSE";
}) {
  const searchParams = new URLSearchParams();

  if (input.from) {
    searchParams.set("from", input.from);
  }

  if (input.to) {
    searchParams.set("to", input.to);
  }

  if (input.search) {
    searchParams.set("search", input.search);
  }

  if (input.type) {
    searchParams.set("type", input.type);
  }

  return getBlob(`/movements/report?${searchParams.toString()}`, {
    accessToken: getAuthAccessToken(),
    accept: "text/csv",
  });
}
