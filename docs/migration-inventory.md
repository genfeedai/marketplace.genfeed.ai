# Migration Inventory: genfeed.ai → marketplace.genfeed.ai

Tracks every marketplace-related path in `genfeed.ai` and its disposition.

**Issue:** genfeedai/marketplace.genfeed.ai#4
**Created:** 2026-04-07

## Legend

| Disposition | Meaning |
|---|---|
| **move** | Move to marketplace.genfeed.ai, delete from genfeed.ai |
| **copy** | Copy to marketplace.genfeed.ai, keep in genfeed.ai until cutover |
| **replace** | Replace compile-time import with HTTP/SDK call in genfeed.ai |
| **keep** | Keep in genfeed.ai as outbound integration config |
| **delete** | Delete from genfeed.ai after cutover (no migration needed) |

---

## Backend Domain (move)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `apps/server/api/src/marketplace/marketplace.module.ts` | move | `apps/api/src/app.module.ts` (integrated) | pending |
| `apps/server/api/src/marketplace/listings/**` | move | `apps/api/src/listings/` | pending |
| `apps/server/api/src/marketplace/sellers/**` | move | `apps/api/src/sellers/` | pending |
| `apps/server/api/src/marketplace/purchases/**` | move | `apps/api/src/purchases/` (exclude InstallService) | pending |
| `apps/server/api/scripts/seeds/marketplace.seed.ts` | move | `apps/api/scripts/seeds/marketplace.seed.ts` | pending |
| `apps/server/api/scripts/seeds/marketplace-packages.seed.ts` | move | `apps/api/scripts/seeds/marketplace-packages.seed.ts` | pending |

## InstallService (stays in genfeed.ai)

| Source Path | Disposition | Notes | Status |
|---|---|---|---|
| `apps/server/api/src/marketplace/purchases/services/install.service.ts` | replace | Stays in genfeed.ai as `MarketplaceIntegrationService`. Calls marketplace API to fetch downloadData, then creates resources locally using WorkflowsService/PromptsService/SkillsService. | pending |

## Public/Shared Marketplace UI (move)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `packages/pages/marketplace/marketplace-list.tsx` | move | `apps/web/app/page.tsx` | pending |
| `packages/pages/marketplace/videos/videos-list.tsx` | move | `apps/web/app/videos/page.tsx` | pending |
| `packages/pages/marketplace/images/images-list.tsx` | move | `apps/web/app/images/page.tsx` | pending |
| `packages/pages/marketplace/musics/musics-list.tsx` | move | `apps/web/app/music/page.tsx` | pending |
| `packages/pages/marketplace/posts/posts-list.tsx` | move | `apps/web/app/posts/page.tsx` | pending |
| `packages/pages/marketplace/leaderboard/leaderboard-list.tsx` | move | `apps/web/app/leaderboard/page.tsx` | pending |
| `packages/pages/marketplace/prompts/prompts-list.tsx` | move | `apps/web/app/prompts/page.tsx` | pending |
| `packages/styles/marketplace.scss` | copy | `apps/web/styles/marketplace.scss` | pending |

> **Note:** Gallery pages (videos, images, musics, posts, leaderboard) call genfeed.ai's public API via `useGalleryList` + `PublicService`. After migration, these will call genfeed.ai's public API via HTTP using `GENFEED_API_URL` env var.

## Admin/Operator UI (move)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `apps/admin/app/(protected)/marketplace/page.tsx` | move | `apps/admin/app/(protected)/marketplace/page.tsx` | pending |
| `apps/admin/app/(protected)/marketplace/marketplace-page.tsx` | move | `apps/admin/app/(protected)/marketplace/marketplace-page.tsx` | pending |
| `packages/services/admin/marketplace.service.ts` | move | `apps/admin/services/marketplace.service.ts` | pending |

## Contracts/Types (copy)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `packages/interfaces/src/marketplace/listing.interface.ts` | copy | `packages/types/src/listing.ts` | done |
| `packages/interfaces/src/marketplace/seller.interface.ts` | copy | `packages/types/src/seller.ts` | done |
| `packages/interfaces/src/marketplace/purchase.interface.ts` | copy | `packages/types/src/purchase.ts` | done |
| `packages/interfaces/src/marketplace/checkout.interface.ts` | copy | `packages/types/src/checkout.ts` | done |
| `packages/interfaces/src/marketplace/index.ts` | copy | `packages/types/src/index.ts` | done |

## Serializers (copy)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `packages/serializers/src/server/marketplace/**` | copy | `apps/api/src/common/serializers/` | pending |
| `packages/serializers/src/attributes/marketplace/**` | copy | `apps/api/src/common/serializers/` | pending |
| `packages/serializers/src/configs/marketplace/**` | copy | `apps/api/src/common/serializers/` | pending |
| `packages/client/src/serializers/**/marketplace/**` | copy | `apps/admin/lib/serializers/` | pending |

## Cross-Product Integration Points (replace with HTTP/SDK)

| Source Path | Current Import | Disposition | Status |
|---|---|---|---|
| `apps/server/api/src/collections/workflows/controllers/workflows.controller.ts` | `ListingsService`, `SellersService` | replace with `MarketplaceApiClient` | pending |
| `apps/server/api/src/collections/workflows/workflows.module.ts` | `ListingsModule`, `SellersModule` | replace with `MarketplaceIntegrationModule` | pending |
| `apps/server/api/src/collections/prompts/controllers/prompts.controller.ts` | `ListingsService`, `SellersService` | replace with `MarketplaceApiClient` | pending |
| `apps/server/api/src/collections/prompts/prompts.module.ts` | `ListingsModule`, `SellersModule` | replace with `MarketplaceIntegrationModule` | pending |
| `apps/server/api/src/services/agent-orchestrator/tools/agent-tool-executor.service.ts` | `ListingsService`, `InstallService`, `PurchasesService` | replace with `MarketplaceApiClient` | pending |
| `apps/server/api/src/services/agent-orchestrator/agent-orchestrator.module.ts` | marketplace modules | replace with `MarketplaceIntegrationModule` | pending |
| `apps/server/api/src/endpoints/webhooks/stripe/webhooks.stripe.service.ts` | `CheckoutService`, `PurchasesService` | delete marketplace branch (marketplace gets own webhook) | pending |
| `apps/server/api/src/endpoints/webhooks/webhooks.module.ts` | `PurchasesModule` | remove import | pending |

## Env/Domain Assumptions (keep)

| Source Path | Reference | Disposition | Status |
|---|---|---|---|
| `packages/services/core/environment.service.ts` | `NEXT_PUBLIC_APPS_MARKETPLACE_ENDPOINT` | keep as outbound config | done |

## E2E Tests (move)

| Source Path | Disposition | Target Path | Status |
|---|---|---|---|
| `e2e/tests/marketplace/browse.spec.ts` | move | `apps/web/e2e/browse.spec.ts` | pending |
| `e2e/tests/marketplace/checkout.spec.ts` | move | `apps/web/e2e/checkout.spec.ts` | pending |
| `e2e/tests/marketplace/library.spec.ts` | move | `apps/web/e2e/library.spec.ts` | pending |
| `e2e/pages/marketplace.page.ts` | move | `apps/web/e2e/pages/marketplace.page.ts` | pending |

## Test Files to Update in genfeed.ai (PR 5)

| Source Path | Action | Status |
|---|---|---|
| `webhooks.stripe.service.spec.ts` | remove marketplace mock/test cases | pending |
| `workflows.controller.spec.ts` | remove marketplace mock/test cases | pending |

## App Module Registration (delete after cutover)

| Source Path | Action | Status |
|---|---|---|
| `apps/server/api/src/app.module.ts` | Remove `MarketplaceModule` import, remove marketplace DB connection | pending |

---

## Summary

| Category | Count | Disposition |
|---|---|---|
| Backend modules/services | 6 | move |
| Seed scripts | 2 | move |
| Public UI pages | 7 | move |
| Admin UI | 3 | move |
| Types/interfaces | 5 | copy (done) |
| Serializers | 4 sets | copy |
| Integration points | 8 | replace with HTTP |
| E2E tests | 4 | move |
| Test cleanup | 2 | update |
| Env config | 1 | keep |
| App module | 1 | delete |

**Total items classified: 43**
**Unclassified: 0**
