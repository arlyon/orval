import {
  ContextSpecs,
  GeneratorImport,
  getRefInfo,
  isReference,
  MockOptions,
} from '@orval/core';
import get from 'lodash.get';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts';
import { getMockScalar } from '../getters/scalar';
import { MockDefinition, MockSchemaObject, MockValue } from '../types';

const isRegex = (key: string) => key[0] === '/' && key[key.length - 1] === '/';

export const resolveMockOverride = (
  properties: Record<string, string> | undefined = {},
  item: SchemaObject & { name: string; path?: string },
) => {
  const property = Object.entries(properties).find(([key]) => {
    if (isRegex(key)) {
      const regex = new RegExp(key.slice(1, key.length - 1));
      if (regex.test(item.name)) {
        return true;
      }
    }

    if (`#.${key}` === (item.path ? item.path : `#.${item.name}`)) {
      return true;
    }

    return false;
  });

  if (!property) {
    return;
  }

  return {
    value: getNullable(
      { type: 'primitive', value: property[1] as string },
      item.nullable,
    ),
    imports: [],
    name: item.name,
    overrided: true,
  };
};

export const getNullable = (value: MockValue, nullable?: boolean): MockValue =>
  nullable
    ? {
        type: 'primitive',
        value: `faker.helpers.arrayElement([${value}, null])`,
      }
    : value;

export const getOptional = (value: MockValue, optional?: boolean): MockValue =>
  optional
    ? {
        type: 'primitive',
        value: `faker.helpers.arrayElement([${value}, undefined])`,
      }
    : value;

export const resolveMockValue = ({
  schema,
  mockOptions,
  operationId,
  tags,
  combine,
  context,
  imports,
}: {
  schema: MockSchemaObject;
  operationId: string;
  mockOptions?: MockOptions;
  tags: string[];
  combine?: {
    separator: 'allOf' | 'oneOf' | 'anyOf';
    includedProperties: string[];
  };
  context: ContextSpecs;
  imports: GeneratorImport[];
}): MockDefinition & { type?: SchemaObject['type'] } => {
  if (isReference(schema)) {
    const {
      name,
      specKey = context.specKey,
      refPaths,
    } = getRefInfo(schema.$ref, context);

    const schemaRef = get(
      context.specs[specKey],
      refPaths as [keyof OpenAPIObject],
    );

    const newSchema = {
      ...schemaRef,
      name,
      path: schema.path,
      isRef: true,
    };

    const scalar = getMockScalar({
      item: newSchema,
      mockOptions,
      operationId,
      tags,
      combine,
      context: {
        ...context,
        specKey,
      },
      imports,
    });

    console.log('REFERENCE', JSON.stringify(scalar));

    return {
      ...scalar,
      type: newSchema.type,
    };
  }

  const scalar = getMockScalar({
    item: schema,
    mockOptions,
    operationId,
    tags,
    combine,
    context,
    imports,
  });

  return {
    ...scalar,
    type: schema.type,
  };
};
