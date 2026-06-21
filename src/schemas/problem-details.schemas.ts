import { Type, type Static } from '@sinclair/typebox';

export const problemDetailsSchema = Type.Object(
  {
    type: Type.String({
      format: 'uri',
      description: 'URI identifying the problem type.',
      examples: ['https://product-lookup.dev/problems/invalid-request']
    }),
    title: Type.String({
      description: 'Short, human-readable summary of the problem.',
      examples: ['Invalid request']
    }),
    status: Type.Integer({
      description: 'HTTP status code for this problem response.',
      examples: [400]
    }),
    detail: Type.Optional(
      Type.String({
        description: 'Human-readable explanation specific to this occurrence.',
        examples: ['The request is invalid.']
      })
    ),
    instance: Type.Optional(
      Type.String({
        description: 'Request path or URI for the specific problem occurrence.',
        examples: ['/api/v1/products']
      })
    )
  },
  {
    title: 'ProblemDetails',
    description: 'Problem Details response based on RFC 9457.'
  }
);

export const validationProblemDetailsSchema = Type.Composite(
  [
    problemDetailsSchema,
    Type.Object(
      {
        errors: Type.Array(Type.Unknown(), {
          description:
            'Validation error entries reported by Fastify for the request.'
        })
      },
      {
        title: 'ValidationProblemDetailsExtension'
      }
    )
  ],
  {
    title: 'ValidationProblemDetails',
    description:
      'Problem Details response for request validation failures, including validation issues.'
  }
);

export type ProblemDetailsSchema = Static<typeof problemDetailsSchema>;
export type ValidationProblemDetailsSchema = Static<
  typeof validationProblemDetailsSchema
>;
