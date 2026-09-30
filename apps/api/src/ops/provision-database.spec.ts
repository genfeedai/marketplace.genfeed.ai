import { randomBytes } from 'node:crypto';
import {
  type ParameterStore,
  provisionDatabase,
} from '@api/ops/provision-database';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const adminUrl = process.env.MARKETPLACE_DB_TEST_ADMIN_URL;
if (process.env.CI === 'true' && !adminUrl) {
  throw new Error('CI requires the PostgreSQL integration fixture');
}
const suffix = randomBytes(6).toString('hex');
const database = `marketplace_test_${suffix}`;
const runtimeRole = `mp_runtime_${suffix}`;
const migrationRole = `mp_migrate_${suffix}`;
const foreignTable = `mp_foreign_${suffix}`;
const path = '/test/marketplace';
const values = new Map<string, string>();
const store: ParameterStore = {
  read: async (name) => values.get(name),
  write: async (name, value) => {
    values.set(name, value);
  },
};
let admin: Client;
let migration: Client;
let runtime: Client;

describe.skipIf(!adminUrl)('isolated PostgreSQL database provisioning', () => {
  beforeAll(async () => {
    if (!adminUrl) throw new Error('Test admin URL required');
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE TABLE "${foreignTable}" (id integer)`);
    await provisionDatabase({
      adminUrl,
      database,
      runtimeRole,
      migrationRole,
      parameterPath: path,
      store,
    });
    migration = new Client({
      connectionString: values.get(`${path}/MIGRATION_DATABASE_URL`),
    });
    await migration.connect();
    await migration.query(
      'CREATE TABLE public.products (id integer PRIMARY KEY, label text)',
    );
    runtime = new Client({
      connectionString: values.get(`${path}/DATABASE_URL`),
    });
    await runtime.connect();
  });
  afterAll(async () => {
    await runtime?.end();
    await migration?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
      await admin.query(`DROP TABLE IF EXISTS "${foreignTable}"`);
      await admin.query(`DROP ROLE IF EXISTS "${runtimeRole}"`);
      await admin.query(`DROP ROLE IF EXISTS "${migrationRole}"`);
      await admin.end();
    }
  });
  it('allows runtime DML while reserving schema changes for the migration role', async () => {
    await runtime.query('INSERT INTO public.products VALUES ($1,$2)', [
      1,
      'Workflow',
    ]);
    expect(
      (await runtime.query('SELECT label FROM public.products')).rows,
    ).toEqual([{ label: 'Workflow' }]);
    await expect(
      runtime.query('CREATE TABLE public.forbidden (id integer)'),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (
        await runtime.query(
          'SELECT rolcreatedb, rolcreaterole, rolsuper FROM pg_roles WHERE rolname=current_user',
        )
      ).rows[0],
    ).toEqual({ rolcreatedb: false, rolcreaterole: false, rolsuper: false });
  });
  it('cannot read application tables in another database', async () => {
    if (!adminUrl) throw new Error('Test admin URL required');
    const url = new URL(values.get(`${path}/DATABASE_URL`) || '');
    url.pathname = new URL(adminUrl).pathname;
    const outsider = new Client({ connectionString: url.toString() });
    await outsider.connect();
    try {
      await expect(
        outsider.query(`SELECT * FROM "${foreignTable}"`),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await outsider.end();
    }
  });
  it('preserves credentials and existing data on repeat provisioning', async () => {
    if (!adminUrl) throw new Error('Test admin URL required');
    const before = new Map(values);
    await provisionDatabase({
      adminUrl,
      database,
      runtimeRole,
      migrationRole,
      parameterPath: path,
      store,
    });
    expect(values).toEqual(before);
    expect(
      (await runtime.query('SELECT label FROM public.products')).rows,
    ).toHaveLength(1);
  });
  it('supports a non-superuser administrator like RDS', async () => {
    if (!adminUrl) throw new Error('Test admin URL required');
    const limitedAdmin = `mp_admin_${suffix}`;
    const isolatedDatabase = `mp_rds_${suffix}`;
    const reader = `mp_rds_user_${suffix}`;
    const owner = `mp_rds_owner_${suffix}`;
    const password = randomBytes(24).toString('hex');
    await admin.query(
      `CREATE ROLE "${limitedAdmin}" LOGIN CREATEROLE CREATEDB PASSWORD '${password}'`,
    );
    const url = new URL(adminUrl);
    url.username = limitedAdmin;
    url.password = password;
    const isolated = new Map<string, string>();
    try {
      await provisionDatabase({
        adminUrl: url.toString(),
        database: isolatedDatabase,
        runtimeRole: reader,
        migrationRole: owner,
        parameterPath: '/test/rds',
        store: {
          read: async (name) => isolated.get(name),
          write: async (name, value) => {
            isolated.set(name, value);
          },
        },
      });
      const connection = new Client({
        connectionString: isolated.get('/test/rds/MIGRATION_DATABASE_URL'),
      });
      await connection.connect();
      try {
        await connection.query('CREATE TABLE public.rds_fixture (id integer)');
      } finally {
        await connection.end();
      }
    } finally {
      await admin.query(
        `DROP DATABASE IF EXISTS "${isolatedDatabase}" WITH (FORCE)`,
      );
      await admin.query(`DROP ROLE IF EXISTS "${reader}"`);
      await admin.query(`DROP ROLE IF EXISTS "${owner}"`);
      await admin.query(`DROP ROLE IF EXISTS "${limitedAdmin}"`);
    }
  });
});
