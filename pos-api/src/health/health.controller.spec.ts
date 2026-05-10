import { HealthController } from './health.controller';
import { isUuidV7 } from '../common/utils/trace-id';

describe('HealthController', () => {
  it('returns ok with uuid v7 traceId', () => {
    const response = new HealthController().getHealth();
    expect(response.status).toBe('ok');
    expect(isUuidV7(response.traceId)).toBe(true);
  });
});
