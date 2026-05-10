export class MissingTenantContextError extends Error {
  constructor(message = 'Tenant context is required for this operation') {
    super(message);
    this.name = 'MissingTenantContextError';
  }
}
