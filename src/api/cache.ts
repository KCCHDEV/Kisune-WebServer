// GET /api/cache — สถิติของ in-memory cache
import { cache } from '@core/cache'

export const GET = () => cache.stats()
