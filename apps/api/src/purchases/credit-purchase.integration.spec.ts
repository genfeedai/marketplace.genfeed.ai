import {
  adminUrl,
  type MarketplaceFixture,
  startMarketplaceFixture,
} from '@api/test/marketplace-fixture';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface PurchaseRow {
  status: string;
  paymentMethod: string | null;
  creditsPaid: number | null;
  total: number;
  buyer: string;
  organization: string;
}

const WORKFLOW = { workflow: { nodes: ['credit-node'] } };
const RECORD = '/marketplace/service/purchases';
const REFUND = '/marketplace/service/purchases/refund';

describe.skipIf(!adminUrl)(
  'purchases paid with GEN credits against real PostgreSQL',
  () => {
    let fixture: MarketplaceFixture;
    let buyerToken: string;
    let serviceToken: string;
    let keyCounter = 0;

    const nextKey = () => `call-${++keyCounter}`;

    const rows = (listingId: string) =>
      fixture.sql<PurchaseRow>(
        `SELECT status, "paymentMethod", "creditsPaid", total, buyer, organization
           FROM purchases WHERE listing = $1 ORDER BY "createdAt"`,
        [listingId],
      );

    const record = (token: string | undefined, body: Record<string, unknown>) =>
      fixture.request(RECORD, token, body);

    const call = (
      listingId: string,
      overrides: Record<string, unknown> = {},
    ) => ({
      listingId,
      buyerId: 'buyer-opaque',
      organizationId: 'buyer-org',
      creditsPaid: 2175,
      idempotencyKey: nextKey(),
      ...overrides,
    });

    const publicCreditPrice = async (listingId: string) => {
      const list = await (
        await fixture.request('/marketplace/listings?limit=100')
      ).json();
      const entry = list.data.find(
        (item: { id: string }) => item.id === listingId,
      );
      return entry.attributes.creditPrice as number | null;
    };

    const libraryIds = async (token: string) =>
      (
        await (
          await fixture.request(
            '/marketplace/purchases?status=completed',
            token,
          )
        ).json()
      ).data.map(
        (item: { attributes: { listing: string } }) => item.attributes.listing,
      ) as string[];

    beforeAll(async () => {
      fixture = await startMarketplaceFixture();
      buyerToken = await fixture.token('buyer-opaque', 'buyer-org');
      serviceToken = await fixture.serviceToken();
    });
    afterAll(async () => {
      await fixture?.stop();
    });

    it('shows a GEN price 25% below the card price, rounded to a whole credit', async () => {
      const paid = await fixture.publishListing({
        title: 'Priced In Both',
        price: 2900,
        downloadData: WORKFLOW,
      });
      const odd = await fixture.publishListing({
        title: 'Odd Price',
        price: 999,
        downloadData: WORKFLOW,
      });
      const free = await fixture.publishListing({
        title: 'Free One',
        price: 0,
        downloadData: WORKFLOW,
      });

      expect(await publicCreditPrice(paid.id)).toBe(2175);
      expect(await publicCreditPrice(odd.id)).toBe(749);
      expect(await publicCreditPrice(free.id)).toBeNull();
    });

    it('records one completed purchase, puts it in the library and unlocks the install payload', async () => {
      const listing = await fixture.publishListing({
        title: 'Bought With GEN',
        price: 2900,
        downloadData: WORKFLOW,
      });
      const body = call(listing.id);

      const response = await record(serviceToken, body);

      expect(response.status).toBe(201);
      expect(await rows(listing.id)).toEqual([
        {
          status: 'completed',
          paymentMethod: 'credits',
          creditsPaid: 2175,
          total: 0,
          buyer: 'buyer-opaque',
          organization: 'buyer-org',
        },
      ]);
      expect(await libraryIds(buyerToken)).toContain(listing.id);
      const install = await fixture.request(
        `/marketplace/purchases/by-listing/${listing.id}/install-data`,
        buyerToken,
      );
      expect(install.status).toBe(200);
      expect((await install.json()).data.attributes.downloadData).toEqual(
        WORKFLOW,
      );
    });

    it('creates no second purchase when the same call is retried', async () => {
      const listing = await fixture.publishListing({
        title: 'Retried Call',
        price: 2900,
        downloadData: WORKFLOW,
      });
      const body = call(listing.id);

      const first = await record(serviceToken, body);
      const retry = await record(serviceToken, body);

      expect(first.status).toBe(201);
      expect(retry.status).toBe(200);
      expect((await retry.json()).data.id).toBe((await first.json()).data.id);
      expect(await rows(listing.id)).toHaveLength(1);
      const [{ purchases }] = await fixture.sql<{ purchases: number }>(
        'SELECT purchases FROM listings WHERE id = $1',
        [listing.id],
      );
      expect(purchases).toBe(1);
    });

    it('refuses a reused call key for another buyer or amount and writes nothing more', async () => {
      const listing = await fixture.publishListing({
        title: 'Reused Key',
        price: 2900,
        downloadData: WORKFLOW,
      });
      const body = call(listing.id);
      await record(serviceToken, body);

      const otherBuyer = await record(serviceToken, {
        ...body,
        buyerId: 'someone-else',
      });

      expect(otherBuyer.status).toBe(409);
      expect(await rows(listing.id)).toHaveLength(1);
    });

    it('refuses a credit amount that is not the listing GEN price', async () => {
      const listing = await fixture.publishListing({
        title: 'Wrong Amount',
        price: 2900,
        downloadData: WORKFLOW,
      });

      const response = await record(
        serviceToken,
        call(listing.id, { creditsPaid: 100 }),
      );

      expect(response.status).toBe(409);
      expect(await rows(listing.id)).toEqual([]);
    });

    it('refuses a buyer who already owns the item, even under a new key', async () => {
      const listing = await fixture.publishListing({
        title: 'Owned Already',
        price: 2900,
        downloadData: WORKFLOW,
      });
      await record(serviceToken, call(listing.id));

      const again = await record(serviceToken, call(listing.id));

      expect(again.status).toBe(409);
      expect(await rows(listing.id)).toHaveLength(1);
    });

    it('refuses a listing that has no GEN price or does not exist', async () => {
      const free = await fixture.publishListing({
        title: 'Free To Claim',
        price: 0,
        downloadData: WORKFLOW,
      });

      const freeResponse = await record(
        serviceToken,
        call(free.id, { creditsPaid: 1 }),
      );
      const missing = await record(
        serviceToken,
        call('00000000-0000-4000-8000-000000000000'),
      );

      expect(freeResponse.status).toBe(400);
      expect(missing.status).toBe(404);
      expect(await rows(free.id)).toEqual([]);
    });

    it('refunds a credit purchase by its call key and removes it from the library', async () => {
      const listing = await fixture.publishListing({
        title: 'Refunded GEN Item',
        price: 2900,
        downloadData: WORKFLOW,
      });
      const body = call(listing.id);
      await record(serviceToken, body);

      const refund = await fixture.request(REFUND, serviceToken, {
        idempotencyKey: body.idempotencyKey,
      });
      const again = await fixture.request(REFUND, serviceToken, {
        idempotencyKey: body.idempotencyKey,
      });

      expect(refund.status).toBe(201);
      expect(again.status).toBe(201);
      expect((await refund.json()).data.attributes.status).toBe('refunded');
      expect((await rows(listing.id))[0].status).toBe('refunded');
      expect(await libraryIds(buyerToken)).not.toContain(listing.id);
      const install = await fixture.request(
        `/marketplace/purchases/by-listing/${listing.id}/install-data`,
        buyerToken,
      );
      expect(install.status).toBe(403);
      const [{ purchases }] = await fixture.sql<{ purchases: number }>(
        'SELECT purchases FROM listings WHERE id = $1',
        [listing.id],
      );
      expect(purchases).toBe(0);
    });

    it('answers 404 when a refund names a key that recorded nothing', async () => {
      const response = await fixture.request(REFUND, serviceToken, {
        idempotencyKey: 'never-recorded',
      });

      expect(response.status).toBe(404);
    });

    it('refuses to refund a card purchase through the credit route', async () => {
      const listing = await fixture.publishListing({
        title: 'Card Purchase',
        price: 1500,
        downloadData: WORKFLOW,
      });
      const checkout = await fixture.startCheckout(buyerToken, listing.id);
      await fixture.sql(
        `UPDATE purchases SET "idempotencyKey" = 'card-key' WHERE id = $1`,
        [checkout.purchaseId],
      );

      const response = await fixture.request(REFUND, serviceToken, {
        idempotencyKey: 'card-key',
      });

      expect(response.status).toBe(400);
      expect((await rows(listing.id))[0].status).toBe('pending');
    });

    describe('service identity', () => {
      let listingId: string;
      beforeAll(async () => {
        listingId = (
          await fixture.publishListing({
            title: 'Identity Checks',
            price: 2900,
            downloadData: WORKFLOW,
          })
        ).id;
      });

      it.each([
        ['no token', async () => undefined],
        ['a buyer identity token', async () => buyerToken],
        [
          'a superadmin identity token',
          async () => fixture.token('operator-opaque', 'operator-org', true),
        ],
        [
          'the wrong audience',
          async () => fixture.serviceToken({ audience: 'something-else' }),
        ],
        [
          'the wrong subject',
          async () => fixture.serviceToken({ subject: 'another-service' }),
        ],
        ['no scope', async () => fixture.serviceToken({ scope: null })],
        [
          'only the refund scope',
          async () => fixture.serviceToken({ scope: 'purchases:refund' }),
        ],
        [
          'a lifetime over five minutes',
          async () => fixture.serviceToken({ lifetimeSeconds: 3600 }),
        ],
      ])('refuses a record call with %s', async (_name, makeToken) => {
        const response = await record(await makeToken(), call(listingId));

        expect(response.status).toBe(401);
        expect(await rows(listingId)).toEqual([]);
      });

      it('refuses a refund call that only holds the record scope', async () => {
        const token = await fixture.serviceToken({ scope: 'purchases:record' });

        const response = await fixture.request(REFUND, token, {
          idempotencyKey: 'whatever',
        });

        expect(response.status).toBe(401);
      });

      it('refuses a service token on a buyer route', async () => {
        const response = await fixture.request(
          '/marketplace/purchases',
          serviceToken,
        );

        expect(response.status).toBe(401);
      });
    });
  },
);
