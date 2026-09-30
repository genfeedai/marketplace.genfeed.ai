import { randomBytes } from 'node:crypto';
import {
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { Client } from 'pg';

export interface ParameterStore {
  read(name: string): Promise<string | undefined>;
  write(name: string, value: string): Promise<void>;
}

interface ProvisionOptions {
  adminUrl: string;
  database: string;
  runtimeRole: string;
  migrationRole: string;
  parameterPath: string;
  store: ParameterStore;
}

function identifier(value: string): string {
  if (!/^[a-z][a-z0-9_]{0,47}$/.test(value))
    throw new Error('Invalid database identifier');
  return `"${value}"`;
}

function connectionUrl(
  adminUrl: string,
  database: string,
  user: string,
): string {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  url.username = user;
  url.password = randomBytes(32).toString('base64url');
  return url.toString();
}

function validateStoredUrl(
  value: string,
  adminUrl: string,
  database: string,
  user: string,
): void {
  const url = new URL(value);
  const admin = new URL(adminUrl);
  if (
    url.hostname !== admin.hostname ||
    url.port !== admin.port ||
    url.pathname !== `/${database}` ||
    decodeURIComponent(url.username) !== user ||
    !url.password
  ) {
    throw new Error(
      'Stored database credentials target an unexpected database or role',
    );
  }
}

export async function provisionDatabase(
  options: ProvisionOptions,
): Promise<void> {
  const {
    adminUrl,
    database,
    runtimeRole,
    migrationRole,
    parameterPath,
    store,
  } = options;
  const adminIdentity = new URL(adminUrl);
  if (
    database === 'postgres' ||
    database === decodeURIComponent(adminIdentity.pathname.slice(1)) ||
    runtimeRole === migrationRole ||
    [runtimeRole, migrationRole].includes(
      decodeURIComponent(adminIdentity.username),
    )
  )
    throw new Error('Dedicated database and distinct roles required');
  const databaseId = identifier(database);
  const runtimeId = identifier(runtimeRole);
  const migrationId = identifier(migrationRole);
  const runtimeName = `${parameterPath}/DATABASE_URL`;
  const migrationName = `${parameterPath}/MIGRATION_DATABASE_URL`;
  const storedRuntimeUrl = await store.read(runtimeName);
  const storedMigrationUrl = await store.read(migrationName);
  const runtimeUrl =
    storedRuntimeUrl ?? connectionUrl(adminUrl, database, runtimeRole);
  const migrationUrl =
    storedMigrationUrl ?? connectionUrl(adminUrl, database, migrationRole);
  validateStoredUrl(runtimeUrl, adminUrl, database, runtimeRole);
  validateStoredUrl(migrationUrl, adminUrl, database, migrationRole);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const existing = await admin.query(
      'SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1',
      [database],
    );
    if (existing.rowCount && existing.rows[0].owner !== migrationRole) {
      throw new Error(
        'Existing database has an unexpected owner; refusing adoption',
      );
    }
    for (const [role, storedUrl] of [
      [runtimeRole, storedRuntimeUrl],
      [migrationRole, storedMigrationUrl],
    ]) {
      const found = await admin.query(
        'SELECT rolsuper, rolreplication, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1',
        [role],
      );
      if (found.rowCount && !storedUrl)
        throw new Error(
          'Existing role has no managed credentials; refusing adoption',
        );
      if (
        found.rowCount &&
        Object.values(found.rows[0]).some((value) => value === true)
      )
        throw new Error('Refusing an existing privileged Marketplace role');
      const memberships = await admin.query(
        'SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)',
        [role],
      );
      if (memberships.rowCount)
        throw new Error('Marketplace roles must not inherit other roles');
    }
    // Persist credentials first so a partial provisioning failure can be retried.
    await store.write(runtimeName, runtimeUrl);
    await store.write(migrationName, migrationUrl);
    for (const [role, roleId, url] of [
      [runtimeRole, runtimeId, runtimeUrl],
      [migrationRole, migrationId, migrationUrl],
    ]) {
      const existing = await admin.query(
        'SELECT 1 FROM pg_roles WHERE rolname = $1',
        [role],
      );
      if (existing.rowCount === 0) await admin.query(`CREATE ROLE ${roleId}`);
      const password = decodeURIComponent(new URL(url).password).replaceAll(
        "'",
        "''",
      );
      await admin.query(
        `ALTER ROLE ${roleId} LOGIN NOINHERIT PASSWORD '${password}'`,
      );
    }
    // RDS administrators have CREATEROLE, rather than PostgreSQL superuser.
    // Explicit SET membership is required to create a database for its owner.
    const administrator = (
      await admin.query('SELECT quote_ident(current_user) AS name')
    ).rows[0].name;
    await admin.query(
      `GRANT ${migrationId} TO ${administrator} WITH INHERIT FALSE, SET TRUE`,
    );
    if (existing.rowCount === 0)
      await admin.query(`CREATE DATABASE ${databaseId} OWNER ${migrationId}`);
    await admin.query(`REVOKE ALL ON DATABASE ${databaseId} FROM PUBLIC`);
    await admin.query(
      `GRANT CONNECT ON DATABASE ${databaseId} TO ${runtimeId}, ${migrationId}`,
    );
  } finally {
    await admin.end();
  }

  const schemaAdminUrl = new URL(adminUrl);
  schemaAdminUrl.pathname = `/${database}`;
  const schemaAdmin = new Client({
    connectionString: schemaAdminUrl.toString(),
  });
  await schemaAdmin.connect();
  try {
    await schemaAdmin.query(`SET ROLE ${migrationId}`);
    await schemaAdmin.query(`ALTER SCHEMA public OWNER TO ${migrationId}`);
    await schemaAdmin.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
    await schemaAdmin.query(`GRANT USAGE ON SCHEMA public TO ${runtimeId}`);
    await schemaAdmin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${runtimeId}`,
    );
    await schemaAdmin.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${runtimeId}`,
    );
    await schemaAdmin.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationId} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtimeId}`,
    );
    await schemaAdmin.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationId} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${runtimeId}`,
    );
  } finally {
    await schemaAdmin.end();
  }
  await store.write(runtimeName, runtimeUrl);
  await store.write(migrationName, migrationUrl);
}

class SsmParameterStore implements ParameterStore {
  private readonly client = new SSMClient({});
  async read(name: string): Promise<string | undefined> {
    try {
      return (
        await this.client.send(
          new GetParameterCommand({ Name: name, WithDecryption: true }),
        )
      ).Parameter?.Value;
    } catch (error) {
      if (error instanceof Error && error.name === 'ParameterNotFound')
        return undefined;
      throw error;
    }
  }
  async write(name: string, value: string): Promise<void> {
    await this.client.send(
      new PutParameterCommand({
        Name: name,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      }),
    );
  }
}

if (require.main === module) {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  const parameterPath = process.env.MARKETPLACE_SSM_PATH;
  if (!adminUrl || !parameterPath)
    throw new Error('DATABASE_ADMIN_URL and MARKETPLACE_SSM_PATH are required');
  provisionDatabase({
    adminUrl,
    parameterPath,
    database: process.env.MARKETPLACE_DB_NAME || 'marketplace',
    runtimeRole: process.env.MARKETPLACE_RUNTIME_ROLE || 'marketplace_runtime',
    migrationRole:
      process.env.MARKETPLACE_MIGRATION_ROLE || 'marketplace_migrator',
    store: new SsmParameterStore(),
  })
    .then(() =>
      process.stdout.write(
        'Marketplace database and isolated roles prepared.\n',
      ),
    )
    .catch(() => {
      process.stderr.write(
        'Marketplace database provisioning failed. Verify administrator permissions and dedicated database ownership.\n',
      );
      process.exitCode = 1;
    });
}
