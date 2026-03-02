export type MyFinancialObligationRequest = {
  id: string;
  companyId: string;
  employeeId: string;
  obligationType: "advance" | "loan";
  status: string;
  requestedAmount: number;
  requestedTermMonths: number | null;
  currencyCode: string;
  reason: string | null;
  rejectionReason: string | null;
  reviewedByProfileId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName?: string | null;
};

export type MyFinancialObligationRequestsResponse = {
  requests: MyFinancialObligationRequest[];
};

export type SubmitFinancialObligationRequestResponse = {
  requestId: string;
  status: string;
};
