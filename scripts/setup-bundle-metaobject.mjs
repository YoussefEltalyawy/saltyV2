#!/usr/bin/env node
/**
 * Create (or top up) the bundle metaobject definitions in Shopify admin:
 *
 *   1. `salty_bundle_slot` – one picker group inside a bundle
 *   2. `salty_bundle`      – one bundle, referencing slots in order
 *
 * Usage:
 *   node scripts/setup-bundle-metaobject.mjs
 *   node scripts/setup-bundle-metaobject.mjs --dry-run
 *
 * Requires SHOPIFY_ADMIN_API_TOKEN and PUBLIC_STORE_DOMAIN in .env or the
 * environment. The token needs the `write_metaobject_definitions` scope to
 * create definitions, and `read_metaobject_definitions` to detect existing
 * ones (without it the script still tries to create them).
 *
 * Optional: SHOPIFY_ADMIN_API_VERSION (defaults to 2026-10).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};

  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const env = { ...loadEnvFile(), ...process.env };
const domain = String(env.PUBLIC_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const token = env.SHOPIFY_ADMIN_API_TOKEN;
const version = env.SHOPIFY_ADMIN_API_VERSION || '2026-10';

if (!domain || !token) {
  console.error(
    'Missing PUBLIC_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN in .env / environment.',
  );
  process.exit(1);
}

// ─── Definition 1: bundle slot ────────────────────────────────────────────────

const SLOT_FIELDS = [
  {
    key: 'label',
    name: 'Label',
    type: 'single_line_text_field',
    description:
      'Heading above this picker, e.g. "Zip Up" or "Free Cap". Also used as the slot name in Shopify admin, so fill it in.',
  },
  {
    key: 'collection',
    name: 'Collection',
    type: 'collection_reference',
    description: 'Customers pick this slot from this collection.',
  },
  {
    key: 'products',
    name: 'Products',
    type: 'list.product_reference',
    description:
      'Instead of a collection, pick from these specific products. Supports up to 20 products.',
  },
  {
    key: 'quantity',
    name: 'Quantity',
    type: 'number_integer',
    description:
      'How many items the customer picks from this slot. Leave blank for 1.',
  },
  {
    key: 'free',
    name: 'Free gift',
    type: 'boolean',
    description:
      'Tick to show this slot as a free gift. The Shopify discount must make it free.',
  },
];

const SLOT_DEFINITION = {
  type: 'salty_bundle_slot',
  name: 'Bundle Slot',
  description:
    'One picker group inside a bundle. Create the slots for a bundle first, then add them to the bundle in order.',
  displayNameKey: 'label',
  access: {
    admin: 'MERCHANT_READ_WRITE',
    storefront: 'PUBLIC_READ',
  },
  fieldDefinitions: SLOT_FIELDS,
};

// ─── Definition 2: bundle ─────────────────────────────────────────────────────

const BUNDLE_FIELDS = [
  {
    key: 'bundle_key',
    name: 'Bundle key',
    type: 'single_line_text_field',
    required: true,
    description:
      'Stable key for this bundle. Use an existing key (see the list printed after setup) to edit a built-in bundle, or any new key to add a bundle.',
  },
  {
    key: 'title',
    name: 'Title',
    type: 'single_line_text_field',
    description: 'Heading shown on the bundle card.',
  },
  {
    key: 'description',
    name: 'Description',
    type: 'multi_line_text_field',
    description: 'Short sentence shown under the heading.',
  },
  {
    key: 'hidden',
    name: 'Hide this bundle',
    type: 'boolean',
    description:
      'Tick to hide the bundle without deleting the entry. Leave unticked to show it.',
  },
  {
    key: 'discount_percent',
    name: 'Discount percent',
    type: 'number_decimal',
    description: 'Percentage saved, e.g. 10 for 10% off. Use 100 for a free item.',
  },
  {
    key: 'discount_code',
    name: 'Discount code',
    type: 'single_line_text_field',
    description:
      'Optional. Shopify discount code applied when the bundle is added. Leave empty for an automatic discount.',
  },
  {
    key: 'sort_order',
    name: 'Sort order',
    type: 'number_integer',
    description: 'Lower numbers appear first on the bundles page.',
  },
];

function slotsField(slotDefinitionId) {
  return {
    key: 'slots',
    name: 'Slots',
    type: 'list.metaobject_reference',
    description:
      'Add one Bundle Slot per picker group. Drag to reorder. The order here is the order customers see.',
    validations: [
      {
        name: 'metaobject_definition_id',
        value: slotDefinitionId,
      },
    ],
  };
}

function bundleDefinition(slotDefinitionId) {
  return {
    type: 'salty_bundle',
    name: 'Bundle Definition',
    description:
      'Storefront bundle configuration. Each entry is one bundle; fields override the built-in defaults.',
    displayNameKey: 'title',
    access: {
      admin: 'MERCHANT_READ_WRITE',
      storefront: 'PUBLIC_READ',
    },
    fieldDefinitions: [...BUNDLE_FIELDS, slotsField(slotDefinitionId)],
  };
}

const BUILT_IN_BUNDLE_KEYS = [
  'zipUpSweatpantsBundle',
  'hoodieSweatpantsBundle',
  'collection3ItemsBundle',
  'linenCrossSell',
  'crossSellDenimPolo',
  'poloBundle2',
  'poloBundle3',
  'topsBundle2',
  'topsBundle3',
  'topsCapBundle',
];

// ─── Admin API ───────────────────────────────────────────────────────────────

async function admin(query, variables) {
  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(
      `Admin API error (${response.status}): ${JSON.stringify(json.errors ?? json)}`,
    );
  }
  return json.data;
}

const CREATE_MUTATION = `#graphql
  mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_MUTATION = `#graphql
  mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition {
        id
        type
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const SCOPES_QUERY = `#graphql
  query BundleSetupScopes {
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
  }
`;

const DEFINITIONS_QUERY = `#graphql
  query BundleSetupDefinitions {
    metaobjectDefinitions(first: 50) {
      nodes {
        id
        type
        name
        fieldDefinitions {
          key
        }
      }
    }
  }
`;

function accessError(result) {
  return result?.userErrors?.some((error) =>
    /access/i.test(`${error.code ?? ''} ${error.message ?? ''}`),
  );
}

function reportErrors(result) {
  if (!result?.userErrors?.length) return false;
  console.error('Could not save the metaobject definition:');
  for (const error of result.userErrors) {
    console.error(`- ${error.field ?? ''}: ${error.message} (${error.code ?? ''})`);
  }
  return true;
}

async function createDefinition(definition) {
  let result = await admin(CREATE_MUTATION, { definition });

  // Some API versions reject the `access` input. Retry without it.
  if (accessError(result)) {
    const withoutAccess = { ...definition };
    delete withoutAccess.access;
    result = await admin(CREATE_MUTATION, { definition: withoutAccess });
  }

  if (reportErrors(result)) return null;
  return result.metaobjectDefinition;
}

async function addMissingFields(id, fieldDefinitions) {
  const result = await admin(UPDATE_MUTATION, {
    id,
    definition: {
      fieldDefinitions: fieldDefinitions.map((field) => ({ create: field })),
    },
  });

  if (reportErrors(result)) return null;
  return result.metaobjectDefinition;
}

/**
 * Create the definition, or add any missing fields to an existing one.
 * Returns the definition (with an `id`) so the bundle definition can reference
 * the slot definition.
 */
async function ensureDefinition(definition, existing) {
  if (!existing) {
    const created = await createDefinition(definition);
    if (!created) {
      console.error(
        '\nIf the definition already exists, add the missing fields by hand in',
      );
      console.error('Shopify admin → Settings → Custom data → Metaobjects.');
      return null;
    }
    console.log(`Created ${created.type} (${created.id})`);
    return created;
  }

  const existingKeys = new Set(
    (existing.fieldDefinitions ?? []).map((field) => field.key),
  );
  const missing = definition.fieldDefinitions.filter(
    (field) => !existingKeys.has(field.key),
  );

  if (!missing.length) {
    console.log(`Kept ${existing.type} (${existing.id}) – all fields present`);
    return existing;
  }

  console.log(
    `Adding ${missing.length} field(s) to ${existing.type}: ${missing
      .map((field) => field.key)
      .join(', ')}`,
  );
  const updated = await addMissingFields(existing.id, missing);
  if (!updated) {
    console.error(
      '\nAdd the missing field(s) by hand in Shopify admin → Settings → Custom data → Metaobjects.',
    );
    return null;
  }
  console.log(`Updated ${updated.type} (${updated.id})`);
  return updated;
}

async function preflightScopes() {
  try {
    const scopeData = await admin(SCOPES_QUERY);
    const scopes =
      scopeData?.currentAppInstallation?.accessScopes?.map((scope) => scope.handle) ?? [];
    if (scopes.length && !scopes.includes('write_metaobject_definitions')) {
      console.error(
        'This Admin API token is missing the write_metaobject_definitions scope.',
      );
      console.error(
        'Create the definitions manually in Shopify admin → Settings → Custom data → Metaobjects,',
      );
      console.error('or rerun this script with a token that has that scope.');
      return false;
    }
  } catch {
    // Scope query unavailable – let the create mutation report the real error.
  }
  return true;
}

async function existingDefinitions() {
  try {
    const data = await admin(DEFINITIONS_QUERY);
    return data?.metaobjectDefinitions?.nodes ?? [];
  } catch {
    return null;
  }
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    console.log('// 1. Create this definition first:\n');
    console.log(JSON.stringify(SLOT_DEFINITION, null, 2));
    console.log('\n// 2. Then create this one, pointing Slots at the first definition:\n');
    console.log(
      JSON.stringify(
        bundleDefinition('gid://shopify/MetaobjectDefinition/REPLACE_WITH_SLOT_DEFINITION_ID'),
        null,
        2,
      ),
    );
    return;
  }

  if (!(await preflightScopes())) process.exit(1);

  const definitions = await existingDefinitions();

  const slotExisting = definitions?.find(
    (definition) => definition.type === SLOT_DEFINITION.type,
  );
  const slot = await ensureDefinition(SLOT_DEFINITION, slotExisting);
  if (!slot) process.exit(1);

  const bundleExisting = definitions?.find(
    (definition) => definition.type === 'salty_bundle',
  );
  const bundle = await ensureDefinition(bundleDefinition(slot.id), bundleExisting);
  if (!bundle) process.exit(1);

  console.log(`\nAdmin: https://${domain}/admin/content/metaobjects`);
  console.log('\nNext:');
  console.log('1. Content → Metaobjects → Bundle Slot → Add entry (one per picker group).');
  console.log('2. Bundle Definition → Add entry → add those slots in the order you want.');
  console.log(
    '\nTo override a built-in bundle, set its "Bundle key" to one of:',
  );
  for (const key of BUILT_IN_BUNDLE_KEYS) console.log(`  - ${key}`);
  console.log('\nNew bundles can use any new key.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
