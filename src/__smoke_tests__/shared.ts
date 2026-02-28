import type { ServiceContext } from "../lib/types";

type QueryResult = {
  data?: unknown;
  error?: { message: string } | null;
};

class QueryStub {
  private readonly table: string;
  private readonly responses: Record<string, QueryResult>;

  constructor(table: string, responses: Record<string, QueryResult>) {
    this.table = table;
    this.responses = responses;
  }

  select(): this {
    return this;
  }

  eq(): this {
    return this;
  }

  is(): this {
    return this;
  }

  in(): this {
    return this;
  }

  lte(): this {
    return this;
  }

  gte(): this {
    return this;
  }

  or(): this {
    return this;
  }

  order(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  insert(): this {
    return this;
  }

  update(): this {
    return this;
  }

  maybeSingle = async (): Promise<QueryResult> => {
    return this.responses[this.table] ?? { data: null, error: null };
  };

  single = async (): Promise<QueryResult> => {
    return this.responses[this.table] ?? { data: null, error: { message: "Not mocked" } };
  };
}

export const createMockContext = (responses: Record<string, QueryResult>): ServiceContext => {
  const supabase = {
    from: (table: string) => new QueryStub(table, responses),
    rpc: async () => ({ data: null, error: null })
  } as unknown as ServiceContext["supabase"];

  return {
    supabase,
    userId: "00000000-0000-0000-0000-000000000001",
    userProfileId: "00000000-0000-0000-0000-000000000003",
    companyId: "00000000-0000-0000-0000-000000000002",
    role: "Admin",
    permissions: ["manage_employees", "manage_attendance", "manage_payroll"],
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    },
    requestId: "00000000-0000-0000-0000-000000000099"
  };
};
