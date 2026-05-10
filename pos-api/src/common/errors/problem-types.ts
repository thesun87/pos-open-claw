export const PROBLEM_TYPES = {
  aboutBlank: 'about:blank',
  validation: 'https://pos.example/errors/validation',
  unauthorized: 'https://pos.example/errors/unauthorized',
  forbidden: 'https://pos.example/errors/forbidden',
  notFound: 'https://pos.example/errors/not-found',
  conflict: 'https://pos.example/errors/conflict',
  internal: 'https://pos.example/errors/internal',
  missingTenantContext: 'https://pos.example/errors/missing-tenant-context',
} as const;
